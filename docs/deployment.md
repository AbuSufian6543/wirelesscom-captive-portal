# Deployment

The application server is Ubuntu. NGINX stays on its own server. This host publishes the Node process on `APP_BIND_HOST:APP_PORT` and does not open 80 or 443.

## First boot

```bash
cd /opt/wirelesscom-captive-portal
chmod +x deploy.sh
./deploy.sh
```

`deploy.sh` installs Docker if it is missing, creates `.env` from `.env.example`, generates `SESSION_SECRET` and `APP_ENCRYPTION_KEY`, binds the app to this server's private IP on port 3000, builds the image, starts PostgreSQL on the internal Docker network, applies migrations, and runs the idempotent seed. The initial admin password is already set in `.env.example`.

Allow only the NGINX server to reach port 3000.

## Updates

```bash
git pull
./deploy.sh --update
```

`--update` rebuilds the image, recreates the containers, applies migrations, and runs the seed again. The seed does not rotate an existing admin password or overwrite portal copy that an administrator has changed. It only inserts missing system roles, permissions, and the original tenant records when those slugs are absent.

## What the script refuses to do

- It does not install or reload NGINX. Copy the rendered snippet to the proxy using `docs/nginx.md`.
- It does not publish 5432 or 6379.
- It does not print `INITIAL_ADMIN_PASSWORD`.

## Firewall example

```bash
sudo ufw allow from <nginx-private-ip> to any port 3000 proto tcp
sudo ufw deny 5432
sudo ufw deny 6379
```

## Health

```bash
curl -fsS "http://127.0.0.1:3000/api/health"
```

Then, from a guest VLAN or with a crafted query, open `/guest/s/default/?ap=<registered-mac>&id=<client-mac>&t=<unix>&url=http://www.msftconnecttest.com/redirect&ssid=<ssid>` and confirm the branding matches that AP's tenant.

## Logs

```bash
docker compose logs -f app
```

Application logs are JSON. They omit passwords and API secrets.
