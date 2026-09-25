import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const domain = process.env.PORTAL_DOMAIN ?? "";
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
  if (process.env.PORTAL_FORCE_HTTPS === "true" && domain && host === domain && proto === "http") {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.host = domain;
    return NextResponse.redirect(target, 301);
  }
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const open = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];
    const isOpen = open.some((path) => request.nextUrl.pathname === path);
    if (!isOpen && !request.cookies.get("wcp_session")) {
      const login = request.nextUrl.clone();
      login.pathname = "/admin/login";
      login.search = "";
      return NextResponse.redirect(login);
    }
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = { matcher: ["/admin/:path*", "/guest/:path*"] };
