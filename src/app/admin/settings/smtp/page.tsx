import { requirePageUser } from "../../guard";
import { saveSmtpAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function SmtpPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requirePageUser();
  const query = await searchParams;
  return (
    <main>
      <h1 className="text-2xl font-semibold">SMTP</h1>
      <p className="mt-1 text-sm text-slate-600">Leave tenant empty for the platform default. Passwords are encrypted and never shown again.</p>
      {query.saved ? <p className="text-emerald-700">Saved.</p> : null}
      <form action={saveSmtpAction} className="mt-4 grid max-w-xl gap-2 rounded-xl border bg-white p-4">
        <input className="rounded border px-3 py-2" name="tenantId" placeholder="Tenant id for an override, or blank" />
        <input className="rounded border px-3 py-2" name="host" placeholder="SMTP host" required />
        <input className="rounded border px-3 py-2" name="port" placeholder="587" defaultValue="587" />
        <input className="rounded border px-3 py-2" name="username" placeholder="Username" />
        <input className="rounded border px-3 py-2" name="password" type="password" placeholder="Password" autoComplete="new-password" />
        <select className="rounded border px-3 py-2" name="encryption"><option>STARTTLS</option><option>TLS</option><option>NONE</option></select>
        <input className="rounded border px-3 py-2" name="fromEmail" type="email" placeholder="From email" required />
        <input className="rounded border px-3 py-2" name="fromName" placeholder="From name" required />
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Save SMTP</button>
      </form>
    </main>
  );
}
