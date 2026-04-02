import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const PLEDGES_FILE = join(process.cwd(), 'data', 'pledges.json');

export interface Pledge {
  id: string;
  name: string;
  email: string;
  milestoneStars: number;
  createdAt: string;
}

export interface PledgesData {
  pledges: Pledge[];
}

export interface MilestoneStats {
  stars: number;
  feature: string;
  description: string;
  pledgeCount: number;
}

function generateId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createSeedData(): PledgesData {
  const now = Date.now();
  return {
    pledges: [
      { id: 'p_seed_01', name: 'Alex Chen', email: 'alex.c***@gmail.com', milestoneStars: 100, createdAt: new Date(now - 6 * 86400000).toISOString() },
      { id: 'p_seed_02', name: 'Sarah Kim', email: 's.ki***@outlook.com', milestoneStars: 250, createdAt: new Date(now - 5 * 86400000).toISOString() },
      { id: 'p_seed_03', name: 'Marcus Rivera', email: 'marc***@proton.me', milestoneStars: 100, createdAt: new Date(now - 4 * 86400000).toISOString() },
      { id: 'p_seed_04', name: 'Yuki Tanaka', email: 'yuki***@yahoo.co.jp', milestoneStars: 500, createdAt: new Date(now - 3.5 * 86400000).toISOString() },
      { id: 'p_seed_05', name: 'Priya Sharma', email: 'priy***@gmail.com', milestoneStars: 1000, createdAt: new Date(now - 3 * 86400000).toISOString() },
      { id: 'p_seed_06', name: 'David Müller', email: 'd.mu***@web.de', milestoneStars: 250, createdAt: new Date(now - 2 * 86400000).toISOString() },
      { id: 'p_seed_07', name: 'Fatima Al-Rashid', email: 'fati***@gmail.com', milestoneStars: 500, createdAt: new Date(now - 1.5 * 86400000).toISOString() },
      { id: 'p_seed_08', name: 'João Santos', email: 'joao***@hotmail.com', milestoneStars: 100, createdAt: new Date(now - 86400000).toISOString() },
    ],
  };
}

function loadPledges(): PledgesData {
  if (!existsSync(PLEDGES_FILE)) {
    const seed = createSeedData();
    const dir = dirname(PLEDGES_FILE);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(PLEDGES_FILE, JSON.stringify(seed, null, 2));
    return seed;
  }
  const raw = readFileSync(PLEDGES_FILE, 'utf-8');
  return JSON.parse(raw) as PledgesData;
}

function savePledges(data: PledgesData): void {
  const dir = dirname(PLEDGES_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(PLEDGES_FILE, JSON.stringify(data, null, 2));
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  const maskedLocal = local.length <= 3 ? '***' : local.slice(0, Math.min(4, local.length)) + '***';
  return `${maskedLocal}@${domain}`;
}

export function getPledges(): Pledge[] {
  const data = loadPledges();
  return data.pledges;
}

export function addPledge(name: string, email: string, milestoneStars: number): Pledge {
  const data = loadPledges();

  // Dedup by email — if email exists, update the pledge
  const existingIndex = data.pledges.findIndex(
    (p) => p.email.toLowerCase() === email.toLowerCase()
  );

  const pledge: Pledge = {
    id: generateId(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    milestoneStars,
    createdAt: new Date().toISOString(),
  };

  if (existingIndex !== -1) {
    // Update existing pledge
    pledge.id = data.pledges[existingIndex].id;
    data.pledges[existingIndex] = pledge;
  } else {
    data.pledges.push(pledge);
  }

  savePledges(data);
  return pledge;
}

export const MILESTONES: { stars: number; feature: string; description: string }[] = [
  { stars: 100, feature: 'PostgreSQL Support', description: 'Persistent database storage for production deployments — replace file-based JSON with battle-tested PostgreSQL.' },
  { stars: 250, feature: 'Multi-Exchange Execution', description: 'One-click live order execution via CCXT across Binance, Bybit, Kraken, and 20+ exchanges.' },
  { stars: 500, feature: 'Mobile App (iOS + Android)', description: 'Native mobile app with push notifications, signal cards, and portfolio tracking on the go.' },
  { stars: 1000, feature: 'AI Strategy Copilot', description: 'Natural language strategy builder — describe your trading logic and TradeClaw generates the strategy JSON automatically.' },
];

export function getStats(): MilestoneStats[] {
  const pledges = getPledges();
  return MILESTONES.map((m) => ({
    stars: m.stars,
    feature: m.feature,
    description: m.description,
    pledgeCount: pledges.filter((p) => p.milestoneStars === m.stars).length,
  }));
}
