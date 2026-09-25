export function Wordmark({ light = false }: { light?: boolean }) {
  const title = light ? "#ffffff" : "#102033";
  const sub = light ? "#9fd8ef" : "#1aa3d4";
  return (
    <span className="inline-flex items-center gap-3">
      <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
        <circle cx="21" cy="21" r="20" fill={light ? "#12324a" : "#e8f7fc"} />
        <path d="M21 27.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" fill="#1cb4e4" />
        <path d="M14.2 22.8a8.2 8.2 0 0 1 13.6 0" fill="none" stroke="#1cb4e4" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M10.2 18.6a13.4 13.4 0 0 1 21.6 0" fill="none" stroke="#0b3a5b" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M6.6 14.4a18.4 18.4 0 0 1 28.8 0" fill="none" stroke="#1cb4e4" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight" style={{ color: title }}>WirelessCom.Ca</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: sub }}>Stay connected</span>
      </span>
    </span>
  );
}
