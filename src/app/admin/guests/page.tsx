import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { requirePageUser } from "../guard";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const user = await requirePageUser();
  const guests = await prisma.guestClient.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { tenantId: { in: user.tenantIds } },
    include: { tenant: true },
    orderBy: { lastSeenAt: "desc" },
    take: 200,
  });
  return (
    <main>
      <h1 className="text-2xl font-semibold">Guest profiles</h1>
      <ul className="mt-4 divide-y rounded-xl border bg-white">
        {guests.map((guest) => (
          <li key={guest.id} className="px-4 py-3 text-sm">
            <p className="font-medium">{guest.name || guest.email || guest.mac}</p>
            <p className="text-slate-500">{guest.tenant.name} · {guest.email} · {guest.phone} · terms {guest.termsVersion || "—"} {guest.termsAcceptedAt?.toISOString() ?? ""} · marketing {guest.marketingConsentAt ? "yes" : "no"}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
