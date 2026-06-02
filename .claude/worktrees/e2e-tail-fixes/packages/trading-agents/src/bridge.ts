import { resolve } from 'node:path';

import type {
  TradingAgentsBridgeConfig,
  TradingAgentsCommand,
  TradingAgentsInvocation,
  TradingAgentsRunRequest,
  TradingAgentsSymbolRequest,
} from './types';

const DEFAULT_MODULE = 'tradingagents.cli.main';

export function createTradingAgentsBridgeConfig(
  config: TradingAgentsBridgeConfig = {},
): Required<Pick<TradingAgentsBridgeConfig, 'pythonCommand' | 'transport'>> & TradingAgentsBridgeConfig {
  return {
    pythonCommand: config.pythonCommand ?? 'python3',
    transport: config.transport ?? 'python-module',
    ...config,
  };
}

export function normalizeTradingAgentsRequest(request: TradingAgentsRunRequest): TradingAgentsSymbolRequest {
  return {
    symbol: request.symbol.trim().toUpperCase(),
    tradeDate: request.tradeDate,
    assetType: request.assetType ?? 'stock',
  };
}

export function buildTradingAgentsCommand(
  invocation: TradingAgentsInvocation,
  config: TradingAgentsBridgeConfig = {},
): TradingAgentsCommand {
  const resolvedConfig = createTradingAgentsBridgeConfig(config);
  const cwd = resolve(resolvedConfig.projectRoot ?? process.cwd());
  const moduleName = invocation.module ?? DEFAULT_MODULE;
  const payloadJson = JSON.stringify(invocation.payload);
  const normalized = normalizeTradingAgentsRequest({
    symbol: invocation.payload.symbol,
    tradeDate: invocation.payload.tradeDate,
    assetType: invocation.payload.assetType,
  });

  if (resolvedConfig.transport === 'http-json') {
    return {
      command: resolvedConfig.pythonCommand,
      args: ['-m', moduleName, '--json', '--role', invocation.stage, '--payload-json', payloadJson, '--symbol', normalized.symbol, '--trade-date', normalized.tradeDate, '--asset-type', normalized.assetType ?? 'stock'],
      cwd,
      env: { ...process.env, ...resolvedConfig.env },
    };
  }

  if (resolvedConfig.transport === 'stdio-json') {
    return {
      command: resolvedConfig.pythonCommand,
      args: ['-m', moduleName, '--stdio', '--role', invocation.stage, '--payload-json', payloadJson],
      cwd,
      env: { ...process.env, ...resolvedConfig.env },
    };
  }

  return {
    command: resolvedConfig.pythonCommand,
    args: ['-m', moduleName, '--role', invocation.stage, '--payload-json', payloadJson, '--symbol', normalized.symbol, '--trade-date', normalized.tradeDate, '--asset-type', normalized.assetType ?? 'stock'],
    cwd,
    env: { ...process.env, ...resolvedConfig.env },
  };
}
