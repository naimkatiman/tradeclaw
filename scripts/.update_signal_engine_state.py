#!/usr/bin/env python3
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

status = sys.argv[1]
exit_code = int(sys.argv[2])
count_path = Path("scripts/consecutive-failures.txt")
try:
    count = int(count_path.read_text().strip() or "0")
except Exception:
    count = 0

data = {
    "consecutive_failures": count,
    "last_status": status,
    "last_run_at": datetime.now(timezone.utc).isoformat(),
    "last_exit_code": exit_code,
}
Path("scripts/signal-engine-failure-state.json").write_text(
    json.dumps(data, indent=2) + "\n",
    encoding="utf-8",
)
