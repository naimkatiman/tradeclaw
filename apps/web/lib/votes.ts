import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const VOTES_FILE = join(process.cwd(), 'data', 'votes.json');

const PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'AAPL', 'TSLA', 'SPX500',
] as const;

type Pair = (typeof PAIRS)[number];
type Direction = 'BUY' | 'SELL' | 'HOLD';

interface PairVotes {
  BUY: number;
  SELL: number;
  HOLD: number;
}

interface VotesData {
  pairs: Record<string, PairVotes>;
  weekStart: string;
}

function getISOWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

function isWeekExpired(weekStart: string): boolean {
  const start = new Date(weekStart);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return diffMs > 7 * 24 * 60 * 60 * 1000;
}

function createSeedData(): VotesData {
  return {
    pairs: {
      BTCUSD: { BUY: 142, SELL: 67, HOLD: 38 },
      ETHUSD: { BUY: 98, SELL: 85, HOLD: 44 },
      XAUUSD: { BUY: 156, SELL: 41, HOLD: 29 },
      XAGUSD: { BUY: 73, SELL: 52, HOLD: 31 },
      EURUSD: { BUY: 61, SELL: 88, HOLD: 53 },
      GBPUSD: { BUY: 79, SELL: 64, HOLD: 41 },
      USDJPY: { BUY: 55, SELL: 102, HOLD: 48 },
      AAPL: { BUY: 121, SELL: 45, HOLD: 37 },
      TSLA: { BUY: 89, SELL: 94, HOLD: 52 },
      SPX500: { BUY: 108, SELL: 56, HOLD: 41 },
    },
    weekStart: getISOWeekStart(),
  };
}

function createEmptyPairs(): Record<string, PairVotes> {
  const pairs: Record<string, PairVotes> = {};
  for (const p of PAIRS) {
    pairs[p] = { BUY: 0, SELL: 0, HOLD: 0 };
  }
  return pairs;
}

function loadVotes(): VotesData {
  if (!existsSync(VOTES_FILE)) {
    const seed = createSeedData();
    writeFileSync(VOTES_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }

  const raw = readFileSync(VOTES_FILE, 'utf-8');
  const data: VotesData = JSON.parse(raw);

  // Auto-reset if week expired
  if (isWeekExpired(data.weekStart)) {
    const reset: VotesData = {
      pairs: createEmptyPairs(),
      weekStart: getISOWeekStart(),
    };
    writeFileSync(VOTES_FILE, JSON.stringify(reset, null, 2));
    return reset;
  }

  return data;
}

function saveVotes(data: VotesData): void {
  writeFileSync(VOTES_FILE, JSON.stringify(data, null, 2));
}

export function getVotes(): VotesData {
  return loadVotes();
}

export function submitVote(pair: string, direction: Direction): PairVotes | null {
  const upper = pair.toUpperCase();
  if (!PAIRS.includes(upper as Pair)) return null;
  if (!['BUY', 'SELL', 'HOLD'].includes(direction)) return null;

  const data = loadVotes();
  if (!data.pairs[upper]) {
    data.pairs[upper] = { BUY: 0, SELL: 0, HOLD: 0 };
  }
  data.pairs[upper][direction] += 1;
  saveVotes(data);
  return data.pairs[upper];
}

export function getVoteStats(): {
  totalVotes: number;
  mostBullishPair: string;
  mostBearishPair: string;
  communityBullishPct: number;
} {
  const data = loadVotes();
  let totalVotes = 0;
  let totalBuy = 0;
  let totalSell = 0;
  let maxBuyRatio = -1;
  let maxSellRatio = -1;
  let mostBullishPair: string = PAIRS[0];
  let mostBearishPair: string = PAIRS[0];

  for (const pair of PAIRS) {
    const v = data.pairs[pair] ?? { BUY: 0, SELL: 0, HOLD: 0 };
    const pairTotal = v.BUY + v.SELL + v.HOLD;
    totalVotes += pairTotal;
    totalBuy += v.BUY;
    totalSell += v.SELL;

    if (pairTotal > 0) {
      const buyRatio = v.BUY / pairTotal;
      const sellRatio = v.SELL / pairTotal;
      if (buyRatio > maxBuyRatio) {
        maxBuyRatio = buyRatio;
        mostBullishPair = pair;
      }
      if (sellRatio > maxSellRatio) {
        maxSellRatio = sellRatio;
        mostBearishPair = pair;
      }
    }
  }

  const communityBullishPct = totalBuy + totalSell > 0
    ? Math.round((totalBuy / (totalBuy + totalSell)) * 100)
    : 50;

  return { totalVotes, mostBullishPair, mostBearishPair, communityBullishPct };
}
