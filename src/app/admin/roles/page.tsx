import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";
import { createRoleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await requirePageUser();
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
  const permissions = await prisma.permission.findMany({ orderBy: { key: "asc" } });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Roles and permissions</h1>
      <p className="mt-2 text-sm text-slate-600">System roles stay in place. Super Admins can add roles such as Analyst or Marketing Manager.</p>
      <ul className="mt-4 space-y-3">
        {roles.map((role) => (
          <li key={role.id} className="rounded-xl border bg-white p-4">
            <p className="font-medium">{role.name} <span className="text-slate-400">{role.key}</span></p>
            <p className="text-sm text-slate-600">{role.description}</p>
            <p className="mt-2 text-xs text-slate-500">{role.permissions.map((item) => item.permission.key).join(", ")}</p>
          </li>
        ))}
      </ul>
      {isSuperAdmin(user) ? (
        <form action={createRoleAction} className="mt-6 grid gap-3 rounded-xl border bg-white p-4">
          <input className="rounded border px-3 py-2" name="name" placeholder="Role name" required />
          <input className="rounded border px-3 py-2" name="key" placeholder="MARKETING_MANAGER" required />
          <input className="rounded border px-3 py-2" name="description" placeholder="Description" />
          <div className="grid gap-2 md:grid-cols-2">
            {permissions.map((permission) => (
              <label key={permission.id} className="text-sm"><input type="checkbox" name="permissionId" value={permission.id} /> {permission.key}</label>
            ))}
          </div>
          <button className="w-fit rounded bg-slate-900 px-4 py-2 text-white" type="submit">Create role</button>
        </form>
      ) : null}
    </main>
  );
}
