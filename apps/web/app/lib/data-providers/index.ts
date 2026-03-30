/**
 * Data Providers Registry — unified access to all free market data sources
 *
 * 24 providers across 8 categories:
 *
 * CRYPTO (no key):     CoinGecko*, Binance*, CoinCap, Kraken, CryptoCompare†
 * FOREX (mixed):       OANDA†, Stooq*, open.er-api*, Frankfurter, fawazahmed0
 * STOCKS (free key):   Finnhub†, Twelve Data†, FMP†
 * COMMODITIES (no key): Stooq*, Free Gold API
 * MACRO (mixed):       FRED†, World Bank, IMF
 * DEFI (no key):       DeFi Llama
 * SENTIMENT (no key):  Fear & Greed Index
 * ON-CHAIN (no key):   Mempool.space
 *
 * * = already integrated prior    † = requires free API key
 */

// Re-export types
export type {
  PriceQuote,
  OHLCV,
  ForexRate,
  MacroDataPoint,
  DeFiProtocol,
  DeFiYield,
  SentimentData,
  OnChainData,
  GoldHistorical,
  ProviderStatus,
  ProviderCategory,
} from './types';
export { safeFetch, safeFetchText } from './types';

// Re-export all provider functions
export {
  fetchCoinCapPrices,
  fetchCoinCapHistory,
  fetchKrakenPrices,
  fetchKrakenOHLCV,
  fetchCryptoCompareOHLCV,
} from './crypto';

export {
  fetchFrankfurterRates,
  fetchFrankfurterHistory,
  fetchFawazRates,
} from './forex';

export {
  fetchOandaOHLCV,
  fetchOandaPrices,
  isOandaSymbol,
} from './oanda';

export {
  fetchFinnhubQuotes,
  fetchFinnhubCandles,
  fetchTwelveDataOHLCV,
  fetchFMPQuotes,
} from './stocks';

export {
  fetchFreeGoldPrice,
  fetchFreeGoldHistory,
  fetchFreeSilverPrice,
} from './commodities';

export {
  fetchFREDSeries,
  fetchFREDLatest,
  getFREDSeriesList,
  fetchWorldBankData,
  fetchWorldBankLatest,
  getWorldBankIndicators,
  fetchIMFExchangeRates,
} from './macro';

export {
  fetchDeFiProtocols,
  fetchTotalTVL,
  fetchDeFiYields,
  fetchDeFiTokenPrices,
  fetchStablecoinData,
} from './defi';

export {
  fetchFearGreedIndex,
  fetchFearGreedHistory,
  interpretSentiment,
} from './sentiment';

export {
  fetchMempoolData,
  fetchAddressInfo,
  fetchBlockFeeHistory,
} from './onchain';

// ─── Provider Registry ─────────────────────────────────────────────────────

import type { ProviderStatus } from './types';

export function getProviderRegistry(): ProviderStatus[] {
  return [
    // Crypto — no key
    { name: 'CoinGecko', category: 'crypto', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: '5-30 req/min', docs: 'https://www.coingecko.com/en/api' },
    { name: 'Binance', category: 'crypto', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: '1200 weight/min', docs: 'https://developers.binance.com/docs/binance-spot-api-docs' },
    { name: 'CoinCap', category: 'crypto', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: '200 req/min', docs: 'https://docs.coincap.io/' },
    { name: 'Kraken', category: 'crypto', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: '15 req/sec', docs: 'https://docs.kraken.com/api/' },
    { name: 'CryptoCompare', category: 'crypto', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: '100k calls/month', docs: 'https://min-api.cryptocompare.com/' },

    // Forex — OANDA (key required)
    { name: 'OANDA', category: 'forex', status: process.env.OANDA_API_TOKEN ? 'ok' : 'down', lastCheck: Date.now(), requiresKey: true, rateLimit: '120 req/sec', docs: 'https://developer.oanda.com/rest-live-v20/introduction/' },

    // Forex — no key
    { name: 'Stooq', category: 'forex', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'generous', docs: 'https://stooq.com/' },
    { name: 'open.er-api', category: 'forex', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: '1 req/hour', docs: 'https://www.exchangerate-api.com/docs/free' },
    { name: 'Frankfurter', category: 'forex', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'none', docs: 'https://frankfurter.dev/' },
    { name: 'fawazahmed0', category: 'forex', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'none (CDN)', docs: 'https://github.com/fawazahmed0/exchange-api' },

    // Stocks — free key required
    { name: 'Finnhub', category: 'stocks', status: process.env.FINNHUB_API_KEY ? 'ok' : 'down', lastCheck: Date.now(), requiresKey: true, rateLimit: '60 req/min', docs: 'https://finnhub.io/' },
    { name: 'Twelve Data', category: 'stocks', status: process.env.TWELVE_DATA_API_KEY ? 'ok' : 'down', lastCheck: Date.now(), requiresKey: true, rateLimit: '800 req/day', docs: 'https://twelvedata.com/' },
    { name: 'FMP', category: 'stocks', status: process.env.FMP_API_KEY ? 'ok' : 'down', lastCheck: Date.now(), requiresKey: true, rateLimit: '250 req/day', docs: 'https://financialmodelingprep.com/' },

    // Commodities — no key
    { name: 'Free Gold API', category: 'commodities', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'generous', docs: 'https://freegoldapi.com/' },

    // Macro — mixed
    { name: 'FRED', category: 'macro', status: process.env.FRED_API_KEY ? 'ok' : 'down', lastCheck: Date.now(), requiresKey: true, rateLimit: '120 req/min', docs: 'https://fred.stlouisfed.org/docs/api/fred/' },
    { name: 'World Bank', category: 'macro', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'generous', docs: 'https://api.worldbank.org/v2/' },
    { name: 'IMF', category: 'macro', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'generous', docs: 'https://dataservices.imf.org/' },

    // DeFi — no key
    { name: 'DeFi Llama', category: 'defi', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'none', docs: 'https://defillama.com/docs/api' },

    // Sentiment — no key
    { name: 'Fear & Greed', category: 'sentiment', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'generous', docs: 'https://alternative.me/crypto/fear-and-greed-index/' },

    // On-chain — no key
    { name: 'Mempool.space', category: 'onchain', status: 'ok', lastCheck: Date.now(), requiresKey: false, rateLimit: 'generous', docs: 'https://mempool.space/docs/api' },
  ];
}
