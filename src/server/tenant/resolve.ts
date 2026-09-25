export type FieldMode = "HIDDEN" | "OPTIONAL" | "REQUIRED";
export type AuthMethodName = "ACCEPT_TERMS" | "EMAIL" | "VOUCHER" | "PASSWORD";

export type PortalView = {
  companyName: string;
  logoPath: string;
  faviconPath: string;
  backgroundPath: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  mutedColor: string;
  cardColor: string;
  buttonColor: string;
  buttonTextColor: string;
  welcomeTitle: string;
  welcomeMessage: string;
  description: string;
  buttonText: string;
  footerText: string;
  supportText: string;
  termsVersion: string;
  privacyVersion: string;
  ssid: string;
  nameField: FieldMode;
  emailField: FieldMode;
  phoneField: FieldMode;
  termsField: FieldMode;
  privacyField: FieldMode;
  marketingField: FieldMode;
  methods: AuthMethodName[];
  customCss?: string;
};

export type ResolvedPortal = {
  tenant: { id: string; name: string; slug: string; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" };
  controller: {
    id: string;
    mode: "MOCK" | "REAL";
    apiStyle: "UNIFI_OS" | "CLASSIC";
    baseUrl: string;
    username: string;
    password: string;
    verifyTls: boolean;
  };
  site: { id: string; externalId: string; name: string };
  accessPoint: { id: string; mac: string; name: string; enabled: boolean };
  ssidName: string;
  portal: PortalView & { sessionDurationMinutes: number; redirectUrl: string; uploadKbps: number | null; downloadKbps: number | null; dataLimitMb: number | null; termsText: string; privacyText: string };
  methods: { method: AuthMethodName; enabled: boolean; sharedSecretHash: string; sortOrder: number }[];
};

export type Directory = {
  findByApMac(mac: string): Promise<ResolvedPortal | null>;
};

export type Resolution =
  | { ok: true; portal: ResolvedPortal }
  | { ok: false; message: string };

export async function resolveTenantByAp(directory: Directory, apMac: string): Promise<Resolution> {
  const found = await directory.findByApMac(apMac);
  if (!found || !found.accessPoint.enabled) {
    return { ok: false, message: "This Wi-Fi network is not registered." };
  }
  if (found.tenant.status !== "ACTIVE") {
    return { ok: false, message: "This Wi-Fi network is temporarily unavailable." };
  }
  return { ok: true, portal: found };
}
