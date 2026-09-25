import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { Empty, PageHeader } from "@/components/admin-ui";
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
      <PageHeader title="Guest list" lead="These are people who completed the guest page. Contact details appear only if that customer asked for them." />
      {guests.length ? (
        <ul className="divide-y divide-[#eef3f7] rounded-2xl border border-[#e4ebf2] bg-white">
          {guests.map((guest) => (
            <li key={guest.id} className="px-5 py-4">
              <p className="font-semibold text-[#071525]">{guest.name || guest.email || "Guest device"}</p>
              <p className="text-sm text-[#5c7284]">{guest.tenant.name} · {guest.email || "no email"} · {guest.phone || "no phone"} · {guest.marketingConsentAt ? "ok to email" : "no marketing"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="No guest details yet" body="They appear after someone connects and submits the form." />
      )}
    </main>
  );
}
