import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function HomePage() {
  return (
    <main>
      <div className="bg-[#071525] px-6 py-3 text-xs text-slate-300">Technology service provider · Serving Northern Ontario since 2005</div>
      <header className="flex items-center justify-between bg-white px-6 py-4">
        <Wordmark />
        <Link className="rounded-lg bg-[#1cb4e4] px-4 py-2 text-sm font-semibold text-white" href="/admin/login">Staff sign in</Link>
      </header>
      <section className="bg-[#071525] px-6 py-16 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8fd4ee]">Captive portal platform</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">Guest Wi-Fi for WirelessCom and every customer tenant.</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-300">One portal engine. Separate branding, terms, and access for each business.</p>
        <Link className="mt-8 inline-flex rounded-lg bg-[#1cb4e4] px-5 py-3 font-semibold text-white" href="/admin/login">Open the admin console</Link>
      </section>
    </main>
  );
}
