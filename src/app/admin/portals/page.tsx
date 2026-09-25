import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";

export const dynamic = "force-dynamic";

export default async function PortalsPage() {
  const user = await requirePageUser();
  const portals = await prisma.portalConfiguration.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { tenantId: { in: user.tenantIds } },
    include: { tenant: true },
    orderBy: { companyName: "asc" },
  });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Captive portals</h1>
      <ul className="mt-4 divide-y rounded-xl border bg-white">
        {portals.map((portal) => (
          <li key={portal.id} className="flex items-center justify-between px-4 py-3">
            <span>{portal.companyName}</span>
            <a className="rounded bg-slate-900 px-3 py-2 text-sm text-white" href={`/admin/portals/${portal.tenantId}`}>Open designer</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
