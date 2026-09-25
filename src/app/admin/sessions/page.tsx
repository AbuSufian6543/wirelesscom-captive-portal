import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";
import { revokeSessionAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const user = await requirePageUser();
  const sessions = await prisma.guestSession.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { tenantId: { in: user.tenantIds } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { tenant: true },
  });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Guest sessions</h1>
      <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50"><tr><th className="px-3 py-2">Tenant</th><th className="px-3 py-2">Client</th><th className="px-3 py-2">AP</th><th className="px-3 py-2">SSID</th><th className="px-3 py-2">Status</th><th className="px-3 py-2"></th></tr></thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.id} className="border-t">
                <td className="px-3 py-2">{session.tenant.name}</td>
                <td className="px-3 py-2">{session.clientMac}</td>
                <td className="px-3 py-2">{session.apMac}</td>
                <td className="px-3 py-2">{session.ssid}</td>
                <td className="px-3 py-2">{session.status}</td>
                <td className="px-3 py-2">{session.status === "AUTHENTICATED" ? <form action={revokeSessionAction}><input type="hidden" name="sessionId" value={session.id} /><button className="text-rose-700" type="submit">Revoke</button></form> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
