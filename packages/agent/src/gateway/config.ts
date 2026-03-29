import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import type { GatewayConfig } from '@tradeclaw/signals';

const DEFAULT_CONFIG: GatewayConfig = {
  scanInterval: 60,
  minConfidence: 70,
  symbols: ['XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD'],
  timeframes: ['H1', 'H4', 'D1'],
  channels: [],
  skills: ['rsi-divergence', 'macd-crossover'],
};

export function getConfigPath(): string {
  const localPath = join(process.cwd(), '.tradeclaw', 'config.json');
  if (existsSync(localPath)) return localPath;

  const homePath = join(homedir(), '.tradeclaw', 'config.json');
  if (existsSync(homePath)) return homePath;

  return localPath;
}

export async function loadConfig(configPath?: string): Promise<GatewayConfig> {
  const path = configPath || getConfigPath();

  if (!existsSync(path)) {
    console.warn(`[config] No config file found at ${path}, using defaults`);
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = await readFile(path, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<GatewayConfig>;

    return {
      scanInterval: parsed.scanInterval ?? DEFAULT_CONFIG.scanInterval,
      minConfidence: parsed.minConfidence ?? DEFAULT_CONFIG.minConfidence,
      symbols: parsed.symbols ?? DEFAULT_CONFIG.symbols,
      timeframes: parsed.timeframes ?? DEFAULT_CONFIG.timeframes,
      channels: parsed.channels ?? DEFAULT_CONFIG.channels,
      skills: parsed.skills ?? DEFAULT_CONFIG.skills,
    };
  } catch (error) {
    console.error(`[config] Failed to parse config at ${path}:`, error);
    return { ...DEFAULT_CONFIG };
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
