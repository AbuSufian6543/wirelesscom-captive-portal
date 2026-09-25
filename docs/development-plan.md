# Development plan

Phase 1 is the captive-portal path: PostgreSQL, staff accounts, roles, tenants, AP-to-tenant resolution, guest HTML, terms, a validated redirect, the mock UniFi provider, NGINX snippets, and audit logging. That path is implemented and covered by `tests/platform.test.ts`.

Acceptance fixtures:

- `d0:21:f9:bc:38:d4` resolves to Pinos, SSID `Pinos-Guest`, redirect `https://pinos.ca`
- `aa:bb:cc:dd:ee:ff` resolves to Trinity, SSID `Trinity-Guest`, redirect `https://trinity.ca`
- An unknown AP is not authorized

The seed keeps those access points attached to the right tenant on later boots, including when the tenants already exist.

Phase 2 is the staff console: tenant and user management, the portal designer, guest lists, and analytics. Those screens are in `/admin`.

Phase 3 adds the real UniFi provider, vouchers, SMTP, password reset, and email campaigns.

Phase 4 adds the generic message API, OTP-ready sending, and SMS campaigns. Provider URLs and secrets stay in configuration, not in source.

`PORTAL_PUBLIC_IP` and `PORTAL_DOMAIN` stay in environment configuration. The application does not choose a tenant from either value.
