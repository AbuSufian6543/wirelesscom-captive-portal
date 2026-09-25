import type { NextRequest } from "next/server";

export function clientIp(request: Request): string {
  if (process.env.APP_TRUST_PROXY !== "false") {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 64);
  }
  return "0.0.0.0";
}

export function requestProto(request: Request): string {
  if (process.env.APP_TRUST_PROXY !== "false") {
    const proto = request.headers.get("x-forwarded-proto");
    if (proto) return proto.split(",")[0]!.trim();
  }
  return "http";
}

export function wantsHtml(request: NextRequest): boolean {
  return (request.headers.get("accept") ?? "").includes("text/html");
}
