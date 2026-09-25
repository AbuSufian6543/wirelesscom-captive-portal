import { cookies, headers } from "next/headers";
import { prisma } from "@/server/database/client";
import { randomToken, sha256 } from "@/server/shared/crypto";
import type { AuthUser } from "./guards";

const COOKIE = "wcp_session";
const TWELVE_HOURS = 60 * 60 * 12;

export async function createAdminSession(userId: string, ip: string, userAgent: string): Promise<string> {
  const token = randomToken(32);
  await prisma.adminSession.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + TWELVE_HOURS * 1000),
      ipAddress: ip.slice(0, 64),
      userAgent: userAgent.slice(0, 300),
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await cookieIsSecure(),
    path: "/",
    maxAge: TWELVE_HOURS,
  });
  return token;
}

export async function destroyAdminSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await prisma.adminSession.deleteMany({ where: { tokenHash: sha256(token) } });
  }
  jar.delete(COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      user: {
        include: {
          roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
          tenants: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;
  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const link of session.user.roles) {
    roles.push(link.role.key);
    for (const grant of link.role.permissions) permissions.add(grant.permission.key);
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    status: session.user.status,
    mustChangePassword: session.user.mustChangePassword,
    hasAllTenants: session.user.hasAllTenants,
    roles,
    permissions: [...permissions],
    tenantIds: session.user.tenants.map((row) => row.tenantId),
  };
}

async function cookieIsSecure(): Promise<boolean> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwarded === "https";
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { userId } });
}
