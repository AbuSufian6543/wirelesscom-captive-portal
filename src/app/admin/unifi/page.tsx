import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { Empty, Notice, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { createAccessPointAction, createControllerAction, createSiteAction, createSsidAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function UnifiPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  const where = isSuperAdmin(user) || user.hasAllTenants ? {} : { tenantId: { in: user.tenantIds } };
  const [tenants, controllers, sites, ssids, aps] = await Promise.all([
    prisma.tenant.findMany({ where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } }, orderBy: { name: "asc" } }),
    prisma.unifiController.findMany({ where, include: { tenant: true } }),
    prisma.unifiSite.findMany({ where, include: { tenant: true, controller: true } }),
    prisma.unifiSsid.findMany({ where, include: { site: true, tenant: true } }),
    prisma.unifiAccessPoint.findMany({ where, include: { tenant: true, site: true }, orderBy: { mac: "asc" } }),
  ]);
  return (
    <main className="space-y-6">
      <PageHeader
        title="Wi-Fi access points"
        lead="When a phone joins Wi-Fi, UniFi sends the access point’s hardware address here. That address decides which customer page the guest sees. If the address is missing, they are not allowed online."
      />
      {query.error ? <Notice kind="error">{query.error}</Notice> : null}
      {query.saved ? <Notice kind="ok">Saved. Guests on that radio will now see the chosen customer.</Notice> : null}

      <Panel title="Registered access points" help="This list is the source of truth. Add a radio here before guests can connect.">
        {aps.length ? (
          <ul className="divide-y divide-[#eef3f7]">
            {aps.map((ap) => (
              <li key={ap.id} className="py-3">
                <p className="font-semibold text-[#071525]">{ap.name}</p>
                <p className="text-sm text-[#5c7284]">{ap.tenant.name} · {ap.mac} · {ap.site.name}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="No access points yet" body="Register the first radio below. You can copy the hardware address from the UniFi controller." />
        )}
        <form action={createAccessPointAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <CustomerSelect tenants={tenants} />
          <label className="text-sm font-semibold">Location
            <select className="mt-1 w-full rounded-xl border px-3 py-3" name="siteId" required>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.tenant.name} — {site.name}</option>)}
            </select>
          </label>
          <TextField name="name" label="Friendly name" placeholder="Front desk" required />
          <TextField name="mac" label="Access point address" placeholder="d0:21:f9:bc:38:d4" hint="Twelve hex digits, with or without colons." required />
          <div className="md:col-span-2"><PrimaryButton>Register access point</PrimaryButton></div>
        </form>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="UniFi controller" help="Use Test only if there is no live controller yet. Live talks to a real UniFi console.">
          <form action={createControllerAction} className="grid gap-3">
            <CustomerSelect tenants={tenants} />
            <TextField name="name" label="Name" placeholder="Pinos controller" required />
            <label className="text-sm font-semibold">Mode
              <select className="mt-1 w-full rounded-xl border px-3 py-3" name="mode">
                <option value="MOCK">Test (no live controller)</option>
                <option value="REAL">Live UniFi controller</option>
              </select>
            </label>
            <label className="text-sm font-semibold">Controller type
              <select className="mt-1 w-full rounded-xl border px-3 py-3" name="apiStyle">
                <option value="UNIFI_OS">UniFi OS / Cloud Gateway</option>
                <option value="CLASSIC">Classic controller</option>
              </select>
            </label>
            <TextField name="baseUrl" label="Controller address" placeholder="https://unifi.example.com" />
            <TextField name="username" label="Username" />
            <TextField name="password" label="Password" type="password" />
            <label className="text-sm"><input type="checkbox" name="verifyTls" defaultChecked /> Check the security certificate</label>
            <PrimaryButton>Save controller</PrimaryButton>
          </form>
        </Panel>
        <Panel title="Location" help="This is the UniFi site name. Many controllers use default.">
          <form action={createSiteAction} className="grid gap-3">
            <CustomerSelect tenants={tenants} />
            <label className="text-sm font-semibold">Controller
              <select className="mt-1 w-full rounded-xl border px-3 py-3" name="controllerId">
                {controllers.map((controller) => <option key={controller.id} value={controller.id}>{controller.tenant.name} — {controller.name}</option>)}
              </select>
            </label>
            <TextField name="name" label="Location name" placeholder="Dining room" required />
            <TextField name="externalId" label="UniFi site key" placeholder="default" required />
            <PrimaryButton>Save location</PrimaryButton>
          </form>
        </Panel>
        <Panel title="Wi-Fi name" help="The name guests see when they pick a network, for example Pinos-Guest.">
          <form action={createSsidAction} className="grid gap-3">
            <CustomerSelect tenants={tenants} />
            <label className="text-sm font-semibold">Location
              <select className="mt-1 w-full rounded-xl border px-3 py-3" name="siteId">
                {sites.map((site) => <option key={site.id} value={site.id}>{site.tenant.name} — {site.name}</option>)}
              </select>
            </label>
            <TextField name="name" label="Wi-Fi name" placeholder="Pinos-Guest" required />
            <label className="text-sm font-semibold">Link to an access point
              <select className="mt-1 w-full rounded-xl border px-3 py-3" name="accessPointId">
                <option value="">Optional</option>
                {aps.map((ap) => <option key={ap.id} value={ap.id}>{ap.tenant.name} — {ap.mac}</option>)}
              </select>
            </label>
            <PrimaryButton>Save Wi-Fi name</PrimaryButton>
          </form>
        </Panel>
      </div>
      {ssids.length ? <p className="text-sm text-[#6b7f91]">{ssids.length} Wi-Fi names are registered.</p> : null}
    </main>
  );
}

function CustomerSelect({ tenants }: { tenants: { id: string; name: string }[] }) {
  return (
    <label className="text-sm font-semibold">Customer
      <select className="mt-1 w-full rounded-xl border px-3 py-3" name="tenantId" required>
        {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}
      </select>
    </label>
  );
}
