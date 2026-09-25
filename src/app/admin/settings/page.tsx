import { getEnv } from "@/server/shared/env";
import { requirePageUser } from "../guard";

export const dynamic = "force-dynamic";

export default async function SystemSettingsPage() {
  const user = await requirePageUser();
  const env = getEnv();
  const rows = [
    ["Environment", env.APP_ENV],
    ["Portal public IP", env.PORTAL_PUBLIC_IP || "Not set"],
    ["Portal domain", env.PORTAL_DOMAIN || "Not set"],
    ["Force HTTPS for domain", env.PORTAL_FORCE_HTTPS],
    ["App bind", `${env.APP_BIND_HOST}:${env.APP_PORT}`],
    ["Public URL", env.APP_PUBLIC_URL || "Not set"],
    ["Signed in as", user.email],
  ];
  return (
    <main>
      <h1 className="text-2xl font-semibold">System settings</h1>
      <p className="mt-1 text-sm text-slate-600">These values come from deployment configuration. Change them in the server .env and restart. They are not stored in tenant records.</p>
      <dl className="mt-4 divide-y rounded-xl border bg-white">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr]">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
