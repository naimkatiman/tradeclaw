/**
 * tradeclaw-agent — Self-hosted AI trading signal agent.
 *
 * Entry point for programmatic usage.
 * For CLI usage, see src/cli/cli.ts
 */

// Re-export shared types from @tradeclaw/signals for backwards compatibility
export type {
  TradingSignal,
  IndicatorSummary,
  SymbolConfig,
  GatewayConfig,
  ChannelConfig,
  Direction,
  Timeframe,
  SignalStatus,
} from '@tradeclaw/signals';

export {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic,
  SYMBOLS,
  getSymbolConfig,
  getAllSymbols,
  updateBasePrice,
  generateSignalId,
  formatNumber,
  formatDiff,
  emaTrendText,
} from '@tradeclaw/signals';

// Agent-specific exports
export { Gateway } from './gateway/gateway.js';
export { loadConfig, saveConfig, getDefaultConfig } from './gateway/config.js';
export { Scheduler } from './gateway/scheduler.js';
export { runScan, runScanAsync, generateSignals, generateSignalsAsync, getAvailableSymbols } from './signals/engine.js';
export { fetchLivePrices, getLivePrice, invalidatePriceCache } from './signals/prices.js';
export { trackSignal, trackSignals, loadHistory, getHistory } from './signals/tracker.js';
export { SkillLoader } from './skills/loader.js';
export { createChannel } from './channels/base.js';

export type { BaseSkill, SkillMeta } from './skills/base.js';
export type { BaseChannel } from './channels/base.js';
export type { TrackedSignal, HistorySummary } from './signals/tracker.js';

// Broker abstraction layer
export { AlpacaBroker, PaperBroker, ExecutionEngine } from './broker/index.js';
export type {
  IBroker,
  AccountInfo,
  Position,
  OrderRequest,
  OrderResult,
  ExecutionSignal,
  ExecutionContext,
  ExecutionResult,
} from './broker/index.js';
