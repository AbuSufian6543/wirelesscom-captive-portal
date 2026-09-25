import { openGuestPortal } from "@/server/portal/service";
import { clientIp } from "@/server/shared/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ site: string }> }) {
  const { site } = await context.params;
  const url = new URL(request.url);
  return openGuestPortal(site, url.searchParams, clientIp(request));
}
