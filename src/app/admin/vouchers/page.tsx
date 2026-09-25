import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";
import { createVoucherAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function VouchersPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const tenants = await prisma.tenant.findMany({ where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } } });
  const tenantId = query.tenantId && tenants.some((tenant) => tenant.id === query.tenantId) ? query.tenantId : tenants[0]?.id;
  const vouchers = tenantId ? await prisma.voucher.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } }) : [];
  return (
    <main>
      <h1 className="text-2xl font-semibold">Vouchers</h1>
      {query.saved ? <p className="text-emerald-700">Voucher created.</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">{tenants.map((tenant) => <a key={tenant.id} className="rounded border bg-white px-3 py-1 text-sm" href={`/admin/vouchers?tenantId=${tenant.id}`}>{tenant.name}</a>)}</div>
      {tenantId ? (
        <form action={createVoucherAction} className="mt-4 grid gap-2 rounded-xl border bg-white p-4 md:grid-cols-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input className="rounded border px-3 py-2" name="code" placeholder="Code (optional)" />
          <input className="rounded border px-3 py-2" name="maxUses" type="number" min={1} defaultValue={1} />
          <input className="rounded border px-3 py-2" name="minutes" type="number" min={5} defaultValue={480} />
          <input className="rounded border px-3 py-2" name="expiresAt" type="datetime-local" />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Create voucher</button>
        </form>
      ) : null}
      <ul className="mt-4 divide-y rounded-xl border bg-white">
        {vouchers.map((voucher) => <li key={voucher.id} className="px-4 py-2 text-sm">{voucher.code} · {voucher.status} · {voucher.useCount}/{voucher.maxUses} · {voucher.sessionDurationMinutes} min</li>)}
      </ul>
    </main>
  );
}
