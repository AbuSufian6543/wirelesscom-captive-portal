import { loginAction } from "../actions";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md py-16">
      <h1 className="text-2xl font-semibold">Staff sign in</h1>
      <p className="mt-2 text-sm text-slate-600">WirelessCom captive portal administration.</p>
      <form action={loginAction} className="mt-6 space-y-4">
        <label className="block text-sm font-medium">Email<input className="mt-1 w-full rounded-lg border px-3 py-3" name="email" type="email" required /></label>
        <label className="block text-sm font-medium">Password<input className="mt-1 w-full rounded-lg border px-3 py-3" name="password" type="password" required /></label>
        <button className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white" type="submit">Sign in</button>
      </form>
      <a className="mt-4 inline-block text-sm text-slate-600" href="/admin/forgot-password">Forgot password</a>
    </main>
  );
}
