import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../../guard";
import { sendEmailCampaignAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EmailCampaignsPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const tenants = await prisma.tenant.findMany({ where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } } });
  const tenantId = query.tenantId && tenants.some((tenant) => tenant.id === query.tenantId) ? query.tenantId : tenants[0]?.id;
  const campaigns = tenantId ? await prisma.emailCampaign.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  return (
    <main>
      <h1 className="text-2xl font-semibold">Email campaigns</h1>
      <p className="mt-1 text-sm text-slate-600">Messages go only to guests of this tenant who accepted marketing and have not unsubscribed.</p>
      <div className="mt-3 flex gap-2">{tenants.map((tenant) => <a key={tenant.id} className="rounded border bg-white px-3 py-1 text-sm" href={`/admin/campaigns/email?tenantId=${tenant.id}`}>{tenant.name}</a>)}</div>
      {query.saved ? <p className="mt-3 text-emerald-700">Campaign processed.</p> : null}
      {tenantId ? (
        <form action={sendEmailCampaignAction} className="mt-4 grid gap-2 rounded-xl border bg-white p-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <input className="rounded border px-3 py-2" name="name" placeholder="Campaign name" required />
          <input className="rounded border px-3 py-2" name="subject" placeholder="Subject" required />
          <textarea className="rounded border px-3 py-2" name="body" rows={5} placeholder="Message" required />
          <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white" type="submit">Send to consented guests</button>
        </form>
      ) : null}
      <ul className="mt-4 divide-y rounded-xl border bg-white">{campaigns.map((campaign) => <li key={campaign.id} className="px-4 py-2 text-sm">{campaign.name} · {campaign.status}</li>)}</ul>
    </main>
  );
}
