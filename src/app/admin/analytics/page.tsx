import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ tenantId?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const scoped = isSuperAdmin(user) || user.hasAllTenants ? {} : { tenantId: { in: user.tenantIds } };
  const tenantId = query.tenantId && (isSuperAdmin(user) || user.hasAllTenants || user.tenantIds.includes(query.tenantId)) ? query.tenantId : undefined;
  const where = tenantId ? { tenantId } : scoped;
  const now = new Date();
  const day = new Date(now); day.setHours(0, 0, 0, 0);
  const week = new Date(now.getTime() - 7 * 86400000);
  const month = new Date(now.getTime() - 30 * 86400000);
  const [total, today, weekly, monthly, active, success, failure] = await Promise.all([
    prisma.guestSession.count({ where }),
    prisma.guestSession.count({ where: { ...where, createdAt: { gte: day } } }),
    prisma.guestSession.count({ where: { ...where, createdAt: { gte: week } } }),
    prisma.guestSession.count({ where: { ...where, createdAt: { gte: month } } }),
    prisma.guestSession.count({ where: { ...where, status: "AUTHENTICATED", expiresAt: { gt: now } } }),
    prisma.analyticsEvent.count({ where: { ...where, type: "AUTH_SUCCESS" } }),
    prisma.analyticsEvent.count({ where: { ...where, type: "AUTH_FAILURE" } }),
  ]);
  const authenticated = await prisma.guestSession.findMany({ where: { ...where, status: "AUTHENTICATED", authenticatedAt: { not: null }, expiresAt: { not: null } }, select: { authenticatedAt: true, expiresAt: true }, take: 500 });
  const average = authenticated.length
    ? Math.round(authenticated.reduce((sum, row) => sum + ((row.expiresAt!.getTime() - row.authenticatedAt!.getTime()) / 60000), 0) / authenticated.length)
    : 0;
  const apGroups = await prisma.guestSession.groupBy({ by: ["apMac"], where, _count: { _all: true }, orderBy: { _count: { apMac: "desc" } }, take: 5 });
  const ssidGroups = await prisma.guestSession.groupBy({ by: ["ssid"], where, _count: { _all: true }, orderBy: { _count: { ssid: "desc" } }, take: 5 });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Analytics</h1>
      <p className="text-sm text-slate-600">{tenantId ? "Tenant view" : isSuperAdmin(user) ? "Platform-wide" : "Your tenants"}</p>
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Total guests" value={total} />
        <Stat label="Today" value={today} />
        <Stat label="7 days" value={weekly} />
        <Stat label="30 days" value={monthly} />
        <Stat label="Active sessions" value={active} />
        <Stat label="Average session minutes" value={average} />
        <Stat label="Auth success" value={success} />
        <Stat label="Auth failure" value={failure} />
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <List title="Top access points" rows={apGroups.map((row) => `${row.apMac || "unknown"} · ${row._count._all}`)} />
        <List title="Top SSIDs" rows={ssidGroups.map((row) => `${row.ssid || "unknown"} · ${row._count._all}`)} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <article className="rounded-xl border bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-semibold">{value}</p></article>;
}
function List({ title, rows }: { title: string; rows: string[] }) {
  return <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">{title}</h2><ul className="mt-2 text-sm">{rows.map((row) => <li key={row}>{row}</li>)}</ul></section>;
}
