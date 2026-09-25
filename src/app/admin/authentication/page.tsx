import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";
import { saveAuthMethodsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AuthenticationPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; error?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const tenants = await prisma.tenant.findMany({ where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } } });
  const tenantId = query.tenantId && tenants.some((tenant) => tenant.id === query.tenantId) ? query.tenantId : tenants[0]?.id;
  if (!tenantId) return <p>No tenant is assigned.</p>;
  const methods = await prisma.authenticationMethod.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" } });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Authentication</h1>
      {query.error ? <p className="text-rose-700">{query.error}</p> : null}
      {query.saved ? <p className="text-emerald-700">Saved.</p> : null}
      <form action={saveAuthMethodsAction} className="mt-4 max-w-xl space-y-3 rounded-xl border bg-white p-4">
        <input type="hidden" name="tenantId" value={tenantId} />
        <p className="text-sm">Tenant: {tenants.find((tenant) => tenant.id === tenantId)?.name}</p>
        <div className="flex flex-wrap gap-2">{tenants.map((tenant) => <a key={tenant.id} className="rounded border px-2 py-1 text-sm" href={`/admin/authentication?tenantId=${tenant.id}`}>{tenant.name}</a>)}</div>
        {methods.map((method) => (
          <label key={method.id} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
            <span>{method.method}</span>
            <input type="checkbox" name={method.method} defaultChecked={method.enabled} />
          </label>
        ))}
        <label className="block text-sm">Shared Wi-Fi password (only stored as a hash)
          <input className="mt-1 w-full rounded border px-3 py-2" name="password-PASSWORD" type="password" autoComplete="new-password" />
        </label>
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Save methods</button>
      </form>
      <p className="mt-3 text-sm text-slate-500">Switch tenant from the list on Vouchers or by adding ?tenantId= to this page. SMS OTP, RADIUS, social login, and payment can be added as new authentication methods later.</p>
    </main>
  );
}
