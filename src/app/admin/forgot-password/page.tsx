import { forgotPasswordAction } from "../actions";

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const query = await searchParams;
  return (
    <main className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 text-[#102033]">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      {query.sent ? <p className="mt-3 text-sm">If that account exists, a reset link is on its way.</p> : null}
      <form action={forgotPasswordAction} className="mt-4 grid gap-3">
        <input className="rounded border px-3 py-3" name="email" type="email" required />
        <button className="rounded-lg bg-[#1cb4e4] px-4 py-3 font-semibold text-white" type="submit">Send reset link</button>
      </form>
    </main>
  );
}
