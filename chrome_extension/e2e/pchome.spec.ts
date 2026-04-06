import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../dist');
const PCHOME_PROMOTION_URL = 'https://24h.pchome.com.tw/promotion/PR26033000063206?region=DJBQ';

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('PChome promotion page: extension injects ratings for Kobo ebooks', async () => {
  const page = await context.newPage();
  await page.goto(PCHOME_PROMOTION_URL, { waitUntil: 'domcontentloaded' });

  // Wait for PChome to render book items (React SSR + hydration)
  await page.waitForSelector('.c-prodInfoV2__title', { timeout: 15000 });

  // Wait for extension to process books and inject ratings
  // The extension marks processed items with 'bra-processed' class
  await page.waitForSelector('.bra-processed', { timeout: 15000 });

  const processedCount = await page.locator('.bra-processed').count();
  console.log(`Processed book items: ${processedCount}`);
  expect(processedCount).toBeGreaterThan(0);

  // Check if any rating wrappers were injected
  // Give extra time for Goodreads API responses
  await page.waitForTimeout(5000);

  const ratingCount = await page.locator('.bra-rating-wrapper').count();
  console.log(`Rating wrappers injected: ${ratingCount}`);

  // Take screenshots for visual verification
  await page.screenshot({ path: 'e2e/screenshots/pchome-promotion.png', fullPage: false });

  // Scroll to book grid area and take a closer screenshot
  await page.locator('.c-listInfoGrid').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/pchome-promotion-books.png', fullPage: false });

  // At least some books should have ratings
  expect(ratingCount).toBeGreaterThan(0);

  // Verify rating content structure
  const firstRating = page.locator('.bra-rating-wrapper').first();
  await expect(firstRating.locator('.bra-rating-score')).toBeVisible();
  await expect(firstRating.locator('.bra-rating-count')).toBeVisible();
});
