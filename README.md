# Legendary.fun integrator kit

Public source for the **SDK**, **developer portal**, and **additive partner API**.

This is **not** the Legendary.fun DAP. Hosted swap, create, claims, Pump buy/sell, and empty tape return `404 DISABLED`. Integer quote and candles stay on. Existing catalog/bootstrap/fx on `https://legendary.fun` are unchanged. Site trading stays same-origin on the token page.

**Not on npm.** `@legendary-fun/sdk` is the intended name of `packages/partner-sdk-v5` and is `"private": true` until a publish is authorized.

## Live portal

- https://developer.legendary.fun
- https://legendary.devbyclaw.com (origin)

Partner prefixes are intended to run on `https://legendary.fun` (`/api/v1`, `/api/compat/pump/v3`, `/api/compat/meteora/v1`). Until that Next app is deployed, the portal overlay still serves the same additive reads.

## Layout

| Path | What it is |
| --- | --- |
| `packages/partner-sdk-v5` | Discovery client, integer quote, v5 unsigned `encodeTrade` |
| `packages/partner-public-api` | Additive `/api/v1`, Pump-shaped, Meteora-shaped routes |
| `apps/developer-portal` | Next.js site + proxy on port **8833** |
| `docs/partners` | Integration guide, PDF, OpenAPI |

## Run the website / API proxy

```sh
cd apps/developer-portal
npm ci
npm run build
npm start
# http://127.0.0.1:8833
```

Catalog, discovery, quotes, bootstrap, and candles are read from `https://legendary.fun`. Additive partner paths are served here until they ship on the main site.

## Use the SDK from this repo

```js
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({ origin: 'https://legendary.fun' });
const launches = await lg.native.discover({ query: '', limit: 50 });
const coins = await lg.pump.getLatestCoins();
const pools = await lg.meteora.getPools();
const quote = await lg.native.quote({ mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000' });
```

`create()`, `claimRewards()`, Pump `buy()`/`sell()`, and Meteora `swap2()` throw `DISABLED`. Execute on the legendary.fun token page.

```sh
node --test packages/partner-sdk-v5/tests/*.test.mjs
node --test packages/partner-public-api/tests/*.test.mjs
node --test apps/developer-portal/tests/*.test.mjs
```
