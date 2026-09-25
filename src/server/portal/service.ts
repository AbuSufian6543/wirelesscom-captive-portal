import { prisma } from "@/server/database/client";
import { audit } from "@/server/audit/log";
import { createUniFiProvider } from "@/server/unifi/factory";
import { findPortalByApMac, viewFor } from "./directory";
import { authenticateGuest, pendingDeadline, type GuestAuthDeps, type GuestInput } from "./authenticate";
import { parseGuestQuery } from "./params";
import { renderDocument, renderGuestPage, renderMessage, renderConnected } from "./render";
import { resolveTenantByAp } from "@/server/tenant/resolve";
import { rateLimit } from "@/server/shared/rate-limit";

const htmlHeaders = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
};

export function htmlResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: htmlHeaders });
}

export async function openGuestPortal(siteKey: string, params: URLSearchParams, ip: string): Promise<Response> {
  const parsed = parseGuestQuery(params);
  if (!parsed.ok) return htmlResponse(renderMessage("Unable to connect", parsed.message), 400);
  const resolution = await resolveTenantByAp({ findByApMac: findPortalByApMac }, parsed.query.apMac);
  if (!resolution.ok) {
    await audit({ action: "guest.portal.unregistered", result: "FAILURE", ipAddress: ip, metadata: { apMac: parsed.query.apMac } });
    return htmlResponse(renderMessage("Unable to connect", resolution.message), 404);
  }
  const portal = resolution.portal;
  const session = await prisma.guestSession.create({
    data: {
      tenantId: portal.tenant.id,
      siteId: portal.site.id,
      accessPointId: portal.accessPoint.id,
      apMac: parsed.query.apMac,
      clientMac: parsed.query.clientMac,
      ssid: parsed.query.ssid || portal.ssidName,
      requestSiteKey: siteKey.slice(0, 80),
      originalUrl: parsed.query.originalUrl,
      status: "PENDING",
    },
  });
  await prisma.analyticsEvent.create({
    data: { tenantId: portal.tenant.id, type: "PORTAL_VIEW", apMac: parsed.query.apMac, ssid: session.ssid, sessionId: session.id },
  });
  const view = viewFor(portal, session.ssid);
  return htmlResponse(
    renderGuestPage({
      portal: view,
      sessionId: session.id,
      termsHref: `/guest/terms?session=${session.id}`,
      privacyHref: `/guest/privacy?session=${session.id}`,
    }),
  );
}

export async function submitGuestPortal(form: FormData, ip: string): Promise<Response> {
  if (!rateLimit(`guest:${ip}`, 20, 10 * 60 * 1000)) {
    return htmlResponse(renderMessage("Please wait", "Too many attempts. Wait a moment and try again."), 429);
  }
  const input: GuestInput = {
    sessionId: String(form.get("sessionId") ?? ""),
    method: String(form.get("method") ?? ""),
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    acceptTerms: true,
    acceptPrivacy: true,
    marketingConsent: form.get("marketingConsent") === "yes",
    voucherCode: String(form.get("voucherCode") ?? ""),
    password: String(form.get("password") ?? ""),
    now: new Date(),
  };
  if (!rateLimit(`guest-mac:${input.sessionId}`, 8, 10 * 60 * 1000)) {
    return htmlResponse(renderMessage("Please wait", "Too many attempts. Wait a moment and try again."), 429);
  }
  const result = await authenticateGuest(prismaGuestDeps(), input, ip);
  if (!result.ok) {
    const reloaded = input.sessionId ? await reloadPage(input.sessionId, result.error) : null;
    return htmlResponse(reloaded ?? renderMessage("Unable to connect", result.error), 400);
  }
  await audit({
    action: "guest.authorization",
    result: "SUCCESS",
    ipAddress: ip,
    metadata: { sessionId: input.sessionId },
  });
  if (result.successUrl) return htmlResponse(renderConnected(result.companyName, result.successUrl));
  return htmlResponse(renderConnected(result.companyName, result.redirectUrl || "/"));
}

function prismaGuestDeps(): GuestAuthDeps {
  return {
    async loadSession(id) {
      const session = await prisma.guestSession.findUnique({ where: { id } });
      if (!session) return null;
      const portal = await findPortalByApMac(session.apMac);
      if (!portal || portal.tenant.id !== session.tenantId) return null;
      return {
        session: {
          id: session.id,
          tenantId: session.tenantId,
          status: session.status,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
          clientMac: session.clientMac,
          apMac: session.apMac,
          originalUrl: session.originalUrl,
          siteExternalId: portal.site.externalId,
        },
        portal,
      };
    },
    async findVoucher(tenantId, code) {
      return prisma.voucher.findUnique({ where: { tenantId_code: { tenantId, code } } });
    },
    async redeemVoucher(voucherId, sessionId, now) {
      return prisma.$transaction(async (tx) => {
        const voucher = await tx.voucher.findUnique({ where: { id: voucherId } });
        if (!voucher || voucher.status !== "ACTIVE" || voucher.useCount >= voucher.maxUses) return null;
        if (voucher.expiresAt && voucher.expiresAt < now) return null;
        const next = voucher.useCount + 1;
        await tx.voucher.update({
          where: { id: voucherId },
          data: { useCount: next, status: next >= voucher.maxUses ? "EXHAUSTED" : "ACTIVE" },
        });
        await tx.voucherRedemption.create({ data: { voucherId, sessionId } });
        return { ...voucher, useCount: next };
      });
    },
    async saveGuest(input) {
      return prisma.guestClient.upsert({
        where: { tenantId_mac: { tenantId: input.tenantId, mac: input.mac } },
        create: {
          tenantId: input.tenantId,
          mac: input.mac,
          name: input.name,
          email: input.email,
          phone: input.phone,
          termsVersion: input.termsVersion,
          termsAcceptedAt: input.termsAcceptedAt,
          privacyVersion: input.privacyVersion,
          privacyAcceptedAt: input.privacyAcceptedAt,
          marketingConsentAt: input.marketingConsentAt,
        },
        update: {
          name: input.name || undefined,
          email: input.email || undefined,
          phone: input.phone || undefined,
          termsVersion: input.termsVersion || undefined,
          termsAcceptedAt: input.termsAcceptedAt,
          privacyVersion: input.privacyVersion || undefined,
          privacyAcceptedAt: input.privacyAcceptedAt,
          marketingConsentAt: input.marketingConsentAt ?? undefined,
          lastSeenAt: input.now,
        },
      });
    },
    async markSession(input) {
      await prisma.guestSession.update({
        where: { id: input.sessionId },
        data: {
          status: input.status,
          method: input.method,
          guestClientId: input.guestClientId,
          authenticatedAt: input.status === "AUTHENTICATED" ? input.now : undefined,
          expiresAt: input.expiresAt,
          redirectUrl: input.redirectUrl,
          failureReason: input.reason ?? "",
        },
      });
      if (input.status === "AUTHENTICATED" || input.status === "FAILED") {
        const session = await prisma.guestSession.findUnique({ where: { id: input.sessionId } });
        if (session) {
          await prisma.analyticsEvent.create({
            data: {
              tenantId: session.tenantId,
              type: input.status === "AUTHENTICATED" ? "AUTH_SUCCESS" : "AUTH_FAILURE",
              apMac: session.apMac,
              ssid: session.ssid,
              sessionId: session.id,
            },
          });
        }
      }
    },
    async recordEvent(input) {
      await prisma.guestAuthenticationEvent.create({ data: input });
    },
    providerFor(portal) {
      return createUniFiProvider({
        mode: portal.controller.mode,
        connection: {
          id: portal.controller.id,
          baseUrl: portal.controller.baseUrl,
          username: portal.controller.username,
          password: portal.controller.password,
          apiStyle: portal.controller.apiStyle,
          verifyTls: portal.controller.verifyTls,
          siteExternalId: portal.site.externalId,
        },
      });
    },
  };
}

async function reloadPage(sessionId: string, error: string): Promise<string | null> {
  const session = await prisma.guestSession.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  const portal = await findPortalByApMac(session.apMac);
  if (!portal) return null;
  return renderGuestPage({
    portal: viewFor(portal, session.ssid),
    sessionId,
    error,
    termsHref: `/guest/terms?session=${sessionId}`,
    privacyHref: `/guest/privacy?session=${sessionId}`,
  });
}

export async function guestLegal(sessionId: string, kind: "terms" | "privacy"): Promise<Response> {
  const session = await prisma.guestSession.findUnique({ where: { id: sessionId } });
  if (!session) return htmlResponse(renderMessage("Unavailable", "This page has expired."), 404);
  const config = await prisma.portalConfiguration.findUnique({ where: { tenantId: session.tenantId } });
  if (!config) return htmlResponse(renderMessage("Unavailable", "This page has expired."), 404);
  const title = kind === "terms" ? "Terms and conditions" : "Privacy policy";
  const body = kind === "terms" ? config.termsText : config.privacyText;
  return htmlResponse(renderDocument(title, config.companyName, body));
}

export { pendingDeadline };
