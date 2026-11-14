/** Pump- and Meteora-shaped method names. Execution stays 501 until admitted. */
import { encodeTrade } from './encode-trade.mjs';

export function pumpAdapter(discovery) {
  return Object.freeze({
    getLatestCoins: () => discovery.pumpCoins(),
    getCoinByMint: (mint) => discovery.pumpCoin(mint),
    getSolPrice: () => discovery.solUsd(),
    async buy() {
      throw Object.assign(new Error('NOT_ADMITTED'), { code: 'NOT_ADMITTED' });
    },
    async sell() {
      throw Object.assign(new Error('NOT_ADMITTED'), { code: 'NOT_ADMITTED' });
    },
  });
}

export function meteoraAdapter(discovery) {
  return Object.freeze({
    getPools: () => discovery.meteoraPools(),
    getPool: (mint) => discovery.meteoraPool(mint),
    async swapQuote2() {
      throw Object.assign(new Error('NOT_ADMITTED'), { code: 'NOT_ADMITTED' });
    },
    async swap2() {
      throw Object.assign(new Error('NOT_ADMITTED'), { code: 'NOT_ADMITTED' });
    },
  });
}

export function nativeAdapter(discovery) {
  return Object.freeze({
    tokens: () => discovery.tokens(),
    token: (mint) => discovery.token(mint),
    curve: (mint) => discovery.curve(mint),
    launchpad: () => discovery.launchpad(),
    catalog: () => discovery.catalog(),
    encodeBuy: (fields) => encodeTrade({ ...fields, side: 'buy' }),
    encodeSell: (fields) => encodeTrade({ ...fields, side: 'sell' }),
    async quote() {
      throw Object.assign(new Error('NOT_ADMITTED'), { code: 'NOT_ADMITTED' });
    },
    async buildSwap() {
      throw Object.assign(new Error('NOT_ADMITTED'), { code: 'NOT_ADMITTED' });
    },
  });
}
