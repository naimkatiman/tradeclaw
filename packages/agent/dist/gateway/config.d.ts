import type { GatewayConfig } from '@tradeclaw/signals';
export declare function getConfigPath(): string;
export declare function loadConfig(configPath?: string): Promise<GatewayConfig>;
export declare function saveConfig(config: GatewayConfig, configPath?: string): Promise<void>;
export declare function getDefaultConfig(): GatewayConfig;
//# sourceMappingURL=config.d.ts.map