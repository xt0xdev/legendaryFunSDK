import Explorer from '../components/Explorer.jsx';

const SDK = `// https://github.com/xt0xdev/legendaryFunSDK  — public source, not on npm
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({
  origin: 'https://api.legendary.fun',
  apiKey: process.env.LEGENDARY_OWNER_API_KEY, // issued by the site owner
});

const launches = await lg.native.discover({ query: '', limit: 50 });
const markets  = await lg.native.markets(launches.tokens.map((t) => t.mint));
const coins    = await lg.pump.getLatestCoins();
const pools    = await lg.meteora.getPools();
const quote    = await lg.native.quote({ mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000' });
const candles  = await lg.native.candles(launches.tokens[0].mint, '1m');
await lg.native.challenge({ wallet: trader });
const prepared = await lg.native.prepare({
  wallet: trader, mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000', slippageBps: 100,
});
await lg.native.create({ wallet: creator, name, ticker });
await lg.native.claimRewards({ wallet: holder, mint: launches.tokens[0].mint });`;

const PUMP = `GET  /api/compat/pump/v3/coins/latest
GET  /api/compat/pump/v3/coins/search?query=
GET  /api/compat/pump/v3/coins/{mint}
GET  /api/compat/pump/v3/candlesticks/{mint}/1m
GET  /api/compat/pump/v3/sol-price
POST /api/mainnet/trade/prepare   x-legendary-api-key
POST /api/compat/pump/v3/coins/create   x-legendary-api-key`;

const METEORA = `GET  /api/compat/meteora/v1/pools
GET  /api/compat/meteora/v1/pools/{mint}
POST /api/compat/meteora/v1/quote
POST /api/mainnet/trade/prepare   x-legendary-api-key`;

const NATIVE = `GET  /api/v1/tokens
POST /api/v1/quote
POST /api/mainnet/trade/auth/challenge  x-legendary-api-key
POST /api/mainnet/trade/auth/verify     x-legendary-api-key
POST /api/mainnet/trade/prepare         x-legendary-api-key
POST /api/mainnet/trade/submit          x-legendary-api-key
POST /api/mainnet/trade/graduated/prepare  x-legendary-api-key
POST /api/v1/create                x-legendary-api-key
GET  /api/v1/rewards               x-legendary-api-key
POST /api/v1/rewards/claim         x-legendary-api-key
POST /api/v1/graduation-claims     x-legendary-api-key`;

function Brand({ href = '/', compact = false }) {
  return (
    <a className="brand" href={href}>
      <img className="brand-mark" src="/legendary-mark.jpg" alt="" width={42} height={42} />
      <span className="brand-copy">
        <strong>LEGENDARY</strong>
        {compact ? null : <small>Developers</small>}
      </span>
    </a>
  );
}

export default function Page() {
  return (
    <>
      <header className="topbar">
        <Brand />
        <nav className="top-nav" aria-label="Developer sections">
          <a href="#paths">Paths</a>
          <a href="#sdk">SDK</a>
          <a href="#reference">API</a>
          <a href="#explorer">Explorer</a>
        </nav>
        <div className="top-actions">
          <a className="btn ghost" href="https://github.com/xt0xdev/legendaryFunSDK">GitHub</a>
          <a className="btn ghost" href="https://legendary.fun">legendary.fun</a>
          <a className="btn" href="/LEGENDARY_PARTNER_INTEGRATION.pdf">PDF</a>
        </div>
      </header>

      <div className="wrap">
        <section className="hero">
          <div className="hero-card">
            <p className="kicker">Integrator kit · v5 factory</p>
            <h1>Integrate Legendary. <i>Three paths, one program.</i></h1>
            <p className="lede">
              Native, Pump-shaped, and Meteora-shaped discovery over the live factory list
              on legendary.fun. Integer quote and candles are on.
              Trades, token launch, claims, and rewards take an API key issued by the site owner.
            </p>
            <div className="actions">
              <a className="btn" href="#explorer">Open API explorer</a>
              <a className="btn ghost" href="/openapi.json">openapi.json</a>
            </div>
          </div>
        </section>

        <h2 className="sec" id="paths">Three ways to integrate</h2>
        <p className="note">Pick one client shape. Pump and Meteora adapters overlay the same factory launches. None impersonate Pump or Meteora program IDs. Graduated tokens already route on Jupiter as Raydium CPMM.</p>
        <div className="grid3">
          <article className="card" id="native">
            <span className="pill live">Path 1 · Native</span>
            <h2>Legendary API</h2>
            <p>Recommended. Live Discover + quotes, plus additive <code>/api/v1</code>. Factory tags <code>LGCBUY05</code> / <code>LGCSEL05</code>.</p>
            <pre>{NATIVE}</pre>
          </article>
          <article className="card" id="pump">
            <span className="pill add">Path 2 · Pump-shaped</span>
            <h2>Pump facade</h2>
            <p>Discovery field names only, now filled from factory launches. Map <code>launchpad=legendary</code>.</p>
            <pre>{PUMP}</pre>
          </article>
          <article className="card" id="meteora">
            <span className="pill add">Path 3 · Meteora-shaped</span>
            <h2>Meteora facade</h2>
            <p>DBC-style pool list from the same launches. <code>config</code> is the Legendary factory. Integer <code>quote</code> is on.</p>
            <pre>{METEORA}</pre>
          </article>
        </div>

        <h2 className="sec" id="sdk">SDK</h2>
        <p className="note">
          Public source: <a href="https://github.com/xt0xdev/legendaryFunSDK">github.com/xt0xdev/legendaryFunSDK</a>.
          Folder <code>packages/partner-sdk-v5</code>. Intended npm name <code>@legendary-fun/sdk</code> is <strong>not on npm</strong>.
          No v4 bytes. <code>discover()</code> and <code>quote()</code> are public. <code>prepare()</code>, <code>submit()</code>, <code>create()</code>, and <code>claimRewards()</code> send <code>x-legendary-api-key</code>.
        </p>
        <pre>{SDK}</pre>

        <h2 className="sec" id="constants">Pinned constants</h2>
        <div className="const-grid">
          <div><span>Cluster</span><strong className="mono">mainnet-beta</strong></div>
          <div><span>Factory</span><strong className="mono">Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i</strong></div>
          <div><span>Genesis</span><strong className="mono">5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d</strong></div>
          <div><span>CTO</span><strong className="mono">7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN</strong></div>
          <div><span>Tags</span><strong className="mono">LGCNEW05 · LGCBUY05 · LGCSEL05 · LGGRAD05</strong></div>
        </div>

        <h2 className="sec" id="reference">API reference</h2>
        <p className="note">Live rows are on legendary.fun. Additive rows overlay that same factory list. Trades, token launch, claims, and rewards require header <code>x-legendary-api-key</code> issued by the site owner.</p>
        <div className="table-wrap">
          <table className="ref">
            <thead>
              <tr><th>Status</th><th>Method</th><th>Path</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/catalog</td><td>Admitted tokens only.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>POST</td><td className="mono">/api/mainnet/trade/discovery</td><td>Factory launches the website lists. {'{ query, limit:20|50, cursor }'}.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>POST</td><td className="mono">/api/mainnet/trade/catalog</td><td>Mint quotes / market cap. {'{ mints, version:3 }'} schema 2.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/bootstrap</td><td>Factory, genesis, CTO.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/candles-swap/{'{mint}'}/1m</td><td>Live OHLCV used by the token page.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/market-ticket</td><td>Websocket ticket for market stream.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/market-metrics/{'{mint}'}</td><td>Holders/volume snapshot for a mint.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/mainnet/trade/auth/challenge</td><td>SIWS challenge. Same owner API key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/mainnet/trade/auth/verify</td><td>Complete sign-in. Same owner API key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/mainnet/trade/prepare</td><td>Unsigned curve buy/sell. Header x-legendary-api-key. 401 without a key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/mainnet/trade/graduated/prepare</td><td>Unsigned Raydium-graduated trade. Same owner API key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/mainnet/trade/submit</td><td>Submit signed trade bytes. Same owner API key. Not an onchain fill by itself.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/market/sol-usd</td><td>Display FX only.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens</td><td>Factory list + quotes from the live Discover list on legendary.fun.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}</td><td>One token, name/ticker from Discover.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}/curve</td><td>graduated vs onFactoryCurve.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/v1/discovery</td><td>Partner-shaped Discover page.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/v1/markets</td><td>Partner-shaped mint quotes.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/launchpad</td><td>Factory, tags, existing live reads.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/sol-usd</td><td>Same FX as /api/market/sol-usd.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/v1/quote</td><td>Integer curve quote from live mint state.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}/candles</td><td>Maps live candles-swap.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/idl</td><td>v5 tags and account counts.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/coins/latest</td><td>Pump-shaped overlay of factory launches.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/coins/search</td><td>Name/ticker/mint filter.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/coins/{'{mint}'}</td><td>One coin.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/candlesticks/{'{mint}'}/1m</td><td>Maps live candles-swap.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/sol-price</td><td>From live FX.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/meteora/v1/pools</td><td>DBC-shaped overlay of factory launches.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/meteora/v1/pools/{'{mint}'}</td><td>One pool.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/compat/meteora/v1/quote</td><td>Legendary integer quote overlay.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/v1/create</td><td>Token launcher. Header x-legendary-api-key. 401 without a key. Not an onchain fill.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>GET</td><td className="mono">/api/v1/rewards</td><td>Rewards snapshot. Same owner API key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/v1/rewards/claim</td><td>Claim rewards. Same owner API key. 401 without a key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/v1/graduation-claims</td><td>Graduation claims. Same owner API key.</td></tr>
              <tr><td><span className="pill key">API key</span></td><td>POST</td><td className="mono">/api/compat/pump/v3/coins/create</td><td>Pump-shaped token launcher. Same owner API key.</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="sec" id="explorer">API explorer</h2>
        <p className="note">Try-it hits this host. Trades, token launch, claims, and rewards return 401 until you send an owner-issued API key.</p>
        <Explorer />
      </div>

      <footer className="site-footer">
        <div className="foot-row">
          <Brand href="https://legendary.fun" />
          <nav className="docs" aria-label="Kit documents">
            <a href="https://github.com/xt0xdev/legendaryFunSDK">GitHub</a>
            <a href="/LEGENDARY_PARTNER_INTEGRATION.pdf">Partner PDF</a>
            <a href="/openapi.json">OpenAPI</a>
            <a href="https://legendary.fun">Launchpad</a>
          </nav>
        </div>
        <p style={{ margin: '14px 0 0' }}>api.legendary.fun · developer.legendary.fun · existing DAP unchanged · preview surfaces labeled · not a production audit.</p>
      </footer>
    </>
  );
}
