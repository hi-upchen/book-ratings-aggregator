#!/bin/bash
# Runs the rating-display checks on this Mac and reports the result to GitHub.
# The Mac only reports to GitHub. It sends no message itself.
# A failed check turns the GitHub run red. UptimeRobot alerts on the red badge.
# The workflow also turns red when no report arrives for 30 hours.
#
# Optional env vars, mainly for testing:
#   MONITOR_CLONE   folder of the monitor's own clone (default ~/.local/share/book-ratings-monitor)
#   MONITOR_BRANCH  branch the clone is reset to (default main)
#   GH              GitHub CLI command (default gh)
#   MONITOR_NET_TRIES  tries of the network check, 20 seconds apart (default 6)
set -uo pipefail

CLONE="${MONITOR_CLONE:-$HOME/.local/share/book-ratings-monitor}"
BRANCH="${MONITOR_BRANCH:-main}"
GH="${GH:-gh}"
REPO="hi-upchen/book-ratings-aggregator"
LOG="$HOME/Library/Logs/book-ratings-monitor.log"

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1
echo "===== $(date '+%Y-%m-%d %H:%M:%S') monitor run ====="

status=ok
summary=""

# Runs one setup step. Only the first failure is recorded.
run_step() {
  local name="$1"
  shift
  if [ "$status" = fail ]; then
    return
  fi
  echo "--- $name"
  if ! "$@"; then
    status=fail
    summary="monitor setup failed at: $name"
    echo "step failed: $name"
  fi
}

# launchd runs a missed job right at wake, often before the network is up.
# This waits for GitHub to answer. If it never does, the steps below fail and report as usual.
wait_for_network() {
  local tries="${MONITOR_NET_TRIES:-6}"
  local i=1
  while [ "$i" -le "$tries" ]; do
    if (cd "$CLONE" && git ls-remote -q origin HEAD >/dev/null 2>&1); then
      echo "network check: ok (try $i)"
      return 0
    fi
    echo "network check: no answer (try $i of $tries)"
    if [ "$i" -lt "$tries" ]; then
      sleep 20
    fi
    i=$((i + 1))
  done
  echo "network check: giving up, continuing anyway"
  return 0
}
wait_for_network

# The clone belongs only to the monitor, so a hard reset is safe.
run_step "git update" bash -c "cd \"\$1\" && git fetch -q origin && git reset -q --hard \"origin/\$2\"" _ "$CLONE" "$BRANCH"

if [ "$status" = ok ]; then
  cd "$CLONE/chrome_extension" || {
    status=fail
    summary="monitor setup failed at: cd chrome_extension"
  }
fi

run_step "npm ci" npm ci --no-audit --no-fund
# Cleaning first keeps an old hashed file in dist/ from causing a false failure.
run_step "npm run clean" npm run clean
run_step "npm run build" npm run build
run_step "playwright install" npx playwright install chromium
# Playwright exits non-zero when a check fails. The report decides the result, so ignore its code here.
run_step "playwright test" bash -c 'rm -f playwright-report/results.json; npx playwright test; [ -f playwright-report/results.json ]'

if [ "$status" = ok ]; then
  summary=$(node e2e/summarize-report.mjs playwright-report/results.json)
  if [ $? -ne 0 ]; then
    status=fail
  fi
fi

echo "result: status=$status"
echo "$summary"

# Enabling the workflow keeps GitHub from disabling its schedule after 60 quiet days.
"$GH" workflow enable monitor.yml -R "$REPO" || true

if ! "$GH" workflow run monitor.yml -R "$REPO" -f status="$status" -f summary="$summary"; then
  echo "could not report to GitHub. The stale-report check will notice."
fi
