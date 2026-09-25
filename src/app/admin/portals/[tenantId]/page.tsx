import { notFound } from "next/navigation";
import { prisma } from "@/server/database/client";
import { canAccessTenant } from "@/server/authentication/guards";
import { requirePageUser } from "../../guard";
import { savePortalAction } from "../../actions";
import { viewFor } from "@/server/portal/directory";
import type { ResolvedPortal } from "@/server/tenant/resolve";

export const dynamic = "force-dynamic";

export default async function DesignerPage({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const { tenantId } = await params;
  const query = await searchParams;
  if (!canAccessTenant(user, tenantId)) return <p>You do not have access to this tenant.</p>;
  const portal = await prisma.portalConfiguration.findUnique({ where: { tenantId }, include: { tenant: true } });
  const methods = await prisma.authenticationMethod.findMany({ where: { tenantId, enabled: true }, orderBy: { sortOrder: "asc" } });
  if (!portal) notFound();
  const preview: ResolvedPortal = {
    tenant: { id: portal.tenant.id, name: portal.tenant.name, slug: portal.tenant.slug, status: portal.tenant.status },
    controller: { id: "", mode: "MOCK", apiStyle: "UNIFI_OS", baseUrl: "", username: "", password: "", verifyTls: true },
    site: { id: "", externalId: "default", name: "" },
    accessPoint: { id: "", mac: "", name: "", enabled: true },
    ssidName: "Preview",
    portal: { ...portal, ssid: "Preview", methods: methods.map((method) => method.method) },
    methods: methods.map((method) => ({ method: method.method, enabled: true, sharedSecretHash: "", sortOrder: method.sortOrder })),
  };
  const html = (await import("@/server/portal/render")).renderGuestPage({ portal: viewFor(preview, "Preview"), preview: true });
  const fields = ["nameField", "emailField", "phoneField", "termsField", "privacyField", "marketingField"] as const;
  return (
    <main>
      <h1 className="text-2xl font-semibold">Portal designer</h1>
      <p className="text-slate-600">{portal.tenant.name}</p>
      {query.error ? <p className="mt-3 text-rose-700">{query.error}</p> : null}
      {query.saved ? <p className="mt-3 text-emerald-700">Portal saved.</p> : null}
      <div className="mt-4 grid gap-6 xl:grid-cols-[1fr_390px]">
        <form action={savePortalAction} className="grid gap-3 rounded-xl border bg-white p-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <Text name="companyName" label="Company name" value={portal.companyName} />
          <Text name="welcomeTitle" label="Welcome title" value={portal.welcomeTitle} />
          <Text name="welcomeMessage" label="Welcome message" value={portal.welcomeMessage} />
          <Text name="description" label="Description" value={portal.description} />
          <Text name="buttonText" label="Button text" value={portal.buttonText} />
          <Text name="footerText" label="Footer" value={portal.footerText} />
          <Area name="customCss" label="Custom CSS" value={portal.customCss} />
          <Area name="supportText" label="Support" value={portal.supportText} />
          <Area name="termsText" label="Terms and conditions" value={portal.termsText} />
          <Text name="termsVersion" label="Terms version" value={portal.termsVersion} />
          <Area name="privacyText" label="Privacy policy" value={portal.privacyText} />
          <Text name="privacyVersion" label="Privacy version" value={portal.privacyVersion} />
          <Text name="redirectUrl" label="Redirect URL after connection" value={portal.redirectUrl} />
          <Text name="sessionDurationMinutes" label="Session minutes" value={String(portal.sessionDurationMinutes)} />
          <Text name="uploadKbps" label="Upload limit Kbps" value={portal.uploadKbps ? String(portal.uploadKbps) : ""} />
          <Text name="downloadKbps" label="Download limit Kbps" value={portal.downloadKbps ? String(portal.downloadKbps) : ""} />
          <Text name="dataLimitMb" label="Data limit MB" value={portal.dataLimitMb ? String(portal.dataLimitMb) : ""} />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {["primaryColor", "accentColor", "backgroundColor", "textColor", "mutedColor", "cardColor", "buttonColor", "buttonTextColor"].map((name) => (
              <label key={name} className="text-xs">{name}<input className="mt-1 w-full rounded border px-2 py-2" name={name} defaultValue={portal[name as "primaryColor"]} /></label>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {fields.map((field) => (
              <label key={field} className="text-sm">{field}
                <select className="mt-1 w-full rounded border px-2 py-2" name={field} defaultValue={portal[field]}>
                  <option>HIDDEN</option><option>OPTIONAL</option><option>REQUIRED</option>
                </select>
              </label>
            ))}
          </div>
          <button className="rounded bg-slate-900 px-4 py-3 font-semibold text-white" type="submit">Save portal</button>
        </form>
        <iframe className="h-[720px] w-full rounded-[28px] border bg-slate-200" title="Mobile preview" srcDoc={html} />
      </div>
    </main>
  );
}

function Text({ name, label, value }: { name: string; label: string; value: string }) {
  return <label className="text-sm font-medium">{label}<input className="mt-1 w-full rounded border px-3 py-2" name={name} defaultValue={value} /></label>;
}
function Area({ name, label, value }: { name: string; label: string; value: string }) {
  return <label className="text-sm font-medium">{label}<textarea className="mt-1 w-full rounded border px-3 py-2" name={name} rows={4} defaultValue={value} /></label>;
}
