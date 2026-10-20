# Tell Me When Ratings Stop Showing — Design Spec

**Date:** 2026-10-19
**Status:** Draft. The owner asked for the spec without a question round, so every decision below marked "(my call)" is open to change.
**Related:** the jars.money alerting design (`12-JarsMoney/jars-money/docs/superpowers/specs/2026-10-19-alerting-design.md`) uses the same Telegram bot and the same principles. Its rollout steps and known pitfalls are in `~/.claude/knowledge/vercel-alerting-playbook.md`. Principles come from `~/.claude/knowledge/alerting-design-best-practices.md` and `~/.claude/knowledge/uptimerobot-monitor-types.md`.

**How this differs from the playbook.** The playbook is for Vercel web apps. In those, UptimeRobot polls a health page every 5 minutes. This project has no live server to poll (section 3), and what breaks happens in the reader's browser. So here a daily browser run replaces the health page. Healthchecks.io replaces UptimeRobot as the "is the monitor still running" watchdog (section 7). Everything else follows the playbook: the shared Telegram bot, alerts only when broken, no reports, and a yes from the owner before each go-live step.

## 1. Goal

The owner learns within one day when Goodreads ratings stop showing on any supported store. Each alert names the store, the page, and the step that broke. It also says where in the code to look.

No message is sent while everything works. A quiet day must mean "it really works". So the monitor itself is also watched. If the daily check stops running, the owner hears about that too.

## 2. Why this needs a browser, not a URL ping

The extension draws ratings inside the reader's browser, on the store's own page. Nothing on our side answers a request when a reader opens a store page. So a plain web check (UptimeRobot) cannot see whether ratings show. UptimeRobot only fetches raw HTML and never runs JavaScript. The ratings are added by JavaScript after the page loads.

The only real check opens each store page in Chromium with the built extension loaded. Then it looks for the ratings on the page. The repo already has Playwright tests that do this (`chrome_extension/e2e/`). This design turns them into a daily monitor.

## 3. What exists today (checked on 2026-10-19)

- **Four end-to-end tests**, one per store. Each opens one list page and waits for `.bra-processed` and `.bra-rating-wrapper`. They run only by hand, in a visible browser window (`headless: false`).
- **The PChome test fails.** Its last saved result shows books found but 0 ratings added. Its URL is a dated promotion page (`/promotion/PR26033000063206`), which has likely expired. A monitor cannot use short-lived pages.
- **No test covers a book detail page.** Each store handler has a separate code path for detail pages. Examples are `#ProdBriefing` on PChome, `h1#ga4ProdTitle` on 讀冊, `.main_wrap` on 博客來 and `.sidebar-group` on Kobo.
- **Goodreads search works.** A search for "Atomic Habits" returned 20 book rows. The rating text matched the pattern the extension uses.
- **The Chrome Web Store listing is live at version 1.4.2.** The store returns HTTP 200 even for an extension ID that does not exist. So the status code alone cannot show that the listing was removed.
- **The data server is unreachable.** `book-ratings-aggregator.runawayup.com` has no DNS record. Public resolvers (1.1.1.1 and 8.8.8.8) confirm this. The parent domain still resolves. Ratings still show, because the extension reads Goodreads directly and ignores send errors. But the book data the extension sends to the server is lost. See section 10.
- The repo is **public** on GitHub, at `hi-upchen/book-ratings-aggregator`.

## 4. What breaks rating display, and how each is caught

| What breaks | What the reader sees | Caught by |
|---|---|---|
| A store changes its page layout, so the handler finds no books | No ratings anywhere on that store | Store check, step 2 |
| A store changes where the rating would go | Books found, but no ratings drawn | Store check, step 3 |
| A store adds a new prefix to book titles, so Goodreads finds nothing | Ratings on far fewer books | Store check, step 4 |
| A store moves to a new domain or path outside the manifest's site list | The extension never runs | Store check, step 1 |
| A store blocks or redirects the check | Unknown | Store check, step 1. This is reported as "check could not run", not as an extension bug. |
| Goodreads changes its search page or blocks searches | No ratings on every store | Goodreads check |
| The extension is removed or unpublished from the Chrome Web Store | New readers cannot install it | Listing check |
| The daily check stops running | Nothing. Silence looks like "all fine". | Missed-run watchdog |

## 5. The checks

All checks run once a day, in one job. They run in the order below.

### 5.1 Goodreads check (runs first)

- Search Goodreads for three well-known English titles, for example "Atomic Habits", "Sapiens" and "1984".
- Parse each result with **the same parsing code the extension uses**. That code now lives inside `chrome_extension/src/scripts/background.ts`, next to Chrome-only calls. Move the parsing into its own small function that both the extension and the check import. Then the check tests the real code, not a copy.
- Pass when at least two of the three searches return a book with a rating (a number like `4.30`) and a rating count.
- Why first: if Goodreads is broken, every store fails at once. The alert then says "Goodreads broke" once. It does not send four store alerts that all point the wrong way.

### 5.2 Store checks

Each of the four stores gets **two pages**:

- **One list page** that stays valid for years, such as a bestseller category or the homepage. It must not be a promotion or a dated campaign page.
- **One fixed book detail page** for a well-known book with an English original title. A good example is the Chinese edition of a famous English book. Then the Goodreads lookup has an English subtitle to search with.

The builder picks the eight URLs. Before choosing one, they open it and confirm it renders books.

Each page goes through four steps. The first step that fails decides the alert.

1. **The page loads.** The final URL after redirects still matches one of the site patterns in `chrome_extension/src/manifest.json` (`content_scripts.matches`). A failure here means the store moved or blocked the check. Fix hint: "check the manifest site list, or open the page by hand".
2. **Books are found.** At least one element has the class `bra-processed`. A failure means the store changed its layout. Fix hint: the selectors in `src/content/retailers/<store>/handler.ts`.
3. **Ratings are drawn.** At least one `.bra-rating-wrapper` contains a visible `.bra-rating-score`. The score text must look like a rating, for example `4.30`. A failure means book lookup or rating placement broke. Fix hint: the insertion code in that store's `handler.ts`.
4. **Enough books got a rating.** This step runs on list pages only. Divide rated books by found books. Pass when the share is at least 20% and at least 3 books are rated. A failure means partial breakage, such as a new title prefix that is not stripped. Fix hint: `cleanBookTitle()` in `src/utils/BookUtils.ts`.

The 20% and 3-book thresholds are my call. Many Chinese-only titles are not on Goodreads, so 100% is never expected. The builder should log the real share for each page during the first week. Then they set each page's threshold just below the lowest normal value.

Each run uses a **fresh browser profile**. The extension caches ratings in browser storage. A cached rating would hide a broken Goodreads lookup. The current tests already pass an empty profile folder (`launchPersistentContext('')`), which starts fresh each time.

### 5.3 Listing check (once a week)

- Fetch the public listing page `https://chromewebstore.google.com/detail/egmngmdfjmfmckiemeiaoonloegkdnbg`.
- Pass when the page contains the version string from `manifest.json`, such as `"1.4.2"`.
- Do not trust the HTTP status code. The store answers 200 even for an extension ID that does not exist (checked 2026-10-19).
- A version mismatch right after a release is normal while store review runs, which can take days. So a mismatch is a warning in the run summary, not an alert. Only "version string not found at all" sends an alert.
- Weekly is my call. A takedown is rare, and a week of delay costs little.

## 6. Where it runs (my call)

- **GitHub Actions**, on a schedule, once a day at 01:00 UTC (09:00 Taiwan time). It can also be started by hand from the Actions tab.
- The job builds the extension (`npm run build`), then runs the checks in **headless** Chromium. Playwright's docs say the `chromium` channel can load extensions in headless mode: https://playwright.dev/docs/chrome-extensions. Change the tests from `headless: false` to `channel: 'chromium'` with headless on. Developers can still run them in a visible window from their own machine when debugging.
- **Retry once** before counting a page as failed. Store sites are sometimes slow.
- Save screenshots and a short result file for every run as job artifacts. Keep them for 14 days. A failed check then comes with a picture of what the page looked like.

**First thing to confirm before building the rest:** GitHub's machines are in the United States. A Taiwanese store may block them or show a different page. The builder runs the store checks once by hand on Actions. If a store does not render books there, stop and tell the owner. The fallback is to run the same job on the owner's Mac on a daily schedule, in headless mode only. That way no browser window ever appears on their screen. The fallback only works while the Mac is awake.

**The dev tests and the monitor are one suite (my call).** The fixed URLs replace the current test URLs, including the expired PChome one. So `npm run test:e2e` on a developer machine runs exactly what the monitor runs. Two suites would drift apart.

## 7. Alerts

**Path one: Telegram, with the details.**
- At the end of a run with any failure, the job sends **one** Telegram message that lists every failed check.
- It reuses the existing `Up' Assistant` bot (@up_assistant_ai_bot) that jars.money uses. The bot token is in 1Password at `Indie-Secrets/telegram-bot-reddit-monitor`, field `bot-token`. Do not rename that item. The Reddit monitor project reads the token by that name. The owner's chat number is listed in `~/.claude/knowledge/vercel-alerting-playbook.md`. Section 14 later puts it in the code, because it is useless without the token.
- **Copy the sender from jars.money** (`src/services/alert.ts` on jars-money `origin/master`). Keep its core:
  - It never throws.
  - It times out after 8 seconds.
  - It hides every secret's value in the whole message, not only in the details.

  Drop the parts that only matter on a web server: the per-type throttle and the `after()` wrapper. Change the prefix to `【book-ratings】`, and change the secret list to this job's three secrets.
- Every message starts with the project name, because the bot is shared:

  ```
  【book-ratings】2 checks failed
  PChome list page: books found, but no ratings drawn.
  Fix: rating insertion in src/content/retailers/pchome/handler.ts
  Kobo detail page: page redirected to https://www.kobo.com/tw/zh/ (outside the manifest site list)
  Fix: open the page by hand; check manifest.json content_scripts.matches
  Screenshots: <link to the job run>
  ```

- While something stays broken, the same message comes once a day (my call). Because the job runs once a day, this needs no stored state to limit repeats.
- A failure to send the message must not hide the result. The job still ends as failed, and the watchdog below reports it.

**Path two: Healthchecks.io, which also catches a missed run.**
- A free Healthchecks.io account (Hobbyist plan: 20 checks, $0) holds one check, "book-ratings daily". https://healthchecks.io/pricing/
- At the end of every run, the job calls the check's ping address. A run where everything passed calls the plain address. A run with failures calls the `/fail` address and sends the failure summary as the request body. https://healthchecks.io/docs/http_api/
- Set the period to 1 day and the grace time to 3 hours. GitHub sometimes starts scheduled jobs late.
- Healthchecks.io emails the owner in two cases. One is a `/fail` ping. The other is no ping at all within the period plus grace time.
- Why this is needed: GitHub turns off scheduled jobs in a **public** repo after 60 days with no repo activity (https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow). This repo is public and rarely changes, so that will happen. Without a watchdog, the monitor would go silent and look exactly like "all fine".
- Why not UptimeRobot, which the owner's other projects use: UptimeRobot can only poll a URL. This job has no URL that changes when a run is missed. UptimeRobot's heartbeat monitor would fit, but it appears to need a paid plan. The search results point that way but do not say it outright. Healthchecks.io does this on its free plan. The cost is one more account. The other projects' alerts also go to iPhone push, and this one won't. Telegram and email are still two separate paths.

**Secrets** go in GitHub Actions repository secrets, never in the workflow file:
- `ALERT_TELEGRAM_BOT_TOKEN`
- `ALERT_TELEGRAM_CHAT_ID`
- `HEALTHCHECKS_PING_URL`

The workflow must only start from the schedule or by hand. It must never start from pull requests. Then a pull request from a fork can never read the secrets. The job must never print a secret to the log, because logs in a public repo are public.

## 8. Resources to create (all new)

- A Healthchecks.io account and one check, set up by the owner. The owner's email is the alert address.
- Three GitHub Actions secrets (section 7). The owner adds them.
- One workflow file under `.github/workflows/`.
- A small shared function that parses a Goodreads search page (section 5.1).

## 9. Not doing

- **No reports from readers' browsers.** The extension will not send success or failure signals home. That would change what the privacy policy promises, and the daily check covers the need.
- **No daily "all fine" message.** Healthchecks.io watches the "still running" signal, so a person never has to.
- **No pixel-by-pixel screenshot comparison.** Store pages change their look all the time, so it would alert constantly. Screenshots are kept only to help with debugging.
- **No check more often than daily.** Store layouts change over days. Many runs a day would also send many Goodreads searches from one address and risk getting blocked.
- **No monitoring of the data server** in this design. See section 10.

**Anti-goal:** a monitor that cries wolf. If store slowness or a one-off timeout sends alerts, the owner will learn to ignore them. That is worse than no monitor. This is why the retry and the "first failing step" rule exist.

## 10. Open item for the owner: the data server

The address the extension sends book data to has no DNS record. The parent domain `runawayup.com` uses Cloudflare name servers. The owner decides one of two things:

- **The server still matters.** Restore the DNS record and confirm `GET /api/book` answers. Then add a health page that runs a real database query. Point an UptimeRobot HTTP monitor at it, the way jars.money does. That is a separate small piece of work.
- **The server no longer matters.** Remove `sendDataToServer` and the server host from `manifest.json` `host_permissions`. The extension then stops sending data to a dead address.

This design works either way. It checks only what readers see.

## 11. Known gaps (accepted)

- **Page types not checked:** search results, Kobo's homepage, and the `activity.` subdomains of 博客來 and 讀冊. One list page and one detail page per store catch most layout changes, but not all.
- **The browser is not the reader's Chrome.** The check uses Playwright's Chromium. A Chrome-only change that breaks the extension would not show up.
- **Goodreads may treat readers differently from the check machine.** It could block readers in Taiwan but not GitHub's machines, or the other way round.
- **A wrong rating is not caught.** The check confirms that a rating shows. It does not confirm that it belongs to the right book.

## 12. Testing and acceptance

- **Unit test** for the shared Goodreads parsing function. Use a saved copy of a real search page, plus a page with the rating text missing.
- **Run by hand on GitHub Actions** and confirm all eight store pages pass. This also answers the "do stores block US machines" question in section 6.
- **Break one check on purpose.** For example, point one page at a URL with no books. Confirm three things:
  - The Telegram message names that page and the right step.
  - Healthchecks.io shows a failed ping, and an email arrives.
  - The job artifacts include the screenshot.
- **Confirm the missed-run email.** Pause the Healthchecks.io check, or temporarily shorten its period. Then confirm the "no ping" email arrives.
- **The owner confirms on their phone** that the Telegram test message arrived. The builder cannot see that.

## 13. Going live (the owner says yes before each step)

1. The owner creates the Healthchecks.io account and the check, then copies its ping address.
2. The owner adds the three GitHub Actions secrets. The builder gives the exact `gh secret set` commands, each one reading its value from 1Password or from standard input. A secret value never appears in a command line or in chat.
3. Merge the branch to `main`. That turns on the daily schedule.
4. Start one run by hand and confirm it passes.
5. Run the "break one check on purpose" test from section 12, then undo it.
6. Add anything new learned here to the pitfalls list in `~/.claude/knowledge/vercel-alerting-playbook.md`.

## 14. Revised design (2026-10-20) — this section overrides sections 5 to 8 and 12 to 13

The owner asked for the monitor to be built and deployed with decisions made for them. Tests on 2026-10-20 changed three things.

**What the tests showed:**
- From a GitHub machine, Kobo and 博客來 answered 403, and 讀冊 never connected. Goodreads answered 3 searches, then sent its bot firewall's "challenge" (an empty 202 response) to the rest. So store pages cannot be checked from GitHub's machines.
- From the owner's Mac, the stores load fine. But one test session sent about 400 real Goodreads searches, because the extension searches once per book on a page. After that, Goodreads challenged every request from the Mac's address for a while.
- The extension treated that empty challenge as "book not found" and cached it for days. A reader whose address gets challenged loses ratings for days, with no error anywhere.

**The revised design:**
1. **The store checks run on the owner's Mac.** A launchd job runs at 09:30 Taiwan time in a separate clone of `main`, outside Dropbox. The browser runs headless, so no window ever appears. If the Mac is asleep at 09:30, the job runs when it wakes. It does not run while the Mac is shut down.
2. **The store checks never call Goodreads.** Playwright answers Goodreads searches with a saved results page. That checks every store-side step: the extension finds books, looks them up, and draws a rating.
3. **One separate test sends 3 real Goodreads searches** through the extension's own search function.
   - A challenge or other non-200 answer marks the test as skipped, not failed. A challenge is not a code bug.
   - A 200 answer that cannot be parsed fails the test. That means Goodreads changed its page.
4. **The extension stops caching a failed search.** A non-200 Goodreads answer counts as an error. The reader sees no rating for that book, and the next page view tries again.
5. **The Mac reports to GitHub.** After each run, the job starts the `monitor.yml` workflow with the result (`ok` or `fail`) and a short summary. The Mac stores no secrets. It uses the `gh` login it already has.
   - On a `fail` report, the workflow ends as failed (red).
   - Once a day, the workflow also checks the age of the last report. If it is older than 30 hours, or the last report failed, it ends as failed (red).
6. **UptimeRobot watches the workflow's status badge**, which says "passing" or "failing". It alerts by email and iPhone push when "passing" is missing. It replaces Healthchecks.io: no new account is needed, and the badge is not subject to GitHub's API request limit.
7. **Cut:** the Chrome Web Store listing check, the 20% rated-books rule (list pages need at least 3 ratings, detail pages need 1), and GitHub-hosted store checks.

**Accepted gaps:**
- If the Mac is off for one day, nothing alerts. From the second day on, UptimeRobot alerts every day until a report arrives again.
- GitHub turns off a public repo's schedule after 60 days with no activity. The Mac's daily `gh workflow enable` turns it back on. Whether that resets the 60-day count is unverified. The staleness alert would fire well before that matters.

**Current design (2026-10-20): UptimeRobot app alerts only, no Telegram.**
The Mac only reports to GitHub. It sends no message and holds no secrets. The `monitor.yml` workflow records each report. It turns red when a report failed or none arrived for 30 hours. UptimeRobot watches the workflow badge and alerts by email and iPhone push. The text above that mentions Telegram is earlier history.
- Failure detail is in the GitHub run and in the Mac log `~/Library/Logs/book-ratings-monitor.log`.
- Alert delay is about 5 to 10 minutes. UptimeRobot checks every 5 minutes, and GitHub caches the badge for 5 minutes.
- Vercel was rejected as a sender. The repo has no web app, and Vercel would add a project, storage and secrets.
