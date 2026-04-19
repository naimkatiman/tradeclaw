import subprocess
from datetime import datetime
from pathlib import Path
import sys

root = Path('/home/naim/.openclaw/workspace/tradeclaw')
log_path = root / 'scripts' / 'signal-errors.log'
cmd = ['python3', 'scripts/scanner-engine.py']
proc = subprocess.run(cmd, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
sys.stdout.write(proc.stdout)
if proc.returncode != 0:
    ts = datetime.now().astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open('a', encoding='utf-8') as f:
        f.write(f'{ts} | scanner-engine failed (exit {proc.returncode})\n')
sys.exit(proc.returncode)
