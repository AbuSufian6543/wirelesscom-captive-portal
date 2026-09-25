# NGINX integration

The reverse proxy is a separate server and already hosts other sites. Do not replace its `sites-enabled` directory. Add one dedicated vhost for the captive-portal hostname, and add a small snippet to the server that owns the public IP so UniFi's IP URL reaches this app.

Templates:

- `infrastructure/nginx/captive-portal-domain.conf.template` — `server_name` is `PORTAL_DOMAIN`. The whole hostname is proxied to the app, including `/admin`.
- `infrastructure/nginx/unifi-captive-portal.conf.template` — `location` blocks for `/guest/`, `/media/`, and `/branding/` only. Include this inside the existing IP or default server. Other locations stay untouched.

Render both with the deployment values:

```bash
export PORTAL_DOMAIN=captive.example.com
export PORTAL_UPSTREAM=10.0.0.5:3000
export CERT_NAME=captive.example.com
envsubst '${PORTAL_DOMAIN} ${PORTAL_UPSTREAM} ${CERT_NAME}' \
  < infrastructure/nginx/captive-portal-domain.conf.template \
  > /etc/nginx/sites-available/captive-portal.conf
envsubst '${PORTAL_UPSTREAM}' \
  < infrastructure/nginx/unifi-captive-portal.conf.template \
  > /etc/nginx/snippets/unifi-captive-portal.conf
```

Inside the existing server that answers for the public IP:

```nginx
include /etc/nginx/snippets/unifi-captive-portal.conf;
```

Then `nginx -t` and reload. Do not enable a new default server that would catch other hostnames.

## HTTPS

Issue a certificate for `PORTAL_DOMAIN` with the mechanism this proxy already uses (certbot, acme.sh, or a managed certificate). The domain vhost listens on 443 and redirects port 80 to HTTPS with `$request_uri`, which preserves `ap`, `id`, `t`, `url`, and `ssid`.

Do not force HTTP→HTTPS for the raw IP. UniFi is configured with an IP, and a certificate error in a captive mini browser blocks detection endpoints such as `http://www.msftconnecttest.com/redirect`. The IP path stays HTTP. The hostname path is HTTPS.

`PORTAL_FORCE_HTTPS=true` makes the application repeat that hostname-only redirect when `Host` equals `PORTAL_DOMAIN`.

## Upstream

`PORTAL_UPSTREAM` is the private address of this application, for example `10.0.0.5:3000` or `127.0.0.1:3000` when the proxy is local. It is not the public IP.

Proxy headers set `X-Forwarded-For`, `X-Forwarded-Proto`, and `Host`. WebSocket headers are harmless and unused by the guest portal.
