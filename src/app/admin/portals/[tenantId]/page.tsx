import { notFound } from "next/navigation";
import { prisma } from "@/server/database/client";
import { canAccessTenant } from "@/server/authentication/guards";
import { fieldNeedLabel } from "@/server/admin/copy";
import { AreaField, Notice, PageHeader, Panel, PrimaryButton, TextField } from "@/components/admin-ui";
import { requirePageUser } from "../../guard";
import { savePortalAction } from "../../actions";
import { viewFor } from "@/server/portal/directory";
import type { ResolvedPortal } from "@/server/tenant/resolve";

export const dynamic = "force-dynamic";

const colors: Array<[string, string]> = [
  ["primaryColor", "Headings"],
  ["accentColor", "Wi-Fi name color"],
  ["backgroundColor", "Page background"],
  ["textColor", "Main text"],
  ["mutedColor", "Small print"],
  ["cardColor", "Card background"],
  ["buttonColor", "Button"],
  ["buttonTextColor", "Button text"],
];

const fields: Array<["nameField" | "emailField" | "phoneField" | "termsField" | "privacyField" | "marketingField", string]> = [
  ["nameField", "Ask for name"],
  ["emailField", "Ask for email"],
  ["phoneField", "Ask for mobile number"],
  ["termsField", "Require terms"],
  ["privacyField", "Require privacy policy"],
  ["marketingField", "Ask to send offers"],
];

export default async function DesignerPage({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const user = await requirePageUser();
  const { tenantId } = await params;
  const query = await searchParams;
  if (!canAccessTenant(user, tenantId)) return <p>Your account cannot change this customer’s guest page.</p>;
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
  return (
    <main>
      <PageHeader title={`${portal.tenant.name} guest page`} lead="This is what a guest sees on their phone. Keep the wording short. The preview on the right is a phone-sized copy of the live page." />
      {query.error ? <Notice kind="error">{query.error}</Notice> : null}
      {query.saved ? <Notice kind="ok">The guest page was saved. New visitors will see it immediately.</Notice> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <form action={savePortalAction} className="space-y-4">
          <input type="hidden" name="tenantId" value={tenantId} />
          <Panel title="What guests read">
            <div className="grid gap-4">
              <TextField name="companyName" label="Business name" value={portal.companyName} />
              <TextField name="welcomeTitle" label="Headline" value={portal.welcomeTitle} />
              <TextField name="welcomeMessage" label="Short welcome" value={portal.welcomeMessage} />
              <TextField name="description" label="Extra sentence (optional)" value={portal.description} />
              <TextField name="buttonText" label="Button label" value={portal.buttonText} hint="Use a clear action such as Connect or Join Wi-Fi." />
              <TextField name="footerText" label="Footer" value={portal.footerText} />
              <AreaField name="supportText" label="Help text" value={portal.supportText} />
            </div>
          </Panel>
          <Panel title="After they connect" help="Only ordinary http or https websites are allowed.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="redirectUrl" label="Website to open" value={portal.redirectUrl} placeholder="https://pinos.ca" />
              <TextField name="sessionDurationMinutes" label="How long they stay online (minutes)" value={String(portal.sessionDurationMinutes)} />
            </div>
          </Panel>
          <Panel title="What to ask for">
            <div className="grid gap-3 md:grid-cols-2">
              {fields.map(([name, label]) => (
                <label key={name} className="text-sm font-semibold">{label}
                  <select className="mt-1 w-full rounded-xl border px-3 py-3" name={name} defaultValue={portal[name]}>
                    <option value="HIDDEN">Do not ask</option>
                    <option value="OPTIONAL">Optional</option>
                    <option value="REQUIRED">Required</option>
                  </select>
                  <span className="mt-1 block text-xs font-normal text-[#6b7f91]">Currently: {fieldNeedLabel(portal[name])}</span>
                </label>
              ))}
            </div>
          </Panel>
          <Panel title="Terms and privacy">
            <div className="grid gap-4">
              <AreaField name="termsText" label="Terms and conditions" value={portal.termsText} rows={6} />
              <TextField name="termsVersion" label="Terms version" value={portal.termsVersion} hint="Raise this when the wording changes, for example 1.1." />
              <AreaField name="privacyText" label="Privacy policy" value={portal.privacyText} rows={6} />
              <TextField name="privacyVersion" label="Privacy version" value={portal.privacyVersion} />
            </div>
          </Panel>
          <Panel title="Colors" help="Use six-character hex colors such as #1cb4e4. Text and background need strong contrast so phones can read them.">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {colors.map(([name, label]) => (
                <label key={name} className="text-xs font-semibold">{label}
                  <input className="mt-1 w-full rounded-xl border px-2 py-2" name={name} defaultValue={portal[name as "primaryColor"]} />
                </label>
              ))}
            </div>
          </Panel>
          <Panel title="Optional speed limits" help="Leave blank unless the UniFi controller should cap this customer. Values are in kilobits per second and megabytes.">
            <div className="grid gap-4 md:grid-cols-3">
              <TextField name="uploadKbps" label="Upload limit" value={portal.uploadKbps ? String(portal.uploadKbps) : ""} />
              <TextField name="downloadKbps" label="Download limit" value={portal.downloadKbps ? String(portal.downloadKbps) : ""} />
              <TextField name="dataLimitMb" label="Data cap (MB)" value={portal.dataLimitMb ? String(portal.dataLimitMb) : ""} />
            </div>
          </Panel>
          <Panel title="Extra styling" help="Plain CSS only. Remote images, imports, and scripts are removed for safety.">
            <AreaField name="customCss" label="Custom CSS" value={portal.customCss} />
          </Panel>
          <PrimaryButton>Save guest page</PrimaryButton>
        </form>
        <div className="xl:sticky xl:top-6">
          <p className="mb-2 text-sm font-semibold text-[#071525]">Phone preview</p>
          <iframe className="h-[720px] w-full rounded-[32px] border-8 border-[#071525] bg-white" title="Phone preview" srcDoc={html} />
        </div>
      </div>
    </main>
  );
}
