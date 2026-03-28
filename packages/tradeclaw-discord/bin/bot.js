#!/usr/bin/env node

/**
 * TradeClaw Discord Bot — Entry point
 *
 * Usage:
 *   DISCORD_TOKEN=your_token node bot.js
 *
 * Optional env vars:
 *   TRADECLAW_BASE_URL  — API base (default: https://tradeclaw.win)
 *   BROADCAST_INTERVAL  — minutes between auto-broadcasts (default: 30)
 */

const { TradeclawBot } = require('../lib/bot');

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('ERROR: DISCORD_TOKEN environment variable is required.');
  console.error('Get your bot token at https://discord.com/developers/applications');
  process.exit(1);
}

const bot = new TradeclawBot({
  token,
  baseUrl: process.env.TRADECLAW_BASE_URL || 'https://tradeclaw.win',
  broadcastInterval: parseInt(process.env.BROADCAST_INTERVAL || '30', 10),
});

bot.start();
