export type AgentRole = 'analyst' | 'risk_manager' | 'portfolio_manager';

export interface ResearchRequest {
  symbol: string;
  timeframe: string; // e.g. 'H1', 'H4', 'D1'
  requestedBy: string; // user_id
}

export interface AgentAnalysis {
  role: AgentRole;
  summary: string;
  confidence: number; // 0-100
  signals: { indicator: string; value: string; interpretation: string }[];
  timestamp: Date;
}

export type ResearchJobStatus =
  | 'queued'
  | 'analyst'
  | 'risk'
  | 'pm'
  | 'complete'
  | 'failed';

export interface FinalVerdict {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  sizing: string; // e.g. "1% of portfolio"
  reasoning: string;
}

export interface ResearchReport {
  id: string;
  request: ResearchRequest;
  status: ResearchJobStatus;
  analyses: AgentAnalysis[];
  finalVerdict?: FinalVerdict;
  createdAt: Date;
  completedAt?: Date;
}
