#!/usr/bin/env node

import { Command } from 'commander';
import { Gateway } from '../gateway/gateway.js';
import { loadConfig } from '../gateway/config.js';
import { runOnboarding } from './onboard.js';
import { formatNumber, createChannel } from '../channels/base.js';
import { WebhookServer } from '../gateway/webhook-server.js';
import { fetchLivePrices } from '../signals/prices.js';
import { trackSignals } from '../signals/tracker.js';
import { getHistory } from '../signals/tracker.js';

const program = new Command();

program
  .name('tradeclaw-agent')
  .description('Self-hosted AI trading signal agent')
  .version('0.2.0');

program
  .command('start')
  .description('Start the gateway daemon')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const gateway = new Gateway();
    await gateway.start(options.config);
  });

program
  .command('scan')
  .description('Run a single scan and exit')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    console.log('\n\u23F3 Fetching live prices...');
    const prices = await fetchLivePrices();
    console.log(`\u2705 Live prices loaded for ${prices.size} symbols`);
    printLivePrices(prices);

    const gateway = new Gateway();
    const signals = await gateway.scanOnce(options.config);

    if (signals.length === 0) {
      console.log('\nNo signals met the confidence threshold.');
    } else {
      console.log(`\n\u{1F4CA} ${signals.length} signal(s) generated:\n`);
      printSignalsTable(signals);

      await trackSignals(signals);
      console.log(`  \u{1F4BE} ${signals.length} signal(s) saved to history\n`);
    }

    process.exit(0);
  });

program
  .command('status')
  .description('Show current configuration')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const config = await loadConfig(options.config);

    console.log('');
    console.log('  tradeclaw-agent status');
    console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    console.log(`  Scan interval:    ${config.scanInterval}s`);
    console.log(`  Min confidence:   ${config.minConfidence}%`);
    console.log(`  Symbols:          ${config.symbols.join(', ')}`);
    console.log(`  Timeframes:       ${config.timeframes.join(', ')}`);
    console.log(`  Channels:         ${config.channels.filter((c: { enabled: boolean }) => c.enabled).map((c: { type: string }) => c.type).join(', ') || 'none'}`);
    console.log(`  Skills:           ${config.skills.join(', ') || 'none'}`);
    console.log('');
  });

program
  .command('signals')
  .description('Run a scan and print latest signals as a table')
  .option('-c, --config <path>', 'Path to config file')
  .option('-a, --all', 'Show all signals regardless of confidence')
  .action(async (options) => {
    console.log('\n\u23F3 Fetching live prices...');
    const prices = await fetchLivePrices();
    console.log(`\u2705 Live prices loaded for ${prices.size} symbols`);

    const gateway = new Gateway();
    const config = await loadConfig(options.config);

    if (options.all) {
      config.minConfidence = 0;
    }

    const signals = await gateway.scanOnce(options.config);

    if (signals.length === 0) {
      console.log('\nNo signals available.');
    } else {
      console.log('');
      printSignalsTable(signals);

      await trackSignals(signals);
    }

    const history = await getHistory();
    if (history.totalSignals > 0) {
      console.log('  \u{1F4C8} Historical accuracy');
      console.log(`     Total tracked: ${history.totalSignals} signals`);
      if (history.closedSignals > 0) {
        console.log(`     Win rate:      ${history.winRate}% (${history.closedSignals} closed)`);
      }
      if (history.bestSymbol) {
        console.log(`     Most active:   ${history.bestSymbol} (${history.symbolBreakdown[history.bestSymbol].total} signals)`);
      }
      console.log('');
    }

    process.exit(0);
  });

program
  .command('history')
  .description('Show signal history and accuracy stats')
  .option('-n, --limit <number>', 'Number of recent signals to show', '10')
  .action(async (options) => {
    const history = await getHistory();
    const limit = parseInt(options.limit, 10) || 10;

    console.log('');
    console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log('  \u2551       Signal History & Accuracy       \u2551');
    console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
    console.log('');

    if (history.totalSignals === 0) {
      console.log('  No signals tracked yet. Run a scan first:');
      console.log('    tradeclaw-agent scan');
      console.log('');
      process.exit(0);
    }

    console.log('  \u{1F4CA} Overall Stats');
    console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    console.log(`  Total signals:    ${history.totalSignals}`);
    console.log(`  Closed signals:   ${history.closedSignals}`);
    console.log(`  Win rate:         ${history.closedSignals > 0 ? history.winRate + '%' : 'N/A (no closed signals yet)'}`);
    console.log(`  Best symbol:      ${history.bestSymbol ?? 'N/A'}`);
    console.log(`  Best skill:       ${history.bestSkill ?? 'N/A'}`);
    console.log('');

    console.log('  \u{1F4C8} Per Symbol');
    console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    for (const [sym, data] of Object.entries(history.symbolBreakdown)) {
      const bar = '\u2588'.repeat(Math.min(Math.round(data.total / 2), 20));
      console.log(`  ${pad(sym, 8)} ${pad(String(data.total), 4)} signals  ${bar}`);
    }
    console.log('');

    console.log('  \u{1F9E0} Per Skill');
    console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
    for (const [sk, data] of Object.entries(history.skillBreakdown)) {
      console.log(`  ${pad(sk, 16)} ${data.total} signals`);
    }
    console.log('');

    const recentSlice = history.recentSignals.slice(0, limit);
    if (recentSlice.length > 0) {
      console.log(`  \u{1F550} Last ${recentSlice.length} signals`);
      console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
      for (const sig of recentSlice) {
        const dir = sig.direction === 'BUY' ? '\u{1F7E2} BUY ' : '\u{1F534} SELL';
        const time = new Date(sig.timestamp).toLocaleString();
        const resultTag = sig.result ? ` [${sig.result}]` : '';
        console.log(`  ${dir} ${pad(sig.symbol, 8)} ${sig.confidence}%  entry=${formatNumber(sig.entry)}  ${time}${resultTag}`);
      }
      console.log('');
    }

    process.exit(0);
  });

program
  .command('prices')
  .description('Show current live prices from all sources')
  .action(async () => {
    console.log('\n\u23F3 Fetching live prices...');
    const prices = await fetchLivePrices();
    console.log(`\u2705 Loaded ${prices.size} symbols\n`);
    printLivePrices(prices);
    process.exit(0);
  });

program
  .command('test-channel')
  .description('Send a test message to all configured channels')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    const gateway = new Gateway();

    await loadConfig(options.config);

    console.log('Sending test message to all channels...\n');
    await gateway.testChannels();
    console.log('\nDone.');

    process.exit(0);
  });

program
  .command('onboard')
  .description('Interactive setup wizard')
  .action(async () => {
    await runOnboarding();
  });

program
  .command('server')
  .description('Start TradingView webhook receiver')
  .option('-p, --port <port>', 'Port to listen on', '8080')
  .option('-c, --config <path>', 'Path to config file')
  .option('-s, --secret <secret>', 'Webhook secret for authentication')
  .action(async (options) => {
    const config = await loadConfig(options.config);
    const channels = config.channels
      .filter((c: { enabled: boolean }) => c.enabled)
      .map(createChannel)
      .filter(Boolean);

    const port = parseInt(options.port, 10);
    const server = new WebhookServer(channels as any, port, options.secret);

    console.log('');
    console.log('  \u{1F99E} tradeclaw-agent webhook server');
    console.log('');
    console.log(`  Listening on http://0.0.0.0:${port}`);
    console.log(`  TradingView URL \u2192 http://YOUR_IP:${port}/webhook`);
    console.log('');

    await server.start();

    process.on('SIGTERM', async () => { await server.stop(); process.exit(0); });
    process.on('SIGINT', async () => { await server.stop(); process.exit(0); });
  });

program.parse();

// --- Helpers ---

function printLivePrices(prices: Map<string, number>): void {
  const categories: Record<string, string[]> = {
    '\u{1FA99} Metals': ['XAUUSD', 'XAGUSD'],
    '\u20BF Crypto': ['BTCUSD', 'ETHUSD', 'SOLUSD', 'XRPUSD'],
    '\u{1F4B1} Forex': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
  };

  for (const [cat, symbols] of Object.entries(categories)) {
    const items: string[] = [];
    for (const sym of symbols) {
      const price = prices.get(sym);
      if (price !== undefined) {
        items.push(`${sym}=${formatNumber(price)}`);
      }
    }
    if (items.length > 0) {
      console.log(`  ${cat}  ${items.join('  ')}`);
    }
  }
  console.log('');
}

function printSignalsTable(signals: { symbol: string; direction: string; confidence: number; entry: number; stopLoss: number; takeProfit1: number; timeframe: string; indicators: { rsi: { value: number }; macd: { signal: string } } }[]): void {
  const header = [
    pad('Symbol', 10),
    pad('Dir', 5),
    pad('Conf', 6),
    pad('Entry', 14),
    pad('SL', 14),
    pad('TP1', 14),
    pad('TF', 5),
    pad('RSI', 7),
    pad('MACD', 8),
  ].join('\u2502');

  const separator = '\u2500'.repeat(header.length);

  console.log(`  ${separator}`);
  console.log(`  ${header}`);
  console.log(`  ${separator}`);

  for (const signal of signals) {
    const dirEmoji = signal.direction === 'BUY' ? '\u{1F7E2}' : '\u{1F534}';
    const row = [
      pad(signal.symbol, 10),
      pad(`${dirEmoji}${signal.direction}`, 5),
      pad(`${signal.confidence}%`, 6),
      pad(formatNumber(signal.entry), 14),
      pad(formatNumber(signal.stopLoss), 14),
      pad(formatNumber(signal.takeProfit1), 14),
      pad(signal.timeframe, 5),
      pad(signal.indicators.rsi.value.toFixed(1), 7),
      pad(capitalize(signal.indicators.macd.signal), 8),
    ].join('\u2502');

    console.log(`  ${row}`);
  }

  console.log(`  ${separator}`);
  console.log(`  ${signals.length} signal(s)`);
  console.log('');
}

function pad(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + ' '.repeat(len - str.length);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
