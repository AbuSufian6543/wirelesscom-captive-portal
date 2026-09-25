import { prisma } from "@/server/database/client";
import { redact } from "@/server/shared/log";

export async function audit(input: {
  actorId?: string | null;
  tenantId?: string | null;
  action: string;
  result: "SUCCESS" | "FAILURE";
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      tenantId: input.tenantId ?? null,
      action: input.action,
      result: input.result,
      ipAddress: (input.ipAddress ?? "").slice(0, 64),
      userAgent: (input.userAgent ?? "").slice(0, 300),
      metadata: input.metadata ? (redact(input.metadata) as object) : undefined,
    },
  });
}
