export type AuthorizeOptions = {
  minutes: number;
  uploadKbps?: number | null;
  downloadKbps?: number | null;
  dataLimitMb?: number | null;
};

export type UniFiSiteInfo = { id: string; name: string; externalId: string };
export type UniFiDevice = { mac: string; name: string; model: string };
export type UniFiClient = { mac: string; hostname: string; ip: string; ssid: string; authorized: boolean };

export type UniFiConnection = {
  id: string;
  baseUrl: string;
  username: string;
  password: string;
  apiStyle: "UNIFI_OS" | "CLASSIC";
  verifyTls: boolean;
  siteExternalId: string;
};

export interface UniFiProvider {
  testConnection(): Promise<{ ok: true } | { ok: false; error: string }>;
  listSites(): Promise<UniFiSiteInfo[]>;
  listAccessPoints(siteExternalId: string): Promise<UniFiDevice[]>;
  listClients(siteExternalId: string): Promise<UniFiClient[]>;
  findClientByMac(siteExternalId: string, mac: string): Promise<UniFiClient | null>;
  authorizeGuest(siteExternalId: string, mac: string, options: AuthorizeOptions): Promise<void>;
  unauthorizeGuest(siteExternalId: string, mac: string): Promise<void>;
}

export type RecordedAuthorization = { siteExternalId: string; mac: string; options: AuthorizeOptions; at: Date };
