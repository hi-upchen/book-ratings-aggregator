# Daily rating monitor

The owner's Mac runs the Playwright rating checks each morning at 09:30. A Taiwan IP is needed, so GitHub runners cannot do this.
The Mac sends no message itself. After the run, it starts the `monitor.yml` GitHub workflow with the result. The workflow holds no secrets and only records it.
The workflow turns red when a report failed or none arrived for 30 hours. UptimeRobot alerts on the red badge.

## Set up

1. Make sure `gh auth status` works on the Mac.
2. Run `bash monitor/install.sh`. It clones the repo to `~/.local/share/book-ratings-monitor` and loads the launchd job.

3. Add an alarm in UptimeRobot. It alerts when the badge goes red. That covers a failed report and also "the Mac stopped reporting".
   - Create a keyword monitor on `https://github.com/hi-upchen/book-ratings-aggregator/actions/workflows/monitor.yml/badge.svg`.
   - Set it to alert when the word `passing` is missing.
   - Send the alert by email and by iPhone push.
   - Checks run every 5 minutes and GitHub caches the badge for 5 minutes. An alert comes about 5 to 10 minutes after the run turns red.

## Where alerts come from

The UptimeRobot keyword monitor is the only alert path. There is no other message from the Mac or from GitHub.
To see what failed, open the red run on GitHub or read the Mac log `~/Library/Logs/book-ratings-monitor.log`.

## Run by hand

    bash monitor/run-daily.sh

## Read the log

    tail -n 60 ~/Library/Logs/book-ratings-monitor.log

Each run starts with a `=====` header line. The line `result: status=...` shows the outcome.

## Test options

- `MONITOR_CLONE`: folder of the monitor's clone.
- `MONITOR_BRANCH`: branch the clone is reset to. The default is `main`.
- `MONITOR_NET_TRIES`: how many times to check the network at the start, 20 seconds apart. The default is 6.
- `GH`: the GitHub CLI command. Set it to `echo` to print the commands instead of running them.
