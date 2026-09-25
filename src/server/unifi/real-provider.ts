import { Agent, fetch as undiciFetch } from "undici";
import { logError } from "@/server/shared/log";
import type { AuthorizeOptions, UniFiClient, UniFiConnection, UniFiDevice, UniFiProvider, UniFiSiteInfo } from "./types";

type Jar = { cookie: string; csrf: string; unifiOs: boolean };

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
    if (options.apMac) body.ap_mac = options.apMac.toLowerCase();
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
    const unifiOs = this.jar?.unifiOs ?? this.connection.apiStyle === "UNIFI_OS";
    if (unifiOs) return `${base}/proxy/network/api${path}`;
    return `${base}/api${path}`;
  }

  private async login(): Promise<Jar> {
    if (this.jar) return this.jar;
    const base = this.connection.baseUrl.replace(/\/$/, "");
    const preferred = this.connection.apiStyle === "CLASSIC"
      ? [`${base}/api/login`, `${base}/api/auth/login`]
      : [`${base}/api/auth/login`, `${base}/api/login`];
    let lastError = "UniFi login failed";
    for (const url of preferred) {
      try {
        const response = await this.fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json" },
          body: JSON.stringify({
            username: this.connection.username,
            password: this.connection.password,
            remember: true,
            rememberMe: true,
          }),
        });
        const raw = await response.text();
        if (!response.ok) {
          lastError = `UniFi login failed (${response.status})`;
          continue;
        }
        let parsed: Record<string, unknown> = {};
        try {
          parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          parsed = {};
        }
        const code = String(parsed.code ?? "");
        if (code.startsWith("AUTHENTICATION_FAILED")) {
          lastError = "UniFi login failed (invalid credentials)";
          continue;
        }
        const setCookie = response.headers.getSetCookie?.() ?? [];
        const cookie = setCookie.map((part) => part.split(";")[0]).join("; ");
        if (!cookie) {
          lastError = "UniFi login failed (no session cookie)";
          continue;
        }
        const csrf =
          String(parsed.csrfToken ?? parsed.csrf_token ?? "") ||
          cookie.match(/csrf_token=([^;]+)/i)?.[1] ||
          response.headers.get("x-csrf-token") ||
          "";
        this.jar = { cookie, csrf, unifiOs: url.includes("/api/auth/login") };
        return this.jar;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "UniFi login failed";
      }
    }
    throw new Error(lastError);
  }

  private async getJson<T>(url: string): Promise<T> {
    const payload = await this.postOrGet(url, "GET");
    return (payload.data ?? payload) as T;
  }

  private async postJson(url: string, body: unknown): Promise<void> {
    await this.postOrGet(url, "POST", body);
  }

  private async postOrGet(url: string, method: "GET" | "POST", body?: unknown, retried = false): Promise<{ data?: unknown; meta?: { rc?: string; msg?: string } }> {
    const jar = await this.login();
    const headers: Record<string, string> = { cookie: jar.cookie, accept: "application/json" };
    if (jar.csrf) {
      headers["x-csrf-token"] = jar.csrf;
      headers["X-CSRF-Token"] = jar.csrf;
    }
    if (body) headers["content-type"] = "application/json";
    const response = await this.fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const raw = await response.text();
    if (response.status === 401 && !retried) {
      this.jar = null;
      return this.postOrGet(url, method, body, true);
    }
    if (!response.ok) {
      throw new Error(`UniFi API ${method} failed (${response.status})`);
    }
    let payload: { data?: unknown; meta?: { rc?: string; msg?: string } } = {};
    try {
      payload = raw ? (JSON.parse(raw) as { data?: unknown; meta?: { rc?: string; msg?: string } }) : {};
    } catch {
      payload = {};
    }
    if (payload.meta?.rc && payload.meta.rc !== "ok") {
      throw new Error(payload.meta.msg || "UniFi API request failed");
    }
    return payload;
  }

  private fetch(url: string, init: { method: string; headers: Record<string, string>; body?: string }) {
    const dispatcher = new Agent({ connect: { rejectUnauthorized: this.connection.verifyTls } });
    return undiciFetch(url, { ...init, dispatcher, signal: AbortSignal.timeout(20000) });
  }
}

export function listDevicesSafe(devices: UniFiDevice[]): UniFiDevice[] {
  return devices;
}
