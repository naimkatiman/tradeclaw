#!/usr/bin/env python3
"""Deterministic edge-decay metrics over REAL local data sources.

Sources (local scanner/dev samples — NOT production Railway Postgres):
  1) apps/web/data/signal-history.json  -> web app recorded signals (strategyId=hmm-top3)
  2) scripts/signals.db                 -> scanner outcomes (source=zaky_strategy | tradingview_screener)

Rule (Satellite Strike Ch7): flag edge decay when rolling-90d win rate < 0.5 * historical baseline.
Historical baseline prior = 50.8% (recorded TradeClaw baseline, project memory).
Auto-demote when the decay flag fires AND rolling-90d sample is adequate (n>=20).
Windows are relative to the max observed date in each source.
"""
import json, sqlite3, datetime as dt, statistics
from pathlib import Path

ROOT = Path("/home/naim/.openclaw/workspace/tradeclaw")
HIST_JSON = ROOT / "apps/web/data/signal-history.json"
SCAN_DB   = ROOT / "scripts/signals.db"
BASELINE = 0.508  # documented recorded baseline (project memory: 50.8% on 299 non-LEGACY rows)
DECAY_FACTOR = 0.5
MIN_N = 20  # below this a window is "insufficient sample" — no auto-demote, no noisy %

def pct(w, n):
    return round(100.0 * w / n, 1) if n else None

def window_rate(rows, get_ts, is_win, max_ts, days):
    cut = max_ts - dt.timedelta(days=days)
    sub = [r for r in rows if get_ts(r) is not None and get_ts(r) >= cut]
    n = len(sub)
    w = sum(1 for r in sub if is_win(r))
    return {"n": n, "wins": w, "win_rate": pct(w, n) if n >= MIN_N else None,
            "insufficient_sample": n < MIN_N}

def decay_status(all_rate, r90):
    """Returns (status, demoted). Compares rolling-90d to 0.5*baseline."""
    thresh = round(100 * DECAY_FACTOR * BASELINE, 1)  # = 25.4
    if r90.get("win_rate") is None:
        return f"monitor (90d n={r90['n']} < {MIN_N}, insufficient sample)", False
    if r90["win_rate"] < thresh:
        return f"DECAYED (90d {r90['win_rate']}% < {thresh}% = 0.5x baseline)", True
    if all_rate is not None and all_rate < 100 * BASELINE:
        return f"watch (all-sample {all_rate}% below {100*BASELINE}% baseline)", False
    return "healthy", False

out = {"_meta": {
    "provenance": "LOCAL scanner/dev samples — NOT production Railway Postgres. Illustrative of the live engine; production rolling metrics resolve via Writer B cron once wired.",
    "historical_baseline_pct": round(100*BASELINE,1),
    "decay_rule": "flag when rolling_90d_win_rate < 0.5 * historical_baseline (Satellite Strike Ch7)",
    "decay_threshold_pct": round(100*DECAY_FACTOR*BASELINE,1),
    "min_sample_for_window": MIN_N,
    "win_definition": "web: repo-canonical isCountedResolved (exclude simulated/gateBlocked/auto-expire sentinel pnlPct==0&&!hit on outcomes.24h), win = outcome.hit===true; scanner: TP1_HIT|EXPIRED_PROFIT",
    "slippage_pct": "pending real data — no execution fills recorded locally (signal-time prices only)",
    "cross_source_note": "The 50.8% baseline and zaky_strategy/tradingview_screener are SCANNER methodology (TP1_HIT|EXPIRED_PROFIT from signals.db). hmm-top3's win rate is WEB methodology (isCountedResolved + hit===true on signal-history.json). zaky/tv vs baseline is like-for-like; hmm-top3 vs the baseline is cross-method and only INDICATIVE — the stricter web win definition understates hmm-top3 against the looser scanner baseline. Satellite placement and the 'watch' call do not depend on this comparison.",
}, "strategies": {}}

# ---- Source 1: signal-history.json (strategyId=hmm-top3) ----
hist = json.load(open(HIST_JSON))
def h_ts(e):
    t = e.get("timestamp")
    return dt.datetime.fromtimestamp(t/1000, dt.timezone.utc) if t else None
def h_outcome(e):
    # Repo canonical: isCountedResolved() reads outcomes['24h'] specifically.
    o = e.get("outcomes") or {}
    return o.get("24h")
def h_resolved(e):
    # Mirror apps/web/lib/signal-history.ts isCountedResolved():
    # exclude simulated, gate-blocked, and the auto-expire sentinel (pnlPct==0 && !hit).
    if e.get("isSimulated"): return False
    if e.get("gateBlocked"): return False
    v = h_outcome(e)
    if not isinstance(v, dict): return False
    if v.get("pnlPct") == 0 and not v.get("hit"): return False  # auto-expire sentinel -> 'expired', not counted
    return True
def h_win(e):
    # Repo canonical (signal-history-status.ts): win = outcome.hit === true.
    v = h_outcome(e)
    return bool(isinstance(v, dict) and v.get("hit"))
def h_rr(e):
    v = h_outcome(e)
    if isinstance(v, dict) and isinstance(v.get("pnlPct"), (int,float)):
        return v["pnlPct"]
    return None

for sid in ["hmm-top3"]:
    rows = [e for e in hist if e.get("strategyId") == sid and h_resolved(e)]
    if not rows: continue
    max_ts = max(h_ts(e) for e in rows)
    n = len(rows); w = sum(1 for e in rows if h_win(e))
    rrs = [h_rr(e) for e in rows if h_rr(e) is not None]
    r30 = window_rate(rows, h_ts, h_win, max_ts, 30)
    r90 = window_rate(rows, h_ts, h_win, max_ts, 90)
    status, demoted = decay_status(pct(w,n), r90)
    # also split by mode
    modes = {}
    for m in ["scalp","swing"]:
        mr = [e for e in rows if e.get("mode")==m]
        if mr:
            modes[m] = {"resolved": len(mr), "win_rate": pct(sum(1 for e in mr if h_win(e)), len(mr))}
    out["strategies"][sid] = {
        "source": "signal-history.json (web app, Writer A/B)",
        "resolved_signals": n, "wins": w, "all_sample_win_rate": pct(w,n),
        "rolling_30d": r30, "rolling_90d": r90,
        "realized_rr_mean_pct": round(statistics.mean(rrs),2) if rrs else None,
        "realized_rr_median_pct": round(statistics.median(rrs),2) if rrs else None,
        "date_range": [min(h_ts(e) for e in rows).date().isoformat(), max_ts.date().isoformat()],
        "by_mode": modes,
        "decay_status": status, "auto_demote": demoted,
    }

# ---- Source 2: scanner signals.db (source=zaky_strategy | tradingview_screener) ----
con = sqlite3.connect(SCAN_DB)
db_rows = con.execute("select symbol,signal,timeframe,source,outcome,accuracy,entry,tp1,sl,fired_at from signals").fetchall()
WIN = {"TP1_HIT","EXPIRED_PROFIT"}
def d_ts(r):
    s = r[9]
    if not s: return None
    try: return dt.datetime.fromisoformat(s)
    except: return None
def d_win(r): return r[4] in WIN
def d_rr(r):
    entry, tp1, sl, outcome = r[6], r[7], r[8], r[4]
    if entry is None or sl is None or entry==sl: return None
    risk = abs(entry-sl)
    if outcome=="TP1_HIT" and tp1 is not None: return round((abs(tp1-entry))/risk, 2)
    if outcome=="SL_HIT": return -1.0
    return None  # EXPIRED_* → unknown exit price locally

for src in ["zaky_strategy","tradingview_screener"]:
    rows = [r for r in db_rows if r[3]==src]
    if not rows: continue
    max_ts = max(d_ts(r) for r in rows if d_ts(r))
    n=len(rows); w=sum(1 for r in rows if d_win(r))
    rrs=[d_rr(r) for r in rows if d_rr(r) is not None]
    r30 = window_rate(rows, d_ts, d_win, max_ts, 30)
    r90 = window_rate(rows, d_ts, d_win, max_ts, 90)
    status, demoted = decay_status(pct(w,n), r90)
    out["strategies"][src] = {
        "source": "scripts/signals.db (scanner)",
        "resolved_signals": n, "wins": w, "all_sample_win_rate": pct(w,n),
        "rolling_30d": r30, "rolling_90d": r90,
        "realized_rr_mean": round(statistics.mean(rrs),2) if rrs else None,
        "realized_rr_n": len(rrs),
        "date_range": [min(d_ts(r) for r in rows if d_ts(r)).date().isoformat(), max_ts.date().isoformat()],
        "decay_status": status, "auto_demote": demoted,
    }
con.close()

print(json.dumps(out, indent=2))
