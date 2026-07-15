/** Formats provider-observed data and explicit unavailable states for Discord. */

const { EmbedBuilder } = require('discord.js');

const COLORS = {
  BUY: 0x00ff88,
  SELL: 0xff4444,
  INFO: 0x6366f1,
  WARN: 0xf59e0b,
};

function humanReason(reason) {
  return String(reason || 'upstream-data-unavailable').replace(/-/g, ' ');
}

function unavailableEmbed(title, reason) {
  return new EmbedBuilder()
    .setColor(COLORS.WARN)
    .setTitle(title)
    .setDescription(
      `TradeClaw did not receive complete provider-observed data. No local fallback was generated.\n\n` +
      `Reason: \`${humanReason(reason)}\``
    )
    .setFooter({ text: 'TradeClaw research data unavailable' });
}

function formatPrice(price) {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return 'Unavailable';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function signalEmbed(signal) {
  if (!signal || signal.available !== true) {
    return unavailableEmbed('Research candidate unavailable', signal && signal.reason);
  }

  const isBuy = signal.direction === 'BUY';
  const emoji = isBuy ? '\u{1F7E2}' : '\u{1F534}';
  const fields = [
    { name: 'Candidate entry', value: formatPrice(signal.price), inline: true },
    { name: 'Candidate target', value: formatPrice(signal.tp), inline: true },
    { name: 'Candidate stop', value: formatPrice(signal.sl), inline: true },
    { name: 'Rule score', value: `${signal.confidence}/100`, inline: true },
  ];

  if (signal.rsi !== null) {
    fields.push({ name: 'Observed RSI', value: String(signal.rsi), inline: true });
  }
  if (signal.macd !== null) {
    fields.push({ name: 'Observed MACD state', value: signal.macd, inline: true });
  }

  return new EmbedBuilder()
    .setColor(isBuy ? COLORS.BUY : COLORS.SELL)
    .setTitle(`${emoji} ${signal.direction} research candidate - ${signal.symbol} ${signal.timeframe}`)
    .setDescription('Mechanical indicator output; the rule score is not a calibrated probability.')
    .addFields(...fields)
    .setFooter({ text: 'Provider-observed research candidate; not an order, fill, or portfolio result' })
    .setTimestamp(new Date(signal.timestamp));
}

function leaderboardEmbed(result, period) {
  if (!result || result.available !== true || !Array.isArray(result.entries) || result.entries.length === 0) {
    return unavailableEmbed('Observed outcome summary unavailable', result && result.reason);
  }

  const rows = result.entries.map(
    entry => `**${entry.rank}.** ${entry.pair} - ${entry.positiveMoves}/${entry.resolved} positive 24h directional moves (${entry.directionalHitRate}%)`
  );

  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`Observed directional outcomes - ${period || '30d'}`)
    .setDescription(rows.join('\n'))
    .setFooter({ text: 'Resolved OHLCV observations; not trades, win claims, or portfolio P&L' });

  if (result.computedAt) embed.setTimestamp(new Date(result.computedAt));
  return embed;
}

function healthEmbed(health) {
  if (!health || health.available === false) {
    return unavailableEmbed('TradeClaw API status', health && health.reason);
  }

  const isUp = health.status === 'ok' || health.status === 'healthy';
  const fields = [
    { name: 'Status', value: health.status || 'unknown', inline: true },
  ];
  if (typeof health.version === 'string') {
    fields.push({ name: 'Version', value: health.version, inline: true });
  }
  if (typeof health.uptime === 'number' && Number.isFinite(health.uptime)) {
    fields.push({
      name: 'Process uptime',
      value: `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m`,
      inline: true,
    });
  }

  return new EmbedBuilder()
    .setColor(isUp ? COLORS.BUY : COLORS.WARN)
    .setTitle('TradeClaw API status')
    .addFields(...fields)
    .setFooter({ text: 'Process health is separate from market-data availability' });
}

function helpEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle('TradeClaw Bot - Commands')
    .setDescription(
      [
        '`/signal [pair]` - Latest provider-observed research candidate',
        '`/leaderboard [period]` - Observed 24h directional outcome summary',
        '`/health` - Check API process and data availability',
        '`/subscribe [pair] [min_confidence]` - Receive qualifying observed candidates',
        '`/unsubscribe` - Stop candidate broadcasts',
        '`/help` - Show this message',
      ].join('\n')
    )
    .addFields({
      name: 'Links',
      value: '[Website](https://tradeclaw.win) | [GitHub](https://github.com/naimkatiman/tradeclaw)',
      inline: false,
    })
    .setFooter({ text: 'Research software; no broker orders or investment advice' });
}

function subscribeEmbed(pair, minConfidence) {
  return new EmbedBuilder()
    .setColor(COLORS.BUY)
    .setTitle('Subscribed to observed candidate broadcasts')
    .setDescription(
      `This channel will be checked at the bot's configured polling interval.\n\n` +
      `**Pair filter:** ${pair || 'All pairs'}\n` +
      `**Minimum rule score:** ${minConfidence || 60}/100\n\n` +
      'No message is sent when provider-observed data is unavailable.'
    )
    .setFooter({ text: 'Use /unsubscribe to stop' });
}

function unsubscribeEmbed() {
  return new EmbedBuilder()
    .setColor(COLORS.WARN)
    .setTitle('Unsubscribed from candidate broadcasts')
    .setDescription('This channel will no longer receive automatic candidate broadcasts.');
}

module.exports = {
  signalEmbed,
  leaderboardEmbed,
  healthEmbed,
  helpEmbed,
  subscribeEmbed,
  unsubscribeEmbed,
  unavailableEmbed,
  COLORS,
};
