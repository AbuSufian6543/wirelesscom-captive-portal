import { prisma } from "@/server/database/client";
import { decryptSecret } from "@/server/shared/crypto";
import type { AuthMethodName, PortalView, ResolvedPortal } from "@/server/tenant/resolve";

const portalSelect = {
  companyName: true,
  logoPath: true,
  faviconPath: true,
  backgroundPath: true,
  primaryColor: true,
  accentColor: true,
  backgroundColor: true,
  textColor: true,
  mutedColor: true,
  cardColor: true,
  buttonColor: true,
  buttonTextColor: true,
  welcomeTitle: true,
  welcomeMessage: true,
  description: true,
  buttonText: true,
  footerText: true,
  supportText: true,
  termsText: true,
  termsVersion: true,
  privacyText: true,
  privacyVersion: true,
  sessionDurationMinutes: true,
  redirectUrl: true,
  uploadKbps: true,
  downloadKbps: true,
  dataLimitMb: true,
  nameField: true,
  emailField: true,
  phoneField: true,
  termsField: true,
  privacyField: true,
  marketingField: true,
  customCss: true,
} as const;

export async function findPortalByApMac(mac: string): Promise<ResolvedPortal | null> {
  const ap = await prisma.unifiAccessPoint.findUnique({
    where: { mac },
    include: {
      tenant: true,
      site: { include: { controller: true } },
      ssids: { include: { ssid: true } },
    },
  });
  if (!ap) return null;
  const [portal, methods] = await Promise.all([
    prisma.portalConfiguration.findUnique({ where: { tenantId: ap.tenantId }, select: portalSelect }),
    prisma.authenticationMethod.findMany({ where: { tenantId: ap.tenantId }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!portal) return null;
  let password = "";
  if (ap.site.controller.passwordEncrypted) {
    try {
      password = decryptSecret(ap.site.controller.passwordEncrypted);
    } catch {
      password = "";
    }
  }
  const view: PortalView = {
    ...portal,
    ssid: "",
    methods: methods.filter((method) => method.enabled).map((method) => method.method),
  };
  return {
    tenant: { id: ap.tenant.id, name: ap.tenant.name, slug: ap.tenant.slug, status: ap.tenant.status },
    controller: {
      id: ap.site.controller.id,
      mode: ap.site.controller.mode,
      apiStyle: ap.site.controller.apiStyle,
      baseUrl: ap.site.controller.baseUrl,
      username: ap.site.controller.username,
      password,
      verifyTls: ap.site.controller.verifyTls,
    },
    site: { id: ap.site.id, externalId: ap.site.externalId, name: ap.site.name },
    accessPoint: { id: ap.id, mac: ap.mac, name: ap.name, enabled: ap.enabled },
    ssidName: ap.ssids.find((link) => link.ssid.enabled)?.ssid.name ?? "",
    portal: { ...view, ...portal, methods: view.methods },
    methods: methods.map((method) => ({
      method: method.method,
      enabled: method.enabled,
      sharedSecretHash: method.sharedSecretHash,
      sortOrder: method.sortOrder,
    })),
  };
}

export function viewFor(portal: ResolvedPortal, ssid: string): PortalView {
  const matched = ssid || portal.ssidName;
  return { ...portal.portal, ssid: matched, methods: portal.methods.filter((method) => method.enabled).map((method) => method.method as AuthMethodName) };
}
