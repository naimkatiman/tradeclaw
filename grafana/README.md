# Grafana + Prometheus for TradeClaw

TradeClaw exposes a Prometheus-compatible metrics endpoint at
`/api/metrics`. Drop the dashboard JSON in this folder into Grafana to
visualize live signals, confidence scores, and direction mix.

## Quick start

1. Start TradeClaw (`docker compose up` or `npm run dev`).
2. Start Prometheus + Grafana side-by-side using the compose snippet
   below.
3. In Grafana, add Prometheus (`http://prometheus:9090`) as a data
   source.
4. **Dashboards → Import** → upload `tradeclaw-dashboard.json` → select
   the Prometheus data source you just added.

## Compose snippet

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./grafana/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports: ["9090:9090"]

  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    ports: ["3001:3000"]
    depends_on: [prometheus]
```

## Prometheus scrape config

Save this as `grafana/prometheus.yml`:

```yaml
global:
  scrape_interval: 30s

scrape_configs:
  - job_name: tradeclaw
    metrics_path: /api/metrics
    static_configs:
      - targets: ["host.docker.internal:3000"]
```

(Replace `host.docker.internal:3000` with the address Prometheus can
reach your TradeClaw container at — e.g. `tradeclaw:3000` if both run in
the same compose network.)

## Metrics exposed

| Metric                              | Type  | Description                                   |
| ----------------------------------- | ----- | --------------------------------------------- |
| `tradeclaw_signal_value`            | gauge | 1=BUY, 0=HOLD, -1=SELL, per symbol/timeframe  |
| `tradeclaw_signal_confidence`       | gauge | Confidence score 0–100                        |
| `tradeclaw_signal_rsi`              | gauge | RSI(14) at scoring time                       |
| `tradeclaw_signals_total`           | gauge | Count of active signals by direction          |
| `tradeclaw_symbols_tracked`         | gauge | Total symbols the engine watches              |
| `tradeclaw_scrape_timestamp_seconds`| gauge | When this scrape was generated (unix seconds) |
| `tradeclaw_signal_outcomes_total`   | gauge | Resolved outcomes per symbol+result over 30d (hit / sl / open) |
| `tradeclaw_signal_age_seconds`      | gauge | Seconds since the most recent signal per symbol (freshness) |
| `tradeclaw_webhook_delivery_total`  | counter | Alert/webhook delivery attempts by `channel` + `status` (in-process, per-instance, resets on restart) |
| `tradeclaw_operator_memory_entries` | gauge | Total operator-memory rows in storage |
| `tradeclaw_signal_gen_duration_seconds` | histogram | Signal-generation latency from the cron precompute path (per-instance, resets on restart) |

The dashboard ships two extra panels for these: a **Signal Freshness**
bar gauge (green <5m, yellow 5–15m, red >15m) that surfaces exchange
connectivity gaps at a glance, and a **Signal Outcomes** donut (hit / sl
/ open over the last 30 days). `tradeclaw_signal_outcomes_total` is a
rolling-window gauge, not a monotonic counter, despite the `_total`
suffix; outcome metrics zero-initialize across all symbols and degrade
gracefully (still serving live-signal series) when the database is
unavailable.
