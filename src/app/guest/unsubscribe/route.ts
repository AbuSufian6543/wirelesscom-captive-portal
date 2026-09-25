import { prisma } from "@/server/database/client";
import { sha256 } from "@/server/shared/crypto";
import { renderMessage } from "@/server/portal/render";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const channel = url.searchParams.get("channel") === "sms" ? "sms" : "email";
  const setting = await prisma.systemSetting.findUnique({ where: { key: `unsub:${sha256(token)}` } });
  const value = setting?.value as { guestClientId?: string } | null;
  if (value?.guestClientId) {
    await prisma.guestClient.update({
      where: { id: value.guestClientId },
      data: channel === "sms" ? { smsUnsubscribedAt: new Date() } : { emailUnsubscribedAt: new Date() },
    });
  }
  return new Response(renderMessage("Unsubscribed", "You will no longer receive marketing messages from this location."), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
