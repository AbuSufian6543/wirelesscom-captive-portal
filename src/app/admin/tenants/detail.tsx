import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { statusLabel } from "@/server/admin/copy";
import { ActionLink, Badge, PageHeader, Panel, QuietLink } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { updateTenantStatusAction } from "../actions";

export async function TenantDetail({ id }: { id: string }) {
  const user = await requirePageUser();
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      portal: true,
      accessPoints: true,
      _count: { select: { sessions: true, guests: true } },
    },
  });
  if (!tenant) return <p>This customer was not found.</p>;
  if (!isSuperAdmin(user) && !user.hasAllTenants && !user.tenantIds.includes(id)) {
    return <p>Your account is not allowed to manage this customer.</p>;
  }
  const actions = [
    ["Edit the guest page", `/admin/portals/${tenant.id}`, "Logo, colors, terms, and the website they open after connecting."],
    ["Register Wi-Fi access points", "/admin/unifi", "A phone is sent to this customer only when its access point is listed here."],
    ["Choose how they connect", `/admin/authentication?tenantId=${tenant.id}`, "Terms only, email, access code, or a shared password."],
    ["Create access codes", `/admin/vouchers?tenantId=${tenant.id}`, "Hand a code to a guest who should skip the public form."],
    ["See who is online", "/admin/sessions", "Disconnect a device if you need to."],
  ];
  return (
    <main>
      <PageHeader
        title={tenant.name}
        lead="Everything below belongs only to this customer. Other businesses on the platform cannot see it."
        actions={<Badge>{statusLabel(tenant.status)}</Badge>}
      />
      <p className="mb-6 text-sm text-[#5c7284]">{tenant._count.guests} guest profiles · {tenant._count.sessions} visits · {tenant.accessPoints.length} access points</p>
      <div className="grid gap-4 md:grid-cols-2">
        {actions.map(([title, href, help]) => (
          <Panel key={href} title={title} help={help}>
            <ActionLink href={href}>Open</ActionLink>
          </Panel>
        ))}
      </div>
      {isSuperAdmin(user) ? (
        <form action={updateTenantStatusAction} className="mt-8 flex flex-wrap items-end gap-3 rounded-2xl border border-[#e4ebf2] bg-white p-5">
          <input type="hidden" name="id" value={tenant.id} />
          <label className="text-sm font-semibold">Customer status
            <select className="mt-1 block rounded-xl border px-3 py-3" name="status" defaultValue={tenant.status}>
              <option value="ACTIVE">Active — guests can connect</option>
              <option value="SUSPENDED">Paused — guests see an unavailable message</option>
              <option value="ARCHIVED">Archived — hidden from day-to-day use</option>
            </select>
          </label>
          <button className="rounded-xl border border-[#d5e0ea] bg-white px-4 py-3 font-semibold" type="submit">Save status</button>
          <QuietLink href="/admin/tenants">Back to customers</QuietLink>
        </form>
      ) : null}
    </main>
  );
}
