/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "https://24h.pchome.com.tw/"}
 */
import * as fs from 'fs';
import * as path from 'path';
import { PChomeHandler } from '../handler';

// A real book card from a PChome store page.
// Its title sits in a span with a title attribute.
const storeCardHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'store-card.html'),
  'utf8'
);

// A real book card from the PChome computer books region page.
// Its link is /prod/... without /books/ and the card does not say 電子書.
const regionCardHtml = fs.readFileSync(
  path.join(__dirname, 'fixtures', 'region-card.html'),
  'utf8'
);

const sendMessage = chrome.runtime.sendMessage as jest.Mock;

// Puts the page at this PChome path with this HTML in a fresh body.
// Each handler watches the body, so a fresh body stops one test's handler from touching the next test.
function openPage(pathname: string, html: string): void {
  window.history.pushState({}, '', pathname);
  const body = document.createElement('body');
  body.innerHTML = html;
  document.documentElement.replaceChild(body, document.body);
}

// Makes the fake background script answer every lookup with this response.
function answerLookupsWith(response: object): void {
  sendMessage.mockImplementation((_message, _options, callback) => callback(response));
}

const foundRating = {
  found: true,
  title: 'Claude',
  rating: 4.3,
  numRatings: 1234,
  url: 'https://www.goodreads.com/book/show/1',
};

describe('PChomeHandler on a store page', () => {
  // Fake timers stop the handler's short timer from running in the next test.
  beforeEach(() => {
    jest.useFakeTimers();
    sendMessage.mockReset();
    openPage('/store/DJAA', storeCardHtml);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('looks up the book by the title in the store card', () => {
    answerLookupsWith({ found: false });
    new PChomeHandler().handle(document);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage.mock.calls[0][0].data.title).toBe('Claude 萬用手冊');
  });

  it('draws the rating above the price', () => {
    answerLookupsWith(foundRating);
    new PChomeHandler().handle(document);

    const wrapper = document.querySelector('.bra-rating-wrapper');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.nextElementSibling?.classList.contains('c-prodInfoV2__priceBar')).toBe(true);
  });

  it('draws nothing when Goodreads has no match', () => {
    answerLookupsWith({ found: false });
    new PChomeHandler().handle(document);

    expect(document.querySelector('.bra-rating-wrapper')).toBeNull();
  });

  it('sends no lookup for a card without a title', () => {
    document.body.innerHTML =
      '<div class="c-listInfoGrid__item"><a href="/books/prod/X"><img src="a.jpg"></a></div>';
    new PChomeHandler().handle(document);

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

describe('PChomeHandler on a region page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sendMessage.mockReset();
    answerLookupsWith(foundRating);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('looks up a book card on a books region page', () => {
    openPage('/region/DJAA', regionCardHtml);
    new PChomeHandler().handle(document);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    // The title cleaner drops the edition note （第二版）.
    expect(sendMessage.mock.calls[0][0].data.title).toBe(
      'Excel Power Pivot｜免VBA，也能讓Excel自動統計、分析資料'
    );
    expect(document.querySelector('.bra-rating-wrapper')).not.toBeNull();
  });

  it('sends no lookup for the same card on a region page that is not books', () => {
    openPage('/region/DIDI', regionCardHtml);
    new PChomeHandler().handle(document);

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('sends no lookup for a non-book product on a books region page', () => {
    openPage('/region/DJAA', regionCardHtml.replace(/DJAA2V-A900K4JLI/g, 'DIDI1A-A900K4JLI'));
    new PChomeHandler().handle(document);

    expect(sendMessage).not.toHaveBeenCalled();
  });
});
