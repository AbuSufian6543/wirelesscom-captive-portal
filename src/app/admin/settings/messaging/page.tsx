import { requirePageUser } from "../../guard";
import { saveMessagingAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function MessagingPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requirePageUser();
  const query = await searchParams;
  return (
    <main>
      <h1 className="text-2xl font-semibold">Message API</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">Generic HTTPS endpoint. The portal POSTs JSON with to, from, body, and purpose. The API key is sent as a bearer token and the secret as X-Api-Secret. No provider is hard-coded.</p>
      {query.saved ? <p className="text-emerald-700">Saved.</p> : null}
      <form action={saveMessagingAction} className="mt-4 grid max-w-xl gap-2 rounded-xl border bg-white p-4">
        <input className="rounded border px-3 py-2" name="tenantId" placeholder="Tenant id override, or blank" />
        <input className="rounded border px-3 py-2" name="apiUrl" placeholder="https://sms.example.com/messages" required />
        <input className="rounded border px-3 py-2" name="apiKey" type="password" placeholder="API key" autoComplete="new-password" />
        <input className="rounded border px-3 py-2" name="apiSecret" type="password" placeholder="API secret" autoComplete="new-password" />
        <input className="rounded border px-3 py-2" name="senderId" placeholder="Sender ID" />
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Save Message API</button>
      </form>
    </main>
  );
}
