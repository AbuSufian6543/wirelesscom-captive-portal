import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, lead, actions }: { title: string; lead?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#071525]">{title}</h1>
        {lead ? <p className="mt-2 max-w-2xl text-base leading-relaxed text-[#4d6072]">{lead}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function Notice({ kind, children }: { kind: "error" | "ok"; children: ReactNode }) {
  const style = kind === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800";
  return <p className={`mb-4 rounded-xl px-4 py-3 text-sm ${style}`}>{children}</p>;
}

export function Panel({ title, help, children }: { title?: string; help?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e4ebf2] bg-white p-5 shadow-[0_8px_24px_rgba(7,21,37,0.04)]">
      {title ? <h2 className="text-lg font-semibold text-[#071525]">{title}</h2> : null}
      {help ? <p className="mt-1 mb-4 text-sm text-[#5c7284]">{help}</p> : null}
      {children}
    </section>
  );
}

export function Field({ name, label, hint, children }: { name?: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-[#102033]">
      {label}
      <span className="mt-1 block font-normal">{children}</span>
      {hint ? <span className="mt-1 block text-xs font-normal text-[#6b7f91]">{hint}</span> : null}
      {name ? null : null}
    </label>
  );
}

export function TextField({ name, label, hint, value = "", type = "text", required = false, placeholder = "" }: { name: string; label: string; hint?: string; value?: string; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input className="w-full rounded-xl border border-[#d5e0ea] px-3 py-3" name={name} type={type} defaultValue={value} required={required} placeholder={placeholder} />
    </Field>
  );
}

export function AreaField({ name, label, hint, value = "", rows = 4 }: { name: string; label: string; hint?: string; value?: string; rows?: number }) {
  return (
    <Field label={label} hint={hint}>
      <textarea className="w-full rounded-xl border border-[#d5e0ea] px-3 py-3" name={name} rows={rows} defaultValue={value} />
    </Field>
  );
}

export function PrimaryButton({ children }: { children: ReactNode }) {
  return <button className="rounded-xl bg-[#1cb4e4] px-4 py-3 font-semibold text-white" type="submit">{children}</button>;
}

export function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex rounded-xl bg-[#1cb4e4] px-4 py-3 text-sm font-semibold text-white no-underline hover:bg-[#0e92c4]">
      {children}
    </Link>
  );
}

export function QuietLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex rounded-xl border border-[#d5e0ea] bg-white px-4 py-3 text-sm font-semibold text-[#102033] no-underline hover:bg-[#f5f8fb]">
      {children}
    </Link>
  );
}

export function CustomerTabs({ customers, currentId, href }: { customers: { id: string; name: string }[]; currentId?: string; href: (id: string) => string }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {customers.map((customer) => (
        <Link
          key={customer.id}
          href={href(customer.id)}
          className={`rounded-full px-4 py-2 text-sm font-semibold no-underline ${customer.id === currentId ? "bg-[#071525] text-white" : "bg-white text-[#102033] ring-1 ring-[#d5e0ea]"}`}
        >
          {customer.name}
        </Link>
      ))}
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d5e0ea] bg-white px-6 py-10 text-center">
      <p className="font-semibold text-[#071525]">{title}</p>
      <p className="mt-2 text-sm text-[#5c7284]">{body}</p>
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="rounded-2xl border border-[#e4ebf2] bg-white p-5">
      <p className="text-sm text-[#5c7284]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-[#071525]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#7b8ea0]">{hint}</p> : null}
    </article>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#e7f7fc] px-2.5 py-1 text-xs font-semibold text-[#0c7eab]">{children}</span>;
}
