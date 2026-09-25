# API

Staff JSON routes and the guest HTML endpoints are described in `docs/api-design.md`.

The guest contract used by UniFi is:

```
GET /guest/s/:site/?ap=&id=&t=&url=&ssid=
POST /guest/authenticate
```

`:site` is stored for correlation. The tenant is resolved from the registered AP MAC. A guest-supplied tenant id is not accepted.
