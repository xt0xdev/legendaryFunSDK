# Partner public API (additive)

New discovery routes for terminals. **Does not change** `/api/mainnet/trade/catalog`, `/api/mainnet/trade/bootstrap`, `/api/market/sol-usd`, or `/api/devnet/trade/*`.

The handler only answers `/api/v1/*` and `/api/compat/pump/v3/*`. Everything else returns `null` so the existing gateway keeps those paths.

Reads the existing catalog; does not sign, quote, or admit factory buys. Missing Pump trade/candle/create routes return **501**, not a fake success.

```sh
node --test packages/partner-public-api/tests/*.test.mjs
```
