/**
 * Binance Futures handshake — proves env vars are wired and keys have
 * futures-trading permission, without placing any order.
 *
 * Run locally:
 *   cd apps/web
 *   tsx scripts/binance-handshake.ts
 *
 * Run on Railway:
 *   railway run tsx apps/web/scripts/binance-handshake.ts
 *
 * Required env (read from process.env):
 *   BINANCE_BASE_URL    https://testnet.binancefuture.com OR https://fapi.binance.com
 *   BINANCE_API_KEY
 *   BINANCE_API_SECRET
 *
 * EXECUTION_MODE is irrelevant here — handshake is read-only.
 */

import {
  getServerTime,
  getAccount,
  isTestnet,
  currentMode,
} from '../lib/execution/binance-futures';

async function main(): Promise<void> {
  console.log('— Binance Futures handshake —');
  console.log('  base_url:        ', process.env.BINANCE_BASE_URL);
  console.log('  testnet:         ', isTestnet());
  console.log('  execution_mode:  ', currentMode());
  console.log('  api_key_present: ', Boolean(process.env.BINANCE_API_KEY));
  console.log('  api_sec_present: ', Boolean(process.env.BINANCE_API_SECRET));
  console.log('');

  console.log('[1/2] GET /fapi/v1/time (unsigned, network reachability)…');
  const t = await getServerTime();
  const drift = Math.abs(Date.now() - t);
  console.log(`      server_time=${t}  local_drift_ms=${drift}`);
  if (drift > 1000) {
    console.warn(`      ⚠ clock drift ${drift}ms exceeds 1s — signed requests may be rejected`);
  }
  console.log('');

  console.log('[2/2] GET /fapi/v2/account (signed, key validity + permissions)…');
  const acct = await getAccount();
  console.log(`      total_wallet_balance:  ${acct.totalWalletBalance} USDT`);
  console.log(`      total_margin_balance:  ${acct.totalMarginBalance} USDT`);
  console.log(`      available_balance:     ${acct.availableBalance} USDT`);
  console.log(`      open_positions:        ${acct.positions.length}`);
  for (const p of acct.positions) {
    console.log(`        ${p.symbol} ${p.positionSide} ${p.positionAmt} @ ${p.entryPrice} (${p.isolated ? 'ISOLATED' : 'CROSS'} ${p.leverage}x)`);
  }
  console.log('');

  if (!isTestnet() && currentMode() !== 'live') {
    console.warn('  ⚠ BASE_URL points at mainnet but EXECUTION_MODE is not "live" — orders will dry-run.');
  }
  if (isTestnet() && acct.totalWalletBalance < 100) {
    console.warn('  ⚠ Testnet balance < 100 USDT. Visit testnet.binancefuture.com → "Get Test USDT" to top up.');
  }

  console.log('✓ Handshake successful.');
}

main().catch((err) => {
  console.error('✗ Handshake failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
