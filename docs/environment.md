# Environment variables

Copy `.env.example` to `.env`. `.env` is not committed.

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENV` | no | `development` or `production`. Production cookies are `Secure`. |
| `APP_HOST` | no | Bind address inside the container. Default `0.0.0.0` in Docker so the published port works. |
| `APP_PORT` | no | Internal listen port. Default `3000`. |
| `APP_BIND_HOST` | no | Host address Docker publishes. Default `127.0.0.1`. |
| `APP_TRUST_PROXY` | no | Honor `X-Forwarded-For` and `X-Forwarded-Proto`. |
| `PORTAL_PUBLIC_IP` | no | Shown in System Settings and NGINX docs. Not used to choose a tenant. |
| `PORTAL_DOMAIN` | no | Hostname of the dedicated vhost. |
| `PORTAL_FORCE_HTTPS` | no | Redirect that hostname from HTTP to HTTPS. |
| `APP_PUBLIC_URL` | no | Base URL in password-reset and unsubscribe links. |
| `DATABASE_URL` | yes | PostgreSQL URL. In Compose the host name is `db`. |
| `SESSION_SECRET` | yes | HMAC key for unsubscribe tokens. At least 32 characters. |
| `APP_ENCRYPTION_KEY` | yes | Base64 of 32 bytes for AES-256-GCM. |
| `INITIAL_ADMIN_EMAIL` | seed | First Super Admin. Default address is `abu@wirelesscom.ca`. |
| `INITIAL_ADMIN_PASSWORD` | seed | Used once, when that user does not exist. The unattended value is in `.env.example`. |
| `UNIFI_API_URL` | no | Optional default shown when creating a controller. |
| `UNIFI_API_USERNAME` | no | Optional default. |
| `UNIFI_API_PASSWORD` | no | Optional default. Not written into source. |
| `UNIFI_API_STYLE` | no | `UNIFI_OS` or `CLASSIC`. |
| `SMTP_HOST` | no | Platform SMTP. Empty disables sending. |
| `SMTP_PORT` | no | Default `587`. |
| `SMTP_USERNAME` | no | SMTP username. |
| `SMTP_PASSWORD` | no | SMTP password. |
| `SMTP_ENCRYPTION` | no | `NONE`, `STARTTLS`, or `TLS`. |
| `SMTP_FROM_EMAIL` | no | From address. |
| `SMTP_FROM_NAME` | no | From name. |
| `MESSAGE_API_URL` | no | Generic messaging endpoint. |
| `MESSAGE_API_KEY` | no | Sent as `Authorization: Bearer`. |
| `MESSAGE_API_SECRET` | no | Sent as `X-Api-Secret` when set. |
| `MESSAGE_SENDER_ID` | no | `from` field in the JSON body. |
| `REDIS_URL` | no | Reserved for a later multi-instance rate limiter. |

Generate secrets on the server:

```bash
openssl rand -base64 48
openssl rand -base64 32
```

Changing `PORTAL_PUBLIC_IP` or `PORTAL_DOMAIN` later is a configuration edit plus an NGINX reload and a UniFi External Portal Server update. No tenant, portal, or session code embeds the address.
