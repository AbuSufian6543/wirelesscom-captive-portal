# API design

JSON routes live under `/api/v1` and require an admin session cookie except for login, forgot-password, and reset-password. Errors are `{ "error": "..." }` with status 400, 401, 403, or 404. Responses never include password hashes, SMTP passwords, API secrets, or session tokens.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Email and password. Sets `wcp_session`. |
| POST | `/api/v1/auth/logout` | Revokes the session. |
| POST | `/api/v1/auth/change-password` | Authenticated password change. |
| POST | `/api/v1/auth/forgot-password` | Always returns ok. Sends a reset only when the account exists. |
| POST | `/api/v1/auth/reset-password` | Consumes a single-use token. |

## Platform

| Method | Path | Authorization |
| --- | --- | --- |
| GET, POST | `/api/v1/tenants` | Read: tenant access. Create: Super Admin. |
| GET, PATCH | `/api/v1/tenants/:id` | `requireTenantAccess`. Status changes: Super Admin. |
| GET, POST | `/api/v1/users` | Super Admin, or a tenant admin for users they may see. |
| PATCH, DELETE | `/api/v1/users/:id` | Super Admin. Tenant admins cannot create Super Admins. |
| GET | `/api/v1/roles` | Any authenticated staff. |
| POST | `/api/v1/roles` | Super Admin. |
| GET, POST | `/api/v1/unifi/controllers` | Tenant admin of that tenant. |
| GET, POST | `/api/v1/unifi/sites` | Tenant admin. |
| GET, POST | `/api/v1/unifi/ssids` | Tenant admin. |
| GET, POST | `/api/v1/unifi/access-points` | Tenant admin. |
| GET, PUT | `/api/v1/portals/:tenantId` | Tenant admin. |
| GET, PUT | `/api/v1/authentication/:tenantId` | Tenant admin. |
| GET, POST | `/api/v1/vouchers?tenantId=` | Tenant admin. |
| POST | `/api/v1/vouchers/:id/revoke` | Tenant admin. |
| GET | `/api/v1/sessions?tenantId=` | Tenant access. |
| POST | `/api/v1/sessions/:id/revoke` | Tenant admin. |
| GET | `/api/v1/guests?tenantId=` | Tenant access. |
| GET | `/api/v1/analytics?tenantId=` | Tenant access. Omit `tenantId` only for platform-wide Super Admin. |
| GET | `/api/v1/audit?tenantId=` | Tenant access. Platform-wide: Super Admin. |
| PUT | `/api/v1/smtp` | Super Admin for platform, tenant admin for a tenant override. |
| PUT | `/api/v1/messaging` | Same as SMTP. |
| POST | `/api/v1/campaigns/email` | `campaigns.manage` on that tenant. |
| POST | `/api/v1/campaigns/sms` | `campaigns.manage` on that tenant. |
| GET | `/api/health` | Unauthenticated liveness. No secrets. |

## Guest endpoints

These are HTML, not JSON.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/guest/s/:site/` | Parse UniFi parameters, resolve the AP, render that tenant's portal. |
| POST | `/guest/authenticate` | Validate the pending session and authorize the client. |
| GET | `/guest/terms?session=` | That session's tenant terms. |
| GET | `/guest/privacy?session=` | That session's tenant privacy text. |
| GET | `/guest/unsubscribe?token=` | Marketing unsubscribe. |

The `:site` path segment is stored for correlation. It is not the tenant id.
