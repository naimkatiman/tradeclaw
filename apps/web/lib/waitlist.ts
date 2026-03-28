import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaitlistEntry {
  email: string;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  joinedAt: string;
}

export interface WaitlistData {
  entries: WaitlistEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), 'data');
const WAITLIST_FILE = path.join(DATA_DIR, 'waitlist.json');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readData(): WaitlistData {
  ensureDataDir();
  if (!fs.existsSync(WAITLIST_FILE)) {
    return { entries: [] };
  }
  const raw = fs.readFileSync(WAITLIST_FILE, 'utf-8');
  return JSON.parse(raw) as WaitlistData;
}

function writeData(data: WaitlistData): void {
  ensureDataDir();
  fs.writeFileSync(WAITLIST_FILE, JSON.stringify(data, null, 2));
}

function generateReferralCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getWaitlistCount(): number {
  return readData().entries.length;
}

export function getPosition(email: string): { position: number; referralCode: string; referralCount: number } | null {
  const data = readData();
  const sorted = getSortedEntries(data.entries);
  const idx = sorted.findIndex((e) => e.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return null;
  return {
    position: idx + 1,
    referralCode: sorted[idx].referralCode,
    referralCount: sorted[idx].referralCount,
  };
}

export function joinWaitlist(email: string, ref?: string): { entry: WaitlistEntry; isNew: boolean } {
  const data = readData();
  const normalizedEmail = email.toLowerCase().trim();

  // Dedup by email
  const existing = data.entries.find((e) => e.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return { entry: existing, isNew: false };
  }

  // Validate referral
  let referredBy: string | null = null;
  if (ref) {
    const referrer = data.entries.find((e) => e.referralCode === ref);
    if (referrer) {
      referrer.referralCount += 1;
      referredBy = ref;
    }
  }

  const entry: WaitlistEntry = {
    email: normalizedEmail,
    referralCode: generateReferralCode(),
    referredBy,
    referralCount: 0,
    joinedAt: new Date().toISOString(),
  };

  data.entries.push(entry);
  writeData(data);

  return { entry, isNew: true };
}

/**
 * Sort entries by effective position: each referral moves you up 5 spots.
 * Effective join time = actual join time minus (referralCount * 5 minutes equivalent).
 */
function getSortedEntries(entries: WaitlistEntry[]): WaitlistEntry[] {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.joinedAt).getTime() - a.referralCount * 5 * 60_000;
    const bTime = new Date(b.joinedAt).getTime() - b.referralCount * 5 * 60_000;
    return aTime - bTime;
  });
}
