import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
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
      <h1 className="text-2xl font-semibold">Audit logs</h1>
      <ul className="mt-4 divide-y rounded-xl border bg-white">
        {logs.map((log) => (
          <li key={log.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{log.action} · {log.result}</p>
            <p className="text-slate-500">{log.createdAt.toISOString()} · {log.actor?.email ?? "system"} · {log.tenant?.name ?? "platform"} · {log.ipAddress}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
