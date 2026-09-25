import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
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
      <h1 className="text-2xl font-semibold">Users</h1>
      <form action={createUserAction} className="mt-4 grid gap-3 rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded border px-3 py-2" name="name" placeholder="Name" required />
          <input className="rounded border px-3 py-2" name="email" type="email" placeholder="Email" required />
        </div>
        <select className="rounded border px-3 py-2" name="role">
          {roles.filter((role) => isSuperAdmin(user) || role.key !== "SUPER_ADMIN").map((role) => (
            <option key={role.id} value={role.key}>{role.name}</option>
          ))}
        </select>
        <div className="grid gap-2 md:grid-cols-3">
          {tenants.map((tenant) => (
            <label key={tenant.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="tenantId" value={tenant.id} /> {tenant.name}</label>
          ))}
        </div>
        {isSuperAdmin(user) ? <label className="text-sm"><input type="checkbox" name="allTenants" /> Access to all tenants</label> : null}
        <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white" type="submit">Create user</button>
      </form>
      <ul className="mt-6 divide-y rounded-xl border bg-white">
        {users.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <a className="font-medium" href={`/admin/users/${row.id}`}>{row.name}</a>
            <p className="text-sm text-slate-500">{row.email} · {row.roles.map((role) => role.role.name).join(", ")} · {row.hasAllTenants ? "All tenants" : row.tenants.map((link) => link.tenant.name).join(", ")}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
