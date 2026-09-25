# Security

## Staff authentication

- Passwords are hashed with Argon2id (19 MiB, time cost 2, parallelism 1).
- The bootstrap password is read from `INITIAL_ADMIN_PASSWORD` at seed time and hashed with Argon2id. It is not written to logs. The unattended install value lives in `.env.example`.
- Users created later from the admin panel still start with `mustChangePassword`. The bootstrap admin can sign in with the configured password.
- Admin sessions are random 32-byte tokens. The database stores SHA-256 only. Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Password reset tokens are 32 random bytes, stored as SHA-256, expire after 30 minutes, and become useless after one successful use. Existing passwords are never emailed.
- Login and guest authentication are rate limited per IP and, for guests, per client MAC.

## Authorization

- `requireAuthentication` loads the session and rejects suspended users.
- `requireSuperAdmin` requires the `SUPER_ADMIN` role.
- `requireTenantAccess` allows a Super Admin, a user with `hasAllTenants`, or a `UserTenant` row for that id.
- `requireTenantAdmin` requires tenant access plus `TENANT_ADMIN` or Super Admin.
- Permission checks cover portal, voucher, campaign, and settings mutations.
- Only a Super Admin can create another Super Admin or set `hasAllTenants`.

Changing `/admin/tenants/<other-id>` or `?tenantId=` does not widen access.

## Guest path

- Tenant identity comes from the registered AP MAC.
- Unknown and invalid MACs are not authorized.
- Suspended tenants are not authorized.
- Pending sessions expire after 20 minutes and are single-use.
- The post-authentication redirect is the tenant URL saved by an authorized administrator. `javascript:`, `data:`, `file:`, `blob:`, protocol-relative URLs, and URLs with userinfo are rejected both on save and on use.
- Guest HTML escapes all tenant text. There is no raw HTML injection and no guest JavaScript.
- Content-Security-Policy on guest responses is `script-src 'none'`.
- UniFi, SMTP, and messaging errors shown to a guest are generic. Detail goes to the audit log after redaction.

## Secrets

- Controller passwords, SMTP passwords, and messaging API credentials are encrypted with AES-256-GCM using `APP_ENCRYPTION_KEY`.
- Audit metadata drops keys that look like passwords, tokens, secrets, or API keys.
- `.env` is gitignored. `.env.example` contains placeholders only.

## Network

- The application does not listen on 80 or 443.
- PostgreSQL and Redis have no host port mapping.
- Publish port 3000 only on a private address, and firewall it to the reverse proxy.
- `APP_TRUST_PROXY` trusts `X-Forwarded-*` because the app is not directly exposed. Leave the port unreachable from the public internet.

## Marketing

- Email and SMS campaigns select guest profiles of the authorized tenant that have a marketing-consent timestamp and no unsubscribe timestamp.
- Every marketing email includes an unsubscribe link.
- A Super Admin can operate across tenants. A tenant user cannot address another tenant's guests.
