import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../../guard";
import { deleteUserAction, resetUserPasswordAction } from "../../actions";
import { Notice, PageHeader } from "@/components/admin-ui";

export const dynamic = "force-dynamic";

export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ temporary?: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } }, tenants: { include: { tenant: true } } } });
  if (!row) return <p>That staff account was not found.</p>;
  const shared = row.hasAllTenants || row.tenants.some((link) => user.tenantIds.includes(link.tenantId));
  if (!isSuperAdmin(user) && !shared) return <p>You cannot manage this staff account.</p>;
  return (
    <main>
      <PageHeader title={row.name} lead={row.email} />
      {query.temporary ? <Notice kind="ok">Temporary password: {query.temporary}. Show this once, then ask them to sign in and change it.</Notice> : null}
      <p className="text-sm text-[#5c7284]">{row.hasAllTenants ? "May manage every customer." : `May manage: ${row.tenants.map((link) => link.tenant.name).join(", ") || "none"}`}</p>
      {isSuperAdmin(user) ? (
        <div className="mt-6 flex gap-3">
          <form action={resetUserPasswordAction}><input type="hidden" name="userId" value={row.id} /><button className="rounded-xl border px-4 py-3" type="submit">Create a new temporary password</button></form>
          <form action={deleteUserAction}><input type="hidden" name="userId" value={row.id} /><button className="rounded-xl border px-4 py-3 text-rose-700" type="submit">Remove this staff account</button></form>
        </div>
      ) : null}
    </main>
  );
}
