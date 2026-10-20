import { test, expect, chromium, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { searchGoodreads } from '../src/utils/GoodreadsSearch';

// Every page the extension must work on. Add a row to cover a new page.
// Keep the URLs stable: bestseller lists, search pages and famous translated books.
type PageSpec = {
  store: 'Kobo' | 'PChome' | '博客來' | '讀冊';
  kind: 'list' | 'detail';
  url: string;
  handlerDir: 'kobo' | 'pchome' | 'bokelai' | 'taaze';
  // Names the page in the test title when one store has two pages of the same kind.
  label?: string;
};

const PAGES: PageSpec[] = [
  { store: 'Kobo', kind: 'list', url: 'https://www.kobo.com/tw/zh/ebooks', handlerDir: 'kobo' },
  { store: 'Kobo', kind: 'detail', url: 'https://www.kobo.com/tw/zh/ebook/pGo8y2e4ET6pdObwFQDfkg', handlerDir: 'kobo' },
  { store: 'PChome', kind: 'list', url: 'https://24h.pchome.com.tw/search/%E5%8E%9F%E5%AD%90%E7%BF%92%E6%85%A3', handlerDir: 'pchome' },
  { store: 'PChome', kind: 'list', url: 'https://24h.pchome.com.tw/store/DJAA', handlerDir: 'pchome', label: 'store' },
  { store: 'PChome', kind: 'list', url: 'https://24h.pchome.com.tw/store/DJAA04', handlerDir: 'pchome', label: 'category' },
  { store: 'PChome', kind: 'detail', url: 'https://24h.pchome.com.tw/books/prod/DJBP1G-A900C7B2Q', handlerDir: 'pchome' },
  { store: '博客來', kind: 'list', url: 'https://www.books.com.tw/web/sys_bbotm/books/010101', handlerDir: 'bokelai' },
  { store: '博客來', kind: 'detail', url: 'https://www.books.com.tw/products/0011060642', handlerDir: 'bokelai' },
  { store: '讀冊', kind: 'list', url: 'https://www.taaze.tw/', handlerDir: 'taaze' },
  { store: '讀冊', kind: 'detail', url: 'https://www.taaze.tw/products/11100876604.html', handlerDir: 'taaze' },
];

const MIN_RATINGS = { list: 3, detail: 1 };
const WAIT_MS = 20000;

const EXTENSION_PATH = path.resolve(__dirname, '../dist');
const FIXTURE_PATH = path.resolve(__dirname, '../src/utils/__tests__/fixtures/goodreads-search.html');
const MANIFEST_PATH = path.resolve(__dirname, '../src/manifest.json');

// Turns a manifest match pattern such as "https://www.kobo.com/*" into a RegExp.
function matchPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function readManifestSitePatterns(): RegExp[] {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  return manifest.content_scripts[0].matches.map(matchPatternToRegExp);
}

// This test talks to the real Goodreads from Node. It needs no extension.
test('Goodreads search returns ratings', async () => {
  const results = await Promise.all(
    ['Atomic Habits', 'Sapiens', '1984'].map((query) => searchGoodreads(query))
  );
  test.skip(
    results.every((result) => result === null),
    'Goodreads challenged every search; not a code failure'
  );
  const parsed = results.filter((result) => result && result.found && result.rating);
  expect(
    parsed.length,
    'Goodreads answered but the page could not be parsed — its search page changed. Fix: selectors in src/utils/GoodreadsSearch.ts'
  ).toBeGreaterThan(0);
});

let context: BrowserContext;
let stubHits = 0;

// Each store test gets its own context and profile.
// The extension caches ratings by title, so a shared profile would skip searches.
test.beforeEach(async () => {
  const fixture = fs.readFileSync(FIXTURE_PATH, 'utf8');
  // An empty user data dir gives a fresh profile on every run.
  context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'zh-TW',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--disable-blink-features=AutomationControlled',
    ],
  });
  // This route also catches the extension's own background requests.
  // It answers searches with the fixture and blocks every other Goodreads URL.
  // So the extension can never send real traffic to Goodreads.
  await context.route('https://www.goodreads.com/**', (route) => {
    if (new URL(route.request().url()).pathname === '/search') {
      stubHits += 1;
      return route.fulfill({ status: 200, contentType: 'text/html', body: fixture });
    }
    return route.abort();
  });
});

test.afterEach(async () => {
  await context.close();
});

for (const { store, kind, url, handlerDir, label } of PAGES) {
  test(`${store} ${label ?? kind} page shows ratings`, async () => {
    const page = await context.newPage();
    const hitsBefore = stubHits;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const finalUrl = page.url();
      expect(
        readManifestSitePatterns().some((pattern) => pattern.test(finalUrl)),
        `${store} ${kind} page: landed on ${finalUrl}, outside the extension's site list. Fix: open the page by hand; check manifest.json content_scripts.matches`
      ).toBe(true);

      await expect(
        page.locator('.bra-processed'),
        `${store} ${kind} page: no books found — the store's layout changed. Fix: selectors in src/content/retailers/${handlerDir}/handler.ts`
      ).not.toHaveCount(0, { timeout: WAIT_MS });

      const min = MIN_RATINGS[kind];
      const scores = page.locator('.bra-rating-wrapper .bra-rating-score:visible');
      try {
        await expect.poll(() => scores.count(), { timeout: WAIT_MS }).toBeGreaterThanOrEqual(min);
      } catch {
        const n = await scores.count();
        expect(
          n,
          `${store} ${kind} page: books found but only ${n} ratings drawn (need ${min}). Fix: rating insertion in src/content/retailers/${handlerDir}/handler.ts`
        ).toBeGreaterThanOrEqual(min);
      }

      const hits = stubHits - hitsBefore;
      console.log(`${store} ${kind}: ${hits} Goodreads searches reached the stub`);
      expect(
        hits,
        `${store} ${kind} page: the extension made no Goodreads search that reached the test stub. Fix: check that context.route still intercepts the extension service worker in this Playwright version`
      ).toBeGreaterThan(0);

      // The fixture's rating is 4.30. Seeing it proves the stub supplied the rating.
      await expect(
        page.locator('.bra-rating-wrapper .bra-rating-score:visible').first(),
        `${store} ${kind} page: the first drawn rating is not the stub's 4.30. Fix: check that context.route still intercepts the extension service worker in this Playwright version`
      ).toContainText(/4\.3/);
    } finally {
      await page.close();
    }
  });
}
