import { getCurrentUser } from "@/server/authentication/session";
import { changePasswordAction } from "../actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  const query = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <section className="w-full rounded-2xl bg-white p-8">
        <h1 className="text-2xl font-semibold text-[#102033]">Choose a new password</h1>
        <p className="mt-2 text-sm text-[#5c7284]">For security, this account must set a new password before the console opens.</p>
        {query.error ? <p className="mt-3 text-rose-700">{query.error}</p> : null}
        <form action={changePasswordAction} className="mt-4 grid gap-3">
          <input className="rounded-xl border px-3 py-3" name="current" type="password" placeholder="Current password" required />
          <input className="rounded-xl border px-3 py-3" name="next" type="password" placeholder="New password" required />
          <button className="rounded-xl bg-[#1cb4e4] px-4 py-3 font-semibold text-white" type="submit">Save password</button>
        </form>
      </section>
    </main>
  );
}
