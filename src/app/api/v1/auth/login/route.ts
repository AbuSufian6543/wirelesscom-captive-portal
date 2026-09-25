import { loginWithPassword } from "@/server/authentication/login";
import { clientIp } from "@/server/shared/http";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await loginWithPassword(String(body.email ?? ""), String(body.password ?? ""), clientIp(request), request.headers.get("user-agent") ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 401 });
  return NextResponse.json({ ok: true, mustChangePassword: result.mustChangePassword });
}
