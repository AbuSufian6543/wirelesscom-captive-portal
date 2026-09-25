import { cleanText } from "@/server/shared/html";
import { normalizeMac } from "@/server/shared/mac";
import { checkRedirectUrl } from "@/server/shared/redirect";

export type GuestQuery = {
  apMac: string;
  clientMac: string;
  timestamp: number;
  originalUrl: string;
  ssid: string;
};

export type ParseResult = { ok: true; query: GuestQuery } | { ok: false; message: string };

export function parseGuestQuery(params: URLSearchParams): ParseResult {
  const apMac = normalizeMac(params.get("ap"));
  const clientMac = normalizeMac(params.get("id"));
  if (!apMac || !clientMac) {
    return { ok: false, message: "This connection request is not valid. Reconnect to Wi-Fi and try again." };
  }
  if (apMac === clientMac) {
    return { ok: false, message: "This connection request is not valid. Reconnect to Wi-Fi and try again." };
  }
  const rawTime = params.get("t");
  if (!rawTime || !/^\d{10,13}$/.test(rawTime)) {
    return { ok: false, message: "This connection request is incomplete. Reconnect to Wi-Fi and try again." };
  }
  const timestamp = Number(rawTime.length === 13 ? Math.floor(Number(rawTime) / 1000) : rawTime);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, message: "This connection request is incomplete. Reconnect to Wi-Fi and try again." };
  }
  const original = params.get("url") ?? "";
  const checked = original ? checkRedirectUrl(original) : null;
  return {
    ok: true,
    query: {
      apMac,
      clientMac,
      timestamp,
      originalUrl: checked?.ok ? checked.url : "",
      ssid: cleanText(params.get("ssid") ?? "", 64),
    },
  };
}
