const CAPTIVE_CHECK = /msftconnecttest|msftncsi|captive\.apple|connectivitycheck|generate_204|gstatic\.com|neverssl|nmcheck|detectportal|firefox\.com\/success/i;

export function postAuthRedirect(originalUrl: string, tenantUrl: string): string {
  if (originalUrl && CAPTIVE_CHECK.test(originalUrl)) return originalUrl;
  if (tenantUrl) return tenantUrl;
  return originalUrl;
}
