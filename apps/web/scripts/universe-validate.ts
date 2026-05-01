/**
 * Universe screen validator. Runs the same fetch + screen pipeline as the
 * cron route, but logs output instead of persisting. Use this to sanity
 * check the math against live market data before persistence is wired.
 *
 * Run:
 *   railway run -s web -- npx tsx apps/web/scripts/universe-validate.ts
 *
 * Or with explicit env:
 *   BINANCE_BASE_URL=https://testnet.binancefuture.com npx tsx apps/web/scripts/universe-validate.ts
 */

import { runUniverseScreen } from '../lib/execution/universe-runner';

async function main(): Promise<void> {
  const t0 = Date.now();
  const r = await runUniverseScreen({ skipPersist: true });
  const dt = Date.now() - t0;

  console.log('— Universe screen —');
  console.log(`  snapshot_date:    ${r.snapshotDate}`);
  console.log(`  candidates_kept:  ${r.candidates}`);
  console.log(`  fallback_applied: ${r.fallbackApplied}`);
  console.log(`  persisted:        ${r.persisted}`);
  console.log(`  duration_ms:      ${dt}`);
  console.log('');

  console.log(`Included (${r.included.length}):`);
  for (const s of r.included) {
    console.log(`  ${s.symbol.padEnd(12)}  vol=$${(s.volUsd / 1e9).toFixed(2)}B  ER=${s.er.toFixed(3)}`);
  }
  console.log('');

  const byReason = new Map<string, typeof r.excluded>();
  for (const e of r.excluded) {
    const list = byReason.get(e.reason) ?? [];
    list.push(e);
    byReason.set(e.reason, list);
  }
  for (const [reason, list] of byReason) {
    console.log(`Excluded — ${reason} (${list.length}):`);
    for (const e of list.slice(0, 10)) {
      console.log(`  ${e.symbol.padEnd(12)}  vol=$${(e.volUsd / 1e9).toFixed(2)}B  ER=${e.er.toFixed(3)}`);
    }
    if (list.length > 10) console.log(`  …(+${list.length - 10} more)`);
    console.log('');
  }
}

main().catch((err) => {
  console.error('✗ universe-validate failed:', err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
