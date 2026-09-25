import { destroyAdminSession } from "@/server/authentication/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await destroyAdminSession();
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  return NextResponse.redirect(new URL("/admin/login", `${proto}://${host}`));
}
