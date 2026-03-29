/**
 * TradeClaw Discord Bot — public API re-export
 */

const { TradeclawBot } = require('./bot');
const { SignalFetcher } = require('./signal-fetcher');
const { signalEmbed, leaderboardEmbed, healthEmbed, helpEmbed, subscribeEmbed, unsubscribeEmbed, COLORS } = require('./formatter');

module.exports = {
  TradeclawBot,
  SignalFetcher,
  signalEmbed,
  leaderboardEmbed,
  healthEmbed,
  helpEmbed,
  subscribeEmbed,
  unsubscribeEmbed,
  COLORS,
};
