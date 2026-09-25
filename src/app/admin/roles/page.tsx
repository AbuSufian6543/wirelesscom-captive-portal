import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../guard";
import { createRoleAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await requirePageUser();
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { name: "asc" } });
  const permissions = await prisma.permission.findMany({ orderBy: { key: "asc" } });
  return (
    <main>
      <PageHeader title="Roles" lead="Built-in roles stay in place. A platform administrator can add a role such as Analyst later." />
      <div className="space-y-4">
        {roles.map((role) => (
          <Panel key={role.id} title={role.name} help={role.description}>
            <p className="text-xs text-[#6b7f91]">{role.permissions.map((item) => item.permission.key).join(", ")}</p>
          </Panel>
        ))}
      </div>
      {isSuperAdmin(user) ? (
        <form action={createRoleAction} className="mt-6 grid gap-3 rounded-2xl border bg-white p-5">
          <TextField name="name" label="Role name" required />
          <TextField name="key" label="Short code" placeholder="MARKETING_MANAGER" required />
          <TextField name="description" label="What this role is for" />
          <div className="grid gap-2 md:grid-cols-2">
            {permissions.map((permission) => (
              <label key={permission.id} className="text-sm"><input type="checkbox" name="permissionId" value={permission.id} /> {permission.description}</label>
            ))}
          </div>
          <PrimaryButton>Add role</PrimaryButton>
        </form>
      ) : null}
    </main>
  );
}
