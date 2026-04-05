import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import type { GatewayConfig, ChannelConfig, Timeframe } from '@tradeclaw/signals';

const DEFAULT_CONFIG: GatewayConfig = {
  scanInterval: 60,
  minConfidence: 70,
  symbols: ['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD'],
  timeframes: ['H1', 'H4', 'D1'],
  channels: [],
  skills: ['rsi-divergence', 'macd-crossover'],
};

/** Build channel configs from environment variables. */
function channelsFromEnv(): ChannelConfig[] {
  const channels: ChannelConfig[] = [];

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChat = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChat) {
    channels.push({
      type: 'telegram',
      enabled: true,
      telegramBotToken: tgToken,
      telegramChatId: tgChat,
    });
  }

  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  if (discordUrl) {
    channels.push({
      type: 'discord',
      enabled: true,
      discordWebhookUrl: discordUrl,
    });
  }

  const webhookUrl = process.env.WEBHOOK_URL;
  if (webhookUrl) {
    channels.push({
      type: 'webhook',
      enabled: true,
      webhookUrl,
    });
  }

  return channels;
}

/** Merge environment variables into a base config. */
function applyEnvOverrides(config: GatewayConfig): GatewayConfig {
  const envChannels = channelsFromEnv();

  return {
    scanInterval: process.env.SCAN_INTERVAL
      ? Number(process.env.SCAN_INTERVAL)
      : config.scanInterval,
    minConfidence: process.env.MIN_CONFIDENCE
      ? Number(process.env.MIN_CONFIDENCE)
      : config.minConfidence,
    symbols: process.env.SYMBOLS
      ? process.env.SYMBOLS.split(',').map(s => s.trim())
      : config.symbols,
    timeframes: process.env.TIMEFRAMES
      ? process.env.TIMEFRAMES.split(',').map(s => s.trim()) as Timeframe[]
      : config.timeframes,
    channels: envChannels.length > 0 ? envChannels : config.channels,
    skills: process.env.SKILLS
      ? process.env.SKILLS.split(',').map(s => s.trim())
      : config.skills,
  };
}

export function getConfigPath(): string {
  const localPath = join(process.cwd(), '.tradeclaw', 'config.json');
  if (existsSync(localPath)) return localPath;

  const homePath = join(homedir(), '.tradeclaw', 'config.json');
  if (existsSync(homePath)) return homePath;

  return localPath;
}

let configWarned = false;

export async function loadConfig(configPath?: string): Promise<GatewayConfig> {
  const path = configPath || getConfigPath();

  if (!existsSync(path)) {
    if (!configWarned) {
      console.log(`[config] No config file at ${path}, using env vars / defaults`);
      configWarned = true;
    }
    return applyEnvOverrides({ ...DEFAULT_CONFIG });
  }

  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<GatewayConfig>;

    const fileConfig: GatewayConfig = {
      scanInterval: parsed.scanInterval ?? DEFAULT_CONFIG.scanInterval,
      minConfidence: parsed.minConfidence ?? DEFAULT_CONFIG.minConfidence,
      symbols: parsed.symbols ?? DEFAULT_CONFIG.symbols,
      timeframes: parsed.timeframes ?? DEFAULT_CONFIG.timeframes,
      channels: parsed.channels ?? DEFAULT_CONFIG.channels,
      skills: parsed.skills ?? DEFAULT_CONFIG.skills,
    };

    return applyEnvOverrides(fileConfig);
  } catch (error) {
    console.error(`[config] Failed to parse config at ${path}:`, error);
    return applyEnvOverrides({ ...DEFAULT_CONFIG });
  }
}

export async function saveConfig(config: GatewayConfig, configPath?: string): Promise<void> {
  const path = configPath || getConfigPath();
  const dir = dirname(path);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(path, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(`[config] Saved configuration to ${path}`);
}

export function getDefaultConfig(): GatewayConfig {
  return { ...DEFAULT_CONFIG };
}
