#!/usr/bin/env python3
from __future__ import annotations
import os
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path

repo = Path('/home/naim/.openclaw/workspace/tradeclaw')
log_path = repo / 'scripts' / 'signal-errors.log'
state_path = repo / 'scripts' / '.signal-engine-failure-count'

try:
    count = int(state_path.read_text().strip()) if state_path.exists() else 0
except Exception:
    count = 0

proc = subprocess.run(
    ['python3', 'scripts/scanner-engine.py'],
    cwd=repo,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
)

if proc.stdout:
    print(proc.stdout, end='')

if proc.returncode == 0:
    state_path.write_text('0')
    raise SystemExit(0)

count += 1
state_path.write_text(str(count))
ts = datetime.now(ZoneInfo('Asia/Singapore')).strftime('%Y-%m-%d %H:%M:%S %Z')
with log_path.open('a', encoding='utf-8') as f:
    f.write(f'{ts} | exit={proc.returncode} | consecutive_failures={count}\n')

raise SystemExit(proc.returncode)
