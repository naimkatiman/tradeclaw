/**
 * TradeClaw Discord Bot — main class
 */

const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const { commands } = require('./commands');
const { SignalFetcher } = require('./signal-fetcher');
const { signalEmbed, leaderboardEmbed, healthEmbed, helpEmbed, subscribeEmbed, unsubscribeEmbed } = require('./formatter');

class TradeclawBot {
  constructor({ token, baseUrl, broadcastInterval }) {
    this.token = token;
    this.baseUrl = baseUrl;
    this.broadcastInterval = broadcastInterval;
    this.fetcher = new SignalFetcher(baseUrl);
    this.subscriptions = new Map(); // channelId -> { pair, minConfidence }
    this.startTime = Date.now();

    this.client = new Client({
      intents: [GatewayIntentBits.Guilds],
    });

    this.client.commands = new Collection();
    this._setupHandlers();
  }

  _setupHandlers() {
    this.client.once('ready', () => {
      console.log(`[TradeClaw] Bot online as ${this.client.user.tag}`);
      console.log(`[TradeClaw] API: ${this.baseUrl}`);
      console.log(`[TradeClaw] Broadcast interval: ${this.broadcastInterval}m`);
      this._startBroadcastLoop();
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      await this._handleCommand(interaction);
    });
  }

  async _handleCommand(interaction) {
    const { commandName } = interaction;

    try {
      switch (commandName) {
        case 'signal': {
          await interaction.deferReply();
          const pair = interaction.options.getString('pair');
          const signal = await this.fetcher.fetchSignal(pair);
          await interaction.editReply({ embeds: [signalEmbed(signal)] });
          break;
        }

        case 'leaderboard': {
          await interaction.deferReply();
          const period = interaction.options.getString('period') || '7d';
          const entries = await this.fetcher.fetchLeaderboard(period);
          await interaction.editReply({ embeds: [leaderboardEmbed(entries, period)] });
          break;
        }

        case 'health': {
          await interaction.deferReply();
          const health = await this.fetcher.fetchHealth();
          await interaction.editReply({ embeds: [healthEmbed(health)] });
          break;
        }

        case 'subscribe': {
          const pair = interaction.options.getString('pair') || null;
          const minConfidence = interaction.options.getInteger('min_confidence') || 60;
          this.subscriptions.set(interaction.channelId, { pair, minConfidence });
          await interaction.reply({ embeds: [subscribeEmbed(pair, minConfidence)] });
          break;
        }

        case 'unsubscribe': {
          const had = this.subscriptions.delete(interaction.channelId);
          if (had) {
            await interaction.reply({ embeds: [unsubscribeEmbed()] });
          } else {
            await interaction.reply({ content: 'This channel is not subscribed to signals.', ephemeral: true });
          }
          break;
        }

        case 'help': {
          await interaction.reply({ embeds: [helpEmbed()] });
          break;
        }

        default:
          await interaction.reply({ content: 'Unknown command.', ephemeral: true });
      }
    } catch (err) {
      console.error(`[TradeClaw] Command error (${commandName}):`, err);
      const reply = { content: 'Something went wrong. Try again later.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }

  _startBroadcastLoop() {
    if (this.broadcastInterval <= 0) return;

    setInterval(async () => {
      for (const [channelId, opts] of this.subscriptions) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (!channel || !channel.isTextBased()) {
            this.subscriptions.delete(channelId);
            continue;
          }

          const signal = await this.fetcher.fetchSignal(opts.pair);
          if (signal.confidence < opts.minConfidence) continue;

          await channel.send({ embeds: [signalEmbed(signal)] });
        } catch (err) {
          console.error(`[TradeClaw] Broadcast error (${channelId}):`, err.message);
        }
      }
    }, this.broadcastInterval * 60 * 1000);
  }

  async start() {
    // Register slash commands on login
    const rest = new REST({ version: '10' }).setToken(this.token);

    this.client.once('ready', async () => {
      try {
        const commandData = commands.map(c => c.toJSON());
        await rest.put(
          Routes.applicationCommands(this.client.user.id),
          { body: commandData },
        );
        console.log(`[TradeClaw] Registered ${commandData.length} slash commands`);
      } catch (err) {
        console.error('[TradeClaw] Failed to register commands:', err);
      }
    });

    await this.client.login(this.token);
  }
}

module.exports = { TradeclawBot };
