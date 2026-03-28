/**
 * Formats signals and data into Discord embeds
 */

const { EmbedBuilder } = require('discord.js');

const COLORS = {
  BUY: 0x10b981,   // emerald-500
  SELL: 0xef4444,   // red-500
  INFO: 0x6366f1,   // indigo-500
  WARN: 0xf59e0b,   // amber-500
};

function formatPrice(price) {
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function signalEmbed(signal) {
  const isBuy = signal.direction === 'BUY';
  const emoji = isBuy ? '\u{1F7E2}' : '\u{1F534}';
  const macdArrow = signal.macd === 'bullish' ? '\u25B2' : '\u25BC';

  return new EmbedBuilder()
    .setColor(isBuy ? COLORS.BUY : COLORS.SELL)
    .setTitle(`${emoji} ${signal.direction} Signal \u2014 ${signal.symbol} ${signal.timeframe}`)
    .setDescription('\u2501'.repeat(18))
    .addFields(
      { name: '\u{1F4B0} Price', value: formatPrice(signal.price), inline: true },
      { name: '\u{1F3AF} TP', value: formatPrice(signal.tp), inline: true },
      { name: '\u{1F6E1}\uFE0F SL', value: formatPrice(signal.sl), inline: true },
      { name: '\u{1F4CA} Confidence', value: `${signal.confidence}%`, inline: true },
      { name: '\u{1F4C8} RSI', value: String(signal.rsi), inline: true },
      { name: '\u{1F4C9} MACD', value: macdArrow, inline: true },
    )
    .setFooter({ text: `TradeClaw \u00B7 ${signal.source === 'api' ? 'Live' : 'Demo'} signal` })
    .setTimestamp()
    .setURL(`https://tradeclaw.win/signal/${signal.symbol}-${signal.timeframe}-${signal.direction}`);
}

function leaderboardEmbed(entries, period) {
  const rows = entries.map(
    (e) => `**${e.rank}.** ${e.pair} \u2014 ${e.winRate}% win \u00B7 ${e.trades} trades \u00B7 +${e.pnl}%`
  );

  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`\u{1F3C6} Leaderboard \u2014 Top 5 (${period || '7d'})`)
    .setDescription(rows.join('\n'))
    .setFooter({ text: 'TradeClaw' })
    .setTimestamp();
}

function healthEmbed(health) {
  const isUp = health.status === 'ok' || health.status === 'healthy';

  return new EmbedBuilder()
    .setColor(isUp ? COLORS.BUY : COLORS.WARN)
    .setTitle(`${isUp ? '\u2705' : '\u26A0\uFE0F'} TradeClaw API Status`)
    .addFields(
      { name: 'Status', value: health.status || 'unknown', inline: true },
      { name: 'Version', value: health.version || 'n/a', inline: true },
      { name: 'Uptime', value: health.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'n/a', inline: true },
    )
    .setFooter({ text: 'TradeClaw Health Check' })
    .setTimestamp();
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('\u{1F916} TradeClaw Bot \u2014 Commands')
    .setDescription(
      [
        '`/signal [pair]` \u2014 Get latest trading signal',
        '`/leaderboard [period]` \u2014 Top 5 pairs by win rate',
        '`/health` \u2014 Check API status',
        '`/subscribe [pair] [min_confidence]` \u2014 Auto-receive signals',
        '`/unsubscribe` \u2014 Stop signal broadcasts',
        '`/help` \u2014 Show this message',
      ].join('\n')
    )
    .addFields(
      { name: 'Pairs', value: 'BTCUSD, ETHUSD, XAUUSD, EURUSD, GBPUSD, USDJPY + more', inline: false },
      { name: 'Periods', value: '24h, 7d, 30d, all', inline: false },
      { name: 'Links', value: '[Website](https://tradeclaw.win) \u00B7 [GitHub](https://github.com/naimkatiman/tradeclaw) \u00B7 [API Docs](https://tradeclaw.win/api-docs)', inline: false },
    )
    .setFooter({ text: 'TradeClaw \u00B7 Open-source trading signals' })
    .setTimestamp();
}

function subscribeEmbed(pair, minConfidence) {
  return new EmbedBuilder()
    .setColor(COLORS.BUY)
    .setTitle('\u{1F514} Subscribed to Signal Broadcasts')
    .setDescription(
      `This channel will receive trading signals every 30 minutes.\n\n` +
      `**Pair filter:** ${pair || 'All pairs'}\n` +
      `**Min confidence:** ${minConfidence || 60}%\n\n` +
      `Use \`/unsubscribe\` to stop.`
    )
    .setFooter({ text: 'TradeClaw' })
    .setTimestamp();
}

function unsubscribeEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.WARN)
    .setTitle('\u{1F515} Unsubscribed from Signals')
    .setDescription('This channel will no longer receive automatic signal broadcasts.\nUse `/subscribe` to re-enable.')
    .setFooter({ text: 'TradeClaw' })
    .setTimestamp();
}

module.exports = { signalEmbed, leaderboardEmbed, healthEmbed, helpEmbed, subscribeEmbed, unsubscribeEmbed, COLORS };
