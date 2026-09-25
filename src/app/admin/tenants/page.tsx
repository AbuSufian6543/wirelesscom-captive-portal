import { isSuperAdmin } from "@/server/authentication/guards";
import { prisma } from "@/server/database/client";
import { statusLabel } from "@/server/admin/copy";
import { Badge, Empty, Notice, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { createTenantAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requirePageUser();
  const params = await searchParams;
  const tenants = await prisma.tenant.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } },
    orderBy: { name: "asc" },
    include: { _count: { select: { accessPoints: true, sessions: true } }, portal: true },
  });
  return (
    <main>
      <PageHeader
        title="Customers"
        lead="A customer is a business with its own guest Wi-Fi page. Pinos cannot see Trinity. Adding a customer here does not change the public websites already running on NGINX."
      />
      {params.error ? <Notice kind="error">{params.error}</Notice> : null}
      {isSuperAdmin(user) ? (
        <Panel title="Add a customer" help="Give them a name people recognize. The short code is used only inside this console (for example pinos). The website they go to after connecting is optional.">
          <form action={createTenantAction} className="grid gap-4 md:grid-cols-4">
            <TextField name="name" label="Business name" placeholder="Pinos" required />
            <TextField name="slug" label="Short code" placeholder="pinos" hint="Letters, numbers, and dashes only." required />
            <TextField name="redirectUrl" label="Website after they connect" placeholder="https://pinos.ca" />
            <div className="flex items-end"><PrimaryButton>Add customer</PrimaryButton></div>
          </form>
        </Panel>
      ) : null}
      <div className="mt-6 grid gap-4">
        {tenants.length ? tenants.map((tenant) => (
          <a key={tenant.id} href={`/admin/tenants/${tenant.id}`} className="block rounded-2xl border border-[#e4ebf2] bg-white p-5 no-underline hover:border-[#1cb4e4]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold text-[#071525]">{tenant.name}</p>
                <p className="mt-1 text-sm text-[#5c7284]">{tenant.portal?.welcomeTitle || "Guest page ready"} · {tenant._count.accessPoints} access points · {tenant._count.sessions} guest visits</p>
              </div>
              <Badge>{statusLabel(tenant.status)}</Badge>
            </div>
          </a>
        )) : <Empty title="No customers yet" body="A platform administrator can add the first customer from this page." />}
      </div>
    </main>
  );
}
