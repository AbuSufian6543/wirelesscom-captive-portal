import { prisma } from "@/server/database/client";
import { listCustomers, pickCustomer, statusLabel } from "@/server/admin/copy";
import { AreaField, CustomerTabs, Notice, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../../guard";
import { sendSmsCampaignAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SmsCampaignsPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const customers = await listCustomers(user);
  const current = pickCustomer(customers, query.tenantId);
  const campaigns = current ? await prisma.smsCampaign.findMany({ where: { tenantId: current.id }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  return (
    <main>
      <PageHeader title="Send a text message" lead="Uses the message service configured in Settings. Only guests of this customer who opted in and left a phone number are included." />
      <CustomerTabs customers={customers} currentId={current?.id} href={(id) => `/admin/campaigns/sms?tenantId=${id}`} />
      {query.saved ? <Notice kind="ok">The text job finished.</Notice> : null}
      {current ? (
        <Panel title={`Text for ${current.name}`}>
          <form action={sendSmsCampaignAction} className="grid gap-4">
            <input type="hidden" name="tenantId" value={current.id} />
            <TextField name="name" label="Internal name" required />
            <AreaField name="body" label="Message" rows={4} />
            <PrimaryButton>Send texts</PrimaryButton>
          </form>
        </Panel>
      ) : null}
      <ul className="mt-6 divide-y rounded-2xl border bg-white">
        {campaigns.map((campaign) => <li key={campaign.id} className="px-5 py-3 text-sm">{campaign.name} · {statusLabel(campaign.status)}</li>)}
      </ul>
    </main>
  );
}
