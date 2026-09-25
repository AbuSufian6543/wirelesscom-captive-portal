# Database schema

PostgreSQL via Prisma. The canonical model is `prisma/schema.prisma`. The first migration is `prisma/migrations/20260925120000_init`.

## Identity and access

- `User` — staff account. `passwordHash` is Argon2id. `mustChangePassword` is set for the bootstrap admin and for admin-created users. `hasAllTenants` grants every current and future tenant without enumerating them.
- `Role`, `Permission`, `RolePermission`, `UserRole` — extensible RBAC. System roles cannot be deleted.
- `UserTenant` — explicit tenant grants. A Pinos administrator has a row for Pinos only.
- `AdminSession` — stores the SHA-256 of the cookie token, not the token.
- `PasswordResetToken` — stores the SHA-256 of a single-use token and `usedAt`.

## Tenancy and UniFi

- `Tenant` — `kind` is `PLATFORM_OWNER` or `CUSTOMER`, `status` is `ACTIVE`, `SUSPENDED`, or `ARCHIVED`.
- `UnifiController` — belongs to one tenant. Secrets are encrypted. `mode` is `MOCK` or `REAL`.
- `UnifiSite` — belongs to one controller and denormalizes `tenantId`.
- `UnifiSsid` — belongs to one site.
- `UnifiAccessPoint` — `mac` is unique across the platform.
- `ApSsid` — which SSIDs an AP broadcasts.

Resolution path: AP MAC → access point → site → controller → tenant → portal configuration.

## Guest portal

- `PortalConfiguration` — one row per tenant: branding, copy, field modes, session length, bandwidth hints, and redirect URL.
- `AuthenticationMethod` — `ACCEPT_TERMS`, `EMAIL`, `VOUCHER`, `PASSWORD`, with an optional Argon2id hash for the shared password method.
- `GuestClient` — unique per `(tenantId, mac)`. Consent is stored as version plus timestamp (`termsAcceptedAt`, `privacyAcceptedAt`, `marketingConsentAt`), plus unsubscribe timestamps.
- `GuestSession` — `PENDING`, `AUTHENTICATED`, `EXPIRED`, `REVOKED`, `FAILED`, with AP, client, SSID, site, original URL, and expiry.
- `GuestAuthenticationEvent` — success or failure for each attempt.
- `Voucher`, `VoucherRedemption` — codes are unique per tenant.

## Messaging and operations

- `SmtpConfiguration` and `MessageApiConfiguration` — platform row (`tenantId` null) or a tenant override. Passwords, API keys, and API secrets are encrypted.
- `EmailCampaign`, `EmailRecipient`, `SmsCampaign`, `SmsRecipient`.
- `AnalyticsEvent` — portal views and authentication outcomes.
- `AuditLog` — actor, tenant, action, result, IP, user agent, redacted metadata.
- `SystemSetting` — non-secret platform preferences.

Tenant-owned operational tables include `tenantId` and are queried with that predicate after the authorization check. Audit and SMTP platform rows may have a null `tenantId`.
