import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { listCustomers, pickCustomer } from "@/server/admin/copy";
import { CustomerTabs, Empty, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { createVoucherAction } from "../actions";
import { statusLabel } from "@/server/admin/copy";
import { Notice } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function VouchersPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const customers = await listCustomers(user);
  const current = pickCustomer(customers, query.tenantId);
  const vouchers = current ? await prisma.voucher.findMany({ where: { tenantId: current.id }, orderBy: { createdAt: "desc" } }) : [];
  return (
    <main>
      <PageHeader title="Access codes" lead="Give a guest a code when they should skip the public form. Codes belong to one customer only." />
      <CustomerTabs customers={customers} currentId={current?.id} href={(id) => `/admin/vouchers?tenantId=${id}`} />
      {query.saved ? <Notice kind="ok">Access code created.</Notice> : null}
      {current ? (
        <Panel title={`New code for ${current.name}`}>
          <form action={createVoucherAction} className="grid gap-4 md:grid-cols-2">
            <input type="hidden" name="tenantId" value={current.id} />
            <TextField name="code" label="Code" placeholder="Leave blank to generate one" />
            <TextField name="maxUses" label="How many times it can be used" value="1" type="number" />
            <TextField name="minutes" label="Minutes online" value="480" type="number" />
            <TextField name="expiresAt" label="Expires" type="datetime-local" />
            <div className="md:col-span-2"><PrimaryButton>Create code</PrimaryButton></div>
          </form>
        </Panel>
      ) : null}
      <ul className="mt-6 divide-y divide-[#eef3f7] rounded-2xl border border-[#e4ebf2] bg-white">
        {vouchers.map((voucher) => (
          <li key={voucher.id} className="px-5 py-3 text-sm">
            <span className="font-semibold">{voucher.code}</span> · {statusLabel(voucher.status)} · used {voucher.useCount} of {voucher.maxUses} · {voucher.sessionDurationMinutes} minutes
          </li>
        ))}
      </ul>
      {!vouchers.length ? <div className="mt-4"><Empty title="No codes yet" body="Create one when a guest needs a printed or spoken code." /></div> : null}
    </main>
  );
}
