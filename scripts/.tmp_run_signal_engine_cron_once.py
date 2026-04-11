from __future__ import annotations

import subprocess
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path('/home/naim/.openclaw/workspace/tradeclaw')
LOG = ROOT / 'scripts' / 'signal-errors.log'
STATE = ROOT / 'scripts' / '.signal-engine-failure-count'

proc = subprocess.run(
    'cd /home/naim/.openclaw/workspace/tradeclaw && python3 scripts/scanner-engine.py 2>&1',
    shell=True,
    capture_output=True,
    text=True,
)

output = proc.stdout
if proc.returncode == 0:
    STATE.write_text('0')
    raise SystemExit(0)

try:
    count = int(STATE.read_text().strip())
except Exception:
    count = 0
count += 1
STATE.write_text(str(count))

ts = datetime.now(ZoneInfo('Asia/Singapore')).strftime('%Y-%m-%d %H:%M:%S %Z')
with LOG.open('a', encoding='utf-8') as f:
    f.write(f'[{ts}] scanner-engine failure #{count} (exit {proc.returncode})\n')
    if output:
        f.write(output)
        if not output.endswith('\n'):
            f.write('\n')
    f.write('\n')

if count >= 3:
    print(f'Signal engine failed {count} consecutive times. Logged to {LOG}')
    raise SystemExit(proc.returncode)

raise SystemExit(0)
