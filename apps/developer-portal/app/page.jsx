import Explorer from '../components/Explorer.jsx';

const SDK = `// https://github.com/xt0xdev/legendaryFunSDK  — public source, not on npm
import { createLegendarySdk } from './packages/partner-sdk-v5/src/index.mjs';

const lg = createLegendarySdk({ origin: 'https://legendary.devbyclaw.com' });

const catalog = await lg.native.catalog();
const tokens  = await lg.native.tokens();
const coins   = await lg.pump.getLatestCoins();
const pools   = await lg.meteora.getPools();

const ix = lg.native.encodeBuy({
  revision: 67n, policyVersion: 1n,
  amount: 1_000_000_000n, minimumOut: 1n, expirySlot: 500n,
});`;

const PUMP = `GET /api/compat/pump/v3/coins/latest
GET /api/compat/pump/v3/coins/{mint}
GET /api/compat/pump/v3/sol-price
# buy / sell / trades → 501`;

const METEORA = `GET /api/compat/meteora/v1/pools
GET /api/compat/meteora/v1/pools/{mint}
# quote / swap2 → 501`;

const NATIVE = `GET /api/mainnet/trade/catalog
GET /api/mainnet/trade/bootstrap
GET /api/market/sol-usd
GET /api/v1/tokens
GET /api/v1/tokens/{mint}
GET /api/v1/launchpad`;

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
              Native, Pump-shaped, and Meteora-shaped discovery over the same catalog.
              Existing DAP paths stay unchanged. Quote, swap, and tape return 501 until admitted.
            </p>
            <div className="actions">
              <a className="btn" href="#explorer">Open API explorer</a>
              <a className="btn ghost" href="/openapi.json">openapi.json</a>
            </div>
          </div>
        </section>

        <h2 className="sec" id="paths">Three ways to integrate</h2>
        <p className="note">Pick one client shape. None impersonate Pump or Meteora program IDs. Graduated tokens already route on Jupiter as Raydium CPMM.</p>
        <div className="grid3">
          <article className="card" id="native">
            <span className="pill live">Path 1 · Native</span>
            <h2>Legendary API</h2>
            <p>Recommended. Live catalog plus additive <code>/api/v1</code>. Factory tags <code>LGCBUY05</code> / <code>LGCSEL05</code>.</p>
            <pre>{NATIVE}</pre>
          </article>
          <article className="card" id="pump">
            <span className="pill add">Path 2 · Pump-shaped</span>
            <h2>Pump facade</h2>
            <p>Discovery field names only. Map <code>launchpad=legendary</code>, then call coins/latest.</p>
            <pre>{PUMP}</pre>
          </article>
          <article className="card" id="meteora">
            <span className="pill add">Path 3 · Meteora-shaped</span>
            <h2>Meteora facade</h2>
            <p>DBC-style pool list. <code>config</code> is the Legendary factory. <code>swap2</code> is not admitted.</p>
            <pre>{METEORA}</pre>
          </article>
        </div>

        <h2 className="sec" id="sdk">SDK</h2>
        <p className="note">
          Public source: <a href="https://github.com/xt0xdev/legendaryFunSDK">github.com/xt0xdev/legendaryFunSDK</a>.
          Folder <code>packages/partner-sdk-v5</code>. Intended npm name <code>@legendary-fun/sdk</code> is <strong>not on npm</strong>.
          No cookies, keys, or v4 bytes.
          <code>quote()</code>, Pump <code>buy()</code>, and Meteora <code>swap2()</code> throw <code>NOT_ADMITTED</code>.
        </p>
        <pre>{SDK}</pre>

        <h2 className="sec" id="constants">Pinned constants</h2>
        <div className="const-grid">
          <div><span>Cluster</span><strong className="mono">mainnet-beta</strong></div>
          <div><span>Factory</span><strong className="mono">Fkeuw75FEAYUpudPNqFqMv2m2KzhSiLYArp1rd8baH1i</strong></div>
          <div><span>Genesis</span><strong className="mono">5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d</strong></div>
          <div><span>CTO</span><strong className="mono">7EgadoHa1THHf9cyKsh4QUrBGsfYW5FHSApSAHLSBbeN</strong></div>
          <div><span>Tags</span><strong className="mono">LGCNEW05 · LGCBUY05 · LGCSEL05 · LGGRAD05</strong></div>
          <div><span>Do not call</span><strong className="mono">/api/devnet/trade — cookie website lane</strong></div>
        </div>

        <h2 className="sec" id="reference">API reference</h2>
        <p className="note">Live rows are the current public contract. Additive rows are served here. 501 rows fail closed on purpose — not a claim that legendary.fun already hosts them in production.</p>
        <div className="table-wrap">
          <table className="ref">
            <thead>
              <tr><th>Status</th><th>Method</th><th>Path</th><th>Notes</th></tr>
            </thead>
            <tbody>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/catalog</td><td>Verified tokens. buy/sell false today.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/mainnet/trade/bootstrap</td><td>Factory, genesis, CTO.</td></tr>
              <tr><td><span className="pill live">Live</span></td><td>GET</td><td className="mono">/api/market/sol-usd</td><td>Display FX only.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens</td><td>Native list from catalog.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}</td><td>One token.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/tokens/{'{mint}'}/curve</td><td>graduated vs onFactoryCurve.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/v1/launchpad</td><td>Constants + existing APIs.</td></tr>
              <tr><td><span className="pill wait">501</span></td><td>GET</td><td className="mono">/api/v1/quote</td><td>Hosted quote not admitted.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/coins/latest</td><td>Pump-shaped coins.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/sol-price</td><td>From live FX.</td></tr>
              <tr><td><span className="pill wait">501</span></td><td>GET</td><td className="mono">/api/compat/pump/v3/trades/latest</td><td>No tape yet.</td></tr>
              <tr><td><span className="pill add">Additive</span></td><td>GET</td><td className="mono">/api/compat/meteora/v1/pools</td><td>DBC-shaped pools.</td></tr>
              <tr><td><span className="pill wait">501</span></td><td>POST</td><td className="mono">/api/compat/meteora/v1/swap2</td><td>Unsigned swap not admitted.</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="sec" id="explorer">API explorer</h2>
        <p className="note">Try-it hits this host. Catalog/bootstrap/fx proxy legendary.fun. Additive paths are local.</p>
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
