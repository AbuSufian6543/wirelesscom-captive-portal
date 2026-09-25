import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "./guard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const tenantWhere = isSuperAdmin(user) || user.hasAllTenants ? {} : { tenantId: { in: user.tenantIds } };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [tenants, activeSessions, today] = await Promise.all([
    prisma.tenant.count(isSuperAdmin(user) || user.hasAllTenants ? undefined : { where: { id: { in: user.tenantIds } } }),
    prisma.guestSession.count({ where: { ...tenantWhere, status: "AUTHENTICATED", expiresAt: { gt: new Date() } } }),
    prisma.guestSession.count({ where: { ...tenantWhere, createdAt: { gte: start } } }),
  ]);
  return (
    <main>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-1 text-slate-600">Platform activity for the tenants you can access.</p>
      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Tenants" value={tenants} />
        <Card label="Active sessions" value={activeSessions} />
        <Card label="Guests today" value={today} />
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}
