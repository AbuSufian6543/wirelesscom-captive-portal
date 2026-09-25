const SECRET = /password|secret|token|apikey|api_key|authorization|cookie|session/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SECRET.test(key) ? "[redacted]" : redact(item);
  }
  return out;
}

export function logInfo(msg: string, fields: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ level: "info", msg, ...(redact(fields) as Record<string, unknown>), ts: new Date().toISOString() }));
}

export function logError(msg: string, fields: Record<string, unknown> = {}): void {
  console.error(JSON.stringify({ level: "error", msg, ...(redact(fields) as Record<string, unknown>), ts: new Date().toISOString() }));
}
