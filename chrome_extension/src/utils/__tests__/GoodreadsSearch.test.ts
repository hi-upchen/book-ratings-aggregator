import * as fs from 'fs';
import * as path from 'path';
import { parseGoodreadsSearch, searchGoodreads } from '../GoodreadsSearch';

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'goodreads-search.html'),
  'utf8'
);

describe('parseGoodreadsSearch', () => {
  it('parses rating, count, url and title from a real search page', () => {
    const result = parseGoodreadsSearch(fixtureHtml);
    expect(result.found).toBe(true);
    expect(result.rating).toBeGreaterThan(3.5);
    expect(result.rating).toBeLessThanOrEqual(5);
    expect(Number.isInteger(result.numRatings)).toBe(true);
    expect(result.numRatings).toBeGreaterThan(1000);
    expect(result.url).toMatch(/^https:\/\/www\.goodreads\.com\/book\/show\//);
    expect((result.title || '').length).toBeGreaterThan(0);
  });

  it('returns found false when there are no result rows', () => {
    expect(parseGoodreadsSearch('<html><body></body></html>')).toEqual({ found: false });
  });
});

describe('searchGoodreads', () => {
  it('returns null on a 202 challenge', async () => {
    const stub = jest.fn().mockResolvedValue(new Response('', { status: 202 }));
    expect(await searchGoodreads('Atomic Habits', stub as any)).toBeNull();
  });

  it('returns null when fetch throws', async () => {
    const stub = jest.fn().mockRejectedValue(new Error('network down'));
    expect(await searchGoodreads('Atomic Habits', stub as any)).toBeNull();
  });

  it('parses a 200 answer', async () => {
    const stub = jest.fn().mockResolvedValue(new Response(fixtureHtml, { status: 200 }));
    const result = await searchGoodreads('Atomic Habits', stub as any);
    expect(result && result.found).toBe(true);
    expect(stub).toHaveBeenCalledWith(
      'https://www.goodreads.com/search?q=Atomic%20Habits'
    );
  });
});
