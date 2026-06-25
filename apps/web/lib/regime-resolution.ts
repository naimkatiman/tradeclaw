/**
 * Regime Resolution — D9 bridge between the algorithmic market_regimes map
 * and the weekly-regime card operator override.
 *
 * Plan: docs/plans/2026-06-11-phase3-regime-engine.md (D9)
 *
 * Override mapping rules:
 * - TRENDING + conviction 3 → hard override: every universe symbol of that
 *   class is forced to 'trend' in the resolved map (including symbols absent
 *   from the algo map). Tilt recorded with hardOverride: true.
 * - TRENDING + conviction 1–2 → tilt recorded (hardOverride: false); regime
 *   labels left unchanged. Metadata preserved for Phase 4 strategy dispatch.
 * - NEUTRAL class / null card / card-read throw → defer to algo (fail-safe).
 *   No tilts recorded for those classes.
 *
 * Symbol→class mapping: getSymbolCategory returns 'metals'|'crypto'|'forex'.
 * metals maps to 'commodities' on the card. Card classes 'stocks' and 'indices'
 * have no universe symbols — unreachable in practice, no special-casing needed.
 *
 * Fail-safe policy: the function never rejects. Either source failing degrades
 * gracefully: algo-map errors → empty map (existing fetchRegimeMap semantics);
 * card errors → null (caught internally, treated as no card).
 *
 * This is the ONLY sanctioned bridge between the two systems. Do not import
 * from weekly-regime/service anywhere else in the algorithmic regime path.
 */

import 'server-only';

import { fetchRegimeMap } from './regime-filter';
import { getCurrentWeeklyRegime } from './weekly-regime/service';
import { getAllSymbols, getSymbolCategory } from '@tradeclaw/signals';
import type { MarketRegime, SymbolCategory } from '@tradeclaw/signals';
import type { AssetClass, Bias, Conviction } from './weekly-regime/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Card-level regime vocabulary (weekly card, not algo). */
type WeeklyRegime = 'TRENDING' | 'NEUTRAL';

/**
 * Directional tilt recorded for a TRENDING asset class.
 * hardOverride=true means conviction 3: labels were forced to 'trend'.
 * hardOverride=false means conviction 1–2: labels untouched, tilt is metadata.
 */
export interface Tilt {
  assetClass: AssetClass;
  bias: Bias;
  conviction: Conviction;
  weeklyRegime: WeeklyRegime;
  hardOverride: boolean;
}

/** Result of fetchResolvedRegimeMap. */
export interface ResolvedRegimeMap {
  /** Symbol→regime map. Pass to getDominantRegime / filterSignalsByRegime unchanged. */
  regimes: Map<string, MarketRegime>;
  /** TRENDING classes only. Empty when card is absent or all classes are NEUTRAL. */
  classTilts: Map<AssetClass, Tilt>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map getSymbolCategory's return value to the card's AssetClass vocabulary.
 * 'metals' → 'commodities'; 'crypto' and 'forex' pass through.
 * Exhaustive: tsc errors here if SymbolCategory ever gains a member.
 */
function symbolCategoryToAssetClass(category: SymbolCategory): AssetClass {
  switch (category) {
    case 'metals':
      return 'commodities';
    case 'crypto':
      return 'crypto';
    case 'forex':
      return 'forex';
    default: {
      const _exhaustive: never = category;
      return _exhaustive;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compose the algorithmic regime map with the weekly-regime card operator
 * override. Returns a resolved map safe to pass to all existing helpers
 * (getDominantRegime, filterSignalsByRegime, runRiskPipeline, etc.).
 *
 * Never rejects — degrades to algo-only on any failure (see module JSDoc).
 */
export async function fetchResolvedRegimeMap(): Promise<ResolvedRegimeMap> {
  // Fetch both sources concurrently. fetchRegimeMap already never rejects in
  // production (empty-map on DB error), but in tests it may be mocked to
  // reject; wrap both to guarantee this function never rejects.
  const [algoMap, card] = await Promise.all([
    fetchRegimeMap().catch(() => new Map<string, MarketRegime>()),
    getCurrentWeeklyRegime().catch(() => null),
  ]);

  const classTilts = new Map<AssetClass, Tilt>();

  // No card → pure algo passthrough. Copy for consistency with the
  // card-present path so callers never share a reference with the source map.
  if (card === null) {
    return { regimes: new Map(algoMap), classTilts };
  }

  // Build the resolved map starting from a copy of the algo map.
  const regimes = new Map<string, MarketRegime>(algoMap);

  // Inspect each card class.
  for (const [cls, classRegime] of Object.entries(card.classes) as [AssetClass, typeof card.classes[AssetClass]][]) {
    if (classRegime.regime !== 'TRENDING') {
      // NEUTRAL → passthrough, no tilt.
      continue;
    }

    const { conviction, bias } = classRegime;
    const tilt: Tilt = {
      assetClass: cls,
      bias,
      conviction,
      weeklyRegime: 'TRENDING',
      hardOverride: conviction === 3,
    };
    classTilts.set(cls, tilt);

    if (conviction === 3) {
      // Hard override: force every universe symbol of this class to 'trend'.
      // For classes with no universe symbols (stocks, indices) this loop is a
      // label no-op — the tilt still records operator intent, so Phase 4
      // consumers must not assume hardOverride implies labels changed.
      for (const symbol of getAllSymbols()) {
        const category = getSymbolCategory(symbol);
        const assetClass = symbolCategoryToAssetClass(category);
        if (assetClass === cls) {
          regimes.set(symbol, 'trend');
        }
      }
    }
    // conviction 1–2: tilt recorded above; labels untouched.
  }

  return { regimes, classTilts };
}
