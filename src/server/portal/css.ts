const BLOCKED = /<|>|url\s*\(|@import|expression\s*\(|javascript:|behavior\s*:|@charset|@namespace|<\/style/i;

export function sanitizeCustomCss(input: string): string {
  return input
    .split("\n")
    .filter((line) => !BLOCKED.test(line))
    .join("\n")
    .slice(0, 8000);
}
