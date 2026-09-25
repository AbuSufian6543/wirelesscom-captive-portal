import type { AuthorizeOptions, RecordedAuthorization, UniFiClient, UniFiDevice, UniFiProvider, UniFiSiteInfo } from "./types";

export class MockUniFiProvider implements UniFiProvider {
  readonly authorizations: RecordedAuthorization[] = [];
  readonly unauthorized: string[] = [];
  readonly clients = new Map<string, UniFiClient>();

  constructor(
    readonly sites: UniFiSiteInfo[] = [{ id: "default", name: "Default", externalId: "default" }],
    readonly devices: UniFiDevice[] = [],
  ) {}

  async testConnection() {
    return { ok: true as const };
  }

  async listSites() {
    return this.sites;
  }

  async listAccessPoints() {
    return this.devices;
  }

  async listClients() {
    return [...this.clients.values()];
  }

  async findClientByMac(_site: string, mac: string) {
    return this.clients.get(mac.toLowerCase()) ?? null;
  }

  async authorizeGuest(siteExternalId: string, mac: string, options: AuthorizeOptions) {
    const normalized = mac.toLowerCase();
    this.authorizations.push({ siteExternalId, mac: normalized, options, at: new Date() });
    const existing = this.clients.get(normalized);
    this.clients.set(normalized, {
      mac: normalized,
      hostname: existing?.hostname ?? "",
      ip: existing?.ip ?? "",
      ssid: existing?.ssid ?? "",
      authorized: true,
    });
  }

  async unauthorizeGuest(_site: string, mac: string) {
    const normalized = mac.toLowerCase();
    this.unauthorized.push(normalized);
    const existing = this.clients.get(normalized);
    if (existing) existing.authorized = false;
  }
}
