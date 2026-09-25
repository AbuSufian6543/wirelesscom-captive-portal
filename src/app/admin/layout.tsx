import Link from "next/link";
import { getCurrentUser } from "@/server/authentication/session";
import { isSuperAdmin } from "@/server/authentication/guards";

const links = [
  ["Dashboard", "/admin"],
  ["Tenants", "/admin/tenants"],
  ["Users", "/admin/users"],
  ["Roles & Permissions", "/admin/roles"],
  ["UniFi", "/admin/unifi"],
  ["Captive Portals", "/admin/portals"],
  ["Authentication", "/admin/authentication"],
  ["Vouchers", "/admin/vouchers"],
  ["Guest Sessions", "/admin/sessions"],
  ["Guest Profiles", "/admin/guests"],
  ["Analytics", "/admin/analytics"],
  ["Email Campaigns", "/admin/campaigns/email"],
  ["SMS Campaigns", "/admin/campaigns/sms"],
  ["SMTP", "/admin/settings/smtp"],
  ["Message API", "/admin/settings/messaging"],
  ["Security", "/admin/security"],
  ["Audit Logs", "/admin/audit"],
  ["System Settings", "/admin/settings"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <AdminNav />
      <div className="min-w-0 px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}

async function AdminNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.mustChangePassword) return null;
  return (
    <aside className="bg-ink text-slate-100 md:min-h-screen">
      <div className="px-4 py-5">
        <p className="text-xs uppercase tracking-wider text-slate-400">WirelessCom</p>
        <p className="text-lg font-semibold">Captive Portal</p>
        <p className="mt-2 text-sm text-slate-300">{user.name}</p>
        <p className="text-xs text-slate-400">{isSuperAdmin(user) ? "Super Admin" : user.roles.join(", ")}</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 pb-4 md:block md:space-y-1 md:px-3">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="block whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-white/10">
            {label}
          </Link>
        ))}
        <form action="/api/v1/auth/logout" method="post">
          <button className="px-3 py-2 text-sm text-slate-300" type="submit">Sign out</button>
        </form>
      </nav>
    </aside>
  );
}
