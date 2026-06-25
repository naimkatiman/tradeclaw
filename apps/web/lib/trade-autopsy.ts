import { query, queryOne } from './db-pool';
import type { TradeEntry } from './trade-journal-db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionRating {
  rating: number; // 1-5
  notes: string;
}

export interface PsychologySection {
  notes: string;
}

export interface TradeAutopsy {
  tradeId: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sections: {
    setup: SectionRating;
    entry: SectionRating;
    exit: SectionRating;
    riskManagement: SectionRating;
    psychology: PsychologySection;
  };
  keyLessons: string[];
  repeatability: 'high' | 'medium' | 'low';
  summary: string;
}

// ---------------------------------------------------------------------------
// Rule-based analysis
// ---------------------------------------------------------------------------

const PSYCH_KEYWORDS: Record<string, string> = {
  fomo: 'FOMO detected — entry may have been chased',
  revenge: 'Possible revenge trade — emotionally driven',
  fear: 'Fear influenced decisions — may have exited too early',
  greed: 'Greed detected — may have held too long',
  patience: 'Patience noted — disciplined execution',
  impatient: 'Impatience detected — rushed the setup',
  panic: 'Panic selling — emotional exit',
  confident: 'Confidence noted — conviction in the thesis',
  overconfident: 'Overconfidence detected — check for oversizing',
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function generateAutopsy(trade: TradeEntry): TradeAutopsy {
  const hasEntry = trade.entryPrice !== null && trade.entryPrice > 0;
  const hasExit = trade.exitPrice !== null && trade.exitPrice > 0;
  const hasSize = trade.positionSize !== null && trade.positionSize > 0;
  const hasPnl = trade.pnl !== null;
  const pnl = trade.pnl ?? 0;
  const pnlPct = trade.pnlPercent ?? 0;

  // --- Setup rating ---
  let setupRating = 3;
  let setupNotes = 'Basic trade logged.';
  if (trade.setupType) {
    setupRating += 1;
    setupNotes = `Setup type identified: ${trade.setupType.replace('_', ' ')}.`;
  }
  if (trade.tags.length > 0) {
    setupRating += 1;
    setupNotes += ` Tags: ${trade.tags.join(', ')}.`;
  }
  if (!trade.setupType && trade.tags.length === 0) {
    setupRating = 2;
    setupNotes = 'No setup type or tags — unclear trade thesis.';
  }
  setupRating = clamp(setupRating, 1, 5);

  // --- Entry rating ---
  let entryRating = 3;
  let entryNotes = '';
  if (!hasEntry) {
    entryRating = 2;
    entryNotes = 'Entry price not recorded — cannot evaluate timing.';
  } else if (hasExit && hasPnl) {
    if (pnl > 0) {
      entryRating = 4;
      entryNotes = 'Entry led to a profitable outcome.';
    } else {
      entryRating = 2;
      entryNotes = 'Entry resulted in a loss — timing may have been off.';
    }
    // Bonus for strong percentage gain
    if (pnlPct > 3) { entryRating = 5; entryNotes += ' Strong move captured from entry.'; }
    if (pnlPct < -3) { entryRating = 1; entryNotes += ' Large adverse move from entry point.'; }
  } else {
    entryNotes = 'Entry recorded but exit/P&L incomplete — limited analysis.';
  }
  entryRating = clamp(entryRating, 1, 5);

  // --- Exit rating ---
  let exitRating = 3;
  let exitNotes = '';
  if (!hasExit) {
    exitRating = 2;
    exitNotes = 'Exit price not recorded — trade may still be open or data missing.';
  } else if (hasPnl && pnl > 0) {
    exitRating = 4;
    exitNotes = 'Exited in profit — execution was adequate.';
    if (pnlPct > 5) { exitRating = 5; exitNotes = 'Excellent exit — captured a large move.'; }
  } else if (hasPnl && pnl < 0) {
    exitRating = 2;
    exitNotes = 'Exited at a loss.';
    if (pnlPct < -5) { exitRating = 1; exitNotes = 'Large loss at exit — stop loss may have been too wide or missing.'; }
  } else {
    exitNotes = 'Exit logged but P&L unclear.';
  }
  exitRating = clamp(exitRating, 1, 5);

  // --- Risk management rating ---
  let rmRating = 3;
  let rmNotes = '';
  if (!hasSize) {
    rmRating = 2;
    rmNotes = 'Position size not recorded — cannot assess risk discipline.';
  } else {
    rmRating = 4;
    rmNotes = 'Position size documented — risk was quantified.';
  }
  if (hasEntry && hasExit && hasSize) {
    const entryP = trade.entryPrice!;
    const exitP = trade.exitPrice!;
    const riskPct = Math.abs((exitP - entryP) / entryP) * 100;
    if (riskPct > 10) {
      rmRating = 1;
      rmNotes = `Risk per trade very high (~${riskPct.toFixed(1)}% move). Tighten stops.`;
    } else if (riskPct > 5) {
      rmRating = 2;
      rmNotes = `Moderate risk (~${riskPct.toFixed(1)}% move). Consider smaller position or tighter stop.`;
    } else {
      rmRating = 4;
      rmNotes = `Controlled risk (~${riskPct.toFixed(1)}% move). Good discipline.`;
    }
  }
  rmRating = clamp(rmRating, 1, 5);

  // --- Psychology ---
  const notesLower = (trade.notes ?? '').toLowerCase();
  const psychHints: string[] = [];
  for (const [keyword, hint] of Object.entries(PSYCH_KEYWORDS)) {
    if (notesLower.includes(keyword)) psychHints.push(hint);
  }
  const psychNotes = psychHints.length > 0
    ? psychHints.join('. ') + '.'
    : 'No emotional keywords detected in notes. Consider journaling your mindset.';

  // --- Grade ---
  const avgRating = (setupRating + entryRating + exitRating + rmRating) / 4;
  let grade: TradeAutopsy['grade'] = 'C';
  if (avgRating >= 4.5) grade = 'A';
  else if (avgRating >= 3.5) grade = 'B';
  else if (avgRating >= 2.5) grade = 'C';
  else if (avgRating >= 1.5) grade = 'D';
  else grade = 'F';

  // --- Key lessons ---
  const lessons: string[] = [];
  if (!hasEntry || !hasExit) lessons.push('Always record entry and exit prices for complete post-trade analysis.');
  if (!hasSize) lessons.push('Log position size to track risk management discipline.');
  if (pnl > 0 && setupRating >= 4) lessons.push('Good setup + profit = repeatable edge. Keep executing this pattern.');
  if (pnl < 0 && entryRating <= 2) lessons.push('Review entry criteria — the timing was off on this trade.');
  if (pnl < 0 && rmRating <= 2) lessons.push('Tighten risk management. Consider smaller size or closer stop loss.');
  if (psychHints.some(h => h.includes('FOMO') || h.includes('revenge'))) {
    lessons.push('Emotional trading detected. Wait for your setup; do not force entries.');
  }
  if (lessons.length === 0) {
    lessons.push('Solid execution. Stay consistent with this approach.');
  }
  // Cap at 3
  const keyLessons = lessons.slice(0, 3);

  // --- Repeatability ---
  let repeatability: TradeAutopsy['repeatability'] = 'medium';
  if (grade === 'A' || grade === 'B') repeatability = 'high';
  if (grade === 'D' || grade === 'F') repeatability = 'low';

  // --- Summary ---
  const dirLabel = trade.direction === 'LONG' ? 'long' : 'short';
  const pnlStr = hasPnl ? (pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`) : 'unknown P&L';
  const summary = `${trade.symbol} ${dirLabel} trade closed with ${pnlStr}. Overall grade: ${grade} — ${grade <= 'B' ? 'well executed' : 'room for improvement in key areas'}.`;

  return {
    tradeId: trade.id,
    grade,
    sections: {
      setup: { rating: setupRating, notes: setupNotes },
      entry: { rating: entryRating, notes: entryNotes },
      exit: { rating: exitRating, notes: exitNotes },
      riskManagement: { rating: rmRating, notes: rmNotes },
      psychology: { notes: psychNotes },
    },
    keyLessons,
    repeatability,
    summary,
  };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

interface AutopsyRow {
  id: string;
  trade_id: string;
  user_id: string;
  analysis: TradeAutopsy;
  created_at: string;
}

export async function saveAutopsy(userId: string, tradeId: string, analysis: TradeAutopsy): Promise<void> {
  await queryOne(
    `INSERT INTO trade_autopsies (user_id, trade_id, analysis)
     VALUES ($1, $2, $3)
     ON CONFLICT (trade_id) DO UPDATE SET analysis = $3`,
    [userId, tradeId, JSON.stringify(analysis)],
  );
}

export async function getAutopsy(tradeId: string): Promise<TradeAutopsy | null> {
  const row = await queryOne<AutopsyRow>(
    `SELECT analysis FROM trade_autopsies WHERE trade_id = $1`,
    [tradeId],
  );
  if (!row) return null;
  return typeof row.analysis === 'string' ? JSON.parse(row.analysis as unknown as string) : row.analysis;
}

export async function listAutopsies(userId: string, limit = 20): Promise<Array<{ tradeId: string; analysis: TradeAutopsy; createdAt: string }>> {
  const rows = await query<AutopsyRow>(
    `SELECT trade_id, analysis, created_at FROM trade_autopsies
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [userId, limit],
  );
  return rows.map(r => ({
    tradeId: r.trade_id,
    analysis: typeof r.analysis === 'string' ? JSON.parse(r.analysis as unknown as string) : r.analysis,
    createdAt: new Date(r.created_at).toISOString(),
  }));
}
