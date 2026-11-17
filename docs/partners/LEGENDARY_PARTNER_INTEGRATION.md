# Legendary.fun integrator API

Status: partner guide, 2026-11-17. Matches OpenAPI 0.6.0. Partner origin https://api.legendary.fun. Not a production audit. A valid API key is not an onchain fill.

Public source: https://github.com/xt0xdev/legendaryFunSDK. Intended npm name @legendary-fun/sdk is not on npm.

---

## Pinned constants

| Item | Value |
| --- | --- |
| Cluster | mainnet-beta |
| Factory | Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i |
| Genesis | 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d |
| CTO | 7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN |
| Tags | LGCNEW05 / LGCBUY05 / LGCSEL05 / LGGRAD05 |
| Trade ix | 52 bytes |

Pump and Meteora adapters overlay this factory. They do not impersonate Pump or Meteora program IDs. Graduated tokens already route on Jupiter as Raydium CPMM.

---

## Public reads (no API key)

These overlay the live factory list on legendary.fun.

| Method | Path | Notes |
| --- | --- | --- |
| GET | /api/mainnet/trade/catalog | Admitted tokens only |
| POST | /api/mainnet/trade/discovery | Factory launches the website lists |
| POST | /api/mainnet/trade/catalog | Mint quotes / market cap. Body { mints, version: 3 } |
| GET | /api/mainnet/trade/bootstrap | Factory, genesis, CTO |
| GET | /api/mainnet/trade/candles-swap/{mint}/1m | Live OHLCV |
| GET | /api/market/sol-usd | Display FX only |
| GET | /api/v1/tokens | Factory list + quotes |
| POST | /api/v1/quote | Integer curve quote. admitted:false |
| GET | /api/compat/pump/v3/coins/latest | Pump-shaped overlay |
| GET | /api/compat/meteora/v1/pools | DBC-shaped overlay |
| POST | /api/compat/meteora/v1/quote | Legendary integer quote overlay |

Unsigned /swap and public trade tape stay off. Failed or simulated transactions never appear as fills.

---

## Owner API key

Partner trades, token launch, claims, and rewards require header:

`x-legendary-api-key`

Keys are issued by the legendary.fun site owner (`LEGENDARY_OWNER_API_KEYS`). Missing key returns 401 API_KEY_REQUIRED. Invalid key returns 403 API_KEY. A valid key is not a mint, claim, or fill.

The legendary.fun website buy/sell buttons still use the token-page wallet session. Cookie create/rewards on the website stay same-origin.

---

## Trades (API key)

| Method | Path | Notes |
| --- | --- | --- |
| POST | /api/mainnet/trade/auth/challenge | SIWS challenge |
| POST | /api/mainnet/trade/auth/verify | Complete sign-in |
| POST | /api/mainnet/trade/prepare | Unsigned curve buy/sell |
| POST | /api/mainnet/trade/graduated/prepare | Unsigned Raydium-graduated trade |
| POST | /api/mainnet/trade/submit | Submit signed trade bytes |
| POST | /api/mainnet/trade/freshness | Refresh slot/revision |
| POST | /api/mainnet/trade/simulate | Simulate signed bytes |

SDK `prepare()`, Pump `buy()`/`sell()`, and Meteora `swap2()` call Legendary prepare with the owner key.

---

## Token launch, claims, and rewards (API key)

| Method | Path | Notes |
| --- | --- | --- |
| POST | /api/v1/create | Token launcher |
| GET | /api/v1/rewards | Rewards snapshot |
| POST | /api/v1/rewards/claim | Claim rewards |
| POST | /api/v1/graduation-claims | Graduation claims |
| POST | /api/compat/pump/v3/coins/create | Pump-shaped launcher, same key |

Hosted launch/claim execution is not deployed on the partner origin. After a valid key the route returns 501 NOT_DEPLOYED rather than a fake signature.

---

## SDK

```js
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({
  origin: 'https://api.legendary.fun',
  apiKey: process.env.LEGENDARY_OWNER_API_KEY,
});

const launches = await lg.native.discover({ query: '', limit: 50 });
const quote = await lg.native.quote({ mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000' });
const prepared = await lg.native.prepare({
  wallet: trader, mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000', slippageBps: 100,
});
```

`discover()` and `quote()` are public. `prepare()`, `submit()`, `create()`, and `claimRewards()` send the owner key.

Partner API: https://api.legendary.fun. Docs portal: https://developer.legendary.fun. OpenAPI: /openapi.json.
