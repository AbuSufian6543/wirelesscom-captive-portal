import { htmlResponse, submitGuestPortal } from "@/server/portal/service";
import { renderMessage } from "@/server/portal/render";
import { clientIp } from "@/server/shared/http";

export const dynamic = "force-dynamic";

export async function GET() {
  return htmlResponse(renderMessage("Tap Join again", "Return to the Wi-Fi screen and tap the button to connect."));
}

export async function POST(request: Request) {
  const form = await request.formData();
  return submitGuestPortal(form, clientIp(request));
}
