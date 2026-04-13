import 'server-only';
import { randomBytes, createHash } from 'node:crypto';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export const FREE_STRATEGY = 'classic' as const;

export interface LicenseContext {
  licenseId: string | null;
  unlockedStrategies: Set<string>; // always includes FREE_STRATEGY
  expiresAt: Date | null;
  issuedTo: string | null;
}

export interface StrategyLicense {
  id: string;
  keyPrefix: string;
  issuedTo: string | null;
  status: 'active' | 'revoked';
  expiresAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  notes: string | null;
}

export interface StrategyLicenseWithGrants extends StrategyLicense {
  strategies: string[];
}

// ──────────────────────────────────────────────────────────────────────────
// Key generation + hashing
// ──────────────────────────────────────────────────────────────────────────

export interface GeneratedKey {
  plaintext: string;
  hash: string;
  prefix: string;
}

export function generateKey(): GeneratedKey {
  const plaintext = 'tck_live_' + randomBytes(16).toString('hex');
  const hash = hashKey(plaintext);
  const prefix = plaintext.slice(0, 12);
  return { plaintext, hash, prefix };
}

export function hashKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────
// Anonymous context helper (used by fall-through cases)
// ──────────────────────────────────────────────────────────────────────────

export function anonymousContext(): LicenseContext {
  return {
    licenseId: null,
    unlockedStrategies: new Set([FREE_STRATEGY]),
    expiresAt: null,
    issuedTo: null,
  };
}
