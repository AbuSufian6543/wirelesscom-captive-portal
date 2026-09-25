import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { listCustomers } from "@/server/admin/copy";
import { Notice, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../../guard";
import { saveSmtpAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SmtpPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const customers = await listCustomers(user);
  return (
    <main>
      <PageHeader title="Outgoing email" lead="Used for password resets and guest messages. Leave Customer set to All customers for the platform default. The password is encrypted and never shown again." />
      {query.saved ? <Notice kind="ok">Email settings saved.</Notice> : null}
      <Panel>
        <form action={saveSmtpAction} className="grid max-w-xl gap-4">
          <label className="text-sm font-semibold">Customer
            <select className="mt-1 w-full rounded-xl border px-3 py-3" name="tenantId">
              {isSuperAdmin(user) ? <option value="">All customers (platform default)</option> : null}
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} only</option>)}
            </select>
          </label>
          <TextField name="host" label="Mail server" placeholder="mail.example.com" required />
          <TextField name="port" label="Port" value="587" />
          <TextField name="username" label="Username" />
          <TextField name="password" label="Password" type="password" />
          <label className="text-sm font-semibold">Encryption
            <select className="mt-1 w-full rounded-xl border px-3 py-3" name="encryption">
              <option>STARTTLS</option>
              <option>TLS</option>
              <option>NONE</option>
            </select>
          </label>
          <TextField name="fromEmail" label="From email" type="email" required />
          <TextField name="fromName" label="From name" required />
          <PrimaryButton>Save email settings</PrimaryButton>
        </form>
      </Panel>
    </main>
  );
}
