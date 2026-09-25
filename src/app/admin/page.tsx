import Link from "next/link";
import { isSuperAdmin } from "@/server/authentication/guards";
import { prisma } from "@/server/database/client";
import { listCustomers } from "@/server/admin/copy";
import { ActionLink, PageHeader, Panel, QuietLink, Stat } from "@/components/admin-ui";
import { requirePageUser } from "./guard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const customers = await listCustomers(user);
  const tenantWhere = isSuperAdmin(user) || user.hasAllTenants ? {} : { tenantId: { in: user.tenantIds } };
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [online, today, total] = await Promise.all([
    prisma.guestSession.count({ where: { ...tenantWhere, status: "AUTHENTICATED", expiresAt: { gt: new Date() } } }),
    prisma.guestSession.count({ where: { ...tenantWhere, createdAt: { gte: start } } }),
    prisma.guestSession.count({ where: tenantWhere }),
  ]);
  return (
    <main>
      <PageHeader
        title={`Hello, ${user.name.split(" ")[0] || user.name}`}
        lead="This console manages guest Wi-Fi for each customer. Pick a customer to change their welcome page, access points, or who is allowed to connect."
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Customers you can manage" value={customers.length} hint="Each customer has its own guest page." />
        <Stat label="People online now" value={online} hint="Guests currently allowed on Wi-Fi." />
        <Stat label="Guests today" value={today} hint={`${total} connections recorded in total.`} />
      </section>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Start here" help="Most work happens on a single customer.">
          <ol className="list-decimal space-y-3 pl-5 text-sm text-[#4d6072]">
            <li>Open a customer, such as Pinos or Trinity.</li>
            <li>Register the Wi-Fi access point that belongs to that customer.</li>
            <li>Edit the guest page they see on their phone.</li>
            <li>Choose how they connect: terms, email, access code, or password.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <ActionLink href="/admin/tenants">Open customers</ActionLink>
            <QuietLink href="/admin/unifi">Register an access point</QuietLink>
          </div>
        </Panel>
        <Panel title="Your customers">
          {customers.length ? (
            <ul className="divide-y divide-[#eef3f7]">
              {customers.map((customer) => (
                <li key={customer.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link className="font-semibold text-[#071525]" href={`/admin/tenants/${customer.id}`}>{customer.name}</Link>
                    <p className="text-xs text-[#6b7f91]">{customer.status === "ACTIVE" ? "Live" : "Paused"}</p>
                  </div>
                  <Link className="text-sm font-semibold" href={`/admin/portals/${customer.id}`}>Edit guest page</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm">No customers are assigned to this account.</p>
          )}
        </Panel>
      </div>
    </main>
  );
}
