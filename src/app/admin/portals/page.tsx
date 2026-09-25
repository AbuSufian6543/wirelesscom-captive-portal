import { prisma } from "@/server/database/client";
import { isSuperAdmin } from "@/server/authentication/guards";
import { ActionLink, Empty, PageHeader } from "@/components/admin-ui";
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
      <PageHeader title="Guest pages" lead="This is the screen a phone shows before Wi-Fi is allowed. Each customer has one page. Changes here do not affect another customer." />
      {portals.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {portals.map((portal) => (
            <article key={portal.id} className="rounded-2xl border border-[#e4ebf2] bg-white p-5">
              <p className="text-lg font-semibold text-[#071525]">{portal.companyName}</p>
              <p className="mt-1 text-sm text-[#5c7284]">{portal.welcomeTitle}</p>
              <p className="mt-1 text-sm text-[#5c7284]">After connecting: {portal.redirectUrl || "no website set"}</p>
              <div className="mt-4"><ActionLink href={`/admin/portals/${portal.tenantId}`}>Edit this page</ActionLink></div>
            </article>
          ))}
        </div>
      ) : (
        <Empty title="No guest pages yet" body="Add a customer first. Their guest page is created automatically." />
      )}
    </main>
  );
}
