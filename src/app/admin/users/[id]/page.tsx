import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../../guard";
import { deleteUserAction, resetUserPasswordAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function UserDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ temporary?: string }> }) {
  const user = await requirePageUser();
  const { id } = await params;
  const query = await searchParams;
  const row = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } }, tenants: { include: { tenant: true } } } });
  if (!row) return <p>User not found.</p>;
  const shared = row.hasAllTenants || row.tenants.some((link) => user.tenantIds.includes(link.tenantId));
  if (!isSuperAdmin(user) && !shared) return <p>You do not have access to this user.</p>;
  return (
    <main>
      <h1 className="text-2xl font-semibold">{row.name}</h1>
      <p className="text-slate-600">{row.email}</p>
      {query.temporary ? <p className="mt-4 rounded bg-amber-50 p-3 text-sm">Temporary password: {query.temporary}. It is shown once. Ask the user to change it at first sign-in.</p> : null}
      {isSuperAdmin(user) ? (
        <div className="mt-6 flex gap-3">
          <form action={resetUserPasswordAction}><input type="hidden" name="userId" value={row.id} /><button className="rounded border px-3 py-2" type="submit">Reset password</button></form>
          <form action={deleteUserAction}><input type="hidden" name="userId" value={row.id} /><button className="rounded border px-3 py-2 text-rose-700" type="submit">Delete user</button></form>
        </div>
      ) : null}
    </main>
  );
}
