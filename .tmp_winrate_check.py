import sqlite3
from pathlib import Path
DB_PATH = Path('/home/naim/.openclaw/workspace/tradeclaw/scripts/signals.db')
BL = {
    'SOLUSDT_SELL', 'USDJPY_BUY', 'XRPUSDT_SELL', 'BTCUSDT_SELL',
    'EURUSD_SELL', 'GBPUSD_SELL', 'ETHUSDT_SELL', 'BNBUSDT_SELL',
    'XAUUSD_SELL', 'SOLUSDT_BUY', 'DOGEUSDT_BUY',
}
conn = sqlite3.connect(DB_PATH)
bl_pairs = [c.rsplit('_', 1) for c in BL]
bl_filter = ' AND (' + ' AND '.join('NOT (symbol = ? AND signal = ?)' for _ in bl_pairs) + ')' if bl_pairs else ''
params = [v for pair in bl_pairs for v in pair]
row = conn.execute(f"""
    SELECT COUNT(*) total,
           SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) wins,
           ROUND(100.0 * SUM(CASE WHEN outcome IN ('TP1_HIT', 'EXPIRED_PROFIT') THEN 1 ELSE 0 END) / COUNT(*), 1) win_rate_pct
    FROM signals
    WHERE outcome IS NOT NULL AND outcome != 'LEGACY'
    {bl_filter}
""", params).fetchone()
print(row[0], row[1], row[2])
conn.close()
