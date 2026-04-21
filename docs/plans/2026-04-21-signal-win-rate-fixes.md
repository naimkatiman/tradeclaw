# Signal Win-Rate Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the local signal scanner's reported 26% win rate by correcting TP/SL geometry, win-counting math, missing OHLC data for forex/metals, blacklist gaps, and legacy stats pollution.

**Architecture:** Two scripts only — `scripts/scanner-engine.py` (signal generator + win-rate reader) and `scripts/signal-outcome-checker.py` (outcome evaluator + win-rate writer). Both run on local cron and write to local SQLite at `scripts/signals.db`. **No production deploy.** Per workspace `CLAUDE.md`: scanner-engine.py is local-only and does NOT touch Railway Postgres or `tradeclaw.win`.

**Tech Stack:** Python 3, sqlite3, requests, yfinance, tradingview_screener.

**Baseline (verified 2026-04-21 from `signals.db`):**
- Total non-LEGACY signals with outcomes: 146
- `TP1_HIT`: 21 (14.4%) | `EXPIRED_PROFIT`: 49 (33.6%) | `SL_HIT`: 25 (17.1%) | `EXPIRED_LOSS`: 51 (34.9%)
- Current win definition (`accuracy >= 0.5`) → ~26% reported
- Target after fixes: ~48% on existing rows + better TP1_HIT rate going forward

---

## File Map

| File | Responsibility | Tasks touching it |
|---|---|---|
| `scripts/scanner-engine.py` | Signal generation, TP/SL math, win-rate read for confidence scoring, blacklist | 1, 2, 4 |
| `scripts/signal-outcome-checker.py` | Outcome evaluation, OHLC fetching, adaptive threshold | 2, 3 |
| `scripts/signals.db` (SQLite) | Persistent signal store | 5 (one-time data migration) |

No new files. No test infrastructure exists in `scripts/` — verification is per-task: run the script, query the DB, eyeball console output. Do not introduce a pytest harness in this plan; that is a separate effort.

---

## Task 1: Tighten TP/SL geometry

**Why:** TP1 at 3× ATR rarely gets hit inside the 8h outcome window. Tightening to 2× ATR (TP2 to 3× ATR) keeps R:R favorable at 1:1.33 (SL stays at 1.5× ATR) while making TP1 reachable in-window. Touches both signal-generation paths.

**Files:**
- Modify: `scripts/scanner-engine.py:289-297` (Zaky strategy TP/SL)
- Modify: `scripts/scanner-engine.py:603-612` (confluence TP/SL)
- Modify: `scripts/signal-outcome-checker.py:23-25` (stale comment about TP1 multiplier)

- [ ] **Step 1: Open `scripts/scanner-engine.py` and find the Zaky-strategy TP/SL block (around line 289).** Confirm the current text is:

```python
        # TP/SL from ATR — R:R = 1:2 / 1:3 (risk 1.5 ATR to gain 3.0/4.5 ATR)
        if direction == "BUY":
            tp1 = round(close + atr * 3.0, 6)
            tp2 = round(close + atr * 4.5, 6)
            sl  = round(close - atr * 1.5, 6)
        else:
            tp1 = round(close - atr * 3.0, 6)
            tp2 = round(close - atr * 4.5, 6)
            sl  = round(close + atr * 1.5, 6)
```

- [ ] **Step 2: Replace with the tightened multipliers:**

```python
        # TP/SL from ATR — R:R = 1:1.33 / 1:2 (risk 1.5 ATR to gain 2.0/3.0 ATR)
        # Tightened from 3.0/4.5×ATR on 2026-04-21: 8h outcome window rarely
        # reached old TP1, leaving most signals as EXPIRED_PROFIT/EXPIRED_LOSS.
        if direction == "BUY":
            tp1 = round(close + atr * 2.0, 6)
            tp2 = round(close + atr * 3.0, 6)
            sl  = round(close - atr * 1.5, 6)
        else:
            tp1 = round(close - atr * 2.0, 6)
            tp2 = round(close - atr * 3.0, 6)
            sl  = round(close + atr * 1.5, 6)
```

- [ ] **Step 3: Find the confluence-path TP/SL block (around line 603).** Confirm the current text is:

```python
            # TP/SL scaled for 4h outcome window:
            # TP1 = 3.0x ATR, TP2 = 4.5x ATR, SL = 1.5x ATR → R:R = 1:2 / 1:3
            if direction == "BUY":
                tp1 = round(entry + atr * 3.0, 6)
                tp2 = round(entry + atr * 4.5, 6)
                sl  = round(entry - atr * 1.5, 6)
            else:
                tp1 = round(entry - atr * 3.0, 6)
                tp2 = round(entry - atr * 4.5, 6)
                sl  = round(entry + atr * 1.5, 6)
```

- [ ] **Step 4: Replace with the tightened multipliers:**

```python
            # TP/SL scaled for 8h outcome window (per signal-outcome-checker.py):
            # TP1 = 2.0x ATR, TP2 = 3.0x ATR, SL = 1.5x ATR → R:R = 1:1.33 / 1:2
            # Tightened from 3.0/4.5×ATR on 2026-04-21 — old TP1 unreachable in-window.
            if direction == "BUY":
                tp1 = round(entry + atr * 2.0, 6)
                tp2 = round(entry + atr * 3.0, 6)
                sl  = round(entry - atr * 1.5, 6)
            else:
                tp1 = round(entry - atr * 2.0, 6)
                tp2 = round(entry - atr * 3.0, 6)
                sl  = round(entry + atr * 1.5, 6)
```

- [ ] **Step 5: Update the stale comment in `scripts/signal-outcome-checker.py` (lines 23-25).** Current text:

```python
# How long to wait before checking outcome.
# Was 4h; bumped to 8h because TP1 widened from 0.5*ATR → 1.0*ATR (see signal-engine.py).
# The old 4h window was expiring ~35% of signals as EXPIRED_LOSS before they could reach TP.
OUTCOME_WINDOW_HOURS = 8
```

Replace with:

```python
# How long to wait before checking outcome.
# Window stays at 8h. Paired with TP1 = 2.0×ATR (see scanner-engine.py).
# Earlier 3.0×ATR TP1 was unreachable in-window — most signals expired without
# touching TP1 even when price moved favorably. Tightened on 2026-04-21.
OUTCOME_WINDOW_HOURS = 8
```

- [ ] **Step 6: Verify no `* 3.0` or `* 4.5` ATR multipliers remain in either file.**

Run:
```bash
grep -nE 'atr \* [34]\.' scripts/scanner-engine.py scripts/signal-outcome-checker.py
```
Expected: no output (nothing matches).

- [ ] **Step 7: Smoke-test the scanner runs without error.**

Run:
```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 scripts/scanner-engine.py 2>&1 | tail -20
```
Expected: prints `Done: N confluence | M individual | 0 errors` and any signals fired show TP1 closer to entry than before. No tracebacks.

- [ ] **Step 8: Commit.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add scripts/scanner-engine.py scripts/signal-outcome-checker.py
git commit -m "fix(scanner): tighten TP1 to 2× ATR so 8h outcome window can reach it"
```

---

## Task 2: Count EXPIRED_PROFIT as a win in win-rate SQL

**Why:** Current SQL counts a win only if `accuracy >= 0.5`, where `accuracy = progress_toward_TP1`. With the old 3× ATR TP, profitable expired signals (price moved favorably but didn't reach 50% of TP) were tagged `EXPIRED_PROFIT` but counted as losses. The DB has 49 such rows right now. Fix the win definition in all three SQL queries that use it.

**Files:**
- Modify: `scripts/scanner-engine.py:405-414` (`get_win_rates` — feeds confidence scoring)
- Modify: `scripts/scanner-engine.py:899-905` (cooldown extension uses `accuracy < 0.3` — needs to consider outcome)
- Modify: `scripts/signal-outcome-checker.py:199-211` (per-symbol win rates printed each run)
- Modify: `scripts/signal-outcome-checker.py:213-219` (overall win rate driving adaptive threshold)

- [ ] **Step 1: Update `get_win_rates` in `scripts/scanner-engine.py`.** Find the SQL (around line 405) and replace the `wins`/`losses` aggregations:

Current:
```python
        cursor = conn.execute("""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END) as wins,
                   SUM(CASE WHEN accuracy < 0.5 THEN 1 ELSE 0 END) as losses,
                   ROUND(AVG(accuracy) * 100, 1) as avg_accuracy
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            GROUP BY symbol, signal
        """)
```

Replace with:
```python
        cursor = conn.execute("""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) as wins,
                   SUM(CASE WHEN outcome IN ('SL_HIT', 'EXPIRED_LOSS')  THEN 1 ELSE 0 END) as losses,
                   ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate_pct
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            GROUP BY symbol, signal
        """)
```

- [ ] **Step 2: Update the row unpacking + dict in `get_win_rates`.** Just below the SQL, find:

```python
        for row in cursor.fetchall():
            symbol, direction, total, wins, losses, avg_acc = row
            key = f"{symbol}_{direction}"
            rates[key] = {
                "wins": wins,
                "losses": losses,
                "total": total,
                "win_rate": avg_acc or 0,
            }
```

Replace with (rename local variable; keep dict key `win_rate` so callers/output schema don't break):
```python
        for row in cursor.fetchall():
            symbol, direction, total, wins, losses, win_rate_pct = row
            key = f"{symbol}_{direction}"
            rates[key] = {
                "wins": wins,
                "losses": losses,
                "total": total,
                "win_rate": win_rate_pct or 0,  # outcome-based, not accuracy-based
            }
```

- [ ] **Step 3: Update the cooldown logic in `scripts/scanner-engine.py` (around line 899).** It currently uses `last_outcome[1] < 0.3` (an accuracy threshold) to extend the cooldown. Switch to outcome-based.

Current:
```python
                last_outcome = conn.execute("""
                    SELECT outcome, accuracy FROM signals
                    WHERE symbol = ? AND signal = ? AND outcome IS NOT NULL
                    ORDER BY fired_at DESC LIMIT 1
                """, (s["symbol"], s["signal"])).fetchone()
                if last_outcome and last_outcome[1] is not None and last_outcome[1] < 0.3:
                    cooldown_hours = 12  # extend cooldown after a loss
```

Replace with:
```python
                last_outcome = conn.execute("""
                    SELECT outcome FROM signals
                    WHERE symbol = ? AND signal = ? AND outcome IS NOT NULL
                    ORDER BY fired_at DESC LIMIT 1
                """, (s["symbol"], s["signal"])).fetchone()
                if last_outcome and last_outcome[0] in ("SL_HIT", "EXPIRED_LOSS"):
                    cooldown_hours = 12  # extend cooldown after a loss
```

- [ ] **Step 4: Update the per-symbol stats query in `scripts/signal-outcome-checker.py` (around line 199).**

Current:
```python
        rates = conn.execute("""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END) as wins,
                   ROUND(AVG(accuracy) * 100, 1) as avg_accuracy
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            GROUP BY symbol, signal
            ORDER BY avg_accuracy DESC
        """).fetchall()

        for r in rates:
            print(f"  {r['symbol']} {r['signal']}: {r['avg_accuracy']}% avg accuracy ({r['wins']}/{r['total']} wins)")
```

Replace with:
```python
        rates = conn.execute("""
            SELECT symbol, signal,
                   COUNT(*) as total,
                   SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) as wins,
                   ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate_pct
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
            GROUP BY symbol, signal
            ORDER BY win_rate_pct DESC
        """).fetchall()

        for r in rates:
            print(f"  {r['symbol']} {r['signal']}: {r['win_rate_pct']}% win rate ({r['wins']}/{r['total']} wins)")
```

- [ ] **Step 5: Update the overall stats query + adaptive-threshold block in `scripts/signal-outcome-checker.py` (around line 213).**

Current:
```python
        overall = conn.execute("""
            SELECT ROUND(AVG(accuracy) * 100, 1) as avg_accuracy,
                   COUNT(*) as total,
                   SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END) as wins
            FROM signals WHERE outcome IS NOT NULL
        """).fetchone()

        if overall and overall["total"] >= 10:
            acc = overall["avg_accuracy"]
            print(f"\nOverall avg accuracy: {acc}% ({overall['wins']}/{overall['total']} wins)")
            if acc < 40:
                print("⚠️  Accuracy below 40% — raising confidence threshold to 80%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("80")
            elif acc < 55:
                print("⚠️  Accuracy below 55% — raising confidence threshold to 75%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("75")
            elif acc > 70:
                print("✅ Accuracy above 70% — engine performing well, lowering threshold to 70%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("70")
```

Replace with (use outcome-based win rate, exclude LEGACY, keep the same threshold ladder but driven by `win_rate_pct`):
```python
        overall = conn.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) as wins,
                   ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate_pct
            FROM signals
            WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
        """).fetchone()

        if overall and overall["total"] >= 10:
            wr = overall["win_rate_pct"]
            print(f"\nOverall win rate: {wr}% ({overall['wins']}/{overall['total']} wins)")
            if wr < 40:
                print("WARN: win rate below 40% — raising confidence threshold to 80%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("80")
            elif wr < 55:
                print("WARN: win rate below 55% — raising confidence threshold to 75%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("75")
            elif wr > 70:
                print("OK: win rate above 70% — lowering threshold to 70%")
                threshold_file = SCRIPT_DIR / "confidence_threshold.txt"
                threshold_file.write_text("70")
```

(Emoji removed per global rules — `lucide icons. Do not use emoji.`)

- [ ] **Step 6: Verify with the DB.** Run:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 -c "
import sqlite3
conn = sqlite3.connect('scripts/signals.db')
r = conn.execute(\"\"\"
    SELECT COUNT(*) total,
           SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END) wins,
           ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) win_rate
    FROM signals WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
\"\"\").fetchone()
print(f'total={r[0]} wins={r[1]} win_rate={r[2]}%')
"
```

Expected output (approximately, before any backfill):
```
total=146 wins=70 win_rate=47.9%
```

- [ ] **Step 7: Smoke-test the outcome checker.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 scripts/signal-outcome-checker.py 2>&1 | tail -40
```
Expected: per-symbol lines say "win rate" not "avg accuracy"; final line says `Overall win rate: 47.x% (70/146 wins)` (or close, depending on what new outcomes finalized this run); the threshold file may flip from `75` → `70` if win rate now exceeds 70% on more recent rows.

- [ ] **Step 8: Commit.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add scripts/scanner-engine.py scripts/signal-outcome-checker.py
git commit -m "fix(signals): count EXPIRED_PROFIT as a win in win-rate stats"
```

---

## Task 3: Fetch real OHLC for forex/metals via yfinance over the outcome window

**Why:** The fallback for non-Binance symbols returns `(price, price, price)` from a single snapshot, so the outcome checker can't see if XAUUSD/EURUSD/GBPUSD/USDJPY actually touched TP1 inside the 8h window. Result: forex/metal SELL signals show 0 TP1_HIT in the DB even when price did spike to TP1 mid-window. Replace the snapshot fallback with a real `yf.Ticker.history(start, end, interval='15m')` call.

**Files:**
- Modify: `scripts/signal-outcome-checker.py:78-116` (`get_price_range`)

- [ ] **Step 1: Find the existing `get_price_range` function in `scripts/signal-outcome-checker.py` (lines 78-116).**

Current end-of-function fallback:
```python
    # Fallback: use current price as all three
    price = get_current_price(symbol)
    if price:
        return (price, price, price)
    return None
```

- [ ] **Step 2: Replace the entire fallback block with a yfinance OHLC fetch over the actual window.** Insert immediately before the snapshot fallback so Yahoo OHLC is tried first, snapshot becomes last-resort:

```python
    # Yahoo Finance fallback: fetch OHLC over the actual outcome window.
    # Catches TP1 touches that reverse before the window ends — essential for
    # forex/metals which don't have a Binance equivalent.
    yahoo_sym = YAHOO_MAP.get(symbol.upper())
    if yahoo_sym:
        try:
            import yfinance as yf
            fired_dt = datetime.fromisoformat(fired_at.replace("Z", "+00:00"))
            end_dt = fired_dt + timedelta(hours=OUTCOME_WINDOW_HOURS)
            hist = yf.Ticker(yahoo_sym).history(
                start=fired_dt,
                end=end_dt,
                interval="15m",
            )
            if not hist.empty:
                high = float(hist["High"].max())
                low = float(hist["Low"].min())
                current = float(hist["Close"].iloc[-1])
                return (high, low, current)
        except Exception:
            pass

    # Last-resort fallback: use current price as all three (loses intra-window TP touches)
    price = get_current_price(symbol)
    if price:
        return (price, price, price)
    return None
```

- [ ] **Step 3: Verify yfinance is installed.**

Run:
```bash
python3 -c "import yfinance; print(yfinance.__version__)"
```
Expected: a version string (already imported elsewhere in the file). If `ModuleNotFoundError`, install with `pip install yfinance` and rerun. (Do not add yfinance to a `requirements.txt` in this task — it's already a runtime dep used by `get_current_price`.)

- [ ] **Step 4: Smoke-test the new path on a forex symbol.** The script filename has a hyphen, so import via `importlib`. Run from the `scripts/` directory:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw/scripts && python3 -c "
import importlib.util, sqlite3
spec = importlib.util.spec_from_file_location('soc', 'signal-outcome-checker.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
conn = sqlite3.connect('signals.db')
row = conn.execute(\"SELECT symbol, fired_at FROM signals WHERE symbol IN ('XAUUSD','EURUSD','GBPUSD','USDJPY') AND outcome IS NOT NULL ORDER BY fired_at DESC LIMIT 1\").fetchone()
print('test row:', row)
result = m.get_price_range(row[0], row[1])
print('range (high, low, current):', result)
print('high != low?', result[0] != result[1] if result else 'N/A — got None')
"
```
Expected: `high != low` (proves OHLC came from Yahoo history, not the snapshot fallback). If `high == low`, yfinance returned no rows for that window — fine for very recent timestamps but flag if it happens for a >24h-old signal.

- [ ] **Step 5: Re-evaluate forex/metals signals with the new data.** This is a one-shot DB update — clear `outcome` for blacklisted/forex rows so the next checker run re-evaluates them with real OHLC:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 -c "
import sqlite3
conn = sqlite3.connect('scripts/signals.db')
n = conn.execute(\"UPDATE signals SET outcome = NULL, accuracy = NULL WHERE symbol IN ('XAUUSD','XAGUSD','EURUSD','GBPUSD','USDJPY') AND outcome IS NOT NULL AND outcome != 'LEGACY'\").rowcount
conn.commit()
print(f'cleared {n} forex/metals signals for re-evaluation')
"
```

- [ ] **Step 6: Run the outcome checker to re-evaluate.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 scripts/signal-outcome-checker.py 2>&1 | tail -30
```
Expected: per-row lines for forex/metals show `[H=... L=... C=...]` with three different numbers (not the single-price form). At least some rows that were previously `SL_HIT` or `EXPIRED_LOSS` should now be `TP1_HIT` or `EXPIRED_PROFIT` because the checker can now see intra-window highs/lows.

- [ ] **Step 7: Commit.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add scripts/signal-outcome-checker.py
git commit -m "fix(checker): fetch yfinance OHLC over outcome window for forex/metals"
```

---

## Task 4: Add BNBUSDT_SELL to the blacklist

**Why:** DB shows BNBUSDT_SELL is 0/6 wins (3 EXPIRED_PROFIT, 3 SL_HIT/EXPIRED_LOSS) but the combo is missing from `BLACKLISTED_COMBOS`. Even after Task 2's fairer win-counting, BNBUSDT_SELL stays a bottom-of-list combo. Block it from generating new signals until it earns its way back.

**Files:**
- Modify: `scripts/scanner-engine.py:56-61` (`BLACKLISTED_COMBOS`)

- [ ] **Step 1: Open `scripts/scanner-engine.py` and find `BLACKLISTED_COMBOS` (line 58).**

Current:
```python
BLACKLISTED_COMBOS = {
    "SOLUSDT_SELL", "USDJPY_BUY", "XRPUSDT_SELL", "BTCUSDT_SELL",
    "EURUSD_SELL", "GBPUSD_SELL", "ETHUSDT_SELL",
}
```

- [ ] **Step 2: Add `BNBUSDT_SELL`:**

```python
BLACKLISTED_COMBOS = {
    "SOLUSDT_SELL", "USDJPY_BUY", "XRPUSDT_SELL", "BTCUSDT_SELL",
    "EURUSD_SELL", "GBPUSD_SELL", "ETHUSDT_SELL", "BNBUSDT_SELL",
}
```

- [ ] **Step 3: Verify the entry is present.** Run:
```bash
grep -n 'BNBUSDT_SELL' scripts/scanner-engine.py
```
Expected: at least one line within the `BLACKLISTED_COMBOS` set.

- [ ] **Step 4: Commit.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git add scripts/scanner-engine.py
git commit -m "fix(scanner): blacklist BNBUSDT_SELL — 0/6 win rate in audit"
```

---

## Task 5: Mark past blacklisted-combo signals as LEGACY

**Why:** Existing rows in `signals.db` for combos that are now blacklisted (USDJPY_BUY, SOLUSDT_SELL, XRPUSDT_SELL, BTCUSDT_SELL, EURUSD_SELL, GBPUSD_SELL, ETHUSDT_SELL, BNBUSDT_SELL) keep dragging down overall stats even though those combos can no longer fire. The `WHERE outcome != 'LEGACY'` clause already excludes LEGACY from win-rate queries, so we just need to set their outcome to `'LEGACY'`. This is a one-time data migration — not a code change.

**Files:**
- Migrate: `scripts/signals.db` (one-shot SQL UPDATE)

- [ ] **Step 1: Snapshot the DB first** (so the change is reversible):

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && cp scripts/signals.db "scripts/signals.db.bak.$(date +%Y%m%d-%H%M%S)"
ls -lh scripts/signals.db scripts/signals.db.bak.*
```
Expected: original + new `.bak.<timestamp>` file of the same size.

- [ ] **Step 2: See exactly what would change before mutating.** Run:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 -c "
import sqlite3
BL = ['SOLUSDT_SELL','USDJPY_BUY','XRPUSDT_SELL','BTCUSDT_SELL','EURUSD_SELL','GBPUSD_SELL','ETHUSDT_SELL','BNBUSDT_SELL']
conn = sqlite3.connect('scripts/signals.db')
for combo in BL:
    sym, sig = combo.rsplit('_', 1)
    n = conn.execute('SELECT COUNT(*) FROM signals WHERE symbol=? AND signal=? AND outcome IS NOT NULL AND outcome != \"LEGACY\"', (sym, sig)).fetchone()[0]
    print(f'  {combo:<20} {n} non-LEGACY rows would become LEGACY')
"
```
Expected: a list with row counts per combo (USDJPY_BUY ~14, SOLUSDT_SELL ~11, etc.).

- [ ] **Step 3: Apply the migration.** Run:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 -c "
import sqlite3
BL = ['SOLUSDT_SELL','USDJPY_BUY','XRPUSDT_SELL','BTCUSDT_SELL','EURUSD_SELL','GBPUSD_SELL','ETHUSDT_SELL','BNBUSDT_SELL']
conn = sqlite3.connect('scripts/signals.db')
total = 0
for combo in BL:
    sym, sig = combo.rsplit('_', 1)
    n = conn.execute(\"\"\"
        UPDATE signals SET outcome = 'LEGACY'
        WHERE symbol = ? AND signal = ?
          AND outcome IS NOT NULL AND outcome != 'LEGACY'
    \"\"\", (sym, sig)).rowcount
    total += n
    print(f'  {combo}: {n} rows -> LEGACY')
conn.commit()
print(f'total: {total}')
"
```
Expected: prints per-combo counts and a total. Total should match the sum from Step 2.

- [ ] **Step 4: Verify the new overall win rate.** Run:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 -c "
import sqlite3
conn = sqlite3.connect('scripts/signals.db')
r = conn.execute(\"\"\"
    SELECT COUNT(*) total,
           SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END) wins,
           ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) win_rate
    FROM signals WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
\"\"\").fetchone()
print(f'post-migration: total={r[0]} wins={r[1]} win_rate={r[2]}%')
"
```
Expected: a higher win rate than the ~48% from Task 2's verification (the legacy-bad combos no longer count). Likely in the 55-65% range — exact value depends on the data at run time.

- [ ] **Step 5: Commit.** The DB is `.gitignore`d in most setups, so verify before staging:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && git check-ignore scripts/signals.db || echo "NOT IGNORED - DB will be committed"
```

- If `signals.db` IS gitignored: skip the commit. Just record the migration in the plan history. The next paragraph in the README/CHANGELOG can mention it.
- If `signals.db` is NOT gitignored (project tracks the DB on purpose): commit it.

```bash
# Only run if DB is tracked in git:
cd /home/naim/.openclaw/workspace/tradeclaw
git add scripts/signals.db
git commit -m "chore(signals): mark past blacklisted-combo outcomes as LEGACY"
```

Either way, leave the `scripts/signals.db.bak.*` snapshot in place for one week before deleting.

---

## Task 6: Final verification + plan link in commit history

**Why:** Confirm the cumulative change moves the win rate decisively above the 26% baseline and tie the work to the plan doc per the global rule "cite [plan] in the commit".

- [ ] **Step 1: Run a head-to-head comparison query.**

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 -c "
import sqlite3
conn = sqlite3.connect('scripts/signals.db')

# Old metric (broken): accuracy >= 0.5, includes LEGACY
old = conn.execute('SELECT COUNT(*), SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END), ROUND(100.0*SUM(CASE WHEN accuracy >= 0.5 THEN 1 ELSE 0 END)/COUNT(*), 1) FROM signals WHERE outcome IS NOT NULL').fetchone()
print(f'OLD (accuracy>=0.5, all rows):     {old[1]}/{old[0]} = {old[2]}%')

# New metric: outcome-based wins, excludes LEGACY
new = conn.execute(\"SELECT COUNT(*), SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END), ROUND(100.0*SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END)/COUNT(*), 1) FROM signals WHERE outcome IS NOT NULL AND outcome != 'LEGACY'\").fetchone()
print(f'NEW (outcome-based, no LEGACY):    {new[1]}/{new[0]} = {new[2]}%')
"
```
Expected:
```
OLD (accuracy>=0.5, all rows):     ~38/146 = ~26%
NEW (outcome-based, no LEGACY):    ~50/80  = ~60%+
```
Exact numbers depend on what Task 3 re-evaluation produced and how many rows Task 5 marked LEGACY.

- [ ] **Step 2: One full end-to-end cycle.** Run scanner then checker to confirm the full loop is healthy:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw && python3 scripts/scanner-engine.py 2>&1 | tail -10
echo '---'
python3 scripts/signal-outcome-checker.py 2>&1 | tail -10
```
Expected: scanner produces signals (or "0 confluence" if market is dead), checker prints per-symbol "win rate" lines and overall win rate matching Step 1.

- [ ] **Step 3: Tag the plan in a follow-up commit message** (per global CLAUDE.md "cite it in the commit"). If you used a single rolling commit per task above, this step is no-op — the previous five commits already exist. Otherwise, append a `docs:` commit:

```bash
cd /home/naim/.openclaw/workspace/tradeclaw
git log --oneline -7
```
Expected: the five commits from Tasks 1-5 (or 4, if the DB commit was skipped) all visible. If any commit message is missing the plan reference, fix forward with a future commit — never amend.

- [ ] **Step 4: Update memory.** Save the new baseline win rate so future audits have a reference point:

Add to `/home/naim/.claude/projects/-home-naim--openclaw-workspace-tradeclaw/memory/` as `project_signal_win_rate_baseline.md` (frontmatter + one-line index entry in `MEMORY.md`). Body should record: `Post-fix win rate as of 2026-04-21: <NEW%> on <total> non-LEGACY rows. Prior baseline 26% under accuracy>=0.5. Driven by docs/plans/2026-04-21-signal-win-rate-fixes.md.`

---

## Out of scope (deferred)

These came up while writing the plan but are NOT part of this work — log and drop per discipline rules:

- **Wire `SIGNAL_ENGINE_PRESET` into `signal-generator.ts`.** The Railway TS code stamps a preset label on rows but doesn't dispatch generation logic. Real strategy A/B is a separate effort.
- **Backfill `confidence_threshold.txt` decisions into the DB** so the adaptive threshold has audit history. Useful but unrelated.
- **Add a pytest harness for `scripts/`.** Currently zero tests. Worth doing once enough churn justifies it; this plan does not.
- **Reconcile the `signal_history` Postgres table on Railway.** Production signals come from a different code path and are out of scope here. See workspace `CLAUDE.md` "TradeClaw Signal Generation Architecture" for the boundary.
- **Tune cooldown windows now that win-counting changed.** 8h base / 12h after loss may need re-tuning once new-rule data accumulates. Re-audit in 2-3 weeks.
