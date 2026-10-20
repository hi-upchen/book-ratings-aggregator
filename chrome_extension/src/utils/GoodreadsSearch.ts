import * as cheerio from 'cheerio';
import { RetrievedGoodreadsBookInfo } from '../types/RetrievedBookInfo';

// Reads the first book row of a Goodreads search page.
// Returns { found: false } when the page has no result row.
export function parseGoodreadsSearch(html: string): RetrievedGoodreadsBookInfo {
  const $ = cheerio.load(html);
  const row = $('table.tableList tr[itemtype="http://schema.org/Book"]').first();
  if (!row.length) {
    return { found: false };
  }

  let href: string | undefined;
  let title: string | undefined;
  row.find('a.bookTitle').each((index, element) => {
    href = $(element).attr('href');
    title = $(element).text().trim();
  });

  let rating: number | undefined;
  let numRatings: number | undefined;
  row.find('.minirating').each((index, element) => {
    const match = ($(element).text() || '').match(/(\d+\.\d{2}) avg rating — ([\d,]+) rating/);
    if (match) {
      rating = parseFloat(match[1]);
      numRatings = parseInt(match[2].replace(/,/g, ''), 10);
    }
  });

  return {
    found: true,
    rating,
    numRatings,
    url: 'https://www.goodreads.com' + href,
    title,
  };
}

// Searches Goodreads and parses the answer.
// Returns null when Goodreads did not answer normally (blocked, failed, or fetch threw).
// Callers must not cache a null result. A real "not found" is { found: false }.
export async function searchGoodreads(
  query: string,
  fetchImpl: typeof fetch = fetch
): Promise<RetrievedGoodreadsBookInfo | null> {
  try {
    const res = await fetchImpl('https://www.goodreads.com/search?q=' + encodeURIComponent(query));
    if (res.status !== 200) {
      return null;
    }
    return parseGoodreadsSearch(await res.text());
  } catch (e) {
    return null;
  }
}
