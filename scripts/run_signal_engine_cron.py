#!/usr/bin/env python3
from __future__ import annotations

import os
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = "/home/naim/.openclaw/workspace/tradeclaw"
SCRIPT = os.path.join(ROOT, "scripts", "scanner-engine.py")
LOG = os.path.join(ROOT, "scripts", "signal-errors.log")
STATE = os.path.join(ROOT, "scripts", ".signal-engine-failure-count")


def read_count() -> int:
    try:
        with open(STATE, "r", encoding="utf-8") as f:
            return int(f.read().strip() or "0")
    except Exception:
        return 0


def write_count(value: int) -> None:
    with open(STATE, "w", encoding="utf-8") as f:
        f.write(str(value))


proc = subprocess.run(
    ["python3", SCRIPT],
    cwd=ROOT,
    capture_output=True,
    text=True,
)

if proc.returncode == 0:
    write_count(0)
    raise SystemExit(0)

count = read_count() + 1
write_count(count)
timestamp = datetime.now(ZoneInfo("Asia/Singapore")).strftime("%Y-%m-%d %H:%M:%S %Z")
with open(LOG, "a", encoding="utf-8") as f:
    f.write(f"[{timestamp}] scanner-engine failure (exit {proc.returncode}, consecutive {count})\n")
    if proc.stdout:
        f.write(proc.stdout)
        if not proc.stdout.endswith("\n"):
            f.write("\n")
    if proc.stderr:
        f.write(proc.stderr)
        if not proc.stderr.endswith("\n"):
            f.write("\n")
    f.write("\n")

if proc.stdout:
    print(proc.stdout, end="")
if proc.stderr:
    print(proc.stderr, end="")
raise SystemExit(proc.returncode)
