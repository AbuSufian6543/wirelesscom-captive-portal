import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { createUserAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requirePageUser();
  const users = await prisma.user.findMany({
    where: isSuperAdmin(user) ? undefined : { tenants: { some: { tenantId: { in: user.tenantIds } } } },
    include: { roles: { include: { role: true } }, tenants: { include: { tenant: true } } },
    orderBy: { email: "asc" },
  });
  const tenants = await prisma.tenant.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } },
    orderBy: { name: "asc" },
  });
  const roles = await prisma.role.findMany({ orderBy: { name: "asc" } });
  return (
    <main>
      <PageHeader title="Staff" lead="Staff are people who log into this console. Guests on Wi-Fi are listed separately under Guest list. A Pinos administrator cannot open Trinity." />
      <Panel title="Add a staff member" help="They will receive a temporary password on the next screen. They should change it after signing in.">
        <form action={createUserAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <TextField name="name" label="Full name" required />
            <TextField name="email" label="Email" type="email" required />
          </div>
          <label className="text-sm font-semibold">Role
            <select className="mt-1 w-full rounded-xl border px-3 py-3" name="role">
              {roles.filter((role) => isSuperAdmin(user) || role.key !== "SUPER_ADMIN").map((role) => (
                <option key={role.id} value={role.key}>{roleLabel(role.key)}</option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Customers they may manage</legend>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {tenants.map((tenant) => (
                <label key={tenant.id} className="flex items-center gap-2 text-sm font-normal"><input type="checkbox" name="tenantId" value={tenant.id} /> {tenant.name}</label>
              ))}
            </div>
          </fieldset>
          {isSuperAdmin(user) ? <label className="text-sm"><input type="checkbox" name="allTenants" /> This person may manage every current and future customer</label> : null}
          <PrimaryButton>Add staff member</PrimaryButton>
        </form>
      </Panel>
      <ul className="mt-6 divide-y divide-[#eef3f7] rounded-2xl border border-[#e4ebf2] bg-white">
        {users.map((row) => (
          <li key={row.id} className="px-5 py-4">
            <a className="font-semibold text-[#071525]" href={`/admin/users/${row.id}`}>{row.name}</a>
            <p className="text-sm text-[#5c7284]">{row.email} · {row.roles.map((role) => roleLabel(role.role.key)).join(", ")} · {row.hasAllTenants ? "All customers" : row.tenants.map((link) => link.tenant.name).join(", ") || "No customers assigned"}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

function roleLabel(key: string): string {
  if (key === "SUPER_ADMIN") return "Platform administrator";
  if (key === "TENANT_ADMIN") return "Customer administrator";
  if (key === "TENANT_USER") return "Customer viewer";
  return key.replaceAll("_", " ").toLowerCase();
}
