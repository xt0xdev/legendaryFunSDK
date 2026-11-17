# @legendary-fun/sdk

Integrator kit for Legendary.fun. Three surfaces, one program:

1. **Native** — live Discover + quotes, `/api/v1/tokens`, trade prepare/submit (`LGCBUY05`)
2. **Pump-shaped** — `/api/compat/pump/v3/coins/latest` overlay of the factory list. `buy()`/`sell()` call Legendary prepare
3. **Meteora-shaped** — `/api/compat/meteora/v1/pools`. `swapQuote2` quotes; `swap2()` calls Legendary prepare

`prepare()`, `submit()`, `create()`, `rewards()`, and `claimRewards()` send header `x-legendary-api-key`. Keys are issued by the legendary.fun site owner. Missing keys return `API_KEY_REQUIRED`; a valid key is not an onchain fill. Graduated tokens also trade on Raydium CPMM / Jupiter.

Public source: https://github.com/xt0xdev/legendaryFunSDK  
Not on npm. Intended name `@legendary-fun/sdk` stays `"private": true` until a publish is authorized.

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
```
