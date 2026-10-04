#!/bin/bash
# Run the whole suite the way CI does and leave a compact summary in "$1.summary" (the full log in "$1.full").
# usage: bash tools/locale-work/run-tests.sh /abs/path/prefix     (always pass an ABSOLUTE prefix outside the repo, or the logs land in it)
# The suite takes about 5 minutes: run it in the background and poll the .summary file for its last line ("done").
cd "$(dirname "$0")/../.." || exit 1
OUT=${1:-/tmp/locale-last-test}
START=$(date +%s)
SP_E2E=0 SP_REAL_E2E=0 RENDER_E2E=0 NO_COLOR=1 node --test > "$OUT.full" 2>&1
CODE=$?
END=$(date +%s)
{
  echo "exit=$CODE seconds=$((END-START))"
  grep -E '^# (tests|suites|pass|fail|cancelled|skipped|todo)' "$OUT.full"
  echo "--- failing top-level / subtests ---"
  grep -E '^\s*not ok ' "$OUT.full" | head -60
} > "$OUT.summary"
echo done >> "$OUT.summary"
