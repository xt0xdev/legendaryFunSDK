/** Pump- and Meteora-shaped method names. Buy/sell map to live Legendary prepare. Create/claims need an owner API key. */
import { encodeTrade } from './encode-trade.mjs';
import { buildUnsignedTrade } from './accounts.mjs';
import { quoteTrade } from './quote.mjs';

function needQuoteInput(input) {
  if (!input?.mint && !input?.row && !input?.quote) {
    throw Object.assign(new Error('AMOUNT'), { code: 'AMOUNT' });
  }
}

function needTradeInput(input) {
  if (!input?.wallet || !input?.mint || input?.amount == null) {
    throw Object.assign(new Error('AMOUNT'), { code: 'AMOUNT' });
  }
}

function needWallet(input) {
  if (!input?.wallet) {
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
    async buy(input) {
      needTradeInput(input);
      return discovery.prepare({ ...input, side: 'buy' });
    },
    async sell(input) {
      needTradeInput(input);
      return discovery.prepare({ ...input, side: 'sell' });
    },
    async createCoin(input) {
      needWallet(input);
      return discovery.pumpCreate(input);
    },
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
    async swap2(input) {
      needTradeInput(input);
      return discovery.prepare({
        ...input,
        side: input.swapBaseForQuote === true || input.side === 'sell' ? 'sell' : 'buy',
      });
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
    challenge: (payload) => discovery.authChallenge(payload),
    verify: (payload) => discovery.authVerify(payload),
    logout: (payload) => discovery.authLogout(payload),
    async prepare(payload) {
      needTradeInput(payload);
      return discovery.prepare(payload);
    },
    async graduatedPrepare(payload) {
      needTradeInput(payload);
      return discovery.graduatedPrepare(payload);
    },
    submit: (payload) => discovery.submit(payload),
    freshness: (payload) => discovery.freshness(payload),
    simulate: (payload) => discovery.simulate(payload),
    dispose: (payload) => discovery.dispose(payload),
    async create(payload) {
      needWallet(payload);
      return discovery.create(payload);
    },
    rewards: () => discovery.rewards(),
    async claimRewards(payload) {
      needWallet(payload);
      return discovery.claimRewards(payload);
    },
    async graduationClaims(payload) {
      if (payload === undefined) return discovery.graduationClaims();
      needWallet(payload);
      return discovery.graduationClaims(payload);
    },
  });
}
