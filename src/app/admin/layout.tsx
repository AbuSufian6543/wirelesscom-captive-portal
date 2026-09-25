import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/server/authentication/session";
import { isSuperAdmin } from "@/server/authentication/guards";
import { Wordmark } from "@/components/brand";

const links = [
  ["Home", "/admin", "Overview of your guest Wi-Fi"],
  ["Customers", "/admin/tenants", "Businesses using this platform"],
  ["Guest page", "/admin/portals", "Logo, colors, and welcome screen"],
  ["Wi-Fi access points", "/admin/unifi", "Which radios send guests here"],
  ["How guests connect", "/admin/authentication", "Terms, email, codes, or password"],
  ["Access codes", "/admin/vouchers", "One-time or limited Wi-Fi codes"],
  ["People online", "/admin/sessions", "Who is connected right now"],
  ["Guest list", "/admin/guests", "Names and contact details collected"],
  ["Reports", "/admin/analytics", "Usage numbers"],
  ["Send email", "/admin/campaigns/email", "Messages to guests who opted in"],
  ["Send text", "/admin/campaigns/sms", "SMS to guests who opted in"],
  ["Staff", "/admin/users", "Who can manage this console"],
  ["Settings", "/admin/settings", "Email server, phone API, and security"],
];

const openPaths = ["/admin/login", "/admin/forgot-password", "/admin/reset-password", "/admin/change-password"];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = (await headers()).get("x-pathname") ?? "";
  if (openPaths.includes(path)) {
    return <div className="min-h-screen bg-[#071525]">{children}</div>;
  }

  const user = await getCurrentUser();
  return (
    <div className="min-h-screen bg-[#f5f8fb]">
      <header className="border-b border-[#e4ebf2] bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div>
            <Wordmark />
            <p className="mt-1 text-xs text-[#6b7f91]">Guest Wi-Fi console</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-[#102033]">{user?.name ?? "Staff"}</p>
            <p className="text-xs text-[#6b7f91]">{user && isSuperAdmin(user) ? "Platform administrator" : "Customer administrator"}</p>
          </div>
        </div>
      </header>
      <div className="md:grid md:grid-cols-[250px_1fr]">
        <aside className="border-r border-[#e4ebf2] bg-white md:min-h-[calc(100vh-76px)]">
          <nav className="px-3 py-4">
            {links.map(([label, href]) => {
              const active = path === href || (href !== "/admin" && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`mt-1 block rounded-xl px-3 py-2.5 text-sm ${active ? "bg-[#e7f7fc] font-semibold text-[#0c7eab]" : "text-[#24384a] hover:bg-[#f3f7fb]"}`}
                >
                  {label}
                </Link>
              );
            })}
            <form action="/api/v1/auth/logout" method="post" className="mt-4 px-3">
              <button className="text-sm font-semibold text-[#0c7eab]" type="submit">Sign out</button>
            </form>
          </nav>
        </aside>
        <div className="min-w-0 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
