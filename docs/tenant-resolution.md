# Tenant resolution

UniFi's External Portal Server is configured with `PORTAL_PUBLIC_IP`. A client association produces a request like:

```
GET /guest/s/default/?ap=d0:21:f9:bc:38:d4&id=e4:a7:a0:74:f9:b9&t=1790349699&url=http://www.msftconnecttest.com/redirect&ssid=Captive%20Portal%20Test%20SE
```

## Steps

1. Read `ap`, `id`, `t`, `url`, and `ssid` from the query string only.
2. Normalize `ap` and `id` to lowercase colon-separated MAC addresses. Reject anything else. Do not authorize.
3. Require `t` to be an integer. Keep it as the controller timestamp. A skewed clock does not block the guest, but a non-numeric value does.
4. Keep `url` only when it is a plain http(s) URL without credentials. Never use it as the post-login redirect unless a future setting explicitly says so. The default destination is the tenant `redirectUrl`.
5. Trim `ssid` and drop control characters.
6. Load `UnifiAccessPoint` by the normalized AP MAC.
7. If the AP is missing, disabled, or its tenant is not `ACTIVE`, render "This Wi-Fi network is not registered" or the suspended message. Do not call UniFi authorize.
8. Load the AP's site, controller, and tenant. Ignore any tenant id in the query string. There isn't one, and a supplied one would not be trusted.
9. If `ssid` matches an SSID linked to that AP, record that SSID. A mismatch does not reassign the tenant; the AP is authoritative.
10. Load `PortalConfiguration` and enabled `AuthenticationMethod` rows and render them.

The path value `default` is UniFi's site key. Many controllers use `default` for every site, so it cannot select a customer.

## Initial infrastructure

The seed inserts three tenants and three access points as data:

| Tenant | Kind | Example AP MAC | Redirect |
| --- | --- | --- | --- |
| WirelessCom.Ca Inc. | PLATFORM_OWNER | `d0:21:f9:bc:38:01` | `https://wirelesscom.ca` |
| Pinos | CUSTOMER | `d0:21:f9:bc:38:d4` | `https://pinos.ca` |
| Trinity | CUSTOMER | `aa:bb:cc:dd:ee:ff` | `https://trinity.ca` |

Those MACs exist so the mock provider and the test suite can prove isolation. Adding the next customer is an admin-panel operation: create the tenant, controller, site, SSID, and AP. No deploy is required.

## After authentication

The pending `GuestSession` is bound to the resolved tenant, AP, and client MAC. The POST must present that session id. The server authorizes `clientMac` on that tenant's controller for `sessionDurationMinutes` (or the voucher duration) and then redirects to the stored safe URL.
