import { requirePageUser } from "../guard";
import { changePasswordAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requirePageUser();
  const query = await searchParams;
  return (
    <main className="max-w-lg">
      <h1 className="text-2xl font-semibold">Security</h1>
      <p className="mt-1 text-sm text-slate-600">Signed in as {user.email}. Changing your password signs you out.</p>
      {query.error ? <p className="mt-3 text-rose-700">{query.error}</p> : null}
      <form action={changePasswordAction} className="mt-4 grid gap-3 rounded-xl border bg-white p-4">
        <input className="rounded border px-3 py-2" name="current" type="password" placeholder="Current password" required />
        <input className="rounded border px-3 py-2" name="next" type="password" placeholder="New password" required />
        <button className="rounded bg-slate-900 px-4 py-2 text-white" type="submit">Change password</button>
      </form>
    </main>
  );
}
