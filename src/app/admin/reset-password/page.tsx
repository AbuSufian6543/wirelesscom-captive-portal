import { resetPasswordAction } from "../actions";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      {query.error ? <p className="mt-3 text-rose-700">{query.error}</p> : null}
      <form action={resetPasswordAction} className="mt-4 grid gap-3">
        <input type="hidden" name="token" value={query.token ?? ""} />
        <input className="rounded border px-3 py-3" name="password" type="password" required />
        <button className="rounded bg-slate-900 px-4 py-3 text-white" type="submit">Save password</button>
      </form>
    </main>
  );
}
