import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";
import { createTenantAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requirePageUser();
  const params = await searchParams;
  const tenants = await prisma.tenant.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } },
    orderBy: { name: "asc" },
    include: { _count: { select: { accessPoints: true, sessions: true } } },
  });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Tenants</h1>
      {params.error ? <p className="mt-3 text-rose-700">{params.error}</p> : null}
      {isSuperAdmin(user) ? (
        <form action={createTenantAction} className="mt-4 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4">
          <input className="rounded border px-3 py-2" name="name" placeholder="Customer name" required />
          <input className="rounded border px-3 py-2" name="slug" placeholder="slug" required />
          <input className="rounded border px-3 py-2" name="redirectUrl" placeholder="https://example.com" />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Create tenant</button>
        </form>
      ) : null}
      <ul className="mt-6 divide-y rounded-xl border bg-white">
        {tenants.map((tenant) => (
          <li key={tenant.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <a href={`/admin/tenants/${tenant.id}`} className="font-medium">{tenant.name}</a>
            <span className="text-sm text-slate-500">{tenant.kind} · {tenant.status} · {tenant._count.accessPoints} APs</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
