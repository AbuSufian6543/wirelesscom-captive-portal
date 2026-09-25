# WirelessCom Captive Portal

Multi-tenant UniFi captive portal operated by WirelessCom.Ca Inc. One application and one PostgreSQL database serve the platform owner and every customer tenant. Guest traffic arrives through the existing NGINX reverse proxy. This process listens on a private port only.

## Start here

- Architecture: `docs/architecture.md`
- Deployment on Ubuntu: `docs/deployment.md` and `./deploy.sh`
- Updates: `./deploy.sh --update`
- NGINX snippet for the separate proxy: `docs/nginx.md`
- Local development and tests: `docs/development.md`

## Guest path

UniFi sends browsers to `/guest/s/default/` with `ap`, `id`, `t`, `url`, and `ssid`. The access-point MAC selects the tenant. Pinos branding cannot be loaded by a Trinity AP, and a guest cannot choose a tenant id.

## Staff path

Sign in at `/admin/login`. The first Super Admin is created from `INITIAL_ADMIN_EMAIL` and `INITIAL_ADMIN_PASSWORD` and must change that password immediately.
