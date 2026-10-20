# Book Ratings Aggregator Project

## Project Overview
Chrome extension that displays Goodreads ratings on Taiwanese book retailer websites (Kobo, PChome, 博客來, 讀冊) to enhance book discovery and help users make informed purchasing decisions.

## Architecture
- **Chrome Extension**: Content scripts for each retailer website

## Tech Stack
- **Frontend**: TypeScript, Chrome Extension APIs, Cheerio for web scraping
- **Build Tools**: Parcel

## Current Project Structure

### Chrome Extension (`chrome_extension/`)
```
chrome_extension/
├── src/
│   ├── content/
│   │   ├── content.ts           # Main entry point with ContentRouter
│   │   ├── content.scss         # Unified styling for all retailers
│   │   └── retailers/           # Modular retailer handlers
│   │       ├── kobo/
│   │       │   ├── handler.ts   # KoboHandler class implementation
│   │       │   └── index.ts     # Export for KoboHandler
│   │       ├── pchome/
│   │       │   ├── handler.ts   # PChomeHandler with unified processing
│   │       │   └── index.ts     # Export for PChomeHandler
│   │       ├── bokelai/
│   │       │   ├── handler.ts   # BokelaiHandler implementation
│   │       │   ├── index.ts     # Export for BokelaiHandler
│   │       │   └── utils.ts     # 博客來-specific utilities
│   │       └── taaze/
│   │           ├── handler.ts   # TaazeHandler implementation
│   │           ├── index.ts     # Export for TaazeHandler
│   │           └── utils.ts     # 讀冊-specific utilities
│   ├── scripts/
│   │   └── background.ts        # Service worker for Goodreads API calls
│   ├── utils/
│   │   ├── BookUtils.ts         # Book data processing utilities
│   │   ├── ChromeMessagingService.ts  # Extension messaging layer
│   │   ├── ContentRouter.ts     # URL-based retailer routing system
│   │   ├── DomUtils.ts          # DOM manipulation helpers
│   │   └── __tests__/           # Unit tests
│   │       ├── ContentRouter.test.ts  # Router tests
│   │       ├── setup.ts         # Test configuration
│   │       └── README.md        # Testing documentation
│   ├── types/
│   │   └── RetrievedBookInfo.ts # TypeScript interfaces
│   ├── images/                  # Extension icons and assets
│   │   ├── book-rating-128.png
│   │   ├── book-rating.png
│   │   └── goodreads-icon.svg
│   ├── popup/
│   │   └── hello.html          # Extension popup interface
│   └── manifest.json           # Chrome extension manifest v3
├── e2e/                        # Playwright E2E tests
│   └── rating-display.spec.ts  # One data-driven check for every store page
├── dist/                       # Parcel build output
├── coverage/                   # Jest test coverage reports
├── node_modules/               # Dependencies
├── package.json                # Extension dependencies & scripts
├── package-lock.json
├── playwright.config.ts        # Playwright E2E config
├── tsconfig.json               # TypeScript config (ES5 target)
├── jest.config.js              # Jest testing configuration
├── .env                        # CWS API credentials (gitignored)
├── .env.sample                 # CWS credential template
├── LICENSE
├── README.md
└── privacy-policy.md
```

## Development Guidelines

### Code Standards
- Use TypeScript for all new code
- 2-space indentation consistently
- CamelCase for variables and functions
- Follow existing patterns in each retailer's content script
- Add JSDoc comments for complex functions
- Use Logger utility for all console output (environment-based log levels)

### Chrome Extension Development

#### Architecture Overview
- **Content Router System**: `ContentRouter.ts` provides URL-based routing to appropriate retailer handlers
- **Modular Handlers**: Each retailer implements the `RetailerHandler` interface with `matches()` and `handle()` methods
- **Unified Styling**: Single `content.scss` file with retailer-specific sections for consistent theming
- **Background Service Worker**: Handles Goodreads API calls and data caching

#### Handler Implementation Pattern
```typescript
export class RetailerHandler implements RetailerHandler {
  name = 'RetailerName';
  matches(url: string): boolean { /* URL pattern matching */ }
  handle(document: Document): void { /* Page processing logic */ }
}
```

#### Unified Processing Architecture (PChome)
Modern PChome implementation uses unified processing that handles both static and dynamic content:

```typescript
handle(document: Document): void {
  // Add retailer theme class
  document.body.classList.add('bra-retailer-pchome');
  
  // Process current page content
  this.processBookDetails();  // Only runs on detail pages
  this.processBookLists();    // Always processes book listings
  
  // Start monitoring for dynamic changes
  this.startObserver();
}
```

Key benefits:
- **Single Observer**: One MutationObserver handles all content changes
- **Smart URL Detection**: `processBookDetails()` only executes on detail page URLs
- **Set-based Deduplication**: Prevents processing the same container multiple times
- **SPA Compatibility**: Handles JavaScript navigation without page reloads

#### Key Development Practices
- **DOM Manipulation**: Use MutationObserver for dynamically loaded content
- **Performance**: Process only visible elements, mark processed items with `bra-processed` class
- **Error Handling**: Graceful fallbacks when book data is incomplete or missing
- **Caching**: Background script manages Goodreads data caching and cleanup
- **Logging**: Use Logger utility with appropriate log levels:
  - `Logger.info()` - Essential status (always visible)
  - `Logger.error()` - Critical errors (always visible)
  - `Logger.warn()` - Important warnings (always visible)
  - `Logger.debug()` - Detailed debugging (development only)
  - `Logger.trace()` - Verbose tracing (development only)

### Retailer-Specific Implementation Notes

#### PChome Handler Architecture
- **Unified Processing**: Single handler processes both detail pages and book listings with shared logic
- **SPA Navigation Support**: Handles JavaScript-based page navigation without full page reloads
- **Price Parsing**: Robust currency handling for formats like "$238" and "$6,451"
- **Dynamic Content**: MutationObserver monitors DOM changes for lazy-loaded content
- **Deduplication**: Set-based container processing prevents duplicate rating injections

#### Other Retailers
- **Kobo**: Handle book detail pages, listings, search results, and homepage with MutationObserver for dynamic content
- **博客來**: Complex DOM structure, monitor for async content loading
- **讀冊**: Multiple page types, check for dynamic content updates

## Development Workflow

### Extension Development
```bash
cd chrome_extension
npm run start          # Development mode with hot reload
npm run build          # Production build
npm run pack:zip       # Create distribution zip
```

### Testing Guidelines

#### Chrome Extension Testing
- **Unit Tests**: Jest with jsdom environment and comprehensive coverage reporting
- **Test Structure**: Unit tests in `src/utils/__tests__/` with mocked Chrome APIs
- **Coverage**: HTML and LCOV reports generated in `coverage/` directory
- **Commands**: `npm test` (watch mode), `npm run test:coverage` (full coverage)

#### E2E Testing (Playwright)
- **Framework**: Playwright with Chromium, loads the extension from `dist/` as unpacked
- **One spec**: `e2e/rating-display.spec.ts`. The `PAGES` list at the top has one row per store page (list and detail for Kobo, PChome, 博客來, 讀冊). Add a row to cover a new page.
- **Command**: `npm run build && npm run test:e2e` (use `rm -rf dist .parcel-cache` first if a stale build file lingers)
- **Headless**: Runs with `channel: 'chromium'` and `headless: true`, so no window opens. A desktop Chrome user agent and `--disable-blink-features=AutomationControlled` keep Kobo's bot filter happy.
- **Goodreads is stubbed** in the store checks. A fixed search page answers every request, so the store checks do not depend on real Goodreads.
- **Real Goodreads check**: One separate test, `Goodreads search returns ratings`, searches three books. It skips when Goodreads challenges every search. It fails when Goodreads answers but the parser finds nothing.
- **Each store row checks**: the final URL is in the manifest site list, books are found (`.bra-processed`), and enough ratings are drawn (3 on list pages, 1 on detail pages). Failure messages say what to fix.
- **Run it from a Taiwan network.** Kobo and 博客來 block overseas and data-center addresses, so the store checks fail on GitHub runners or overseas servers.


#### Daily Goodreads check (GitHub Actions + UptimeRobot)
- **What runs**: `.github/workflows/goodreads-check.yml` runs once a day on GitHub. It searches the real Goodreads site once and parses the page with `parseGoodreadsSearch`.
- **Red means**: Goodreads answered but the page no longer parses. Ratings stop showing for everyone. Fix the selectors in `src/utils/GoodreadsSearch.ts`.
- **A bot challenge is not red**: the test retries 3 times, 60 seconds apart, then passes with a warning.
- **Alerts**: UptimeRobot watches the workflow badge and sends email and iPhone push. No secrets are stored anywhere.
- **Not covered**: store page changes. Those pages block data-center machines, so run `npm run test:e2e` by hand from a Taiwan network.
- **By hand**: `npx jest --testPathPattern='GoodreadsSearch\.live' --testPathIgnorePatterns='/node_modules/'` (normal `npm test` skips it).

#### Manual Testing Checklist
- Test extension on all supported retailer websites (Kobo, PChome, 博客來, 讀冊)
- Verify both Chinese and English book title handling
- Check rating display across different page layouts and responsive designs
- Test caching behavior and storage cleanup functionality
- Verify MutationObserver behavior on dynamic content loading
- Test error handling when Goodreads data is unavailable
- **PChome Specific**: Test SPA navigation on detail pages loaded via JavaScript
- **PChome Specific**: Verify currency parsing for prices like "$238" and "$6,451"
- **PChome Specific**: Check duplicate prevention on dynamically loaded book lists

### Chrome Web Store Publishing
- **CLI Tool**: `chrome-webstore-upload-cli` for automated upload and publish
- **Credentials**: OAuth2 credentials stored in `chrome_extension/.env` (gitignored)
- **Setup**: See `chrome_extension/.env.sample` for required variables (EXTENSION_ID, CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)
- **One-command release**: `npm run release` (builds, zips, uploads, publishes)
- **Individual steps**: `npm run cws:upload` and `npm run cws:publish`
- **Note**: Publishing triggers Chrome Web Store review (hours to days)
- **Version**: Must bump `version` in `src/manifest.json` before each upload

## Common Commands

### Chrome Extension Commands
```bash
cd chrome_extension
npm run start          # Development mode with Parcel hot reload (all logs)
npm run build:dev      # Development build (all logs)
npm run build          # Production build (essential logs only)
npm run clean          # Clean Parcel cache and dist folder
npm test               # Run Jest tests in watch mode
npm run test:coverage  # Generate test coverage reports
npm run test:e2e       # Run the Playwright rating-display check (headless)
npm run pack:zip       # Create distribution zip file
npm run release        # Build + zip + upload + publish to Chrome Web Store
```

## Key Features Implementation
- **Multi-language Support**: Handle Chinese titles by searching English subtitles
- **Smart Caching**: Remove old/unpopular book data to optimize storage
- **Performance**: Only process visible book elements to avoid slowdowns
- **Cross-site Integration**: Inject ratings seamlessly into existing retailer layouts
- **SPA Navigation**: Handle JavaScript-based page transitions without full reloads
- **Currency Parsing**: Robust price extraction supporting various formats ($238, $6,451)
- **Duplicate Prevention**: Set-based container deduplication and rating wrapper detection

## Known Issues & Gotchas

### Book Title Prefixes
- Retailer sites prepend platform names to book titles (e.g., PChome adds "Kobo " to Kobo ebook titles)
- `BookUtils.cleanBookTitle()` must strip these prefixes, otherwise Goodreads search returns 0 results
- Currently handled: `Kobo`, `HyRead`, `Readmoo 讀墨`, `Pubu電子書`, `讀墨電子書`, `電子書`
- **When adding new retailer support**: Check if the retailer prepends any prefix to book titles

### Goodreads Scraping
- Background script scrapes `goodreads.com/search` HTML using Cheerio
- Key selectors: `table.tableList`, `a.bookTitle`, `.minirating`
- Rating regex: `/(\d+\.\d{2}) avg rating — ([\d,]+) rating/`
- **If ratings stop working**: First check if Goodreads changed their search page HTML structure
- Chinese book titles often return 0 results on Goodreads; the code falls back to English subtitle if available

### Retailer DOM Changes
- Retailers (especially PChome) use React/Next.js with SSR — DOM structure can change without notice
- Content is often loaded dynamically; always verify selectors against the **rendered** DOM, not raw HTML
- Use the Playwright check (`npm run test:e2e`) to quickly verify all 4 retailers still work

## Debugging Tips

### Chrome Extension Debugging
- **Content Scripts**: Use Chrome DevTools Sources tab, set breakpoints in injected scripts
- **Background Script**: Open extension details → Inspect views → service worker
- **API Calls**: Monitor background script console for Goodreads API logs
- **Storage**: Test caching with `chrome.storage.local.get(null, console.log)` in DevTools
- **Network**: Check Network tab for failed requests to book retailer APIs
- **DOM Issues**: Use Elements tab to verify rating injection and CSS class application

## Repository Information
- **Author**: Up Chen <hi.upchen@gmail.com>
- **License**: GPL-3.0
- **Repository**: https://github.com/hi-upchen/book-ratings-aggregator