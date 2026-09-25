export const PERMISSIONS = [
  ["platform.super", "Full platform administration"],
  ["tenants.read", "View assigned tenants"],
  ["tenants.manage", "Create and manage tenants"],
  ["users.read", "View users"],
  ["users.manage", "Create and manage users"],
  ["users.assign_super_admin", "Grant Super Admin"],
  ["unifi.manage", "Manage UniFi infrastructure"],
  ["portal.manage", "Edit captive portal branding and content"],
  ["auth.manage", "Edit guest authentication methods"],
  ["vouchers.manage", "Manage vouchers"],
  ["guests.read", "View guest profiles"],
  ["sessions.read", "View guest sessions"],
  ["sessions.manage", "Revoke guest sessions"],
  ["analytics.read", "View analytics"],
  ["campaigns.manage", "Send email and SMS campaigns"],
  ["settings.manage", "Manage SMTP, messaging, and system settings"],
  ["audit.read", "View audit logs"],
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number][0];

export const ROLE_SEEDS = {
  SUPER_ADMIN: {
    name: "Super Admin",
    description: "Full access to every tenant and platform setting.",
    permissions: PERMISSIONS.map(([key]) => key),
  },
  TENANT_ADMIN: {
    name: "Tenant Admin",
    description: "Manage assigned tenants, portals, guests, and campaigns.",
    permissions: [
      "tenants.read",
      "users.read",
      "users.manage",
      "unifi.manage",
      "portal.manage",
      "auth.manage",
      "vouchers.manage",
      "guests.read",
      "sessions.read",
      "sessions.manage",
      "analytics.read",
      "campaigns.manage",
      "settings.manage",
      "audit.read",
    ],
  },
  TENANT_USER: {
    name: "Tenant User",
    description: "Read guest activity and analytics for assigned tenants.",
    permissions: ["tenants.read", "guests.read", "sessions.read", "analytics.read", "audit.read"],
  },
} as const;

export type RoleKey = keyof typeof ROLE_SEEDS;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  mustChangePassword: boolean;
  hasAllTenants: boolean;
  roles: string[];
  permissions: string[];
  tenantIds: string[];
};

export class AuthzError extends Error {
  status: 401 | 403;
  constructor(status: 401 | 403, message: string) {
    super(message);
    this.status = status;
  }
}

export function hasRole(user: AuthUser, role: string): boolean {
  return user.roles.includes(role);
}

export function isSuperAdmin(user: AuthUser): boolean {
  return hasRole(user, "SUPER_ADMIN");
}

export function hasPermission(user: AuthUser, permission: PermissionKey): boolean {
  if (isSuperAdmin(user)) return true;
  return user.permissions.includes(permission);
}

export function canAccessTenant(user: AuthUser, tenantId: string): boolean {
  if (user.status !== "ACTIVE") return false;
  if (isSuperAdmin(user) || user.hasAllTenants) return true;
  return user.tenantIds.includes(tenantId);
}

export function requireAuthentication(user: AuthUser | null): AuthUser {
  if (!user || user.status !== "ACTIVE") throw new AuthzError(401, "Authentication required");
  return user;
}

export function requireSuperAdmin(user: AuthUser | null): AuthUser {
  const auth = requireAuthentication(user);
  if (!isSuperAdmin(auth)) throw new AuthzError(403, "Super Admin access required");
  return auth;
}

export function requireTenantAccess(user: AuthUser | null, tenantId: string): AuthUser {
  const auth = requireAuthentication(user);
  if (!canAccessTenant(auth, tenantId)) throw new AuthzError(403, "You do not have access to this tenant");
  return auth;
}

export function requireTenantAdmin(user: AuthUser | null, tenantId: string): AuthUser {
  const auth = requireTenantAccess(user, tenantId);
  if (isSuperAdmin(auth) || hasRole(auth, "TENANT_ADMIN")) return auth;
  throw new AuthzError(403, "Tenant administrator access required");
}

export function requirePermission(user: AuthUser | null, permission: PermissionKey, tenantId?: string): AuthUser {
  const auth = tenantId ? requireTenantAccess(user, tenantId) : requireAuthentication(user);
  if (!hasPermission(auth, permission)) throw new AuthzError(403, "Missing permission");
  return auth;
}
