# Partner public API (additive)

New discovery routes for terminals. **Does not change** `/api/mainnet/trade/catalog` GET, `/api/mainnet/trade/bootstrap`, `/api/market/sol-usd`, or `/api/devnet/trade/*`.

Reads live factory discovery (`POST /api/mainnet/trade/discovery`) and mint quotes (`POST /api/mainnet/trade/catalog` `{mints, version:3}`) when those ports are provided, then overlays:

- Native `/api/v1/tokens`, `/api/v1/discovery`, `/api/v1/markets`
- Pump-shaped `/api/compat/pump/v3/coins/latest`
- Meteora-shaped `/api/compat/meteora/v1/pools`

The handler only answers `/api/v1/*`, `/api/compat/pump/v3/*`, and `/api/compat/meteora/v1/*`. Everything else returns `null` so the existing gateway keeps those paths.

Integer `POST /api/v1/quote` reads live curve state. Candles map `GET /api/mainnet/trade/candles-swap/{mint}/{interval}`. Trade prepare/submit, token launch, claims, and rewards require header `x-legendary-api-key` issued by the site owner (**401 API_KEY_REQUIRED** without a key).

```sh
node --test packages/partner-public-api/tests/*.test.mjs
```
