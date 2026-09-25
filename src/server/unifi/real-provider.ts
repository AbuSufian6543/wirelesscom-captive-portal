import { Agent, fetch as undiciFetch } from "undici";
import { logError } from "@/server/shared/log";
import type { AuthorizeOptions, UniFiClient, UniFiConnection, UniFiDevice, UniFiProvider, UniFiSiteInfo } from "./types";

type Jar = { cookie: string; csrf: string };

export class RealUniFiProvider implements UniFiProvider {
  private jar: Jar | null = null;

  constructor(private readonly connection: UniFiConnection) {}

  async testConnection() {
    try {
      await this.login();
      return { ok: true as const };
    } catch (error) {
      logError("unifi.connection_failed", { controllerId: this.connection.id, error: error instanceof Error ? error.message : "failed" });
      return { ok: false as const, error: "Could not sign in to the UniFi controller" };
    }
  }

  async listSites() {
    const data = await this.getJson<Array<{ _id?: string; name?: string; desc?: string }>>(this.apiPath("/self/sites"));
    return data.map((site) => ({
      id: site._id ?? site.name ?? "default",
      name: site.desc || site.name || "Site",
      externalId: site.name || "default",
    }));
  }

  async listAccessPoints(siteExternalId: string) {
    const data = await this.getJson<Array<{ mac?: string; name?: string; model?: string; type?: string }>>(
      this.apiPath(`/s/${siteExternalId}/stat/device`),
    );
    return data
      .filter((device) => device.mac && (device.type === "uap" || !device.type))
      .map((device) => ({ mac: device.mac!.toLowerCase(), name: device.name || device.mac!, model: device.model || "" }));
  }

  async listClients(siteExternalId: string) {
    return this.clients(siteExternalId);
  }

  async findClientByMac(siteExternalId: string, mac: string) {
    const wanted = mac.toLowerCase();
    return (await this.clients(siteExternalId)).find((client) => client.mac === wanted) ?? null;
  }

  async authorizeGuest(siteExternalId: string, mac: string, options: AuthorizeOptions) {
    const body: Record<string, unknown> = { cmd: "authorize-guest", mac: mac.toLowerCase(), minutes: options.minutes };
    if (options.uploadKbps) body.up = options.uploadKbps;
    if (options.downloadKbps) body.down = options.downloadKbps;
    if (options.dataLimitMb) body.bytes = options.dataLimitMb * 1024 * 1024;
    await this.postJson(this.apiPath(`/s/${siteExternalId}/cmd/stamgr`), body);
  }

  async unauthorizeGuest(siteExternalId: string, mac: string) {
    await this.postJson(this.apiPath(`/s/${siteExternalId}/cmd/stamgr`), {
      cmd: "unauthorize-guest",
      mac: mac.toLowerCase(),
    });
  }

  private async clients(siteExternalId: string): Promise<UniFiClient[]> {
    const data = await this.getJson<Array<Record<string, unknown>>>(this.apiPath(`/s/${siteExternalId}/stat/sta`));
    return data
      .filter((row) => typeof row.mac === "string")
      .map((row) => ({
        mac: String(row.mac).toLowerCase(),
        hostname: String(row.hostname ?? row.name ?? ""),
        ip: String(row.ip ?? ""),
        ssid: String(row.essid ?? ""),
        authorized: Boolean(row.authorized),
      }));
  }

  private apiPath(path: string): string {
    const base = this.connection.baseUrl.replace(/\/$/, "");
    if (this.connection.apiStyle === "UNIFI_OS") return `${base}/proxy/network/api${path}`;
    return `${base}/api${path}`;
  }

  private async login(): Promise<Jar> {
    if (this.jar) return this.jar;
    const base = this.connection.baseUrl.replace(/\/$/, "");
    const loginPath = this.connection.apiStyle === "UNIFI_OS" ? "/api/auth/login" : "/api/login";
    const response = await this.fetch(`${base}${loginPath}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: this.connection.username, password: this.connection.password }),
    });
    if (!response.ok) throw new Error("UniFi login failed");
    const setCookie = response.headers.getSetCookie?.() ?? [];
    const cookie = setCookie.map((part) => part.split(";")[0]).join("; ");
    const csrf = cookie.match(/csrf_token=([^;]+)/i)?.[1] ?? response.headers.get("x-csrf-token") ?? "";
    this.jar = { cookie, csrf };
    return this.jar;
  }

  private async getJson<T>(url: string): Promise<T> {
    const payload = await this.postOrGet(url, "GET");
    return (payload.data ?? payload) as T;
  }

  private async postJson(url: string, body: unknown): Promise<void> {
    await this.postOrGet(url, "POST", body);
  }

  private async postOrGet(url: string, method: "GET" | "POST", body?: unknown): Promise<{ data?: unknown }> {
    const jar = await this.login();
    const headers: Record<string, string> = { cookie: jar.cookie, accept: "application/json" };
    if (jar.csrf) headers["x-csrf-token"] = jar.csrf;
    if (body) headers["content-type"] = "application/json";
    const response = await this.fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error("UniFi API request failed");
    return (await response.json()) as { data?: unknown };
  }

  private fetch(url: string, init: { method: string; headers: Record<string, string>; body?: string }) {
    const dispatcher = new Agent({ connect: { rejectUnauthorized: this.connection.verifyTls } });
    return undiciFetch(url, { ...init, dispatcher, signal: AbortSignal.timeout(10000) });
  }
}

export function listDevicesSafe(devices: UniFiDevice[]): UniFiDevice[] {
  return devices;
}
