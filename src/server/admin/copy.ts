import type { AuthUser } from "@/server/authentication/guards";
import { isSuperAdmin } from "@/server/authentication/guards";
import { prisma } from "@/server/database/client";

export type CustomerOption = { id: string; name: string; status: string };

export async function listCustomers(user: AuthUser): Promise<CustomerOption[]> {
  return prisma.tenant.findMany({
    where: isSuperAdmin(user) || user.hasAllTenants ? undefined : { id: { in: user.tenantIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, status: true },
  });
}

export function pickCustomer(customers: CustomerOption[], requested?: string | null): CustomerOption | null {
  if (!customers.length) return null;
  return customers.find((item) => item.id === requested) ?? customers[0] ?? null;
}

export function methodLabel(method: string): string {
  switch (method) {
    case "ACCEPT_TERMS":
      return "Accept terms and continue";
    case "EMAIL":
      return "Email address";
    case "VOUCHER":
      return "Access code";
    case "PASSWORD":
      return "Shared password";
    default:
      return method;
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "SUSPENDED":
      return "Paused";
    case "ARCHIVED":
      return "Archived";
    case "PENDING":
      return "Waiting";
    case "AUTHENTICATED":
      return "Online";
    case "EXPIRED":
      return "Ended";
    case "REVOKED":
      return "Disconnected";
    case "FAILED":
      return "Failed";
    case "EXHAUSTED":
      return "Used up";
    default:
      return status;
  }
}

export function fieldNeedLabel(mode: string): string {
  switch (mode) {
    case "HIDDEN":
      return "Do not ask";
    case "OPTIONAL":
      return "Optional";
    case "REQUIRED":
      return "Required";
    default:
      return mode;
  }
}
