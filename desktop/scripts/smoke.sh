#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# A launch check only: never scan or delete the runner's files.
app=bin/Swept.app
"$app/Contents/MacOS/Swept" > bin/launch.log 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true' EXIT
sleep 5
if ! kill -0 "$pid" 2>/dev/null; then
  cat bin/launch.log
  echo "Swept exited during startup" >&2
  exit 1
fi
