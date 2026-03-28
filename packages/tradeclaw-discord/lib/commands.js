/**
 * Slash command definitions for TradeClaw Discord bot
 */

const { SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('signal')
    .setDescription('Get the latest trading signal for a pair')
    .addStringOption(opt =>
      opt.setName('pair')
        .setDescription('Trading pair (e.g. BTCUSD, ETHUSD)')
        .setRequired(false)
        .addChoices(
          { name: 'BTCUSD', value: 'BTCUSD' },
          { name: 'ETHUSD', value: 'ETHUSD' },
          { name: 'XAUUSD', value: 'XAUUSD' },
          { name: 'EURUSD', value: 'EURUSD' },
          { name: 'GBPUSD', value: 'GBPUSD' },
          { name: 'USDJPY', value: 'USDJPY' },
          { name: 'XAGUSD', value: 'XAGUSD' },
          { name: 'BNBUSD', value: 'BNBUSD' },
          { name: 'SOLUSD', value: 'SOLUSD' },
          { name: 'ADAUSD', value: 'ADAUSD' },
        )
    ),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show top 5 trading pairs by win rate')
    .addStringOption(opt =>
      opt.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: 'Last 24h', value: '24h' },
          { name: 'Last 7 days', value: '7d' },
          { name: 'Last 30 days', value: '30d' },
          { name: 'All time', value: 'all' },
        )
    ),

  new SlashCommandBuilder()
    .setName('health')
    .setDescription('Check TradeClaw API health and uptime'),

  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe this channel to auto-receive trading signals')
    .addStringOption(opt =>
      opt.setName('pair')
        .setDescription('Filter by pair (leave empty for all)')
        .setRequired(false)
    )
    .addIntegerOption(opt =>
      opt.setName('min_confidence')
        .setDescription('Minimum confidence % (default: 60)')
        .setRequired(false)
        .setMinValue(50)
        .setMaxValue(100)
    ),

  new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Stop signal broadcasts in this channel'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all TradeClaw bot commands'),
];

module.exports = { commands };
