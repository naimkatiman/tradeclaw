export type RoadmapStatus = 'done' | 'in-progress' | 'planned';
export type RoadmapCategory = 'Trading' | 'Developer' | 'Community' | 'Infrastructure';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  seedVotes: number;
  priority: 'high' | 'medium' | 'low';
}

export const ROADMAP_ITEMS: RoadmapItem[] = [
  // ── Trading ──
  {
    id: 'rm-001',
    title: 'PostgreSQL live signal storage',
    description: 'Replace file-based JSON with PostgreSQL for production-grade signal persistence, real analytics, and multi-instance support.',
    category: 'Trading',
    status: 'planned',
    seedVotes: 142,
    priority: 'high',
  },
  {
    id: 'rm-002',
    title: 'WebSocket real-time prices',
    description: 'Replace polling with a true WebSocket feed for sub-second price updates across all asset pairs.',
    category: 'Trading',
    status: 'in-progress',
    seedVotes: 118,
    priority: 'high',
  },
  {
    id: 'rm-003',
    title: 'Multiple exchange live data',
    description: 'Pull live OHLCV from Binance, Bybit, OKX, and Coinbase simultaneously for better price accuracy.',
    category: 'Trading',
    status: 'planned',
    seedVotes: 97,
    priority: 'high',
  },
  {
    id: 'rm-004',
    title: 'Options signals',
    description: 'Add put/call signal generation with implied volatility, Greeks display, and options chain viewer.',
    category: 'Trading',
    status: 'planned',
    seedVotes: 76,
    priority: 'medium',
  },
  {
    id: 'rm-005',
    title: 'Portfolio optimization engine',
    description: 'Markowitz mean-variance optimization across your open positions with Sharpe ratio maximization.',
    category: 'Trading',
    status: 'planned',
    seedVotes: 64,
    priority: 'medium',
  },
  {
    id: 'rm-006',
    title: 'Risk management dashboard',
    description: 'Real-time position sizing calculator, max drawdown alerts, correlation-based risk exposure view.',
    category: 'Trading',
    status: 'planned',
    seedVotes: 89,
    priority: 'high',
  },
  // ── Developer ──
  {
    id: 'rm-007',
    title: 'Python SDK',
    description: 'pip install tradeclaw — full Python client matching the TypeScript SDK with async/await support.',
    category: 'Developer',
    status: 'planned',
    seedVotes: 134,
    priority: 'high',
  },
  {
    id: 'rm-008',
    title: 'Webhook retry UI',
    description: 'Visual retry queue in the webhooks settings page — see failed deliveries and re-trigger with one click.',
    category: 'Developer',
    status: 'planned',
    seedVotes: 45,
    priority: 'low',
  },
  {
    id: 'rm-009',
    title: 'GraphQL API',
    description: 'Full GraphQL endpoint alongside REST — subscriptions for live signals, nested queries for backtest results.',
    category: 'Developer',
    status: 'planned',
    seedVotes: 88,
    priority: 'medium',
  },
  {
    id: 'rm-010',
    title: 'OpenTelemetry metrics',
    description: 'Export signal generation latency, API response times, and cache hit rates to Prometheus/Grafana.',
    category: 'Developer',
    status: 'planned',
    seedVotes: 52,
    priority: 'medium',
  },
  {
    id: 'rm-011',
    title: 'Unit test suite',
    description: 'Full Vitest/Jest test coverage for the TA engine, signal generator, and all API routes.',
    category: 'Developer',
    status: 'in-progress',
    seedVotes: 71,
    priority: 'high',
  },
  // ── Community ──
  {
    id: 'rm-012',
    title: 'Discord live integration',
    description: 'Official TradeClaw Discord server with live signal bot, community leaderboards, and support channels.',
    category: 'Community',
    status: 'planned',
    seedVotes: 156,
    priority: 'high',
  },
  {
    id: 'rm-013',
    title: 'TradeClaw Academy',
    description: 'Free trading education hub — RSI/MACD/EMA courses, backtesting guides, and strategy tutorials built into the app.',
    category: 'Community',
    status: 'planned',
    seedVotes: 103,
    priority: 'medium',
  },
  {
    id: 'rm-014',
    title: 'Community strategy store',
    description: 'Share, browse, and fork community strategies with ratings, performance history, and one-click load.',
    category: 'Community',
    status: 'planned',
    seedVotes: 91,
    priority: 'medium',
  },
  {
    id: 'rm-015',
    title: 'Signal leaderboard seasons',
    description: 'Monthly seasons with rankings, badges, and prizes for top signal accuracy contributors.',
    category: 'Community',
    status: 'planned',
    seedVotes: 67,
    priority: 'low',
  },
  {
    id: 'rm-016',
    title: 'Mobile app (iOS + Android)',
    description: 'Native mobile app with push notifications for signals, price alerts, and portfolio tracking.',
    category: 'Community',
    status: 'planned',
    seedVotes: 198,
    priority: 'high',
  },
  // ── Infrastructure ──
  {
    id: 'rm-017',
    title: 'Redis caching layer',
    description: 'Replace in-memory caches with Redis for multi-instance deployments and persistent cache across restarts.',
    category: 'Infrastructure',
    status: 'planned',
    seedVotes: 74,
    priority: 'high',
  },
  {
    id: 'rm-018',
    title: 'Official Docker Hub image',
    description: 'Publish tradeclaw/tradeclaw:latest to Docker Hub with multi-platform builds and automated nightly pushes.',
    category: 'Infrastructure',
    status: 'in-progress',
    seedVotes: 112,
    priority: 'high',
  },
  {
    id: 'rm-019',
    title: 'Kubernetes Helm chart',
    description: 'Production-grade Helm chart with HPA, PodDisruptionBudget, and configurable resource limits.',
    category: 'Infrastructure',
    status: 'planned',
    seedVotes: 59,
    priority: 'medium',
  },
  {
    id: 'rm-020',
    title: 'CLI v2.0 with TUI',
    description: 'Rewrite tradeclaw CLI with an interactive TUI mode — live signal dashboard, backtest runner, strategy editor in terminal.',
    category: 'Infrastructure',
    status: 'planned',
    seedVotes: 83,
    priority: 'medium',
  },
];

export function getTopVoted(items: RoadmapItem[], userVotes: Record<string, number>, limit = 3): RoadmapItem[] {
  return [...items]
    .filter((i) => i.status !== 'done')
    .sort((a, b) => (b.seedVotes + (userVotes[b.id] ?? 0)) - (a.seedVotes + (userVotes[a.id] ?? 0)))
    .slice(0, limit);
}
