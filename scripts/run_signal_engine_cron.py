#!/usr/bin/env python3
import json
import os
import subprocess
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path('/home/naim/.openclaw/workspace/tradeclaw')
STATE_FILE = ROOT / 'scripts/.signal-engine-state.json'
LOG_FILE = ROOT / 'scripts/signal-errors.log'


def now_times():
    utc_now = datetime.now(timezone.utc)
    sgt = timezone(timedelta(hours=8), name='SGT')
    sgt_now = utc_now.astimezone(sgt)
    return utc_now.strftime('%Y-%m-%dT%H:%M:%SZ'), sgt_now.strftime('%Y-%m-%d %I:%M:%S %p %Z')


def load_state():
    try:
        return json.loads(STATE_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {'consecutive_failures': 0}


def save_state(state):
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding='utf-8')


def main():
    now_utc, now_sgt = now_times()
    proc = subprocess.run(
        ['python3', 'scripts/scanner-engine.py'],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    output = (proc.stdout or '') + (proc.stderr or '')
    state = load_state()

    notify = False
    if proc.returncode == 0:
        state['consecutive_failures'] = 0
        state['last_status'] = 'success'
        state['last_run_utc'] = now_utc
        state.pop('last_error', None)
    else:
        state['consecutive_failures'] = int(state.get('consecutive_failures', 0)) + 1
        state['last_status'] = 'failure'
        state['last_run_utc'] = now_utc
        state['last_error'] = output[-4000:]
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open('a', encoding='utf-8') as f:
            f.write(f'[{now_sgt} | {now_utc}] scanner-engine failure (exit {proc.returncode})\n')
            if output:
                f.write(output.rstrip())
                f.write('\n\n')
            else:
                f.write('(no output)\n\n')
        notify = state['consecutive_failures'] >= 3

    save_state(state)
    print(json.dumps({
        'status': proc.returncode,
        'consecutive_failures': state['consecutive_failures'],
        'notify': notify,
        'output_tail': output[-2000:],
    }))
    raise SystemExit(proc.returncode)


if __name__ == '__main__':
    main()
