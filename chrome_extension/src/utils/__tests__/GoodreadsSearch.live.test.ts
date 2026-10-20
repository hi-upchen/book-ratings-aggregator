import { parseGoodreadsSearch } from '../GoodreadsSearch';

// This test searches the real Goodreads site once.
// It catches Goodreads changing its search page, which breaks every rating.
// Normal test runs skip it. The daily GitHub workflow runs it.

const SEARCH_URL = 'https://www.goodreads.com/search?q=The+Hobbit';
const TRIES = 3;
const WAIT_MS = 60_000;

// Fetches the search page. It returns null when Goodreads did not answer 200.
// Goodreads sometimes sends a bot challenge (HTTP 202) to data-center machines.
async function fetchSearchPage(): Promise<string | null> {
  try {
    const res = await fetch(SEARCH_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    return res.status === 200 ? await res.text() : null;
  } catch {
    return null;
  }
}

it('Goodreads search page still parses', async () => {
  let html: string | null = null;
  for (let i = 1; i <= TRIES && html === null; i++) {
    html = await fetchSearchPage();
    if (html === null && i < TRIES) await new Promise(r => setTimeout(r, WAIT_MS));
  }

  // A challenge on every try is not a code problem, so the check stays green.
  if (html === null) {
    console.warn(`Goodreads did not answer 200 in ${TRIES} tries. Nothing was checked today.`);
    return;
  }

  const result = parseGoodreadsSearch(html);
  expect(result.found).toBe(true);
  expect(result.rating).toBeGreaterThan(0);
}, TRIES * WAIT_MS + 60_000);
