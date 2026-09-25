import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../../guard";
import { sendSmsCampaignAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SmsCampaignsPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const tenants = await prisma.tenant.findMany({ where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } } });
  const tenantId = query.tenantId && tenants.some((tenant) => tenant.id === query.tenantId) ? query.tenantId : tenants[0]?.id;
  const campaigns = tenantId ? await prisma.smsCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  return (
    <main>
      <h1 className="text-2xl font-semibold">SMS campaigns</h1>
      <p className="mt-1 text-sm text-slate-600">Uses the generic Message API configured for the tenant or the platform. Guests must have marketing consent.</p>
      <div className="mt-3 flex gap-2">{tenants.map((tenant) => <a key={tenant.id} className="rounded border bg-white px-3 py-1 text-sm" href={`/admin/campaigns/sms?tenantId=${tenant.id}`}>{tenant.name}</a>)}</div>
      {tenantId ? (
        <form action={sendSmsCampaignAction} className="mt-4 grid gap-2 rounded-xl border bg-white p-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input className="rounded border px-3 py-2" name="name" placeholder="Campaign name" required />
          <textarea className="rounded border px-3 py-2" name="body" rows={4} placeholder="Text message" required />
          <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white" type="submit">Send SMS</button>
        </form>
      ) : null}
      {query.saved ? <p className="text-emerald-700">Campaign processed.</p> : null}
      <ul className="mt-4 divide-y rounded-xl border bg-white">{campaigns.map((campaign) => <li key={campaign.id} className="px-4 py-2 text-sm">{campaign.name} · {campaign.status}</li>)}</ul>
    </main>
  );
}
