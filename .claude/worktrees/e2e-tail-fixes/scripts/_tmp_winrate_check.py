#!/usr/bin/env python3
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / 'signals.db'
BLACKLISTED_COMBOS = {
    'SOLUSDT_SELL', 'USDJPY_BUY', 'XRPUSDT_SELL', 'BTCUSDT_SELL',
    'EURUSD_SELL', 'GBPUSD_SELL', 'ETHUSDT_SELL', 'BNBUSDT_SELL',
}

bl_pairs = [c.rsplit('_', 1) for c in BLACKLISTED_COMBOS]
bl_filter = ' AND (' + ' AND '.join('NOT (symbol = ? AND signal = ?)' for _ in bl_pairs) + ')'
bl_params = [v for pair in bl_pairs for v in pair]

conn = sqlite3.connect(DB_PATH)
row = conn.execute(f'''
    SELECT COUNT(*) as total,
           SUM(CASE WHEN outcome IN (\'TP1_HIT\', \'EXPIRED_PROFIT\') OR accuracy >= 0.5 THEN 1 ELSE 0 END) as wins
    FROM signals
    WHERE outcome IS NOT NULL AND outcome != \'LEGACY\'
    {bl_filter}
''', bl_params).fetchone()
conn.close()

total, wins = row
win_rate = round(100.0 * wins / total, 1) if total else 0.0
print(f'{total} {wins} {win_rate}')
