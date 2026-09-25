# Architecture

WirelessCom Captive Portal is one application, one PostgreSQL database, one captive-portal engine, and one NGINX integration path. WirelessCom.Ca Inc. operates the platform and is also a tenant. Customer tenants such as Pinos and Trinity are ordinary rows in `tenants`. Nothing in the request path branches on a customer name.

## Runtime

```
UniFi AP  ->  guest device
                 |
                 v
        http://<PORTAL_PUBLIC_IP>/guest/s/<site>/?ap&id&t&url&ssid
                 |
                 v
     Existing NGINX reverse proxy (ports 80 and 443)
       dedicated vhost for PORTAL_DOMAIN
       snippet on the IP/default vhost for /guest/, /media/, /branding/ only
                 |
                 v
     This application on APP_BIND_HOST:APP_PORT (never 80 or 443)
                 |
                 v
     PostgreSQL (Docker network only, no published port)
```

The public IP, portal domain, UniFi controller, SMTP server, and messaging API are environment or database settings. Replacing them does not require an application change.

## Modules

| Path | Responsibility |
| --- | --- |
| `src/server/shared` | Environment, MAC addresses, safe redirects, encryption, rate limits |
| `src/server/database` | Prisma client |
| `src/server/authentication` | Passwords, admin sessions, authorization, password reset |
| `src/server/tenant` | Tenant resolution from a registered AP MAC |
| `src/server/portal` | UniFi query parsing, guest HTML, guest authentication |
| `src/server/unifi` | `UniFiProvider`, mock provider, real controller provider |
| `src/server/email` | Generic SMTP email |
| `src/server/messaging` | Generic HTTP messaging API |
| `src/server/audit` | Audit log with secret redaction |
| `src/app/guest` | Captive-portal HTTP endpoints (raw HTML, no app shell) |
| `src/app/admin` | Staff dashboard |
| `src/app/api/v1` | JSON API used by automation and the dashboard |
| `infrastructure/nginx` | Snippets for the separate reverse proxy |
| `prisma` | Schema, migration, idempotent seed |

## Tenant isolation

Every tenant-owned table has `tenant_id`. Access points have a globally unique MAC, so one AP cannot belong to two tenants. Guest requests never choose a tenant. The server loads the AP, then its site, controller, and tenant.

Staff requests pass `requireAuthentication`, then `requireSuperAdmin`, `requireTenantAccess`, or `requireTenantAdmin`. A user assigned to one tenant who changes a URL or API id receives 403. Super Admins and users with `hasAllTenants` may cross tenants. That grant is stored on the user, not taken from the request.

## Guest experience

`GET /guest/s/[site]` returns a single HTML document with inlined CSS, no JavaScript, no external fonts, and a normal form POST. That keeps captive-portal mini browsers on Windows, iOS, Android, and macOS from waiting on bundles or third-party hosts. After a successful local authentication the app calls `UniFiProvider.authorizeGuest` and redirects only to the tenant's validated `redirectUrl`.

## Providers

`UniFiProvider` isolates controller calls. Seeded controllers use `MockUniFiProvider`, so the three initial networks can be exercised without a live controller. A controller can be switched to `RealUniFiProvider` (`UNIFI_OS` or `CLASSIC`) in the admin panel.

`EmailService` and `MessageService` read platform or per-tenant configuration. They are unused until SMTP or the messaging API is filled in, and neither provider name is hard-coded.

## Roles

Roles and permissions are tables. `SUPER_ADMIN`, `TENANT_ADMIN`, and `TENANT_USER` are seeded system roles. Additional roles such as `ANALYST` or `MARKETING_MANAGER` can be created from the admin panel and given a permission subset.

## Bootstrap

On first boot the seed creates the platform-owner tenant, the initial customer tenants, mock UniFi infrastructure, portal content, and the first Super Admin from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD`. The password is hashed with Argon2id and is not written to logs. Later seeds do not reset that password. The account must change its password on first login.
