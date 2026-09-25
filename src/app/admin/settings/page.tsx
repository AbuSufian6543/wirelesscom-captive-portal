import Link from "next/link";
import { getEnv } from "@/server/shared/env";
import { PageHeader, Panel } from "@/components/admin-ui";
import { requirePageUser } from "../guard";

export const dynamic = "force-dynamic";

export default async function SystemSettingsPage() {
  const user = await requirePageUser();
  const env = getEnv();
  const rows = [
    ["Signed in as", user.email],
    ["Public IP UniFi is pointed at", env.PORTAL_PUBLIC_IP || "Not set in .env"],
    ["Guest Wi-Fi hostname", env.PORTAL_DOMAIN || "Not set yet"],
    ["Send hostname traffic to HTTPS", env.PORTAL_FORCE_HTTPS === "true" ? "Yes" : "No"],
    ["This app listens on", `${env.APP_BIND_HOST}:${env.APP_PORT}`],
    ["Links used in emails", env.APP_PUBLIC_URL || "Not set"],
  ];
  return (
    <main>
      <PageHeader title="Settings" lead="Network values live in the server .env file so the public IP can change later without rewriting this application. Use the links below for email, texts, passwords, and the activity log." />
      <div className="mb-6 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href="/admin/settings/smtp">Outgoing email</Link>
        <Link href="/admin/settings/messaging">Text messages</Link>
        <Link href="/admin/security">Change password</Link>
        <Link href="/admin/audit">Activity log</Link>
        <Link href="/admin/roles">Roles</Link>
      </div>
      <Panel title="Server configuration">
        <dl className="divide-y divide-[#eef3f7]">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 md:grid-cols-[240px_1fr]">
              <dt className="text-sm text-[#5c7284]">{label}</dt>
              <dd className="font-medium text-[#071525]">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </main>
  );
}
