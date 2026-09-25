import { submitGuestPortal } from "@/server/portal/service";
import { clientIp } from "@/server/shared/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const form = await request.formData();
  return submitGuestPortal(form, clientIp(request));
}
