const BLOCKED = /^(javascript|data|file|blob|vbscript|filesystem):/i;

export type RedirectCheck =
  | { ok: true; url: string }
  | { ok: false; reason: string };

export function checkRedirectUrl(input: string): RedirectCheck {
  const value = input.trim();
  if (!value) return { ok: false, reason: "Redirect URL is empty" };
  if (value.length > 2000) return { ok: false, reason: "Redirect URL is too long" };
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return { ok: false, reason: "Redirect URL contains illegal characters" };
  if (value.startsWith("//") || value.startsWith("\\")) return { ok: false, reason: "Protocol-relative URLs are not allowed" };
  if (BLOCKED.test(value)) return { ok: false, reason: "This URL scheme is not allowed" };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, reason: "Redirect URL is not valid" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https redirects are allowed" };
  }
  if (url.username || url.password) return { ok: false, reason: "Redirect URLs cannot contain credentials" };
  if (!url.hostname || url.hostname.includes(" ")) return { ok: false, reason: "Redirect host is not valid" };
  return { ok: true, url: url.toString() };
}

export function assertSafeRedirect(input: string): string {
  const result = checkRedirectUrl(input);
  if (!result.ok) throw new Error(result.reason);
  return result.url;
}
