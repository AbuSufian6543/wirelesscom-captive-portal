import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { statusLabel } from "@/server/admin/copy";
import { Empty, PageHeader } from "@/components/admin-ui";
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
      <PageHeader title="People online" lead="Each row is a phone or laptop that opened the guest page. Disconnect removes their internet access if the UniFi controller is live." />
      {sessions.length ? (
        <div className="overflow-x-auto rounded-2xl border border-[#e4ebf2] bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#f5f8fb] text-[#5c7284]">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Device</th>
                <th className="px-4 py-3 font-semibold">Access point</th>
                <th className="px-4 py-3 font-semibold">Wi-Fi name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id} className="border-t border-[#eef3f7]">
                  <td className="px-4 py-3">{session.tenant.name}</td>
                  <td className="px-4 py-3">{session.clientMac}</td>
                  <td className="px-4 py-3">{session.apMac}</td>
                  <td className="px-4 py-3">{session.ssid || "—"}</td>
                  <td className="px-4 py-3">{statusLabel(session.status)}</td>
                  <td className="px-4 py-3">
                    {session.status === "AUTHENTICATED" ? (
                      <form action={revokeSessionAction}>
                        <input type="hidden" name="sessionId" value={session.id} />
                        <button className="font-semibold text-rose-700" type="submit">Disconnect</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="No guests yet" body="When someone opens the guest page from a registered access point, they appear here." />
      )}
    </main>
  );
}
