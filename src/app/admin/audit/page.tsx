import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { Empty, PageHeader } from "@/components/admin-ui";
import { requirePageUser } from "../guard";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const user = await requirePageUser();
  const logs = await prisma.auditLog.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { OR: [{ tenantId: { in: user.tenantIds } }, { actorId: user.id }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: true, tenant: true },
  });
  return (
    <main>
      <PageHeader title="Activity log" lead="Important staff and guest events. Passwords and API keys are never stored here." />
      {logs.length ? (
        <ul className="divide-y divide-[#eef3f7] rounded-2xl border border-[#e4ebf2] bg-white">
          {logs.map((log) => (
            <li key={log.id} className="px-5 py-3 text-sm">
              <p className="font-semibold text-[#071525]">{plainAction(log.action)} · {log.result === "SUCCESS" ? "OK" : "Failed"}</p>
              <p className="text-[#5c7284]">{log.createdAt.toLocaleString()} · {log.actor?.email ?? "system"} · {log.tenant?.name ?? "platform"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No activity yet" body="Staff changes and guest connections will show up here." />
      )}
    </main>
  );
}

function plainAction(action: string): string {
  return action.replaceAll(".", " ").replace("auth login", "Signed in").replace("guest authorization", "Guest connected");
}
