import { getCurrentUser } from "@/server/authentication/session";
import { isSuperAdmin, requireAuthentication } from "@/server/authentication/guards";
import { prisma } from "@/server/database/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = requireAuthentication(await getCurrentUser());
    const tenants = await prisma.tenant.findMany({
      where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } },
      select: { id: true, name: true, slug: true, kind: true, status: true },
    });
    return NextResponse.json({ tenants });
  } catch {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
}
