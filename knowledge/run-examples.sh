#!/usr/bin/env bash
# Runs every agent's worked examples (node:test, TypeScript via Node's type stripping, Node >= 22.18).
# Optional deps for two suites: @anthropic-ai/sdk and @axe-core/playwright. Install them anywhere and pass the folder:
#   EXTRA_NODE_PATH=/path/to/node_modules ./knowledge/run-examples.sh
# Without them those tests are skipped (reported as skipped, never as passed).
set -u
cd "$(dirname "$0")"
export NODE_PATH="${EXTRA_NODE_PATH:+$EXTRA_NODE_PATH:}${NODE_PATH:-}"
total=0; failed=0
for dir in */examples; do
  agent="${dir%%/*}"
  files=$(ls "$dir"/*.test.ts 2>/dev/null) || true
  [ -z "$files" ] && { printf "%-34s (no runnable examples)\n" "$agent"; continue; }
  out=$(cd "$dir" && node --test --test-timeout=60000 *.test.ts 2>&1)
  pass=$(echo "$out" | sed -n 's/^# pass //p'); fail=$(echo "$out" | sed -n 's/^# fail //p'); skip=$(echo "$out" | sed -n 's/^# skipped //p')
  printf "%-34s pass %-3s fail %-3s skipped %s\n" "$agent" "$pass" "$fail" "$skip"
  total=$((total + pass)); [ "${fail:-0}" != "0" ] && { failed=1; echo "$out" | grep -E "^not ok" ; }
done
echo "TOTAL passing: $total"
exit $failed
