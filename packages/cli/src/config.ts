import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface TradeclawConfig {
  url: string;
  apikey: string;
}

const CONFIG_DIR = join(homedir(), ".tradeclaw");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: TradeclawConfig = {
  url: "http://localhost:3000",
  apikey: "",
};

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): TradeclawConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TradeclawConfig>;
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: TradeclawConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function setConfigValue(
  key: keyof TradeclawConfig,
  value: string,
): void {
  const config = loadConfig();
  config[key] = value;
  saveConfig(config);
}

export function getConfigValue(key: keyof TradeclawConfig): string {
  const config = loadConfig();
  return config[key];
}
