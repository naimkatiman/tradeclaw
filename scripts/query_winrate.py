#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB_PATH = Path('/home/naim/.openclaw/workspace/tradeclaw/scripts/signals.db')
conn = sqlite3.connect(DB_PATH)
row = conn.execute("""
SELECT
  ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) AS win_rate_pct,
  SUM(CASE WHEN outcome IN ('TP1_HIT','EXPIRED_PROFIT') THEN 1 ELSE 0 END) AS wins,
  COUNT(*) AS total
FROM signals
WHERE outcome IS NOT NULL AND outcome != 'LEGACY';
""").fetchone()
print(row[0], row[1], row[2])
conn.close()
