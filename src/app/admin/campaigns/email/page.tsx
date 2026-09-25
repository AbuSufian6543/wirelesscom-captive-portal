import { prisma } from "@/server/database/client";
import { listCustomers, pickCustomer, statusLabel } from "@/server/admin/copy";
import { CustomerTabs, Notice, PageHeader, Panel, PrimaryButton, TextField, AreaField } from "@/components/admin-ui";
import { requirePageUser } from "../../guard";
import { sendEmailCampaignAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EmailCampaignsPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const customers = await listCustomers(user);
  const current = pickCustomer(customers, query.tenantId);
  const campaigns = current ? await prisma.emailCampaign.findMany({ where: { tenantId: current.id }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  return (
    <main>
      <PageHeader title="Send email" lead="Messages go only to guests of this customer who agreed to offers and have not unsubscribed. Trinity guests never receive a Pinos email." />
      <CustomerTabs customers={customers} currentId={current?.id} href={(id) => `/admin/campaigns/email?tenantId=${id}`} />
      {query.saved ? <Notice kind="ok">The email job finished. Failed sends are listed with the campaign.</Notice> : null}
      {current ? (
        <Panel title={`Email for ${current.name}`}>
          <form action={sendEmailCampaignAction} className="grid gap-4">
            <input type="hidden" name="tenantId" value={current.id} />
            <TextField name="name" label="Internal name" required />
            <TextField name="subject" label="Subject line" required />
            <AreaField name="body" label="Message" rows={6} />
            <PrimaryButton>Send to guests who opted in</PrimaryButton>
          </form>
        </Panel>
      ) : null}
      <ul className="mt-6 divide-y rounded-2xl border bg-white">
        {campaigns.map((campaign) => <li key={campaign.id} className="px-5 py-3 text-sm">{campaign.name} · {statusLabel(campaign.status)}</li>)}
      </ul>
    </main>
  );
}
