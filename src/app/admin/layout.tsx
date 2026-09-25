import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser } from "@/server/authentication/session";
import { isSuperAdmin } from "@/server/authentication/guards";
import { Wordmark } from "@/components/brand";

const groups = [
  {
    title: "Platform",
    links: [
      ["Dashboard", "/admin"],
      ["Tenants", "/admin/tenants"],
      ["Users", "/admin/users"],
      ["Roles & Permissions", "/admin/roles"],
    ],
  },
  {
    title: "Network",
    links: [
      ["UniFi", "/admin/unifi"],
      ["Controllers", "/admin/unifi#controllers"],
      ["Sites", "/admin/unifi#sites"],
      ["Access Points", "/admin/unifi#access-points"],
      ["SSIDs", "/admin/unifi#ssids"],
      ["Captive Portals", "/admin/portals"],
      ["Authentication", "/admin/authentication"],
      ["Vouchers", "/admin/vouchers"],
    ],
  },
  {
    title: "Guests",
    links: [
      ["Guest Sessions", "/admin/sessions"],
      ["Guest Profiles", "/admin/guests"],
      ["Analytics", "/admin/analytics"],
    ],
  },
  {
    title: "Messages",
    links: [
      ["Email Campaigns", "/admin/campaigns/email"],
      ["SMS Campaigns", "/admin/campaigns/sms"],
      ["SMTP", "/admin/settings/smtp"],
      ["Message API", "/admin/settings/messaging"],
    ],
  },
  {
    title: "System",
    links: [
      ["Security", "/admin/security"],
      ["Audit Logs", "/admin/audit"],
      ["System Settings", "/admin/settings"],
    ],
  },
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
      <header className="bg-[#071525] text-white">
        <div className="flex items-center justify-between gap-4 px-4 py-2 text-xs text-slate-300 md:px-6">
          <p>Technology service provider · Captive portal platform</p>
          <p>{user ? user.email : "Staff access"}</p>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-white/10 bg-white px-4 py-3 text-[#102033] md:px-6">
          <Wordmark />
          <div className="text-right text-sm">
            <p className="font-semibold">{user?.name ?? "WirelessCom staff"}</p>
            <p className="text-xs text-[#5c7284]">{user && isSuperAdmin(user) ? "Super Admin" : user?.roles.join(", ")}</p>
          </div>
        </div>
      </header>
      <div className="md:grid md:grid-cols-[260px_1fr]">
        <aside className="border-r border-[#e4ebf2] bg-white md:min-h-[calc(100vh-92px)]">
          <nav className="space-y-5 px-3 py-5">
            {groups.map((group) => (
              <div key={group.title}>
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b8ea0]">{group.title}</p>
                <div className="mt-1">
                  {group.links.map(([label, href]) => {
                    const active = path === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`mt-1 block rounded-lg px-3 py-2 text-sm ${active ? "bg-[#e7f7fc] font-semibold text-[#0c7eab]" : "text-[#24384a] hover:bg-[#f3f7fb]"}`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
            <form action="/api/v1/auth/logout" method="post">
              <button className="px-3 py-2 text-sm font-semibold text-[#0c7eab]" type="submit">Sign out</button>
            </form>
          </nav>
        </aside>
        <div className="wc-main min-w-0 px-4 py-6 md:px-8">{children}</div>
      </div>
    </div>
  );
}
