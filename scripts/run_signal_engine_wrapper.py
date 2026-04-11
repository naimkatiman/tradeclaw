from __future__ import annotations

import os
import subprocess
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = "/home/naim/.openclaw/workspace/tradeclaw"
ENGINE = os.path.join(ROOT, "scripts", "scanner-engine.py")
SCRIPTS_DIR = os.path.join(ROOT, "scripts")
COUNT_FILE = os.path.join(SCRIPTS_DIR, ".signal-engine-failure-count")
LOG_FILE = os.path.join(SCRIPTS_DIR, "signal-errors.log")


def read_count() -> int:
    try:
        with open(COUNT_FILE, "r", encoding="utf-8") as f:
            return int(f.read().strip() or "0")
    except Exception:
        return 0


def write_count(value: int) -> None:
    with open(COUNT_FILE, "w", encoding="utf-8") as f:
        f.write(str(value))


def main() -> int:
    os.makedirs(SCRIPTS_DIR, exist_ok=True)
    proc = subprocess.run(
        [sys.executable, ENGINE],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )

    if proc.returncode == 0:
        write_count(0)
        return 0

    ts = datetime.now(ZoneInfo("Asia/Singapore")).strftime("%Y-%m-%d %H:%M:%S %Z")
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(f"[{ts}] scanner-engine failed with exit {proc.returncode}\n")
        if proc.stdout:
            f.write(proc.stdout)
            if not proc.stdout.endswith("\n"):
                f.write("\n")
        if proc.stderr:
            f.write(proc.stderr)
            if not proc.stderr.endswith("\n"):
                f.write("\n")
        f.write("\n")

    new_count = read_count() + 1
    write_count(new_count)

    if new_count >= 3:
        sys.stdout.write(
            f"TradeClaw signal engine failed {new_count} consecutive times. "
            f"Latest exit: {proc.returncode}. Logged to {LOG_FILE}\n"
        )
        if proc.stdout:
            sys.stdout.write(proc.stdout)
        if proc.stderr:
            sys.stdout.write(proc.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
