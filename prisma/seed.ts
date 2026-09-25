import { PrismaClient, type AuthMethod } from "@prisma/client";
import { hashPassword } from "../src/server/authentication/password";
import { PERMISSIONS, ROLE_SEEDS } from "../src/server/authentication/guards";
import { encryptSecret } from "../src/server/shared/crypto";

const prisma = new PrismaClient();

const PLACEHOLDER = "change-me-before-first-boot";

async function main() {
  const permissionIds = new Map<string, string>();
  for (const [key, description] of PERMISSIONS) {
    const row = await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
    permissionIds.set(key, row.id);
  }
  for (const [key, role] of Object.entries(ROLE_SEEDS)) {
    const saved = await prisma.role.upsert({
      where: { key },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { key, name: role.name, description: role.description, isSystem: true },
    });
    for (const permission of role.permissions) {
      const permissionId = permissionIds.get(permission);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: saved.id, permissionId } },
        update: {},
        create: { roleId: saved.id, permissionId },
      });
    }
  }

  await ensureTenant({
    slug: "wirelesscom",
    name: "WirelessCom.Ca Inc.",
    kind: "PLATFORM_OWNER",
    redirectUrl: "https://wirelesscom.ca",
    companyName: "WirelessCom.Ca Inc.",
    welcomeTitle: "Welcome online",
    welcomeMessage: "Connect to WirelessCom guest Wi-Fi.",
    description: "A fast connection for guests and staff.",
    buttonText: "Connect",
    primaryColor: "#0B1F33",
    accentColor: "#C4A35A",
    backgroundColor: "#0B1F33",
    buttonColor: "#0B1F33",
    terms: "WirelessCom.Ca Inc. provides this network for lawful guest use. Do not attempt to disrupt the service or access other customers.",
    privacy: "WirelessCom.Ca Inc. stores the contact details you choose to submit, the time you accepted these terms, and the device address required to enable Wi-Fi.",
    support: "Need help? Ask a WirelessCom representative.",
    footer: "WirelessCom.Ca Inc.",
    logo: "/branding/wirelesscom.svg",
    apMac: "d0:21:f9:bc:38:01",
    apName: "WirelessCom front desk",
    ssid: "WirelessCom Guest",
    siteName: "WirelessCom HQ",
  });
  await ensureTenant({
    slug: "pinos",
    name: "Pinos",
    kind: "CUSTOMER",
    redirectUrl: "https://pinos.ca",
    companyName: "Pinos",
    welcomeTitle: "Welcome to Pinos",
    welcomeMessage: "Free Wi-Fi for our guests.",
    description: "Stay as long as your visit lasts.",
    buttonText: "Join Pinos Wi-Fi",
    primaryColor: "#1F4D3A",
    accentColor: "#2F6D4F",
    backgroundColor: "#143528",
    buttonColor: "#1F4D3A",
    terms: "Pinos guest Wi-Fi is for customers on the premises. You are responsible for activity from your device.",
    privacy: "Pinos stores your connection details and any contact information you submit for this visit only.",
    support: "Ask any Pinos team member if you need help connecting.",
    footer: "Pinos",
    logo: "/branding/pinos.svg",
    apMac: "d0:21:f9:bc:38:d4",
    apName: "Pinos dining room",
    ssid: "Pinos-Guest",
    siteName: "Pinos",
  });
  await ensureTenant({
    slug: "trinity",
    name: "Trinity",
    kind: "CUSTOMER",
    redirectUrl: "https://trinity.ca",
    companyName: "Trinity",
    welcomeTitle: "Welcome to Trinity",
    welcomeMessage: "You are joining the Trinity guest network.",
    description: "Please review the terms before you continue.",
    buttonText: "Continue",
    primaryColor: "#5C1A2E",
    accentColor: "#8C3A52",
    backgroundColor: "#3A1020",
    buttonColor: "#5C1A2E",
    terms: "Trinity guest access is provided during your visit. Commercial redistribution of the connection is not permitted.",
    privacy: "Trinity records consent timestamps and the device address used to authorize Wi-Fi. Marketing messages are sent only if you opt in.",
    support: "Contact the Trinity host if the page does not load.",
    footer: "Trinity",
    logo: "/branding/trinity.svg",
    apMac: "aa:bb:cc:dd:ee:ff",
    apName: "Trinity lobby",
    ssid: "Trinity-Guest",
    siteName: "Trinity",
  });

  await ensureAdmin();
}

async function syncDemoAccessPoint(tenantId: string, input: { apMac: string; apName: string; ssid: string; siteName: string; name: string }) {
  let site = await prisma.unifiSite.findFirst({ where: { tenantId } });
  if (!site) {
    const controller = await prisma.unifiController.create({ data: { tenantId, name: `${input.name} controller`, mode: "MOCK" } });
    site = await prisma.unifiSite.create({ data: { tenantId, controllerId: controller.id, name: input.siteName, externalId: "default" } });
  }
  const ssid = await prisma.unifiSsid.upsert({
    where: { siteId_name: { siteId: site.id, name: input.ssid } },
    update: { enabled: true },
    create: { tenantId, siteId: site.id, name: input.ssid },
  });
  const existingAp = await prisma.unifiAccessPoint.findUnique({ where: { mac: input.apMac } });
  const ap = existingAp
    ? await prisma.unifiAccessPoint.update({ where: { id: existingAp.id }, data: { tenantId, siteId: site.id, name: input.apName, enabled: true } })
    : await prisma.unifiAccessPoint.create({ data: { tenantId, siteId: site.id, mac: input.apMac, name: input.apName } });
  await prisma.apSsid.upsert({
    where: { accessPointId_ssidId: { accessPointId: ap.id, ssidId: ssid.id } },
    update: {},
    create: { accessPointId: ap.id, ssidId: ssid.id },
  });
}

async function ensureTenant(input: {
  slug: string;
  name: string;
  kind: "PLATFORM_OWNER" | "CUSTOMER";
  redirectUrl: string;
  companyName: string;
  welcomeTitle: string;
  welcomeMessage: string;
  description: string;
  buttonText: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  buttonColor: string;
  terms: string;
  privacy: string;
  support: string;
  footer: string;
  logo: string;
  apMac: string;
  apName: string;
  ssid: string;
  siteName: string;
}) {
  const existing = await prisma.tenant.findUnique({ where: { slug: input.slug } });
  if (existing) {
    await prisma.portalConfiguration.updateMany({
      where: { tenantId: existing.id },
      data: { emailField: "OPTIONAL" },
    });
    await prisma.authenticationMethod.updateMany({
      where: { tenantId: existing.id, method: "EMAIL" },
      data: { enabled: false },
    });
    await prisma.authenticationMethod.updateMany({
      where: { tenantId: existing.id, method: "ACCEPT_TERMS" },
      data: { enabled: true },
    });
    await applyUnifiEnv(existing.id);
    await syncDemoAccessPoint(existing.id, input);
    return;
  }
  const tenant = await prisma.tenant.create({ data: { slug: input.slug, name: input.name, kind: input.kind } });
  await prisma.portalConfiguration.create({
    data: {
      tenantId: tenant.id,
      companyName: input.companyName,
      logoPath: input.logo,
      welcomeTitle: input.welcomeTitle,
      welcomeMessage: input.welcomeMessage,
      description: input.description,
      buttonText: input.buttonText,
      footerText: input.footer,
      termsText: input.terms,
      privacyText: input.privacy,
      supportText: input.support,
      redirectUrl: input.redirectUrl,
      emailField: "OPTIONAL",
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      backgroundColor: input.backgroundColor,
      buttonColor: input.buttonColor,
      textColor: "#102033",
      buttonTextColor: "#FFFFFF",
      cardColor: "#FFFFFF",
    },
  });
  const methods: AuthMethod[] = ["ACCEPT_TERMS", "EMAIL", "VOUCHER", "PASSWORD"];
  for (const [index, method] of methods.entries()) {
    await prisma.authenticationMethod.create({
      data: { tenantId: tenant.id, method, enabled: method === "ACCEPT_TERMS", sortOrder: index },
    });
  }
  const controller = await prisma.unifiController.create({
    data: { tenantId: tenant.id, name: `${input.name} controller`, mode: "MOCK" },
  });
  const site = await prisma.unifiSite.create({
    data: { tenantId: tenant.id, controllerId: controller.id, name: input.siteName, externalId: "default" },
  });
  const ssid = await prisma.unifiSsid.create({ data: { tenantId: tenant.id, siteId: site.id, name: input.ssid } });
  const ap = await prisma.unifiAccessPoint.create({
    data: { tenantId: tenant.id, siteId: site.id, name: input.apName, mac: input.apMac },
  });
  await prisma.apSsid.create({ data: { accessPointId: ap.id, ssidId: ssid.id } });
  await applyUnifiEnv(tenant.id);
}

async function applyUnifiEnv(tenantId: string) {
  const url = (process.env.UNIFI_API_URL || "").trim();
  const username = (process.env.UNIFI_API_USERNAME || "").trim();
  const password = process.env.UNIFI_API_PASSWORD || "";
  if (!url || !username || !password) return;
  const style = process.env.UNIFI_API_STYLE === "CLASSIC" ? "CLASSIC" : "UNIFI_OS";
  await prisma.unifiController.updateMany({
    where: { tenantId },
    data: {
      mode: "REAL",
      apiStyle: style,
      baseUrl: url,
      username,
      passwordEncrypted: encryptSecret(password),
      verifyTls: process.env.UNIFI_VERIFY_TLS === "true",
    },
  });
}

async function ensureAdmin() {
  const email = (process.env.INITIAL_ADMIN_EMAIL || "abu@wirelesscom.ca").toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;
  const password = process.env.INITIAL_ADMIN_PASSWORD || "";
  if (password.length < 12 || password === PLACEHOLDER) {
    throw new Error("Set INITIAL_ADMIN_PASSWORD to a unique password of at least 12 characters before seeding");
  }
  const role = await prisma.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  await prisma.user.create({
    data: {
      email,
      name: "Platform Admin",
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      hasAllTenants: true,
      roles: { create: { roleId: role.id } },
    },
  });
  if (process.env.SMTP_HOST && process.env.SMTP_FROM_EMAIL) {
    await prisma.smtpConfiguration.create({
      data: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        username: process.env.SMTP_USERNAME || "",
        passwordEncrypted: process.env.SMTP_PASSWORD ? encryptSecret(process.env.SMTP_PASSWORD) : "",
        encryption: (process.env.SMTP_ENCRYPTION as "STARTTLS") || "STARTTLS",
        fromEmail: process.env.SMTP_FROM_EMAIL,
        fromName: process.env.SMTP_FROM_NAME || "WirelessCom Captive Portal",
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Seed failed");
    await prisma.$disconnect();
    process.exit(1);
  });
