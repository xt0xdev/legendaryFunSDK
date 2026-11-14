# @legendary-fun/sdk

Integrator kit for Legendary.fun. Three surfaces, one program:

1. **Native** — `/api/mainnet/trade/catalog`, `/api/v1/tokens`, `encodeTrade` (`LGCBUY05`)
2. **Pump-shaped** — `/api/compat/pump/v3/coins/latest` (discovery). `buy()`/`sell()` throw `NOT_ADMITTED`
3. **Meteora-shaped** — `/api/compat/meteora/v1/pools`. `swapQuote2`/`swap2` throw `NOT_ADMITTED`

Does not wrap `/api/devnet/trade` cookies. Does not sign. Graduated tokens trade on Raydium CPMM / Jupiter.

Not published to npm. Not a separate runtime from this folder. Intended name `@legendary-fun/sdk` is private until a publish is authorized.

```js
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({ origin: 'https://legendary.devbyclaw.com' });
const catalog = await lg.native.catalog();
const coins = await lg.pump.getLatestCoins();
const pools = await lg.meteora.getPools();
```
