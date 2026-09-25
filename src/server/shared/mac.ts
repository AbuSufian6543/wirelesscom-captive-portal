const MAC = /^[0-9a-f]{2}(?::[0-9a-f]{2}){5}$/;

export function normalizeMac(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  const hex = trimmed.replace(/[^0-9a-f]/g, "");
  if (hex.length !== 12) return null;
  const mac = hex.match(/.{2}/g)!.join(":");
  if (!MAC.test(mac)) return null;
  if (mac === "00:00:00:00:00:00" || mac === "ff:ff:ff:ff:ff:ff") return null;
  return mac;
}

export function isMac(value: string): boolean {
  return MAC.test(value);
}
