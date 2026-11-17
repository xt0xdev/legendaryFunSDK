'use client';

import { useEffect, useMemo, useState } from 'react';

const DEFAULT_MINT = '422DqsfnCANTP7vNToY7hdBaEXPE1qoc6CD9QyDGLGND';
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function statusClass(status) {
  if (status === 'live') return 'pill live';
  if (status === 'additive') return 'pill add';
  if (status === 'keyed') return 'pill key';
  return 'pill wait';
}

function statusLabel(status) {
  if (status === 'live') return 'Live DAP';
  if (status === 'keyed') return 'API key';
  return 'Working';
}

export default function Explorer() {
  const [spec, setSpec] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');
  const [mint, setMint] = useState(DEFAULT_MINT);
  const [body, setBody] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/openapi.json', { headers: { accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error('OPENAPI');
        return r.json();
      })
      .then((json) => {
        setSpec(json);
        const first = Object.keys(json.paths || {})[0];
        if (first) setSelected(`GET ${first}`);
      })
      .catch(() => setError('OpenAPI could not be loaded.'));
  }, []);

  const operations = useMemo(() => {
    if (!spec?.paths) return [];
    const out = [];
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (typeof op !== 'object' || Array.isArray(op)) continue;
        const status = op['x-status'] || 'additive';
        if (status !== 'live' && status !== 'additive' && status !== 'keyed') continue;
        if (/\/(trades|stream)\b/.test(path)) continue;
        out.push({
          id: `${method.toUpperCase()} ${path}`,
          method: method.toUpperCase(),
          path,
          summary: op.summary || '',
          description: op.description || '',
          status: op['x-status'] || 'additive',
          tags: op.tags || [],
          operationId: op.operationId,
          tryBody: typeof op['x-try-body'] === 'string' ? op['x-try-body'] : '',
        });
      }
    }
    return out;
  }, [spec]);

  const current = operations.find((op) => op.id === selected) || operations[0];

  useEffect(() => {
    if (current?.tryBody) setBody(current.tryBody);
    else setBody('');
  }, [current?.id, current?.tryBody]);

  async function run() {
    if (!current) return;
    setBusy(true);
    setResult(null);
    try {
      if (!current.path.startsWith('/api/')) throw new Error('PATH');
      const value = mint.trim();
      if (current.path.includes('{mint}') && !MINT_RE.test(value)) throw new Error('MINT');
      const path = current.path.replaceAll('{mint}', value).replaceAll('{interval}', '1m');
      const init = {
        method: current.method,
        headers: { accept: 'application/json' },
      };
      if (current.status === 'keyed' && apiKey.trim()) {
        init.headers['x-legendary-api-key'] = apiKey.trim();
      }
      if (current.method !== 'GET' && current.method !== 'OPTIONS') {
        init.headers['content-type'] = 'application/json';
        if (body.trim()) init.body = body;
      }
      const response = await fetch(path, init);
      const type = response.headers.get('content-type') || '';
      const payload = type.includes('json') ? await response.json() : await response.text();
      setResult({ status: response.status, body: payload });
    } catch (err) {
      setResult({ status: 0, body: { error: String(err) } });
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="note">{error}</p>;
  if (!current) return <p className="note">Loading OpenAPI…</p>;

  return (
    <div className="explorer">
      <div className="ops" role="list">
        {operations.map((op) => (
          <button
            key={op.id}
            type="button"
            className={op.id === current.id ? 'on' : ''}
            onClick={() => {
              setSelected(op.id);
              setResult(null);
            }}
          >
            <span className={`m ${op.method === 'POST' ? 'post' : ''}`}>{op.method}</span>
            {op.path}
          </button>
        ))}
      </div>
      <div className="op-body">
        <p>
          <span className={statusClass(current.status)}>{statusLabel(current.status)}</span>
          {' '}
          {current.tags.join(' · ')}
        </p>
        <h3 style={{ marginTop: 0 }}>{current.summary}</h3>
        {current.description ? <p className="note">{current.description}</p> : null}
        <p className="mono" style={{ fontSize: '0.85rem' }}>{current.method} {current.path}</p>
        {current.path.includes('{mint}') ? (
          <label>
            mint
            <input value={mint} onChange={(e) => setMint(e.target.value)} autoComplete="off" spellCheck="false" />
          </label>
        ) : null}
        {current.status === 'keyed' ? (
          <label>
            x-legendary-api-key
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              spellCheck="false"
              placeholder="issued by the site owner"
            />
          </label>
        ) : null}
        {current.tryBody || current.method === 'POST' ? (
          <label>
            JSON body
            <textarea value={body} onChange={(e) => setBody(e.target.value)} spellCheck="false" rows={6} />
          </label>
        ) : null}
        <button type="button" className="btn" onClick={run} disabled={busy}>
          {busy ? 'Calling…' : 'Try it'}
        </button>
        {result ? (
          <>
            <p className="note">HTTP {result.status}</p>
            <pre>{typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}</pre>
          </>
        ) : (
          <p className="note">Hits this portal. Catalog, discovery, quotes, and candles read https://legendary.fun. Trades, token launch, claims, and rewards need an owner-issued API key.</p>
        )}
      </div>
    </div>
  );
}
