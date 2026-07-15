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

function loadPledges(): PledgesData {
  if (!existsSync(PLEDGES_FILE)) {
    return { pledges: [] };
  }
  try {
    const raw = readFileSync(PLEDGES_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PledgesData>;
    return { pledges: Array.isArray(parsed.pledges) ? parsed.pledges : [] };
  } catch {
    return { pledges: [] };
  }
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
  { stars: 100, feature: 'PostgreSQL improvements', description: 'Community request for broader production persistence and multi-instance support.' },
  { stars: 250, feature: 'Additional exchange adapters', description: 'Community request for more explicitly configured execution adapters.' },
  { stars: 500, feature: 'Mobile client', description: 'Community request for a mobile client and configured push notifications.' },
  { stars: 1000, feature: 'Strategy authoring assistant', description: 'Community request for assisted, reviewable strategy configuration.' },
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
