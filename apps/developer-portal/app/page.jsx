import Explorer from '../components/Explorer.jsx';

const SDK = `// https://github.com/xt0xdev/legendaryFunSDK  — public source, not on npm
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({ origin: 'https://legendary.fun' });

const launches = await lg.native.discover({ query: '', limit: 50 });
const markets  = await lg.native.markets(launches.tokens.map((t) => t.mint));
const coins    = await lg.pump.getLatestCoins();   // same factory list
const pools    = await lg.meteora.getPools();      // same list, DBC shape
const quote    = await lg.native.quote({ mint: launches.tokens[0].mint, side: 'buy', amount: '1000000000' });
const candles  = await lg.native.candles(launches.tokens[0].mint, '1m');
// Execute is the legendary.fun token ticket, not a partner CORS swap.`;

const PUMP = `GET /api/compat/pump/v3/coins/latest
GET /api/compat/pump/v3/coins/search?query=
GET /api/compat/pump/v3/candlesticks/{mint}/1m
# buy / sell / create / trades are off`;

const METEORA = `GET  /api/compat/meteora/v1/pools
POST /api/compat/meteora/v1/quote
# swap2 is off — site trade ticket only`;

const NATIVE = `GET  /api/v1/tokens
POST /api/v1/quote     { mint, side, amount }
GET  /api/v1/tokens/{mint}/candles?interval=1m
GET  /api/v1/idl`;

const SITE = `# legendary.fun same-origin + x-legendary-csrf
POST /api/mainnet/trade/prepare
POST /api/mainnet/create/*
GET|POST /api/mainnet/graduation-claims
wss://api.legendary.fun/api/mainnet/market/stream`;

function Brand({ href = '/', compact = false }) {
  return (
    <a className="brand" href={href}>
      <img className="brand-mark" src="/lmeow-logo-v4.jpg" alt="" width={42} height={42} />
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
              (Discover + mint quotes), not only the admitted catalog. Existing DAP GET paths stay unchanged.
              Wallet create and reward claims stay on legendary.fun. Integer quote and candles are on. Hosted swap, create, claims, and Pump execute are off.
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
            <p>DBC-style pool list from the same launches. <code>config</code> is the Legendary factory. Integer <code>quote</code> is on. <code>swap2</code> is off.</p>
            <pre>{METEORA}</pre>
          </article>
        </div>

        <h2 className="sec" id="site-lane">Posting tokens and claiming rewards</h2>
        <p className="note">
          Create and graduation claims are the website wallet lane: same-origin cookies and <code>x-legendary-csrf</code>.
          Partner CORS does not receive those sessions. Use the site, or encode <code>LGCNEW05</code> yourself. Display-only
          reward fixtures live on devnet. The market websocket is documented; this portal does not proxy it.
        </p>
        <pre>{SITE}</pre>

        <h2 className="sec" id="sdk">SDK</h2>
        <p className="note">
          Public source: <a href="https://github.com/xt0xdev/legendaryFunSDK">github.com/xt0xdev/legendaryFunSDK</a>.
          Folder <code>packages/partner-sdk-v5</code>. Intended npm name <code>@legendary-fun/sdk</code> is <strong>not on npm</strong>.
          No cookies, keys, or v4 bytes.
          Integer <code>quote()</code> and live candles are on. Hosted swap, create, claims, and Pump buy/sell are off on this prefix.
          Execute from the legendary.fun token page.
        </p>
        <pre>{SDK}</pre>

        <h2 className="sec" id="constants">Pinned constants</h2>
        <div className="const-grid">
          <div><span>Cluster</span><strong className="mono">mainnet-beta</strong></div>
          <div><span>Factory</span><strong className="mono">Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i</strong></div>
          <div><span>Genesis</span><strong className="mono">5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d</strong></div>
          <div><span>CTO</span><strong className="mono">7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN</strong></div>
          <div><span>Tags</span><strong className="mono">LGCNEW05 · LGCBUY05 · LGCSEL05 · LGGRAD05</strong></div>
          <div><span>Do not call from partners</span><strong className="mono">/api/mainnet/create · /api/devnet/trade — cookie website lane</strong></div>
        </div>

        <h2 className="sec" id="reference">API reference</h2>
        <p className="note">Live rows are the current public contract on legendary.fun. Additive rows overlay that same origin. Disabled execute/create/claim routes are omitted, not advertised as 501.</p>
        <div className="table-wrap">
          <table className="ref">
            <thead>
              <tr><th>Status</th><th>Method</th><th>Path</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/catalog</td><td>Admitted tokens only. buy/sell false today.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>POST</td><td className="mono">/api/mainnet/trade/discovery</td><td>Factory launches the website lists. {'{ query, limit:20|50, cursor }'}.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>POST</td><td className="mono">/api/mainnet/trade/catalog</td><td>Mint quotes / market cap. {'{ mints, version:3 }'} schema 2.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/bootstrap</td><td>Factory, genesis, CTO. enabled true on live mints.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/candles-swap/{'{mint}'}/1m</td><td>Live OHLCV used by the token page.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/market/sol-usd</td><td>Display FX only.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens</td><td>Factory list + quotes. Includes LMEOW-style curve mints.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}</td><td>One token, name/ticker from Discover.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}/curve</td><td>graduated vs onFactoryCurve.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/v1/discovery</td><td>Partner-shaped Discover page.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/v1/markets</td><td>Partner-shaped mint quotes.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/launchpad</td><td>Constants + site-lane map.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/stream</td><td>Returns wss://api.legendary.fun/api/mainnet/market/stream.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/v1/quote</td><td>Integer curve quote from live mint state.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}/candles</td><td>Maps live candles-swap.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/idl</td><td>v5 tags and account counts.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/coins/latest</td><td>Pump-shaped overlay of factory launches.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/coins/search</td><td>Name/ticker/mint filter.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/sol-price</td><td>From live FX.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/meteora/v1/pools</td><td>DBC-shaped overlay of factory launches.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>POST</td><td className="mono">/api/compat/meteora/v1/quote</td><td>Legendary integer quote overlay.</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="sec" id="explorer">API explorer</h2>
        <p className="note">Try-it hits this host. Catalog, discovery, quotes, and candles read legendary.fun. Hosted swap/create/claim are not on this prefix.</p>
        <Explorer />

        <h2 className="sec" id="auto">Auto-detect</h2>
        <p className="callout">
          Extra DAP paths make Legendary <strong>listable</strong>, not magically detected. Contact Jupiter, GMGN, Axiom, and Fomo to add <code>launchpad=legendary</code> / <code>DexType.Legendary</code> and point crawlers at <code>/api/v1/tokens</code>, Pump coins, or Meteora pools. Graduated tokens already appear in Jupiter as Raydium CPMM.
        </p>
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
        <p style={{ margin: '14px 0 0' }}>developer.legendary.fun → legendary.devbyclaw.com · existing DAP unchanged · preview surfaces labeled · not a production audit.</p>
      </footer>
    </>
  );
}
