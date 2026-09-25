import { guestLegal } from "@/server/portal/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = new URL(request.url).searchParams.get("session") ?? "";
  return guestLegal(session, "terms");
}
