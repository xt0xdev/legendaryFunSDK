# @legendary-fun/sdk

Integrator kit for Legendary.fun. Three surfaces, one program:

1. **Native** — live Discover + quotes, `/api/v1/tokens`, `encodeTrade` (`LGCBUY05`)
2. **Pump-shaped** — `/api/compat/pump/v3/coins/latest` overlay of the factory list. `buy()`/`sell()` throw `DISABLED`
3. **Meteora-shaped** — `/api/compat/meteora/v1/pools`. `swapQuote2` quotes; `swap2()` throws `DISABLED`

Does not wrap `/api/mainnet/create` or cookie trade prepare. `create()` and `claimRewards()` throw `DISABLED`. Execute on the legendary.fun token page. Graduated tokens trade on Raydium CPMM / Jupiter.

Public source: https://github.com/xt0xdev/legendaryFunSDK  
Not on npm. Intended name `@legendary-fun/sdk` stays `"private": true` until a publish is authorized.

```js
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({ origin: 'https://legendary.fun' });
const launches = await lg.native.discover({ query: '', limit: 50 });
const coins = await lg.pump.getLatestCoins();
const pools = await lg.meteora.getPools();
```
