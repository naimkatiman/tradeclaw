#!/usr/bin/env bash
# Run any webhook forwarder on a cron schedule.
#
# Crontab entry (every 2 minutes):
#   */2 * * * * /path/to/tradeclaw/examples/webhooks/cron-runner.sh forward-to-slack >> /var/log/tradeclaw-webhook.log 2>&1
#
# Required env vars depend on the script you choose — see each .js file.

set -euo pipefail

SCRIPT="${1:-forward-to-slack}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "${DIR}/${SCRIPT}.js" ]; then
  echo "Unknown script: ${SCRIPT}.js (looked in ${DIR})" >&2
  echo "Available:" >&2
  ls "${DIR}"/*.js | xargs -n1 basename | sed 's/^/  - /' >&2
  exit 1
fi

cd "$DIR"
exec node "${SCRIPT}.js"
