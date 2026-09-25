import { Wordmark } from "@/components/brand";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 md:grid-cols-2">
      <section className="text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4ee]">WirelessCom.Ca Inc.</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight">Networks, security, and guest Wi-Fi in one platform.</h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">Sign in to manage tenants, captive portals, and UniFi access for WirelessCom and its customers.</p>
      </section>
      <section className="rounded-2xl bg-white p-8 shadow-2xl">
        <Wordmark />
        <h2 className="mt-6 text-2xl font-semibold text-[#102033]">Staff sign in</h2>
        <p className="mt-1 text-sm text-[#5c7284]">Use the WirelessCom administrator account.</p>
        {query.error ? <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{query.error}</p> : null}
        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm font-semibold text-[#102033]">Email
            <input className="mt-1 w-full rounded-lg border border-[#d5e0ea] px-3 py-3" name="email" type="email" autoComplete="username" required />
          </label>
          <label className="block text-sm font-semibold text-[#102033]">Password
            <input className="mt-1 w-full rounded-lg border border-[#d5e0ea] px-3 py-3" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="w-full rounded-lg bg-[#1cb4e4] px-4 py-3 font-semibold text-white" type="submit">Sign in</button>
        </form>
        <a className="mt-4 inline-block text-sm font-semibold text-[#0c7eab]" href="/admin/forgot-password">Forgot password</a>
      </section>
    </main>
  );
}
