/** Pump- and Meteora-shaped method names. Hosted submit stays closed. */
import { encodeTrade } from './encode-trade.mjs';
import { buildUnsignedTrade } from './accounts.mjs';
import { quoteTrade } from './quote.mjs';

function closed(code, message) {
  return async function rejected() {
    throw Object.assign(new Error(message || code), { code });
  };
}

function needQuoteInput(input) {
  if (!input?.mint && !input?.row && !input?.quote) {
    throw Object.assign(new Error('AMOUNT'), { code: 'AMOUNT' });
  }
}

export function pumpAdapter(discovery) {
  return Object.freeze({
    getLatestCoins: () => discovery.pumpCoins(),
    getCoinByMint: (mint) => discovery.pumpCoin(mint),
    searchCoins: (query) => discovery.pumpSearch(query),
    getSolPrice: () => discovery.solUsd(),
    getCandlesticks: (mint) => discovery.pumpCandles(mint),
    buy: closed('DISABLED', 'Pump buy is not a Legendary instruction. Use the legendary.fun token page.'),
    sell: closed('DISABLED', 'Pump sell is not a Legendary instruction. Use the legendary.fun token page.'),
    createCoin: closed('DISABLED', 'Create stays on legendary.fun same-origin.'),
  });
}

export function meteoraAdapter(discovery) {
  return Object.freeze({
    getPools: () => discovery.meteoraPools(),
    getPool: (mint) => discovery.meteoraPool(mint),
    async swapQuote2(input) {
      needQuoteInput(input);
      if (input.row) {
        return quoteTrade({
          ...input,
          side: input.swapBaseForQuote === true ? 'sell' : (input.side || 'buy'),
        });
      }
      return discovery.meteoraQuote(input);
    },
    swap2: closed('DISABLED', 'Hosted swap is the legendary.fun trade ticket, not a partner execute API.'),
  });
}

export function nativeAdapter(discovery) {
  return Object.freeze({
    tokens: () => discovery.tokens(),
    token: (mint) => discovery.token(mint),
    curve: (mint) => discovery.curve(mint),
    launchpad: () => discovery.launchpad(),
    catalog: () => discovery.catalog(),
    discover: (query) => discovery.discover(query),
    markets: (mints) => discovery.markets(mints),
    stream: () => discovery.stream(),
    candles: (mint, interval) => discovery.candles(mint, interval),
    idl: () => discovery.idl(),
    encodeBuy: (fields) => encodeTrade({ ...fields, side: 'buy' }),
    encodeSell: (fields) => encodeTrade({ ...fields, side: 'sell' }),
    quoteLocal: quoteTrade,
    buildLocal: buildUnsignedTrade,
    async quote(input) {
      needQuoteInput(input);
      if (input.row) return quoteTrade(input);
      return discovery.quote(input);
    },
    async buildSwap(input) {
      needQuoteInput(input);
      const quote = input.quote || (input.row ? quoteTrade(input) : await discovery.quote(input));
      return buildUnsignedTrade({ quote, trader: input.trader, traderToken: input.traderToken });
    },
    create: closed('DISABLED', 'Create stays on legendary.fun same-origin.'),
    claimRewards: closed('DISABLED', 'Claims stay on legendary.fun same-origin.'),
  });
}
