import { CLUSTER, FACTORY, GENESIS, PATHS, TAGS } from './constants.mjs';
import { createDiscovery } from './discovery.mjs';
import { encodeTrade } from './encode-trade.mjs';
import { meteoraAdapter, nativeAdapter, pumpAdapter } from './adapters.mjs';

export * from './constants.mjs';
export { encodeTrade } from './encode-trade.mjs';
export { createDiscovery, DiscoveryError } from './discovery.mjs';

export function createLegendarySdk(options = {}) {
  const discovery = createDiscovery(options);
  return Object.freeze({
    cluster: CLUSTER,
    factory: FACTORY,
    genesis: GENESIS,
    tags: TAGS,
    paths: PATHS,
    discovery,
    native: nativeAdapter(discovery),
    pump: pumpAdapter(discovery),
    meteora: meteoraAdapter(discovery),
    encodeTrade,
  });
}

export class Legendary {
  constructor(options = {}) {
    Object.assign(this, createLegendarySdk(options));
  }
}
