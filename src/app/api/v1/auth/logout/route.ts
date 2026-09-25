import { destroyAdminSession } from "@/server/authentication/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroyAdminSession();
  return NextResponse.redirect(new URL("/admin/login", process.env.APP_PUBLIC_URL || "http://127.0.0.1:3000"));
}
