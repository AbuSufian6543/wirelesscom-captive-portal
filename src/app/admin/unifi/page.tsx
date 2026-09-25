import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
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
    prisma.unifiSsid.findMany({ where, include: { site: true } }),
    prisma.unifiAccessPoint.findMany({ where, include: { tenant: true, site: true }, orderBy: { mac: "asc" } }),
  ]);
  return (
    <main className="space-y-8">
      <h1 className="text-2xl font-semibold">UniFi controllers, sites, SSIDs, and access points</h1>
      {query.error ? <p className="text-rose-700">{query.error}</p> : null}
      {query.saved ? <p className="text-emerald-700">Saved.</p> : null}
      <section>
        <h2 id="access-points" className="font-semibold">Access points</h2>
        <ul className="mt-2 divide-y rounded-xl border bg-white">
          {aps.map((ap) => <li key={ap.id} className="px-4 py-2 text-sm">{ap.mac} · {ap.name} · {ap.tenant.name} · {ap.site.name}</li>)}
        </ul>
        <form action={createAccessPointAction} className="mt-3 grid gap-2 rounded-xl border bg-white p-4 md:grid-cols-4">
          <TenantSelect tenants={tenants} />
          <select className="rounded border px-3 py-2" name="siteId" required>{sites.map((site) => <option key={site.id} value={site.id}>{site.tenant.name}: {site.name}</option>)}</select>
          <input className="rounded border px-3 py-2" name="name" placeholder="AP name" required />
          <input className="rounded border px-3 py-2" name="mac" placeholder="aa:bb:cc:dd:ee:ff" required />
          <button className="rounded bg-slate-900 px-3 py-2 text-white md:col-span-4" type="submit">Register access point</button>
        </form>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <form action={createControllerAction} className="grid gap-2 rounded-xl border bg-white p-4">
          <h2 id="controllers" className="font-semibold">Controller</h2>
          <TenantSelect tenants={tenants} />
          <input className="rounded border px-3 py-2" name="name" placeholder="Name" required />
          <select className="rounded border px-3 py-2" name="mode"><option>MOCK</option><option>REAL</option></select>
          <select className="rounded border px-3 py-2" name="apiStyle"><option>UNIFI_OS</option><option>CLASSIC</option></select>
          <input className="rounded border px-3 py-2" name="baseUrl" placeholder="https://unifi.example.com" />
          <input className="rounded border px-3 py-2" name="username" placeholder="Username" />
          <input className="rounded border px-3 py-2" name="password" type="password" placeholder="Password" autoComplete="new-password" />
          <label className="text-sm"><input type="checkbox" name="verifyTls" defaultChecked /> Verify TLS</label>
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add controller</button>
        </form>
        <form action={createSiteAction} className="grid gap-2 rounded-xl border bg-white p-4">
          <h2 id="sites" className="font-semibold">Site</h2>
          <TenantSelect tenants={tenants} />
          <select className="rounded border px-3 py-2" name="controllerId">{controllers.map((controller) => <option key={controller.id} value={controller.id}>{controller.tenant.name}: {controller.name}</option>)}</select>
          <input className="rounded border px-3 py-2" name="name" placeholder="Site name" required />
          <input className="rounded border px-3 py-2" name="externalId" placeholder="default" required />
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add site</button>
        </form>
        <form action={createSsidAction} className="grid gap-2 rounded-xl border bg-white p-4">
          <h2 id="ssids" className="font-semibold">SSID</h2>
          <TenantSelect tenants={tenants} />
          <select className="rounded border px-3 py-2" name="siteId">{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
          <input className="rounded border px-3 py-2" name="name" placeholder="SSID" required />
          <select className="rounded border px-3 py-2" name="accessPointId"><option value="">Link to AP (optional)</option>{aps.map((ap) => <option key={ap.id} value={ap.id}>{ap.mac}</option>)}</select>
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add SSID</button>
        </form>
      </section>
      <p className="text-sm text-slate-500">{ssids.length} SSIDs registered. Guest tenant selection uses the AP MAC, not the site name in the URL.</p>
    </main>
  );
}

function TenantSelect({ tenants }: { tenants: { id: string; name: string }[] }) {
  return <select className="rounded border px-3 py-2" name="tenantId" required>{tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>;
}
