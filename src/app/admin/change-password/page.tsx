import { getCurrentUser } from "@/server/authentication/session";
import { changePasswordAction } from "../actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const query = await searchParams;
  return (
    <main className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm text-slate-600">This account must set a new password before the dashboard opens.</p>
      {query.error ? <p className="mt-3 text-rose-700">{query.error}</p> : null}
      <form action={changePasswordAction} className="mt-4 grid gap-3">
        <input className="rounded border px-3 py-3" name="current" type="password" placeholder="Current password" required />
        <input className="rounded border px-3 py-3" name="next" type="password" placeholder="New password" required />
        <button className="rounded bg-slate-900 px-4 py-3 text-white" type="submit">Update password</button>
      </form>
    </main>
  );
}
