# Legendary.fun integrator kit

Public source for the **SDK**, **developer portal**, and **additive API proxy**.

This is **not** the Legendary.fun DAP. Quote, swap, and trade tape return `501 NOT_ADMITTED`. Existing catalog/bootstrap/fx on `https://legendary.fun` are unchanged.

**Not on npm.** `@legendary-fun/sdk` is the intended name of `packages/partner-sdk-v5` and is `"private": true` until a publish is authorized.

## Live portal

- https://legendary.devbyclaw.com/
- `developer.legendary.fun` is planned as a CNAME to that host (DNS not live yet)

## Layout

| Path | What it is |
| --- | --- |
| `packages/partner-sdk-v5` | Discovery client + v5 unsigned `encodeTrade` |
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

Catalog/bootstrap/sol-usd are proxied from `https://legendary.fun`. Additive partner paths are served here.

## Use the SDK from this repo

```js
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({ origin: 'https://legendary.devbyclaw.com' });
const catalog = await lg.native.catalog();
const coins = await lg.pump.getLatestCoins();
const pools = await lg.meteora.getPools();
```

`quote()`, Pump `buy()`/`sell()`, and Meteora `swap2()` throw `NOT_ADMITTED`.

```sh
node --test packages/partner-sdk-v5/tests/*.test.mjs
node --test packages/partner-public-api/tests/*.test.mjs
node --test apps/developer-portal/tests/*.test.mjs
```
