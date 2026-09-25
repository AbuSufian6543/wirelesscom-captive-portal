import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">WirelessCom.Ca Inc.</p>
      <h1 className="mt-2 text-3xl font-semibold">Captive portal platform</h1>
      <p className="mt-3 text-slate-600">Guest Wi-Fi sign-in is served on the /guest path. Staff tools are separate.</p>
      <Link className="mt-6 inline-flex w-fit rounded-lg bg-slate-900 px-4 py-3 text-white" href="/admin/login">
        Staff sign in
      </Link>
    </main>
  );
}
