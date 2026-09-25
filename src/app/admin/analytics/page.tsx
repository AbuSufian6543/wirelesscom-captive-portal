import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { PageHeader, Stat } from "@/components/admin-ui";
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
  const apGroups = await prisma.guestSession.groupBy({ by: ["apMac"], where, _count: { _all: true }, orderBy: { _count: { apMac: "desc" } }, take: 5 });
  const ssidGroups = await prisma.guestSession.groupBy({ by: ["ssid"], where, _count: { _all: true }, orderBy: { _count: { ssid: "desc" } }, take: 5 });
  return (
    <main>
      <PageHeader title="Reports" lead={tenantId ? "Numbers for one customer only." : isSuperAdmin(user) ? "Numbers across every customer you can see." : "Numbers for your customers only."} />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="All visits" value={total} />
        <Stat label="Today" value={today} />
        <Stat label="Last 7 days" value={weekly} />
        <Stat label="Last 30 days" value={monthly} />
        <Stat label="Online now" value={active} />
        <Stat label="Successful connections" value={success} />
        <Stat label="Failed attempts" value={failure} />
      </section>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[#e4ebf2] bg-white p-5">
          <h2 className="font-semibold">Busiest access points</h2>
          <ul className="mt-3 text-sm">{apGroups.map((row) => <li key={row.apMac}>{row.apMac || "unknown"} · {row._count._all}</li>)}</ul>
        </section>
        <section className="rounded-2xl border border-[#e4ebf2] bg-white p-5">
          <h2 className="font-semibold">Busiest Wi-Fi names</h2>
          <ul className="mt-3 text-sm">{ssidGroups.map((row) => <li key={row.ssid}>{row.ssid || "unknown"} · {row._count._all}</li>)}</ul>
        </section>
      </div>
    </main>
  );
}
