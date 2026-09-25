"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/server/database/client";
import { audit } from "@/server/audit/log";
import { AuthzError, isSuperAdmin, requirePermission, requireSuperAdmin, requireTenantAdmin, requireTenantAccess } from "@/server/authentication/guards";
import { hashPassword, passwordIssues, verifyPassword } from "@/server/authentication/password";
import { loginWithPassword } from "@/server/authentication/login";
import { destroyAdminSession, getCurrentUser, revokeUserSessions } from "@/server/authentication/session";
import { completePasswordReset, prismaResetStore, requestPasswordReset } from "@/server/authentication/reset";
import { encryptSecret } from "@/server/shared/crypto";
import { checkRedirectUrl } from "@/server/shared/redirect";
import { contrastRatio, isHexColor } from "@/server/shared/color";
import { sanitizeCustomCss } from "@/server/portal/css";
import { normalizeMac } from "@/server/shared/mac";
import { EmailService } from "@/server/email/email-service";
import { MessageService } from "@/server/messaging/message-service";
import { getEnv } from "@/server/shared/env";
import { randomToken, sha256 } from "@/server/shared/crypto";
import { createUniFiProvider } from "@/server/unifi/factory";
import { decryptSecret } from "@/server/shared/crypto";

async function ip() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "0.0.0.0").split(",")[0]!.trim();
}

function fail(error: unknown): never {
  if (error instanceof AuthzError) redirect(`/admin/login?error=${encodeURIComponent(error.message)}`);
  throw error;
}

export async function loginAction(form: FormData) {
  const result = await loginWithPassword(String(form.get("email") ?? ""), String(form.get("password") ?? ""), await ip(), "admin-form");
  if (!result.ok) redirect(`/admin/login?error=${encodeURIComponent(result.error)}`);
  redirect(result.mustChangePassword ? "/admin/change-password" : "/admin");
}

export async function logoutAction() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function changePasswordAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const issue = passwordIssues(next);
  if (issue) redirect(`/admin/change-password?error=${encodeURIComponent(issue)}`);
  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row || !(await verifyPassword(row.passwordHash, current))) {
    redirect("/admin/change-password?error=Current%20password%20is%20not%20correct");
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), mustChangePassword: false } });
  await revokeUserSessions(user.id);
  await audit({ actorId: user.id, action: "auth.password_change", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/login");
}

export async function forgotPasswordAction(form: FormData) {
  const env = getEnv();
  const emailSettings = await platformSmtp();
  await requestPasswordReset(
    prismaResetStore(async ({ to, name, link }) => {
      const service = new EmailService(emailSettings);
      if (!service.configured()) return;
      await service.send({
        to,
        subject: "Reset your WirelessCom portal password",
        text: `Hello ${name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you did not ask for this, ignore this email.`,
      });
    }),
    String(form.get("email") ?? ""),
    env.APP_PUBLIC_URL || "",
  );
  redirect("/admin/forgot-password?sent=1");
}

export async function resetPasswordAction(form: FormData) {
  const result = await completePasswordReset(prismaResetStore(async () => undefined), String(form.get("token") ?? ""), String(form.get("password") ?? ""));
  if (!result.ok) redirect(`/admin/reset-password?error=${encodeURIComponent(result.error)}`);
  await audit({ action: "auth.password_reset", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/login");
}

export async function createTenantAction(form: FormData) {
  try {
    const user = requireSuperAdmin(await getCurrentUser());
    const name = String(form.get("name") ?? "").trim();
    const slug = String(form.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    const redirectUrl = String(form.get("redirectUrl") ?? "").trim();
    if (!name || !slug) redirect("/admin/tenants?error=Name%20and%20slug%20are%20required");
    if (redirectUrl) {
      const safe = checkRedirectUrl(redirectUrl);
      if (!safe.ok) redirect(`/admin/tenants?error=${encodeURIComponent(safe.reason)}`);
    }
    const tenant = await prisma.tenant.create({ data: { name, slug, kind: "CUSTOMER" } });
    await prisma.portalConfiguration.create({
      data: {
        tenantId: tenant.id,
        companyName: name,
        welcomeTitle: `Welcome to ${name}`,
        welcomeMessage: "Connect to Wi-Fi to get online.",
        termsText: "By connecting you agree to use this network lawfully.",
        privacyText: "We store the details you submit so we can provide Wi-Fi access.",
        redirectUrl: redirectUrl || "",
        buttonText: "Connect",
      },
    });
    for (const [index, method] of ["ACCEPT_TERMS", "EMAIL", "VOUCHER", "PASSWORD"].entries()) {
      await prisma.authenticationMethod.create({
        data: { tenantId: tenant.id, method: method as "ACCEPT_TERMS", enabled: method === "ACCEPT_TERMS", sortOrder: index },
      });
    }
    await audit({ actorId: user.id, tenantId: tenant.id, action: "tenant.create", result: "SUCCESS", ipAddress: await ip(), metadata: { slug } });
    revalidatePath("/admin/tenants");
    redirect(`/admin/tenants/${tenant.id}`);
  } catch (error) {
    fail(error);
  }
}

export async function updateTenantStatusAction(form: FormData) {
  const user = requireSuperAdmin(await getCurrentUser());
  const id = String(form.get("id") ?? "");
  const status = String(form.get("status") ?? "") as "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  await prisma.tenant.update({ where: { id }, data: { status } });
  await audit({ actorId: user.id, tenantId: id, action: status === "SUSPENDED" ? "tenant.suspend" : "tenant.update", result: "SUCCESS", ipAddress: await ip(), metadata: { status } });
  redirect(`/admin/tenants/${id}`);
}

export async function savePortalAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "portal.manage", tenantId);
  const colors = ["primaryColor", "accentColor", "backgroundColor", "textColor", "mutedColor", "cardColor", "buttonColor", "buttonTextColor"] as const;
  const data: Record<string, string | number | null> = {};
  for (const key of ["companyName", "welcomeTitle", "welcomeMessage", "description", "buttonText", "footerText", "supportText", "termsText", "termsVersion", "privacyText", "privacyVersion", ...colors] as const) {
    data[key] = String(form.get(key) ?? "");
  }
  for (const color of colors) {
    if (!isHexColor(String(data[color]))) redirect(`/admin/portals/${tenantId}?error=Use%20%23RRGGBB%20colors`);
  }
  if (contrastRatio(String(data.textColor), String(data.cardColor)) < 4.5) {
    redirect(`/admin/portals/${tenantId}?error=Text%20and%20card%20colors%20need%20stronger%20contrast`);
  }
  if (contrastRatio(String(data.buttonTextColor), String(data.buttonColor)) < 4.5) {
    redirect(`/admin/portals/${tenantId}?error=Button%20text%20and%20button%20colors%20need%20stronger%20contrast`);
  }
  const redirectUrl = String(form.get("redirectUrl") ?? "").trim();
  if (redirectUrl) {
    const safe = checkRedirectUrl(redirectUrl);
    if (!safe.ok) redirect(`/admin/portals/${tenantId}?error=${encodeURIComponent(safe.reason)}`);
    data.redirectUrl = safe.url;
  } else data.redirectUrl = "";
  const minutes = Number(form.get("sessionDurationMinutes") ?? 480);
  if (!Number.isFinite(minutes) || minutes < 5 || minutes > 43200) redirect(`/admin/portals/${tenantId}?error=Session%20length%20is%20invalid`);
  const fields = ["nameField", "emailField", "phoneField", "termsField", "privacyField", "marketingField"] as const;
  await prisma.portalConfiguration.update({
    where: { tenantId },
    data: {
      ...(data as object),
      sessionDurationMinutes: minutes,
      customCss: sanitizeCustomCss(String(form.get("customCss") ?? "")),
      uploadKbps: numberOrNull(form.get("uploadKbps")),
      downloadKbps: numberOrNull(form.get("downloadKbps")),
      dataLimitMb: numberOrNull(form.get("dataLimitMb")),
      ...Object.fromEntries(fields.map((field) => [field, String(form.get(field) ?? "OPTIONAL")])),
    },
  });
  await audit({ actorId: user.id, tenantId, action: "portal.update", result: "SUCCESS", ipAddress: await ip() });
  revalidatePath(`/admin/portals/${tenantId}`);
  redirect(`/admin/portals/${tenantId}?saved=1`);
}

export async function saveAuthMethodsAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "auth.manage", tenantId);
  const methods = ["ACCEPT_TERMS", "EMAIL", "VOUCHER", "PASSWORD"] as const;
  for (const [index, method] of methods.entries()) {
    const password = String(form.get(`password-${method}`) ?? "");
    const data: { enabled: boolean; sortOrder: number; sharedSecretHash?: string } = {
      enabled: form.get(method) === "on",
      sortOrder: index,
    };
    if (method === "PASSWORD" && password) {
      const issue = passwordIssues(password);
      if (issue) redirect(`/admin/authentication?tenantId=${tenantId}&error=${encodeURIComponent(issue)}`);
      data.sharedSecretHash = await hashPassword(password);
    }
    await prisma.authenticationMethod.upsert({
      where: { tenantId_method: { tenantId, method } },
      create: { tenantId, method, ...data },
      update: data,
    });
  }
  await audit({ actorId: user.id, tenantId, action: "auth.methods.update", result: "SUCCESS", ipAddress: await ip() });
  redirect(`/admin/authentication?tenantId=${tenantId}&saved=1`);
}

export async function createUserAction(form: FormData) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/admin/login");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const roleKey = String(form.get("role") ?? "TENANT_USER");
  const tenantIds = form.getAll("tenantId").map(String);
  const allTenants = form.get("allTenants") === "on";
  if (roleKey === "SUPER_ADMIN" || allTenants) requireSuperAdmin(actor);
  else requirePermission(actor, "users.manage");
  if (!isSuperAdmin(actor)) {
    for (const tenantId of tenantIds) requireTenantAccess(actor, tenantId);
  }
  const temporary = randomToken(18);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await hashPassword(temporary),
      mustChangePassword: true,
      hasAllTenants: allTenants,
      roles: { create: { role: { connect: { key: roleKey } } } },
      tenants: { create: tenantIds.map((tenantId) => ({ tenantId })) },
    },
  });
  await audit({ actorId: actor.id, action: "user.create", result: "SUCCESS", ipAddress: await ip(), metadata: { email, roleKey } });
  redirect(`/admin/users/${user.id}?temporary=${encodeURIComponent(temporary)}`);
}

export async function resetUserPasswordAction(form: FormData) {
  const actor = requireSuperAdmin(await getCurrentUser());
  const userId = String(form.get("userId") ?? "");
  const temporary = randomToken(18);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(temporary), mustChangePassword: true } });
  await revokeUserSessions(userId);
  await audit({ actorId: actor.id, action: "user.password_reset", result: "SUCCESS", ipAddress: await ip(), metadata: { userId } });
  redirect(`/admin/users/${userId}?temporary=${encodeURIComponent(temporary)}`);
}

export async function deleteUserAction(form: FormData) {
  const actor = requireSuperAdmin(await getCurrentUser());
  const userId = String(form.get("userId") ?? "");
  if (userId === actor.id) redirect("/admin/users?error=You%20cannot%20delete%20yourself");
  await prisma.user.delete({ where: { id: userId } });
  await audit({ actorId: actor.id, action: "user.delete", result: "SUCCESS", ipAddress: await ip(), metadata: { userId } });
  redirect("/admin/users");
}

export async function createAccessPointAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "unifi.manage", tenantId);
  const mac = normalizeMac(String(form.get("mac") ?? ""));
  if (!mac) redirect("/admin/unifi?error=Enter%20a%20valid%20AP%20MAC");
  const siteId = String(form.get("siteId") ?? "");
  const site = await prisma.unifiSite.findFirst({ where: { id: siteId, tenantId } });
  if (!site) redirect("/admin/unifi?error=Site%20not%20found");
  await prisma.unifiAccessPoint.create({ data: { tenantId, siteId, mac, name: String(form.get("name") ?? mac) } });
  await audit({ actorId: user.id, tenantId, action: "unifi.ap.create", result: "SUCCESS", ipAddress: await ip(), metadata: { mac } });
  redirect("/admin/unifi?saved=1");
}

export async function createControllerAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "unifi.manage", tenantId);
  const password = String(form.get("password") ?? "");
  await prisma.unifiController.create({
    data: {
      tenantId,
      name: String(form.get("name") ?? "Controller"),
      mode: form.get("mode") === "REAL" ? "REAL" : "MOCK",
      apiStyle: form.get("apiStyle") === "CLASSIC" ? "CLASSIC" : "UNIFI_OS",
      baseUrl: String(form.get("baseUrl") ?? ""),
      username: String(form.get("username") ?? ""),
      passwordEncrypted: password ? encryptSecret(password) : "",
      verifyTls: form.get("verifyTls") === "on",
    },
  });
  await audit({ actorId: user.id, tenantId, action: "unifi.controller.create", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/unifi?saved=1");
}

export async function createSiteAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "unifi.manage", tenantId);
  const controllerId = String(form.get("controllerId") ?? "");
  const controller = await prisma.unifiController.findFirst({ where: { id: controllerId, tenantId } });
  if (!controller) redirect("/admin/unifi?error=Controller%20not%20found");
  await prisma.unifiSite.create({
    data: { tenantId, controllerId, name: String(form.get("name") ?? "Site"), externalId: String(form.get("externalId") ?? "default") },
  });
  await audit({ actorId: user.id, tenantId, action: "unifi.site.create", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/unifi?saved=1");
}

export async function createSsidAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "unifi.manage", tenantId);
  const siteId = String(form.get("siteId") ?? "");
  const site = await prisma.unifiSite.findFirst({ where: { id: siteId, tenantId } });
  if (!site) redirect("/admin/unifi?error=Site%20not%20found");
  const ssid = await prisma.unifiSsid.create({ data: { tenantId, siteId, name: String(form.get("name") ?? "").trim() } });
  const apId = String(form.get("accessPointId") ?? "");
  if (apId) await prisma.apSsid.create({ data: { accessPointId: apId, ssidId: ssid.id } });
  await audit({ actorId: user.id, tenantId, action: "unifi.ssid.create", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/unifi?saved=1");
}

export async function createVoucherAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const user = requirePermission(await getCurrentUser(), "vouchers.manage", tenantId);
  const code = (String(form.get("code") ?? "") || randomToken(6)).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  await prisma.voucher.create({
    data: {
      tenantId,
      code,
      maxUses: Number(form.get("maxUses") ?? 1),
      sessionDurationMinutes: Number(form.get("minutes") ?? 480),
      expiresAt: form.get("expiresAt") ? new Date(String(form.get("expiresAt"))) : null,
      note: String(form.get("note") ?? ""),
    },
  });
  await audit({ actorId: user.id, tenantId, action: "voucher.create", result: "SUCCESS", ipAddress: await ip() });
  redirect(`/admin/vouchers?tenantId=${tenantId}&saved=1`);
}

export async function revokeSessionAction(form: FormData) {
  const sessionId = String(form.get("sessionId") ?? "");
  const session = await prisma.guestSession.findUnique({ where: { id: sessionId }, include: { site: { include: { controller: true } } } });
  if (!session) redirect("/admin/sessions");
  const user = requirePermission(await getCurrentUser(), "sessions.manage", session.tenantId);
  await prisma.guestSession.update({ where: { id: sessionId }, data: { status: "REVOKED" } });
  if (session.site) {
    const provider = createUniFiProvider({
      mode: session.site.controller.mode,
      connection: {
        id: session.site.controller.id,
        baseUrl: session.site.controller.baseUrl,
        username: session.site.controller.username,
        password: session.site.controller.passwordEncrypted ? decryptSecret(session.site.controller.passwordEncrypted) : "",
        apiStyle: session.site.controller.apiStyle,
        verifyTls: session.site.controller.verifyTls,
        siteExternalId: session.site.externalId,
      },
    });
    await provider.unauthorizeGuest(session.site.externalId, session.clientMac).catch(() => undefined);
  }
  await audit({ actorId: user.id, tenantId: session.tenantId, action: "guest.session.revoke", result: "SUCCESS", ipAddress: await ip(), metadata: { sessionId } });
  redirect("/admin/sessions");
}

export async function saveSmtpAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "") || null;
  const actor = await getCurrentUser();
  if (!actor) redirect("/admin/login");
  if (tenantId) requireTenantAdmin(actor, tenantId);
  else requireSuperAdmin(actor);
  const password = String(form.get("password") ?? "");
  const data = {
    host: String(form.get("host") ?? ""),
    port: Number(form.get("port") ?? 587),
    username: String(form.get("username") ?? ""),
    encryption: (String(form.get("encryption") ?? "STARTTLS") as "STARTTLS"),
    fromEmail: String(form.get("fromEmail") ?? ""),
    fromName: String(form.get("fromName") ?? ""),
    ...(password ? { passwordEncrypted: encryptSecret(password) } : {}),
  };
  const existingSmtp = await prisma.smtpConfiguration.findFirst({ where: { tenantId } });
  if (existingSmtp) await prisma.smtpConfiguration.update({ where: { id: existingSmtp.id }, data });
  else await prisma.smtpConfiguration.create({ data: { tenantId, ...data, passwordEncrypted: data.passwordEncrypted ?? "" } });
  await audit({ actorId: actor.id, tenantId, action: "smtp.update", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/settings/smtp?saved=1");
}

export async function saveMessagingAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "") || null;
  const actor = await getCurrentUser();
  if (!actor) redirect("/admin/login");
  if (tenantId) requireTenantAdmin(actor, tenantId);
  else requireSuperAdmin(actor);
  const apiKey = String(form.get("apiKey") ?? "");
  const apiSecret = String(form.get("apiSecret") ?? "");
  const data = {
    apiUrl: String(form.get("apiUrl") ?? ""),
    senderId: String(form.get("senderId") ?? ""),
    ...(apiKey ? { apiKeyEncrypted: encryptSecret(apiKey) } : {}),
    ...(apiSecret ? { apiSecretEncrypted: encryptSecret(apiSecret) } : {}),
  };
  const existingMessage = await prisma.messageApiConfiguration.findFirst({ where: { tenantId } });
  if (existingMessage) await prisma.messageApiConfiguration.update({ where: { id: existingMessage.id }, data });
  else {
    await prisma.messageApiConfiguration.create({
      data: { tenantId, apiUrl: data.apiUrl, senderId: data.senderId, apiKeyEncrypted: data.apiKeyEncrypted ?? "", apiSecretEncrypted: data.apiSecretEncrypted ?? "" },
    });
  }
  await audit({ actorId: actor.id, tenantId, action: "messaging.update", result: "SUCCESS", ipAddress: await ip() });
  redirect("/admin/settings/messaging?saved=1");
}

export async function sendEmailCampaignAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const actor = requirePermission(await getCurrentUser(), "campaigns.manage", tenantId);
  const guests = await prisma.guestClient.findMany({
    where: { tenantId, marketingConsentAt: { not: null }, emailUnsubscribedAt: null, email: { not: "" } },
  });
  const campaign = await prisma.emailCampaign.create({
    data: {
      tenantId,
      name: String(form.get("name") ?? "Campaign"),
      subject: String(form.get("subject") ?? ""),
      bodyText: String(form.get("body") ?? ""),
      createdBy: actor.id,
      status: "SENDING",
      recipients: { create: guests.map((guest) => ({ guestClientId: guest.id, email: guest.email })) },
    },
    include: { recipients: true },
  });
  const smtp = await smtpForTenant(tenantId);
  const service = new EmailService(smtp);
  let failed = 0;
  for (const recipient of campaign.recipients) {
    const token = randomToken(24);
    const link = `${getEnv().APP_PUBLIC_URL}/guest/unsubscribe?token=${token}&channel=email`;
    try {
      await service.send({
        to: recipient.email,
        subject: campaign.subject,
        text: `${campaign.bodyText}\n\nUnsubscribe: ${link}`,
      });
      await prisma.guestClient.update({ where: { id: recipient.guestClientId ?? "" }, data: {} }).catch(() => undefined);
      await prisma.systemSetting.upsert({
        where: { key: `unsub:${sha256(token)}` },
        create: { key: `unsub:${sha256(token)}`, value: { guestClientId: recipient.guestClientId, channel: "email" } },
        update: { value: { guestClientId: recipient.guestClientId, channel: "email" } },
      });
      await prisma.emailRecipient.update({ where: { id: recipient.id }, data: { status: "SENT" } });
    } catch (error) {
      failed += 1;
      await prisma.emailRecipient.update({ where: { id: recipient.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "failed" } });
    }
  }
  await prisma.emailCampaign.update({ where: { id: campaign.id }, data: { status: failed ? "FAILED" : "SENT", sentAt: new Date() } });
  await audit({ actorId: actor.id, tenantId, action: "campaign.email.send", result: failed ? "FAILURE" : "SUCCESS", ipAddress: await ip(), metadata: { campaignId: campaign.id, failed } });
  redirect(`/admin/campaigns/email?tenantId=${tenantId}&saved=1`);
}

export async function sendSmsCampaignAction(form: FormData) {
  const tenantId = String(form.get("tenantId") ?? "");
  const actor = requirePermission(await getCurrentUser(), "campaigns.manage", tenantId);
  const guests = await prisma.guestClient.findMany({
    where: { tenantId, marketingConsentAt: { not: null }, smsUnsubscribedAt: null, phone: { not: "" } },
  });
  const campaign = await prisma.smsCampaign.create({
    data: {
      tenantId,
      name: String(form.get("name") ?? "SMS"),
      bodyText: String(form.get("body") ?? ""),
      createdBy: actor.id,
      status: "SENDING",
      recipients: { create: guests.map((guest) => ({ guestClientId: guest.id, phone: guest.phone })) },
    },
    include: { recipients: true },
  });
  const messaging = await messageForTenant(tenantId);
  const service = new MessageService(messaging);
  let failed = 0;
  for (const recipient of campaign.recipients) {
    try {
      await service.send({ to: recipient.phone, body: campaign.bodyText, purpose: "MARKETING" });
      await prisma.smsRecipient.update({ where: { id: recipient.id }, data: { status: "SENT" } });
    } catch (error) {
      failed += 1;
      await prisma.smsRecipient.update({ where: { id: recipient.id }, data: { status: "FAILED", error: error instanceof Error ? error.message : "failed" } });
    }
  }
  await prisma.smsCampaign.update({ where: { id: campaign.id }, data: { status: failed ? "FAILED" : "SENT", sentAt: new Date() } });
  await audit({ actorId: actor.id, tenantId, action: "campaign.sms.send", result: failed ? "FAILURE" : "SUCCESS", ipAddress: await ip() });
  redirect(`/admin/campaigns/sms?tenantId=${tenantId}&saved=1`);
}

export async function createRoleAction(form: FormData) {
  const actor = requireSuperAdmin(await getCurrentUser());
  const key = String(form.get("key") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  const permissionIds = form.getAll("permissionId").map(String);
  await prisma.role.create({
    data: {
      key,
      name: String(form.get("name") ?? key),
      description: String(form.get("description") ?? ""),
      permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
    },
  });
  await audit({ actorId: actor.id, action: "role.create", result: "SUCCESS", ipAddress: await ip(), metadata: { key } });
  redirect("/admin/roles");
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function platformSmtp() {
  const row = await prisma.smtpConfiguration.findFirst({ where: { tenantId: null } });
  const env = getEnv();
  if (!row && !env.SMTP_HOST) return null;
  return {
    host: row?.host || env.SMTP_HOST,
    port: row?.port || env.SMTP_PORT,
    username: row?.username || env.SMTP_USERNAME,
    password: row?.passwordEncrypted ? decryptSecret(row.passwordEncrypted) : env.SMTP_PASSWORD,
    encryption: row?.encryption || env.SMTP_ENCRYPTION,
    fromEmail: row?.fromEmail || env.SMTP_FROM_EMAIL,
    fromName: row?.fromName || env.SMTP_FROM_NAME,
  };
}

async function smtpForTenant(tenantId: string) {
  const row = (await prisma.smtpConfiguration.findFirst({ where: { tenantId } })) ?? (await prisma.smtpConfiguration.findFirst({ where: { tenantId: null } }));
  if (!row) return platformSmtp();
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    password: row.passwordEncrypted ? decryptSecret(row.passwordEncrypted) : "",
    encryption: row.encryption,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
  };
}

async function messageForTenant(tenantId: string) {
  const row = (await prisma.messageApiConfiguration.findFirst({ where: { tenantId } })) ?? (await prisma.messageApiConfiguration.findFirst({ where: { tenantId: null } }));
  const env = getEnv();
  if (!row && !env.MESSAGE_API_URL) return null;
  return {
    apiUrl: row?.apiUrl || env.MESSAGE_API_URL,
    apiKey: row?.apiKeyEncrypted ? decryptSecret(row.apiKeyEncrypted) : env.MESSAGE_API_KEY,
    apiSecret: row?.apiSecretEncrypted ? decryptSecret(row.apiSecretEncrypted) : env.MESSAGE_API_SECRET,
    senderId: row?.senderId || env.MESSAGE_SENDER_ID,
  };
}
