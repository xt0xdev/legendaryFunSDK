# Legendary.fun partner integration and compatibility-layer gap analysis

Status: internal briefing, 2026-11-14. Live facts were fetched from `https://legendary.fun` and `https://api.jup.ag` that day. This is not a production audit, not permission to enable mainnet signing, and not a claim that preview or disabled controls already work.

Machine-readable twin: [`partner-gap-contract.json`](./partner-gap-contract.json). An AI IDE should treat that JSON as the build queue (`gaps[].id`, `fillOrder`, `acceptance`) and this document as the why.

Controlling product docs: [`docs/BUILD_SPECIFICATION.md`](../BUILD_SPECIFICATION.md), [`docs/SECURITY_MODEL.md`](../SECURITY_MODEL.md), [`compat/launch-creation-v5/ABI.md`](../../compat/launch-creation-v5/ABI.md). If this briefing and those documents disagree on fees, authority, or admission, the specification wins.

---

## 1. What partners actually integrate

Fomo, Axiom, GMGN, Photon, Jupiter, and similar terminals do **not** scrape the Legendary website. They integrate a launchpad at three layers:

| Layer | What they need | Pump.fun / Meteora equivalent | Legendary today |
| --- | --- | --- | --- |
| Discovery | New mints, bonding progress, graduated flag, metadata, FDV | Pump `frontend-api-v3` coins/latest; GMGN trenches `launchpad-platform`; Axiom Pulse WS | Public catalog + bootstrap. No Pulse firehose, no candles, no trade tape |
| Execution | Quote + unsigned swap for the **curve** program | `@pump-fun/pump-sdk`, Meteora `swap2`, Raydium `launchpad.buyToken` | On-chain v5 buy/sell exist. No public partner SDK. Website `capabilities.buy/sell` are **false** |
| Aggregation | Auto-route from a mint with no app-specific code | Jupiter Metis instant-routing allowlist (Pump, Meteora DBC, Raydium LaunchLab, …) | **Graduated** tokens already route as Raydium CPMM. **Curve** tokens are not in Jupiter’s allowlist |

“Plug and play identical to Pump.fun / Meteora” is therefore three different products. Only one of them is honest:

1. **Native Legendary surface** (recommended): IDL + quote/build SDK + public discovery/tape APIs. Each terminal adds `DexType.Legendary`.
2. **Shaped adapters** (optional): method names that look like Meteora `swap2` or LaunchLab `buyToken`, calling Legendary underneath.
3. **Pump REST facade** (optional, discovery only): a handful of `GET /coins…` aliases. Never instruction-compatible.

Binary-identical on-chain ABI is **out of scope**. Impersonating Pump or Meteora program IDs is **forbidden**. Terminals and Jupiter do not auto-detect unknown programs; they match hardcoded IDs and discriminators. Disguise does not create auto-detect.

Adding extra DAP paths (`/api/v1/tokens`, `/api/v1/launchpad`, Pump-shaped `/api/compat/pump/v3/coins/latest`) is how we become *listable*: those endpoints publish factory ID, instruction tags, mints, phase, and Raydium pool without changing the existing catalog. Auto-detect still requires contacting Jupiter, GMGN, Axiom, Fomo, and similar to add `launchpad=legendary` / `DexType.Legendary` and point their crawlers at those URLs; once listed, they can pick up new Legendary coins the same way they pick up Pump or Meteora launches. Graduated tokens already appear in Jupiter as Raydium CPMM; the new paths are what let them recognize the **curve** stage as us.

---

## 2. Live site API (observed 2026-11-14)

### 2.1 Public reads that work

`GET https://legendary.fun/api/mainnet/trade/catalog`

- Unauthenticated JSON. Schema 1, `network: solana:mainnet`, `scope: server-admitted-atomic-v5`.
- One token on that day: `GPiHbgbvWbZHKQiVf1v8AupAuST3mqSv3zb2SBJULGND` (Legendary / LGND).
- `phase: graduated`, `venue: raydium-cpmm`, pool `czewDLamSPb89EqxWU37M1ddK7kGeAcDwVWKHAkmwtM`.
- Integer rationals for price (`SOL-per-token`, `beforeFees: true`), vault reserves, Raydium fee millionths, locked-LP migration fields.
- **Admission flags on that row:** `signingAllowed: false`, `quoteAvailable: false`, `capabilities: { buy: false, sell: false, create: false }`.

`GET https://legendary.fun/api/mainnet/trade/bootstrap`

- `enabled: true` means the **site bootstrap** is up, not that public trading is admitted.
- Mainnet genesis `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d`.
- Factory `Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i` (sha256 pinned in the payload).
- CTO program `7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN`.
- Token program + ATA program listed. Providers labeled `helius-mainnet` / `quicknode-mainnet`.

`GET https://legendary.fun/api/market/sol-usd`

- Coinbase SOL-USD with expiry. Fine for display FDV. Not an oracle for on-chain amounts.

### 2.2 Additive partner routes (do not change existing APIs)

Implemented in-repo as a parallel handler (`packages/partner-public-api`, Netlify paths `/api/v1/*` and `/api/compat/pump/v3/*`). It only **reads** `/api/mainnet/trade/catalog` and `/api/market/sol-usd`. Catalog, bootstrap, and `/api/devnet/trade` are unchanged.

| New path | Maps from | Notes |
| --- | --- | --- |
| `GET /api/v1/tokens` | catalog | Legendary-shaped list, CORS `*` |
| `GET /api/v1/tokens/{mint}` | catalog row | Honest `capabilities.factoryBuy=false` today |
| `GET /api/v1/tokens/{mint}/curve` | catalog row | `graduated` / `onFactoryCurve` |
| `GET /api/v1/launchpad` | constants | Factory, tags, existing API list |
| `GET /api/compat/pump/v3/coins/latest` | catalog | Discovery-only Pump field names |
| `GET /api/compat/meteora/v1/pools` | catalog | DBC-shaped discovery; factory in `config` |
| `GET /api/v1/quote` or Pump trades/candles or Meteora `swap2` | — | **501 NOT_ADMITTED**, never a fake tx |

Local integrator portal: Next.js on port **8833** (`apps/developer-portal`). Public hosts: `developer.legendary.fun` (CNAME) and `legendary.devbyclaw.com` (origin). It proxies the three existing DAP reads from legendary.fun, serves the additive prefixes, OpenAPI/Swagger, the SDK snippets, and the partner PDF. Live origin still 404s `/prepare` and `/candles` on the **old** prefix, by design. These new paths are not admitted on legendary.fun until this function is deployed there.

### 2.3 Website trade API that exists in-repo (devnet, not a partner API)

`scripts/trade-api/service.mjs` implements `/api/devnet/trade/*`:

- Cookie session (`__Host-legendary-devnet-trade`), CSRF, same-origin, origin-key, IP header.
- Wallet allowlist or public-devnet admission.
- `POST /prepare` → unsigned tx attempt, then simulate/submit with exact-wire checks.

This is the **first-party website lane**. It is the wrong shape for Axiom/GMGN/Jupiter (they will not complete a SIWS cookie dance per swap). Do not reopen it as “the partner API.” If a hosted builder is wanted, add a new `/v1/quote` + `/v1/swap` that returns unsigned bytes and never holds keys.

---

## 3. Program buy/sell (what actually moves funds)

Live factory: `Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i`.

Instruction tags (ASCII, 8 bytes), from `compat/launch-creation-v5`:

| Tag | Meaning |
| --- | --- |
| `LGCNEW05` | Create launch + mint + metadata |
| `LGCBUY05` | Curve buy |
| `LGCSEL05` | Curve sell |
| `LGGRAD05` | Graduate to Raydium CPMM + lock |
| `LGCTRV05` / `LGLIFE05` | Launch account magic / lifecycle |

Trade instruction is **52 bytes**: 48 bytes of integers (revision, policy version, amount, minimum out, expiry slot) plus two `u16` Shield absence-proof indices. **27 accounts**. Creation is **42 accounts** with a variable metadata commitment.

Buy (spec, BUILD_SPECIFICATION 6.3):

- `amount` = max gross SOL in (lamports).
- 2% fee off gross; only net SOL enters the virtual-reserve constant-product curve.
- Signed `minimumOut` is absolute. Quote expiry is a slot.
- Final buy may cap at remaining graduation fill (120 SOL real reserve, 20B migration inventory). Fees only on accepted input.

Sell (spec, 6.4):

- `amount` = exact base tokens in.
- Fee taken from gross SOL out; seller receives net.
- Existing holders can always sell; a later registry listing cannot trap a balance.

Graduation: 120 SOL + 20B tokens into Raydium CPMM, full LP lock (Burn & Earn). After that, the venue is **Raydium**, not the factory.

Local `tools/curve-snipe` can quote and compile a **v4** `LGCBUY04` trade over RPC. Telegram decode helpers understand **v5** `LGCBUY05` / `LGCNEW05`. Neither is a supported partner SDK. The published v4 instruction client (`packages/launch-instruction-client-v4`) must not be used against the live v5 factory.

---

## 4. How the named venues integrate launchpads today

### Jupiter (and wallets that only call Jupiter)

Jupiter Swap v2 (`/swap/v2/order` + `/execute`) routes markets on an **allowlist**. Instant routing currently includes Pump.fun, Pump AMM, Meteora DBC / DAMM / DLMM, Raydium (incl. LaunchLab and CPMM), Moonshot, and others. Legendary factory is not on that list.

**Observed:** a 0.1 SOL quote for the live LGND mint already returns a Jupiter route labeled `Raydium CP` through pool `czewDLam…`. Graduated Legendary tokens are therefore already plug-and-play for Jupiter/Phantom/Backpack **as Raydium**. Curve-stage tokens will return no Metis route until Jupiter lists the factory (or until some other router implements it).

### GMGN

Official Agent/OpenAPI is their own execution and research layer. Trenches take `launchpad-platform` enums (`Pump.fun`, `letsbonk`, …). They classify by **program ID + decoded create/trade events**, then optionally swap through their backend. They will not list Legendary until: (1) a decoder for `LGCNEW05`/`LGCBUY05`, (2) a Pulse-shaped feed or their own RPC ingest, (3) an execution path (our SDK or their builder).

### Axiom / Fomo / Photon

These are terminals. Public APIs, where they exist, are **their** order APIs, not launchpad APIs. Under the hood they keep a `DexType` enum (see also community SDKs such as `sol-trade-sdk`: PumpFun, PumpSwap, Bonk, Meteora DAMM v2, Raydium, …). Adding Legendary is a plugin: program ID, discriminators, account map, quote function, SWQoS submit. Fomo.family-style social APIs are unrelated.

### Pump.fun “API”

Two different things are routinely confused:

1. **On-chain SDK / IDL** — `@pump-fun/pump-sdk` (curve) and PumpSwap (`buy_v2` / `sell_v2`, 17 accounts, `base_amount_out` + `max_quote_amount_in`). This is what bots actually trade through.
2. **Frontend REST** — `frontend-api-v3.pump.fun` with hundreds of endpoints (coins, trades, livestreams, replies, bookmarks, jito tip). Unofficial mirrors document `/coins/latest`, `/coins/{mint}`, `/trades/all/{mint}`, `/candlesticks/{mint}`. This is a **website backend**, not a standard Solana interface.

Meteora DBC has **no official launch REST**. Integrators use `@meteora-ag/dynamic-bonding-curve-sdk`: `swapQuote2` then `swap2` (`swapBaseForQuote`, `SwapMode.ExactIn|PartialFill|ExactOut`). Raydium LaunchLab is the same pattern: `Curve.buyExactIn` + `launchpad.buyToken`.

Legendary is closer to “custom curve + Raydium graduation” than to Pump’s frontend. Copying 400 Pump REST routes would be the wrong gap to fill.

---

## 5. Compatibility-layer options (ranked)

### Option A — Native partner stack (do this)

Ship what those SDKs actually are:

- IDL-equivalent JSON for factory v5.
- Integer quote + unsigned instruction builder.
- Public discovery + trade tape + candles + log-subscribe recipe.
- Optional hosted `/v1/quote` + `/v1/swap` (unsigned tx, taker = user wallet).

Gap IDs: `GAP-IDL`, `GAP-SDK-QUOTE-BUILD`, `GAP-DISCOVERY-API`, `GAP-TRADE-TAPE-CANDLES-WS`, `GAP-PARTNER-EXECUTION-API`, `GAP-TERMINAL-PLUGIN`.

### Option B — Jupiter listing (do this for auto-route)

Implement a Metis AMM adapter (quote + account metas + swap ix) and apply for instant routing of factory `Fkeuw75…`. Keep graduated flow on Raydium CPMM.

Gap ID: `GAP-JUPITER-LISTING`. This is the only path that makes Phantom/Backpack “auto-detect” curve tokens.

### Option C — Meteora / LaunchLab-shaped wrappers (small)

`client.pool.swapQuote2({ swapBaseForQuote: false, amountIn, slippageBps })` → Legendary `quoteBuy`. Same for `buyToken`. Document exact-out / partial-fill as unsupported unless the program gains them.

Gap ID: `GAP-METEORA-RAYDIUM-SHAPED-SDK`.

### Option D — Pump REST facade (discovery only)

Implement six GETs under `/compat/pump/v3`. Map mint, name, symbol, usd_market_cap, complete (graduated), virtual reserves, created_timestamp. Return 501 for create-coin, livestream, social, and any POST that would imply Pump instruction bytes.

Gap ID: `GAP-PUMP-SHAPED-FACADE`. Useful only for UIs already hardcoded to Pump’s coin list. It will **not** make `@pump-fun/pump-sdk` send a successful curve buy.

### Option E — Byte-identical Pump program (do not)

Would require abandoning Shield proofs, CTO, 2% / 120 SOL / 20B economics, 27-account layout, and factory identity. Forbidden by the security model. Also illegal as “auto-detect”: it would be impersonation of another program.

---

## 6. Gap matrix (what we have vs what they expect vs what to build)

| Expectation | They call | We have | Distance | Build |
| --- | --- | --- | --- | --- |
| List new coins | Pump `/coins/latest`, GMGN trenches | Catalog (1 graduated row; no live firehose) | Medium | Paginated public `/v1/tokens` + create-event stream |
| Coin by mint | `/coins/{mint}` | Catalog row + Metaplex on-chain | Small | Mint lookup + name/ticker/uri |
| Bonding progress | Pump `real_sol_reserves` / `complete` | Launch account `R`, `S`, phase | Medium | Document layout + `/v1/tokens/{mint}/curve` |
| Quote SOL→token | Pump SDK `buy`; Meteora `swapQuote2`; LaunchLab `Curve.buyExactIn` | Offline curve package; no public quote API; site `quoteAvailable: false` | Large | Partner SDK quote (bigint) |
| Build buy/sell tx | Pump/Meteora/LaunchLab SDK | v5 ABI in-repo; v4 local compiler; website prepare disabled | Large | v5 unsigned builder + ATA + compute budget |
| Slippage | `min_out` / `minimumAmountOut` | Spec has `minimumOut` + expiry slot | Small once quote exists | Pass through signed limits |
| Shield / denylist | Pump has none of this form | Curve-only Shield + absence indices on buy | Legendary-specific | SDK must fail closed; terminals must not strip proofs |
| Trade tape | `/trades/all/{mint}` | Specified, not deployed; candles 404 | Large | REST + WS per BUILD_SPEC 11 |
| Charts | `/candlesticks/{mint}` | Specified 1m candles, not live | Large | Same as tape |
| Graduated swap | Jupiter / Raydium CPMM / PumpSwap | Already Raydium CPMM; Jupiter routes LGND | **None for aggregators** | Keep pool id in catalog |
| Instant Jupiter curve routing | Allowlisted DEX | Not listed | Large + external | Metis adapter + listing request |
| Integrator share fee | LaunchLab `share_fee_rate`; some Pump remaining accounts | Not in LGCBUY05 | Product decision | `GAP-REFERRAL-SHARE-FEE` |
| Create-from-terminal | Pump `create_v2` + first buy | Website `capabilities.create: false`; v5 create is 42 accounts + metadata CID | Out of band | Not required for buy/sell terminals |
| Cookie SIWS trade API | Nobody expects this | Devnet website lane | Wrong shape | Do not reuse |

---

## 7. Integration guide (native path)

Give every partner this box and nothing that requires our cookies.

### 7.1 Constants

```
cluster        mainnet-beta
genesis        5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
factory        Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i
cto            7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN
token program  TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA
ata program    ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL
quote mint     So11111111111111111111111111111111111111112
decimals       6
```

### 7.2 Detect a Legendary launch

1. `transactionSubscribe` / `logsSubscribe` on the factory.
2. Instruction data prefix `LGCNEW05` → new mint at account index 2 (create).
3. `LGCBUY05` → buy; trader is account 0, mint is account 5 (as used by the in-repo decoder). Confirm with the IDL once published — do not treat Telegram helper indices as the full 27-role map.
4. `LGGRAD05` / catalog `phase=graduated` → stop using the factory; trade the Raydium CPMM pool from the catalog.

### 7.3 Quote and swap (target SDK shape)

```ts
const q = await legendary.quote({
  mint, side: "buy", amount: 1_000_000_000n, slippageBps: 100, taker,
});
// q.grossIn, q.fees, q.net, q.minOut, q.expirySlot, q.revision, q.policyVersion

const tx = await legendary.buildSwap(q); // unsigned VersionedTransaction
const signed = await wallet.signTransaction(tx);
await send(signed);
```

Rules the SDK must enforce:

- Amounts are `bigint` lamports / base units. No `number` math on instruction fields.
- User signs `minOut` and `expirySlot`, not a UI estimate.
- If Shield is curve-only, buys include authenticated absence proofs; sells do not become blocked.
- After graduation, refuse factory swaps and return `{ venue: "raydium-cpmm", pool }`.

### 7.4 Discovery (additive `/api/v1`, existing catalog unchanged)

In-repo now (not live on legendary.fun until the new Netlify function is deployed):

```
GET /api/v1/tokens
GET /api/v1/tokens/{mint}
GET /api/v1/tokens/{mint}/curve
GET /api/v1/launchpad
GET /api/v1/sol-usd
GET /api/compat/pump/v3/coins/latest
GET /api/compat/pump/v3/coins/{mint}
GET /api/compat/pump/v3/sol-price
```

Still not admitted (return 501, do not invent):

```
GET /api/v1/tokens/{mint}/trades
GET /api/v1/tokens/{mint}/candles
GET /api/v1/quote
POST /api/v1/swap
Pump /trades/* and /candlesticks/*
```

Reuse catalog fields already present: mint, launch, pool, phase, venue, decimals, supply strings, price rational, poolReserves, fees, migration, shield. Do not change `/api/mainnet/trade/catalog`.

### 7.5 What to tell each vendor

- **Jupiter:** list the factory as an instant-routing DEX; keep CPMM for graduated. Until then, only graduated Legendary tokens appear in Ultra/Swap.
- **GMGN:** add `launchpad-platform=legendary`; ingest factory logs or our `/v1/tokens` + trades; execute via our SDK or their builder.
- **Axiom / Fomo / Photon:** add `DexType.Legendary` with the constants above; Pulse subscribe to create logs; do not call `/api/devnet/trade`.
- **Wallets (Phantom et al.):** they will follow Jupiter. Curve support = Jupiter listing.

---

## 8. AI IDE build contract

Work the JSON `fillOrder`. Do not start Option D or E before P0 IDL + SDK + discovery.

**P0**

1. `GAP-IDL` — `docs/partners/idl/legendary-factory-v5.json`
2. `GAP-SDK-QUOTE-BUILD` — `packages/partner-sdk-v5` unsigned quote/build, v5 only, golden tests vs `packages/graduation-curve`
3. `GAP-DISCOVERY-API` — additive `/api/v1/tokens*` is implemented in-repo (`packages/partner-public-api`); remaining: OpenAPI file, phase filters, metadata/name, live deploy. Do not modify the existing catalog route.
4. `GAP-TRADE-TAPE-CANDLES-WS` — trades + 1m candles + cursor WS as specified in BUILD_SPEC 11; failed txs are not candles. New paths only; 501 until real tape exists.

**P1**

5. `GAP-TERMINAL-PLUGIN` — decoder tests on a recorded mainnet tx; Pulse payload example
6. `GAP-JUPITER-LISTING` — Metis adapter + listing packet (program id, sample quotes, account dumps)
7. `GAP-PARTNER-EXECUTION-API` — optional hosted unsigned `/v1/quote`+`/v1/swap`; new auth model, not the cookie API

**P2**

8. `GAP-METEORA-RAYDIUM-SHAPED-SDK` — aliases only
9. `GAP-PUMP-SHAPED-FACADE` — coins/latest, coins/{mint}, sol-price mapped in-repo; trades/candles/create stay 501. Do not add Pump instruction compatibility.

**P3**

10. `GAP-REFERRAL-SHARE-FEE` — product decision; default unsupported

Non-goals are in the JSON. Particularly: no private keys on the server, no floating-point quotes, no v4 bytes on v5, no capability-flag flip as a substitute for admission.

Suggested checks after implementation (record what was actually run):

```
node --test packages/partner-sdk-v5/tests/*.test.mjs
# decoder vs a pinned mainnet buy/create fixture
# OpenAPI examples against a local stub, then live catalog mapping
# never hit /api/devnet/trade from the partner SDK
```

---

## 9. Honest distance summary

- **Graduated trading with Jupiter / Raydium aggregators:** already working for the live token. Gap ≈ documentation of pool id.
- **Discovery for Pulse/trenches:** additive `/api/v1/tokens` maps the existing catalog without changing it. Still missing live deploy, name/ticker, firehose, and tape.
- **Curve buy/sell from Fomo/Axiom/GMGN:** program can do it; partners cannot, because there is no v5 IDL/SDK and the website refuses quotes/signing. Gap ≈ SDK + decoder, then each vendor’s DexType.
- **True auto-detect (type a mint in Phantom and buy on the curve):** Jupiter listing. Not an API clone.
- **Identical Pump.fun HTTP + identical instructions:** not a gap to close. Facade can clone a thin discovery subset; instructions must stay Legendary.

The shortest path to “they can trade us” is: publish IDL + v5 quote/build SDK, open discovery/tape, then Jupiter listing for the factory. Compatibility shims help copy-paste, they do not replace listing.

---

## 10. How to build the integrator SDK kit

Ship a **native Legendary SDK**, same shape as `@pump-fun/pump-sdk` / Meteora DBC: constants, decoder, integer quote, unsigned buy/sell. Do **not** wrap `/api/devnet/trade`, `tools/curve-snipe`, or the v4 instruction client. Those are the wrong ABI or the cookie website lane.

### What to put in the kit

| Piece | Package / file | Integrator use |
| --- | --- | --- |
| Constants | factory, genesis, CTO, tags `LGCNEW05/LGCBUY05/LGCSEL05/LGGRAD05` | Hardcode `DexType.Legendary` |
| IDL-equivalent JSON | 27 trade roles, 52-byte buy/sell, 1536-byte launch `LGCTRV05` | Independent decoders, Jupiter adapter |
| PDA derive | v5 seeds (not v4 `life-v4` names) | Account metas |
| Decode launch | Parse on-chain launch account | Phase, revision, Shield, reserves |
| Quote | Reuse `packages/graduation-curve` bigint math | Preview + `minOut` |
| Build ix | `encodeTrade` v5 (52 bytes + absence u16s) + ATA + compute budget | Unsigned tx |
| Discovery client | Optional GET `/api/v1/tokens` | Pulse/trenches, not execution |
| Graduated handoff | If `phase=graduated`, return Raydium pool; refuse factory swap | Jupiter/Raydium already routes LGND |

Suggested layout:

```
packages/partner-sdk-v5/
  src/constants.ts      // pinned mainnet identities
  src/idl.json          // GAP-IDL
  src/pda.ts            // derive launch, vaults, rights, trader ATA
  src/decode.ts         // launch account + ix tags
  src/quote.ts          // bigint buy/sell vs packages/graduation-curve
  src/build.ts          // unsigned VersionedTransaction, never a key
  src/discovery.ts      // optional catalog/v1 client
  src/index.ts          // quote() + buildSwap()
  tests/                // golden vectors + reject LGCBUY04
README.md               // 20-line quickstart, no cookie login
```

Public surface to document:

```ts
import { Legendary } from "@legendary-fun/sdk";

const lg = new Legendary({ connection });
const token = await lg.load(mint);          // RPC launch account, or /api/v1/tokens/{mint}
if (token.graduated) return token.pool;     // caller uses Raydium / Jupiter
const q = await lg.quote({ side: "buy", amount: 1_000_000_000n, slippageBps: 100, taker });
const tx = await lg.buildSwap(q);           // unsigned
const signed = await wallet.signTransaction(tx);
```

### Build order

1. **IDL JSON** from `compat/launch-creation-v5/ABI.md` — discriminators, account order, error codes. Tests: decode a pinned mainnet `LGCBUY05` and reject `LGCBUY04`.
2. **PDA + decode** — v5 seeds and 1536-byte launch. Tests: derived launch matches catalog `launch` for LGND.
3. **Quote** — call `packages/graduation-curve`; amounts are `bigint`; slippage becomes `minOut`; expiry is a slot. Tests: golden buy/sell vs the curve package, final-fill cap at 120 SOL.
4. **Build** — 52-byte ix, 27 metas, optional ATA, compute budget. Return unsigned bytes only. Shield-on buys fail closed without proofs; sells stay allowed. After graduation, throw `GRADUATED` with the Raydium pool.
5. **README + npm** — pin factory/genesis; say cookie `/api/devnet/trade` is not this SDK; optional thin `swapQuote2` aliases later (`GAP-METEORA-RAYDIUM-SHAPED-SDK`).
6. **Give it out** — GitHub + npm `@legendary-fun/sdk`, plus the partner PDF. Jupiter/GMGN/Axiom still need a listing email with program ID and this package.

### Rules

- No private keys, RPC vendor secrets, or SIWS cookies in the kit.
- No `number` math on instruction fields.
- Do not claim Pump instruction compatibility.
- Do not enable mainnet website `capabilities.buy` by shipping the SDK; the program already trades; the SDK only builds the ix the wallet signs.

---

## 11. developer.legendary.fun

The integrator site is `apps/developer-portal` (Next.js, port **8833**). Hosts: `developer.legendary.fun` CNAMEs to `legendary.devbyclaw.com`. Public source: https://github.com/xt0xdev/legendaryFunSDK (`@legendary-fun/sdk` is **not on npm** yet). One page: three integration paths, SDK snippets, full path table, OpenAPI/Swagger try-it, and the partner PDF. It does not replace legendary.fun and does not enable signing.
