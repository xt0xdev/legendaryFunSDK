# Legendary.fun integrator kit

Public source for the **SDK**, **developer portal**, and **additive partner API**.

This is **not** the Legendary.fun DAP. Existing catalog/bootstrap/fx on `https://legendary.fun` are unchanged. Partner trades, token launch, claims, and rewards require header `x-legendary-api-key` issued by the site owner.

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

Catalog, discovery, quotes, bootstrap, and candles are read from `https://legendary.fun`. Trade prepare/submit, create, claims, and rewards require `x-legendary-api-key`.

## Use the SDK from this repo

```js
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({
  origin: 'https://legendary.fun',
  apiKey: process.env.LEGENDARY_OWNER_API_KEY,
});
const launches = await lg.native.discover({ query: '', limit: 50 });
const coins = await lg.pump.getLatestCoins();
const pools = await lg.meteora.getPools();
const quote = await lg.native.quote({ mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000' });
const prepared = await lg.native.prepare({
  wallet: trader, mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000', slippageBps: 100,
});
```

Missing keys return `API_KEY_REQUIRED`. A valid key is not an onchain fill. Site trading on legendary.fun still uses the token-page wallet session.

```sh
node --test packages/partner-sdk-v5/tests/*.test.mjs
node --test packages/partner-public-api/tests/*.test.mjs
node --test apps/developer-portal/tests/*.test.mjs
```
