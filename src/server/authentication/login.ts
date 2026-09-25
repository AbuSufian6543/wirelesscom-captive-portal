import { prisma } from "@/server/database/client";
import { verifyPassword } from "./password";
import { rateLimit } from "@/server/shared/rate-limit";
import { audit } from "@/server/audit/log";
import { createAdminSession } from "./session";

export async function loginWithPassword(email: string, password: string, ip: string, userAgent: string) {
  const normalized = email.trim().toLowerCase();
  if (!rateLimit(`login:${ip}`, 8, 15 * 60 * 1000)) {
    return { ok: false as const, error: "Too many attempts. Try again later." };
  }
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  const valid = user ? await verifyPassword(user.passwordHash, password) : false;
  if (!user || !valid || user.status !== "ACTIVE") {
    await audit({ actorId: user?.id, action: "auth.login", result: "FAILURE", ipAddress: ip, metadata: { email: normalized } });
    return { ok: false as const, error: "Invalid email or password" };
  }
  await createAdminSession(user.id, ip, userAgent);
  await audit({ actorId: user.id, action: "auth.login", result: "SUCCESS", ipAddress: ip });
  return { ok: true as const, mustChangePassword: user.mustChangePassword };
}
