import { isSuperAdmin } from "@/server/authentication/guards";
import { listCustomers } from "@/server/admin/copy";
import { Notice, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../../guard";
import { saveMessagingAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function MessagingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const customers = await listCustomers(user);
  return (
    <main>
      <PageHeader title="Text message service" lead="This is a generic connection. Paste the address and keys your provider gives you. Nothing here names a specific vendor." />
      {query.saved ? <Notice kind="ok">Message settings saved.</Notice> : null}
      <Panel>
        <form action={saveMessagingAction} className="grid max-w-xl gap-4">
          <label className="text-sm font-semibold">Customer
            <select className="mt-1 w-full rounded-xl border px-3 py-3" name="tenantId">
              {isSuperAdmin(user) ? <option value="">All customers (platform default)</option> : null}
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} only</option>)}
            </select>
          </label>
          <TextField name="apiUrl" label="API address" placeholder="https://sms.example.com/messages" required />
          <TextField name="apiKey" label="API key" type="password" />
          <TextField name="apiSecret" label="API secret" type="password" />
          <TextField name="senderId" label="Sender name or number" />
          <PrimaryButton>Save message settings</PrimaryButton>
        </form>
      </Panel>
    </main>
  );
}
