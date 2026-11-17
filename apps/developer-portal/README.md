# developer.legendary.fun

One-page Next.js integrator portal. Serves the partner PDF, OpenAPI/Swagger explorer, SDK snippets, and the three integration paths (native, Pump-shaped, Meteora-shaped). Existing DAP catalog GET, factory discovery POST, catalog quote POST, bootstrap, and fx are proxied from `https://legendary.fun`. Additive `/api/v1`, `/api/compat/pump/v3`, and `/api/compat/meteora/v1` are served locally and overlay the factory list.

Wallet create and graduation claims stay on legendary.fun. Integer quote and candles are on. Hosted swap, create, claims, Pump buy/sell, and empty tape are 404 DISABLED.

Public hosts (both accepted):

- `https://developer.legendary.fun` (CNAME to the origin below)
- `https://legendary.devbyclaw.com` (origin)

```
npm run dev
# listens on 0.0.0.0:8833
# http://127.0.0.1:8833
```

Does not flip live `capabilities.buy/sell`.
