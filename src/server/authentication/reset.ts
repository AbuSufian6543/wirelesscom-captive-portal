import { prisma } from "@/server/database/client";
import { randomToken, sha256 } from "@/server/shared/crypto";
import { hashPassword, passwordIssues } from "./password";
import { revokeUserSessions } from "./session";

const THIRTY_MINUTES = 30 * 60 * 1000;

export type ResetStore = {
  findUserByEmail(email: string): Promise<{ id: string; email: string; name: string; status: string } | null>;
  saveToken(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findToken(tokenHash: string): Promise<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null } | null>;
  markUsed(id: string, usedAt: Date): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  revokeSessions(userId: string): Promise<void>;
  send(input: { to: string; name: string; link: string }): Promise<void>;
};

export async function requestPasswordReset(
  store: ResetStore,
  email: string,
  publicUrl: string,
  now = new Date(),
): Promise<void> {
  const user = await store.findUserByEmail(email.trim().toLowerCase());
  if (!user || user.status !== "ACTIVE") return;
  const token = randomToken(32);
  await store.saveToken({
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt: new Date(now.getTime() + THIRTY_MINUTES),
  });
  const base = publicUrl.replace(/\/$/, "");
  await store.send({
    to: user.email,
    name: user.name,
    link: `${base}/admin/reset-password?token=${encodeURIComponent(token)}`,
  });
}

export async function completePasswordReset(
  store: ResetStore,
  token: string,
  newPassword: string,
  now = new Date(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const issue = passwordIssues(newPassword);
  if (issue) return { ok: false, error: issue };
  const row = await store.findToken(sha256(token));
  if (!row || row.usedAt || row.expiresAt < now) return { ok: false, error: "This reset link is invalid or expired" };
  await store.markUsed(row.id, now);
  await store.updatePassword(row.userId, await hashPassword(newPassword));
  await store.revokeSessions(row.userId);
  return { ok: true };
}

export function prismaResetStore(send: ResetStore["send"]): ResetStore {
  return {
    async findUserByEmail(email) {
      return prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, status: true } });
    },
    async saveToken(input) {
      await prisma.passwordResetToken.create({ data: input });
    },
    async findToken(tokenHash) {
      return prisma.passwordResetToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, expiresAt: true, usedAt: true },
      });
    },
    async markUsed(id, usedAt) {
      await prisma.passwordResetToken.update({ where: { id }, data: { usedAt } });
    },
    async updatePassword(userId, passwordHash) {
      await prisma.user.update({ where: { id: userId }, data: { passwordHash, mustChangePassword: false } });
    },
    async revokeSessions(userId) {
      await revokeUserSessions(userId);
    },
    send,
  };
}
