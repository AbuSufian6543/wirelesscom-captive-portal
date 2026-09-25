import { MockUniFiProvider } from "./mock-provider";
import { RealUniFiProvider } from "./real-provider";
import type { AuthorizeOptions, UniFiClient, UniFiConnection, UniFiDevice, UniFiProvider, UniFiSiteInfo } from "./types";

export function createUniFiProvider(input: {
  mode: "MOCK" | "REAL";
  connection: UniFiConnection;
}): UniFiProvider {
  const connection = withEnvFallback(input.connection);
  if (connection.baseUrl && connection.username && connection.password) {
    return new RealUniFiProvider(connection);
  }
  if (input.mode === "REAL") return new RealUniFiProvider(connection);
  if (process.env.APP_ENV === "production") return new UnconfiguredUniFiProvider();
  return new MockUniFiProvider([{ id: "site", name: "Site", externalId: connection.siteExternalId }]);
}

function withEnvFallback(connection: UniFiConnection): UniFiConnection {
  const url = process.env.UNIFI_API_URL ?? "";
  const username = process.env.UNIFI_API_USERNAME ?? "";
  const password = process.env.UNIFI_API_PASSWORD ?? "";
  const style = process.env.UNIFI_API_STYLE === "CLASSIC" ? "CLASSIC" : connection.apiStyle;
  if (connection.baseUrl && connection.username && connection.password) return connection;
  if (url && username && password) {
    return {
      ...connection,
      baseUrl: url,
      username,
      password,
      apiStyle: style,
      verifyTls: process.env.UNIFI_VERIFY_TLS === "true",
    };
  }
  return connection;
}

class UnconfiguredUniFiProvider implements UniFiProvider {
  async testConnection() {
    return { ok: false as const, error: "UniFi controller is not configured" };
  }
  async listSites(): Promise<UniFiSiteInfo[]> {
    return [];
  }
  async listAccessPoints(): Promise<UniFiDevice[]> {
    return [];
  }
  async listClients(): Promise<UniFiClient[]> {
    return [];
  }
  async findClientByMac(): Promise<UniFiClient | null> {
    return null;
  }
  async authorizeGuest(_site: string, _mac: string, _options: AuthorizeOptions): Promise<void> {
    throw new Error("UniFi controller is not configured");
  }
  async unauthorizeGuest(): Promise<void> {
    throw new Error("UniFi controller is not configured");
  }
}
