# Partner public API (additive)

New discovery routes for terminals. **Does not change** `/api/mainnet/trade/catalog` GET, `/api/mainnet/trade/bootstrap`, `/api/market/sol-usd`, or `/api/devnet/trade/*`.

Reads live factory discovery (`POST /api/mainnet/trade/discovery`) and mint quotes (`POST /api/mainnet/trade/catalog` `{mints, version:3}`) when those ports are provided, then overlays:

- Native `/api/v1/tokens`, `/api/v1/discovery`, `/api/v1/markets`
- Pump-shaped `/api/compat/pump/v3/coins/latest`
- Meteora-shaped `/api/compat/meteora/v1/pools`

The handler only answers `/api/v1/*`, `/api/compat/pump/v3/*`, and `/api/compat/meteora/v1/*`. Everything else returns `null` so the existing gateway keeps those paths.

Does not sign or host execute. Integer `POST /api/v1/quote` reads live curve state. Candles map `GET /api/mainnet/trade/candles-swap/{mint}/{interval}`. Create, claims, hosted swap, Pump buy/sell, and empty tape routes are **404 DISABLED**. Site trading stays on legendary.fun same-origin.

```sh
node --test packages/partner-public-api/tests/*.test.mjs
```
