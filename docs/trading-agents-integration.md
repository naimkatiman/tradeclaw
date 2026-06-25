# TradingAgents integration scaffold

This document captures the integration points for the `TauricResearch/TradingAgents` research stack and the new TradeClaw wrapper package.

## Upstream TradingAgents architecture

The upstream project is a Python/LangGraph framework with a single orchestration entrypoint:

- `TradingAgentsGraph` in `tradingagents/graph/trading_graph.py`
- public config defaults in `tradingagents/default_config.py`
- structured outputs in `tradingagents/agents/schemas.py`

The graph constructs a multi-stage workflow with these major roles:

- analyst team: market, social, news, fundamentals
- researcher / risk debate layer
- trader: converts research into a transaction proposal
- portfolio manager: emits the final portfolio decision

The primary runtime call is:

- `TradingAgentsGraph.propagate(company_name, trade_date, asset_type='stock')`

## TradeClaw wrapper surface

The new `packages/trading-agents/` workspace is intentionally thin. It provides:

- typed request/response contracts for analyst, risk, and portfolio-manager stages
- a generic `TradingAgentsBridgeConfig` for choosing the transport
- a command builder that can target a Python module, stdio bridge, or HTTP JSON shim and serializes the full stage payload as `--payload-json`

### Type mapping

| TradeClaw type | Upstream analogue |
| --- | --- |
| `AnalystAgentInput` / `AnalystAgentOutput` | analyst team outputs feeding the research pipeline |
| `RiskAgentInput` / `RiskAgentOutput` | researcher / risk debate layer |
| `PortfolioManagerAgentInput` / `PortfolioManagerAgentOutput` | `PortfolioDecision` in upstream schemas |
| `ResearchPlanLike` | `ResearchPlan` in upstream schemas |

## Integration notes

- The wrapper keeps transport abstract so we can swap between direct Python CLI execution and a future HTTP service without changing consumers.
- `projectRoot` defaults to the current working directory, which makes local monorepo development straightforward.
- The wrapper normalizes tickers to uppercase and defaults `assetType` to `stock` to match the upstream defaults.
- The package is a scaffold, not a full integration yet; it documents and types the boundary so TC-177 can plug in orchestration later.

## Upstream references captured during evaluation

- `tradingagents/graph/trading_graph.py`
- `tradingagents/default_config.py`
- `tradingagents/agents/schemas.py`

## Next step

Wire the bridge into a real research workflow and reuse the typed contracts for the `/pro/research` endpoint and job queue.
