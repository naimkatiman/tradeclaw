import { describe, it, expect } from 'vitest';
import {
  FREE_SYMBOLS,
  isAllowedForTier,
  partitionByTier,
  type Tier,
} from '../tier.js';

describe('FREE_SYMBOLS', () => {
  // Pinned set so accidental drift between ws-server and apps/web/lib/tier-client.ts
  // surfaces as a failed test rather than a silent leak. If product changes the
  // free symbol list, update this assertion AND apps/web/lib/tier-client.ts in
  // the same PR.
  it('matches the canonical 6-symbol free-tier set', () => {
    expect([...FREE_SYMBOLS].sort()).toEqual(
      ['BTCUSD', 'ETHUSD', 'XAUUSD', 'EURUSD', 'SPYUSD', 'QQQUSD'].sort(),
    );
  });
});

describe('isAllowedForTier', () => {
  it('returns true for free symbols on free tier', () => {
    for (const sym of FREE_SYMBOLS) {
      expect(isAllowedForTier(sym, 'free')).toBe(true);
    }
  });

  it('returns false for Pro-only symbols on free tier', () => {
    expect(isAllowedForTier('NVDAUSD', 'free')).toBe(false);
    expect(isAllowedForTier('TSLAUSD', 'free')).toBe(false);
    expect(isAllowedForTier('GBPUSD', 'free')).toBe(false);
  });

  it('returns true for any symbol on pro/elite/custom', () => {
    const tiers: Tier[] = ['pro', 'elite', 'custom'];
    for (const tier of tiers) {
      expect(isAllowedForTier('NVDAUSD', tier)).toBe(true);
      expect(isAllowedForTier('BTCUSD', tier)).toBe(true);
      expect(isAllowedForTier('GBPUSD', tier)).toBe(true);
    }
  });

  it('is case-insensitive', () => {
    expect(isAllowedForTier('btcusd', 'free')).toBe(true);
    expect(isAllowedForTier('BtcUsd', 'free')).toBe(true);
    expect(isAllowedForTier('nvdausd', 'free')).toBe(false);
  });
});

describe('partitionByTier', () => {
  it('splits a mixed list into allowed and blocked for free', () => {
    const result = partitionByTier(['BTCUSD', 'NVDAUSD', 'ETHUSD', 'GBPUSD'], 'free');
    expect(result.allowed.sort()).toEqual(['BTCUSD', 'ETHUSD'].sort());
    expect(result.blocked.sort()).toEqual(['GBPUSD', 'NVDAUSD'].sort());
  });

  it('returns everything as allowed for pro', () => {
    const result = partitionByTier(['BTCUSD', 'NVDAUSD', 'GBPUSD'], 'pro');
    expect(result.allowed.sort()).toEqual(['BTCUSD', 'GBPUSD', 'NVDAUSD'].sort());
    expect(result.blocked).toEqual([]);
  });

  it('preserves the input casing on allowed results', () => {
    // Allowed list keeps the symbol in the form it was passed (uppercased)
    // so the relay's existing case-handling stays unchanged.
    const result = partitionByTier(['btcusd', 'nvdausd'], 'free');
    expect(result.allowed).toEqual(['BTCUSD']);
    expect(result.blocked).toEqual(['NVDAUSD']);
  });

  it('handles an empty input', () => {
    expect(partitionByTier([], 'free')).toEqual({ allowed: [], blocked: [] });
    expect(partitionByTier([], 'pro')).toEqual({ allowed: [], blocked: [] });
  });
});
