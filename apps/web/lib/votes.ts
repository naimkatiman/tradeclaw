import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

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

function createEmptyPairs(): Record<string, PairVotes> {
  const pairs: Record<string, PairVotes> = {};
  for (const p of PAIRS) {
    pairs[p] = { BUY: 0, SELL: 0, HOLD: 0 };
  }
  return pairs;
}

function loadVotes(): VotesData {
  if (!existsSync(VOTES_FILE)) {
    return { pairs: createEmptyPairs(), weekStart: getISOWeekStart() };
  }

  let data: VotesData;
  try {
    const raw = readFileSync(VOTES_FILE, 'utf-8');
    data = JSON.parse(raw) as VotesData;
  } catch {
    return { pairs: createEmptyPairs(), weekStart: getISOWeekStart() };
  }

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
  const dir = dirname(VOTES_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
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
  mostBullishPair: string | null;
  mostBearishPair: string | null;
  bullishSubmissionPct: number | null;
} {
  const data = loadVotes();
  let totalVotes = 0;
  let totalBuy = 0;
  let totalSell = 0;
  let maxBuyRatio = -1;
  let maxSellRatio = -1;
  let mostBullishPair: string | null = null;
  let mostBearishPair: string | null = null;

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

  const bullishSubmissionPct = totalBuy + totalSell > 0
    ? Math.round((totalBuy / (totalBuy + totalSell)) * 100)
    : null;

  return { totalVotes, mostBullishPair, mostBearishPair, bullishSubmissionPct };
}
