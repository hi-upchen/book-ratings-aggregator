#!/bin/bash
# Installs the daily monitor job on this Mac. Safe to run again.
# It clones the repo for the monitor, writes a launchd job, and loads it.
set -euo pipefail

CLONE="$HOME/.local/share/book-ratings-monitor"
LABEL="com.upchen.book-ratings-monitor"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$HOME/Library/Logs/book-ratings-monitor.log"

if [ ! -d "$CLONE" ]; then
  mkdir -p "$(dirname "$CLONE")"
  git clone https://github.com/hi-upchen/book-ratings-aggregator.git "$CLONE"
fi

mkdir -p "$(dirname "$PLIST")" "$(dirname "$LOG")"
cat >"$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$CLONE/monitor/run-daily.sh</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>30</integer>
  </dict>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/opt/node@24/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>StandardOutPath</key>
  <string>$LOG</string>
  <key>StandardErrorPath</key>
  <string>$LOG</string>
</dict>
</plist>
PLIST_EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed. The check runs daily at 09:30. Log: $LOG"
