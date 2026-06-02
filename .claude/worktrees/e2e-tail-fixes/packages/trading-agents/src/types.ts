export type TradingAgentsRole = 'analyst' | 'risk' | 'portfolio-manager';

export type TradingAgentsAssetType = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index';

export type TradingAgentsTransport = 'python-module' | 'http-json' | 'stdio-json';

export interface TradingAgentsBridgeConfig {
  /**
   * Repo or deployment root for the Python TradingAgents project.
   * Defaults to the current working directory when omitted.
   */
  projectRoot?: string;
  /** Command used to launch the Python runtime. */
  pythonCommand?: string;
  /**
   * Transport contract used to talk to the upstream Python framework.
   * The scaffold keeps this abstract so we can swap between CLI, HTTP, or
   * stdio shims without changing the call sites.
   */
  transport?: TradingAgentsTransport;
  /** Optional env overrides forwarded to the Python process. */
  env?: NodeJS.ProcessEnv;
}

export interface TradingAgentsSymbolRequest {
  symbol: string;
  tradeDate: string;
  assetType?: TradingAgentsAssetType;
  note?: string;
}

export interface AnalystAgentInput extends TradingAgentsSymbolRequest {
  role: 'analyst';
  selectedAnalysts: readonly string[];
  marketContext?: Record<string, unknown>;
}

export interface AnalystAgentOutput {
  summary: string;
  bullishFactors: readonly string[];
  bearishFactors: readonly string[];
  confidence: number;
  sources: readonly string[];
  raw?: unknown;
}

export interface RiskAgentInput {
  role: 'risk';
  symbol: string;
  tradeDate: string;
  assetType?: TradingAgentsAssetType;
  analystReport: AnalystAgentOutput;
  draftPlan?: ResearchPlanLike;
}

export interface RiskAgentOutput {
  summary: string;
  veto: boolean;
  risks: readonly string[];
  maxPositionSizePct?: number;
  raw?: unknown;
}

export interface PortfolioManagerAgentInput {
  role: 'portfolio-manager';
  symbol: string;
  tradeDate: string;
  assetType?: TradingAgentsAssetType;
  analystReport: AnalystAgentOutput;
  riskReview: RiskAgentOutput;
}

export interface PortfolioManagerAgentOutput {
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  rationale: string;
  positionSizingPct?: number;
  timeHorizon?: string;
  raw?: unknown;
}

export interface ResearchPlanLike {
  recommendation: 'Buy' | 'Overweight' | 'Hold' | 'Underweight' | 'Sell';
  rationale: string;
  strategicActions: string;
}

export interface TradingAgentsRunRequest {
  symbol: string;
  tradeDate: string;
  assetType?: TradingAgentsAssetType;
  selectedAnalysts?: readonly string[];
}

export interface TradingAgentsRunResult {
  request: TradingAgentsRunRequest;
  analyst?: AnalystAgentOutput;
  risk?: RiskAgentOutput;
  portfolioManager?: PortfolioManagerAgentOutput;
  raw?: unknown;
}

export interface TradingAgentsCommand {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface TradingAgentsInvocation {
  stage: TradingAgentsRole;
  payload: TradingAgentsSymbolRequest | AnalystAgentInput | RiskAgentInput | PortfolioManagerAgentInput;
  module?: string;
}
