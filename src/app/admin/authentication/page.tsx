import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { listCustomers, methodLabel, pickCustomer } from "@/server/admin/copy";
import { CustomerTabs, Notice, PageHeader, Panel, PrimaryButton } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { saveAuthMethodsAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function AuthenticationPage({ searchParams }: { searchParams: Promise<{ tenantId?: string; error?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const customers = await listCustomers(user);
  const current = pickCustomer(customers, query.tenantId);
  if (!current) return <p>No customer is assigned to this account.</p>;
  const methods = await prisma.authenticationMethod.findMany({ where: { tenantId: current.id }, orderBy: { sortOrder: "asc" } });
  return (
    <main>
      <PageHeader
        title="How guests connect"
        lead="Turn on the options this customer wants. Guests always see a large Connect button. Only the options you enable appear on their phone."
      />
      <CustomerTabs customers={customers} currentId={current.id} href={(id) => `/admin/authentication?tenantId=${id}`} />
      {query.error ? <Notice kind="error">{query.error}</Notice> : null}
      {query.saved ? <Notice kind="ok">Saved for {current.name}.</Notice> : null}
      <Panel title={current.name}>
        <form action={saveAuthMethodsAction} className="max-w-xl space-y-3">
          <input type="hidden" name="tenantId" value={current.id} />
          {methods.map((method) => (
            <label key={method.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4ebf2] px-4 py-3">
              <span>
                <span className="block font-semibold">{methodLabel(method.method)}</span>
                <span className="text-xs text-[#6b7f91]">{helpFor(method.method)}</span>
              </span>
              <input type="checkbox" name={method.method} defaultChecked={method.enabled} />
            </label>
          ))}
          <label className="block text-sm font-semibold">Shared password
            <input className="mt-1 w-full rounded-xl border px-3 py-3" name="password-PASSWORD" type="password" autoComplete="new-password" />
            <span className="mt-1 block text-xs font-normal text-[#6b7f91]">Leave blank to keep the current password. It is stored as a hash.</span>
          </label>
          <PrimaryButton>Save connection options</PrimaryButton>
        </form>
      </Panel>
    </main>
  );
}

function helpFor(method: string): string {
  switch (method) {
    case "ACCEPT_TERMS":
      return "Guest agrees to the terms and continues.";
    case "EMAIL":
      return "Guest types an email address.";
    case "VOUCHER":
      return "Guest types an access code you created.";
    case "PASSWORD":
      return "Guest types a password you set here.";
    default:
      return "";
  }
}
