import { verifyPassword } from "@/server/authentication/password";
import { checkRedirectUrl } from "@/server/shared/redirect";
import { logError } from "@/server/shared/log";
import type { AuthMethodName, ResolvedPortal } from "@/server/tenant/resolve";
import type { AuthorizeOptions, UniFiProvider } from "@/server/unifi/types";
import { postAuthRedirect } from "./success-url";

export type GuestInput = {
  sessionId: string;
  method: string;
  name: string;
  email: string;
  phone: string;
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  marketingConsent: boolean;
  voucherCode: string;
  password: string;
  now: Date;
};

export type PendingSession = {
  id: string;
  tenantId: string;
  status: "PENDING" | "AUTHENTICATED" | "EXPIRED" | "REVOKED" | "FAILED";
  createdAt: Date;
  expiresAt: Date | null;
  clientMac: string;
  apMac: string;
  originalUrl: string;
  siteExternalId: string;
};

export type VoucherRecord = {
  id: string;
  code: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "EXHAUSTED";
  expiresAt: Date | null;
  maxUses: number;
  useCount: number;
  sessionDurationMinutes: number;
};

export type GuestAuthDeps = {
  loadSession(id: string): Promise<{ session: PendingSession; portal: ResolvedPortal } | null>;
  findVoucher(tenantId: string, code: string): Promise<VoucherRecord | null>;
  redeemVoucher(voucherId: string, sessionId: string, now: Date): Promise<VoucherRecord | null>;
  saveGuest(input: {
    tenantId: string;
    mac: string;
    name: string;
    email: string;
    phone: string;
    termsVersion: string;
    termsAcceptedAt: Date | null;
    privacyVersion: string;
    privacyAcceptedAt: Date | null;
    marketingConsentAt: Date | null;
    now: Date;
  }): Promise<{ id: string }>;
  markSession(input: {
    sessionId: string;
    status: "AUTHENTICATED" | "FAILED" | "EXPIRED";
    method: AuthMethodName | null;
    guestClientId?: string;
    expiresAt?: Date;
    redirectUrl?: string;
    reason?: string;
    now: Date;
  }): Promise<void>;
  recordEvent(input: { tenantId: string; sessionId: string; method: AuthMethodName | null; result: "SUCCESS" | "FAILURE"; reason: string; ip: string }): Promise<void>;
  providerFor(portal: ResolvedPortal): UniFiProvider;
};

const PENDING_MS = 20 * 60 * 1000;

export function pendingDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + PENDING_MS);
}

export function evaluateVoucher(voucher: VoucherRecord, now: Date): { ok: true } | { ok: false; reason: string } {
  if (voucher.status === "REVOKED") return { ok: false, reason: "This voucher is no longer valid" };
  if (voucher.status === "EXHAUSTED" || voucher.useCount >= voucher.maxUses) return { ok: false, reason: "This voucher has already been used" };
  if (voucher.expiresAt && voucher.expiresAt < now) return { ok: false, reason: "This voucher has expired" };
  if (voucher.status !== "ACTIVE") return { ok: false, reason: "This voucher is no longer valid" };
  return { ok: true };
}

export function resolveGuestMethod(portal: ResolvedPortal, input: GuestInput): AuthMethodName | null {
  const enabled = portal.methods.filter((item) => item.enabled).map((item) => item.method);
  if (!enabled.length) return null;
  if (input.voucherCode.trim() && enabled.includes("VOUCHER")) return "VOUCHER";
  if (input.password && enabled.includes("PASSWORD")) return "PASSWORD";
  if (input.email.includes("@") && enabled.includes("EMAIL")) return "EMAIL";
  const requested = input.method as AuthMethodName;
  if (requested && enabled.includes(requested)) return requested;
  if (enabled.includes("ACCEPT_TERMS")) return "ACCEPT_TERMS";
  return enabled[0] ?? null;
}

export async function authenticateGuest(
  deps: GuestAuthDeps,
  input: GuestInput,
  ip: string,
): Promise<
  | { ok: true; redirectUrl: string; successUrl: string; companyName: string }
  | { ok: false; error: string; sessionId?: string }
> {
  const loaded = await deps.loadSession(input.sessionId);
  if (!loaded) return { ok: false, error: "This connection expired. Reconnect to Wi-Fi and try again." };
  const { session, portal } = loaded;
  if (session.status !== "PENDING" || pendingDeadline(session.createdAt) < input.now) {
    await deps.markSession({ sessionId: session.id, status: "EXPIRED", method: null, reason: "expired", now: input.now });
    return { ok: false, error: "This connection expired. Reconnect to Wi-Fi and try again.", sessionId: session.id };
  }

  const method = resolveGuestMethod(portal, input);
  if (!method) {
    await fail(deps, session, portal, null, "method", ip, input.now);
    return { ok: false, error: "Choose an available way to connect.", sessionId: session.id };
  }
  const configured = portal.methods.find((item) => item.method === method && item.enabled);
  if (!configured) {
    await fail(deps, session, portal, method, "method", ip, input.now);
    return { ok: false, error: "Choose an available way to connect.", sessionId: session.id };
  }

  const missing = requiredMissing(portal, input, method);
  if (missing) return { ok: false, error: missing, sessionId: session.id };

  let minutes = portal.portal.sessionDurationMinutes;
  if (method === "VOUCHER") {
    const voucher = await deps.findVoucher(portal.tenant.id, input.voucherCode.trim().toUpperCase());
    if (!voucher) {
      await fail(deps, session, portal, method, "voucher", ip, input.now);
      return { ok: false, error: "That voucher code was not recognized.", sessionId: session.id };
    }
    const decision = evaluateVoucher(voucher, input.now);
    if (!decision.ok) {
      await fail(deps, session, portal, method, decision.reason, ip, input.now);
      return { ok: false, error: decision.reason, sessionId: session.id };
    }
    const redeemed = await deps.redeemVoucher(voucher.id, session.id, input.now);
    if (!redeemed) {
      await fail(deps, session, portal, method, "redeem", ip, input.now);
      return { ok: false, error: "This voucher has already been used.", sessionId: session.id };
    }
    minutes = redeemed.sessionDurationMinutes;
  }

  if (method === "PASSWORD") {
    const matches = await verifyPassword(configured.sharedSecretHash, input.password);
    if (!matches) {
      await fail(deps, session, portal, method, "password", ip, input.now);
      return { ok: false, error: "That password is not correct.", sessionId: session.id };
    }
  }

  const destination = checkRedirectUrl(portal.portal.redirectUrl);
  const redirectUrl = destination.ok ? destination.url : "";
  const guest = await deps.saveGuest({
    tenantId: portal.tenant.id,
    mac: session.clientMac,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    termsVersion: portal.portal.termsVersion,
    termsAcceptedAt: input.now,
    privacyVersion: portal.portal.privacyVersion,
    privacyAcceptedAt: input.now,
    marketingConsentAt: input.marketingConsent ? input.now : null,
    now: input.now,
  });

  const options: AuthorizeOptions = {
    minutes,
    uploadKbps: portal.portal.uploadKbps,
    downloadKbps: portal.portal.downloadKbps,
    dataLimitMb: portal.portal.dataLimitMb,
    apMac: session.apMac,
  };
  try {
    await deps.providerFor(portal).authorizeGuest(session.siteExternalId, session.clientMac, options);
  } catch (error) {
    logError("unifi.authorize_failed", {
      tenantId: portal.tenant.id,
      sessionId: session.id,
      siteExternalId: session.siteExternalId,
      error: error instanceof Error ? error.message : "failed",
    });
    await fail(deps, session, portal, method, "unifi", ip, input.now);
    return { ok: false, error: "We could not enable your connection. Please try again.", sessionId: session.id };
  }

  const successUrl = postAuthRedirect(session.originalUrl, redirectUrl);
  await deps.markSession({
    sessionId: session.id,
    status: "AUTHENTICATED",
    method,
    guestClientId: guest.id,
    expiresAt: new Date(input.now.getTime() + minutes * 60 * 1000),
    redirectUrl: successUrl || redirectUrl,
    now: input.now,
  });
  await deps.recordEvent({ tenantId: portal.tenant.id, sessionId: session.id, method, result: "SUCCESS", reason: "", ip });
  return { ok: true, redirectUrl, successUrl, companyName: portal.portal.companyName };
}

function requiredMissing(portal: ResolvedPortal, input: GuestInput, method: AuthMethodName): string | null {
  const p = portal.portal;
  if (method === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return "Enter a valid email address.";
  if (p.emailField === "REQUIRED" && method !== "ACCEPT_TERMS" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "Enter a valid email address.";
  }
  if (p.nameField === "REQUIRED" && input.name.trim().length < 2) return "Enter your name.";
  if (p.phoneField === "REQUIRED" && input.phone.trim().length < 7) return "Enter your mobile number.";
  if (method === "VOUCHER" && input.voucherCode.trim().length < 4) return "Enter your voucher code.";
  if (method === "PASSWORD" && !input.password) return "Enter the Wi-Fi password.";
  return null;
}

async function fail(
  deps: GuestAuthDeps,
  session: PendingSession,
  portal: ResolvedPortal,
  method: AuthMethodName | null,
  reason: string,
  ip: string,
  _now: Date,
) {
  await deps.recordEvent({ tenantId: portal.tenant.id, sessionId: session.id, method, result: "FAILURE", reason, ip });
}
