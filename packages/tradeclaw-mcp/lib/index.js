'use strict';

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { TradeClawClient, PAIRS, TIMEFRAMES } = require('./tradeclaw-client');

const DESCRIPTION = `TradeClaw MCP Server — AI Trading Signals

Tools available:
- get_signals: Fetch live BUY/SELL trading signals for forex, crypto, and commodities
- get_leaderboard: Get the accuracy leaderboard by asset pair
- get_health: Check TradeClaw platform status
- explain_signal: Get a natural language explanation of a trading signal

Data source: TradeClaw open-source platform (https://tradeclaw.win)
Assets: ${PAIRS.join(', ')}
Timeframes: ${TIMEFRAMES.join(', ')}
`;

async function createServer(baseUrl) {
  const client = new TradeClawClient(baseUrl);

  const server = new McpServer({
    name: 'tradeclaw',
    version: '0.1.0',
    description: DESCRIPTION,
  });

  // Tool: get_signals
  server.tool(
    'get_signals',
    {
      pair: z
        .string()
        .optional()
        .describe(`Trading pair to fetch signals for. Options: ${PAIRS.join(', ')}. Leave empty for all pairs.`),
      timeframe: z
        .enum(['H1', 'H4', 'D1'])
        .optional()
        .describe('Timeframe filter: H1 (1-hour), H4 (4-hour), D1 (daily)'),
      direction: z
        .enum(['BUY', 'SELL'])
        .optional()
        .describe('Filter by signal direction: BUY or SELL'),
      minConfidence: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe('Minimum confidence percentage (0-100). Use 70+ for high-confidence signals.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('Number of signals to return (max 50)'),
    },
    async ({ pair, timeframe, direction, minConfidence, limit }) => {
      const data = await client.getSignals({ pair, timeframe, direction, minConfidence, limit });

      if (!data.signals || data.signals.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No signals found matching your criteria. Try removing filters or checking a different timeframe.',
            },
          ],
        };
      }

      const lines = data.signals.map((s) => {
        const arrow = s.direction === 'BUY' ? '▲' : '▼';
        const rr = s.takeProfit1 && s.entry && s.stopLoss
          ? Math.abs((s.takeProfit1 - s.entry) / (s.entry - s.stopLoss)).toFixed(2)
          : 'N/A';
        return [
          `## ${arrow} ${s.symbol} — ${s.direction} (${s.confidence}% confidence)`,
          `- **Timeframe:** ${s.timeframe}`,
          `- **Entry:** ${s.entry}`,
          `- **Stop Loss:** ${s.stopLoss}`,
          `- **Take Profit 1:** ${s.takeProfit1 || 'N/A'} | TP2: ${s.takeProfit2 || 'N/A'} | TP3: ${s.takeProfit3 || 'N/A'}`,
          `- **Risk:Reward:** ${rr}`,
          s.indicators
            ? `- **Indicators:** RSI ${s.indicators.rsi?.toFixed(1) || 'N/A'} | MACD ${
                s.indicators.macd?.histogram?.toFixed(4) || 'N/A'
              } | EMA20 ${s.indicators.ema?.ema20?.toFixed(4) || 'N/A'}`
            : '',
          `- **Timestamp:** ${s.timestamp}`,
          `- **Status:** ${s.status || 'open'}`,
        ]
          .filter(Boolean)
          .join('\n');
      });

      const summary = `# TradeClaw Trading Signals\n\n**Found ${data.signals.length} signal(s)**${
        pair ? ` for ${pair}` : ''
      }${timeframe ? ` on ${timeframe}` : ''}${direction ? ` — ${direction} only` : ''}\n\n${lines.join('\n\n---\n\n')}`;

      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    }
  );

  // Tool: get_leaderboard
  server.tool(
    'get_leaderboard',
    {
      period: z
        .enum(['7d', '30d', 'all'])
        .default('30d')
        .describe('Time period for leaderboard: 7d (7 days), 30d (30 days), all (all time)'),
      sort: z
        .enum(['hitRate', 'totalSignals', 'avgConfidence'])
        .default('hitRate')
        .describe('Sort leaderboard by: hitRate (win rate), totalSignals (volume), avgConfidence (avg confidence score)'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(10)
        .describe('Number of entries to return'),
    },
    async ({ period, sort, limit }) => {
      const data = await client.getLeaderboard({ period, sort, limit });

      if (!data.leaderboard || data.leaderboard.length === 0) {
        return {
          content: [{ type: 'text', text: 'Leaderboard data unavailable at this time.' }],
        };
      }

      const rows = data.leaderboard.map((entry, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
        const hitPct = entry.hitRate !== undefined ? `${(entry.hitRate * 100).toFixed(1)}%` : 'N/A';
        return `${medal} **${entry.symbol || entry.pair}** — Win Rate: ${hitPct} | Signals: ${entry.totalSignals || 0} | Avg Confidence: ${entry.avgConfidence?.toFixed(0) || 'N/A'}%`;
      });

      return {
        content: [
          {
            type: 'text',
            text: `# TradeClaw Signal Accuracy Leaderboard\n\n**Period:** ${period} | **Sorted by:** ${sort}\n\n${rows.join('\n')}\n\n*Source: TradeClaw open-source platform — https://tradeclaw.win/leaderboard*`,
          },
        ],
      };
    }
  );

  // Tool: get_health
  server.tool(
    'get_health',
    {},
    async () => {
      const data = await client.getHealth();

      return {
        content: [
          {
            type: 'text',
            text: `# TradeClaw Platform Status\n\n- **Status:** ${data.status || 'unknown'}\n- **Version:** ${data.version || 'N/A'}\n- **Uptime:** ${data.uptime || 'N/A'}\n- **Source:** ${data.source || 'tradeclaw'}\n- **Timestamp:** ${data.timestamp || new Date().toISOString()}\n\n*TradeClaw is an open-source self-hosted trading signal platform. GitHub: https://github.com/naimkatiman/tradeclaw*`,
          },
        ],
      };
    }
  );

  // Tool: explain_signal
  server.tool(
    'explain_signal',
    {
      pair: z
        .string()
        .describe(`Trading pair to explain. Options: ${PAIRS.join(', ')}`),
      timeframe: z
        .enum(['H1', 'H4', 'D1'])
        .default('H1')
        .describe('Timeframe: H1, H4, or D1'),
    },
    async ({ pair, timeframe }) => {
      const normalizedPair = pair.toUpperCase().replace('/', '');
      const data = await client.getSignals({ pair: normalizedPair, timeframe, limit: 1 });

      if (!data.signals || data.signals.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No current signal found for ${pair} on ${timeframe}. Available pairs: ${PAIRS.join(', ')}`,
            },
          ],
        };
      }

      const s = data.signals[0];
      const ind = s.indicators || {};
      const rsi = ind.rsi;
      const macd = ind.macd?.histogram;
      const ema20 = ind.ema?.ema20;
      const ema50 = ind.ema?.ema50;
      const bb = ind.bollingerBands;
      const stoch = ind.stochastic;

      // Build natural language explanation
      const lines = [
        `# ${s.symbol} ${s.timeframe} — ${s.direction} Signal (${s.confidence}% confidence)`,
        '',
        `## Summary`,
        `TradeClaw is signaling a **${s.direction}** for **${s.symbol}** on the **${s.timeframe}** timeframe with **${s.confidence}% confidence**.`,
        '',
        `## Entry Parameters`,
        `- Entry: **${s.entry}**`,
        `- Stop Loss: **${s.stopLoss}** (risk: ${Math.abs(((s.entry - s.stopLoss) / s.entry) * 100).toFixed(2)}%)`,
        `- Take Profit 1: **${s.takeProfit1 || 'N/A'}**`,
        `- Take Profit 2: **${s.takeProfit2 || 'N/A'}**`,
        `- Take Profit 3: **${s.takeProfit3 || 'N/A'}**`,
        '',
        `## Indicator Breakdown`,
      ];

      if (rsi !== undefined) {
        const rsiStatus = rsi < 30 ? 'oversold (bullish)' : rsi > 70 ? 'overbought (bearish)' : 'neutral zone';
        lines.push(`- **RSI (${rsi.toFixed(1)}):** ${rsiStatus}`);
      }

      if (macd !== undefined) {
        const macdStatus = macd > 0 ? 'above zero (bullish momentum)' : 'below zero (bearish momentum)';
        lines.push(`- **MACD histogram (${macd.toFixed(4)}):** ${macdStatus}`);
      }

      if (ema20 !== undefined && ema50 !== undefined) {
        const emaStatus = ema20 > ema50 ? 'EMA20 > EMA50 (uptrend)' : 'EMA20 < EMA50 (downtrend)';
        lines.push(`- **EMA:** ${emaStatus} | EMA20: ${ema20.toFixed(4)} | EMA50: ${ema50.toFixed(4)}`);
      }

      if (bb) {
        lines.push(`- **Bollinger Bands:** Price ${bb.position || 'within bands'} | Upper: ${bb.upper?.toFixed(4) || 'N/A'} | Lower: ${bb.lower?.toFixed(4) || 'N/A'}`);
      }

      if (stoch) {
        const stochStatus = stoch.k < 20 ? 'oversold' : stoch.k > 80 ? 'overbought' : 'neutral';
        lines.push(`- **Stochastic (K: ${stoch.k?.toFixed(1)}, D: ${stoch.d?.toFixed(1)}):** ${stochStatus}`);
      }

      lines.push(
        '',
        `## Disclaimer`,
        `This signal is generated algorithmically by TradeClaw using technical analysis. It is not financial advice. Always manage your risk and use appropriate position sizing.`,
        '',
        `*Full analysis: https://tradeclaw.win/signal/${s.id || normalizedPair + '-' + timeframe + '-' + s.direction}*`
      );

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      };
    }
  );

  return server;
}

module.exports = { createServer };
