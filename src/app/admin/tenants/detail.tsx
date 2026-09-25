import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";
import { updateTenantStatusAction } from "../actions";

export async function TenantDetail({ id }: { id: string }) {
  const user = await requirePageUser();
  const tenant = await prisma.tenant.findUnique({ where: { id } });
  if (!tenant) return <p>Tenant not found.</p>;
  if (!isSuperAdmin(user) && !user.hasAllTenants && !user.tenantIds.includes(id)) return <p>You do not have access to this tenant.</p>;
  return (
    <main>
      <h1 className="text-2xl font-semibold">{tenant.name}</h1>
      <p className="text-slate-600">{tenant.slug} · {tenant.status}</p>
      <div className="mt-4 flex gap-3">
        <a className="rounded bg-slate-900 px-3 py-2 text-white" href={`/admin/portals/${tenant.id}`}>Portal designer</a>
      </div>
      {isSuperAdmin(user) ? (
        <form action={updateTenantStatusAction} className="mt-6 flex gap-2">
          <input type="hidden" name="id" value={tenant.id} />
          <select className="rounded border px-3 py-2" name="status" defaultValue={tenant.status}>
            <option>ACTIVE</option>
            <option>SUSPENDED</option>
            <option>ARCHIVED</option>
          </select>
          <button className="rounded border px-3 py-2" type="submit">Update status</button>
        </form>
      ) : null}
    </main>
  );
}
