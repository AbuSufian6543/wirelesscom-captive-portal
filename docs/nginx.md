# NGINX integration

UniFi’s External Portal Server is an IP. Phones therefore request:

```
http://64.141.110.164/guest/s/default/?ap=...&id=...&t=...&url=...&ssid=...
```

`captive.wirelesscom.org` is a separate hostname. If that hostname is the only vhost that proxies to this app, the IP request never arrives here. The guest mini-browser sits on a blank page or on another website.

## What to add on the NGINX server

Do not replace existing sites. Edit the `server { }` that already answers for `64.141.110.164` (often the default port-80 server) and paste `infrastructure/nginx/add-to-ip-server.conf`.

Replace `APP_PRIVATE_IP` with the Ubuntu machine that runs `./deploy.sh`.

```nginx
include /etc/nginx/snippets/add-to-ip-server.conf;
```

Then:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Test from any computer:

```bash
curl -sS "http://64.141.110.164/api/health"
curl -sS "http://64.141.110.164/guest/s/default/?ap=d0:21:f9:bc:38:d4&id=e4:a7:a0:74:f9:b9&t=1790349699&url=http://www.msftconnecttest.com/redirect&ssid=Captive%20Portal%20Test%20SE"
```

The first command must return JSON with `"ok":true`. The second must return HTML that says Pinos (that access point belongs to Pinos).

The staff console can stay on `https://captive.wirelesscom.org/admin/login`. A ready vhost is `infrastructure/nginx/captive.wirelesscom.org.conf`.

## HTTPS

Issue the certificate for `captive.wirelesscom.org` the same way the other sites on this proxy get certificates. The domain vhost may redirect HTTP to HTTPS with `$request_uri`, which keeps `ap`, `id`, `t`, `url`, and `ssid`.

Do not force HTTPS on the raw IP. UniFi is configured with an IP. A certificate error in a captive mini-browser blocks Windows, iOS, and Android detection.

## Upstream

`APP_PRIVATE_IP:3000` is the application server, not `64.141.110.164`. Allow that port from the NGINX server only.
