# API design

Staff work is done in the admin UI, which calls the same authorization guards as the HTTP API. Implemented JSON routes are listed below. The other admin operations (users, UniFi, portals, vouchers, campaigns, SMTP, messaging) are available in the dashboard and use `requireSuperAdmin`, `requireTenantAccess`, and `requireTenantAdmin`. Errors are `{ "error": "..." }` with status 400, 401, 403, or 404. Responses never include password hashes, SMTP passwords, API secrets, or session tokens.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Email and password. Sets `wcp_session`. |
| POST | `/api/v1/auth/logout` | Revokes the session and returns to the sign-in page. |

## Platform

| Method | Path | Authorization |
| --- | --- | --- |
| GET | `/api/v1/tenants` | Authenticated. Returns only tenants the caller can access. |
| GET | `/api/health` | Unauthenticated liveness. No secrets. |

Password change, forgot-password, and reset-password are staff pages at `/admin/change-password`, `/admin/forgot-password`, and `/admin/reset-password`.

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
