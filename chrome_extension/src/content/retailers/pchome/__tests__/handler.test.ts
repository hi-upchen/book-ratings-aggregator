/**
 * @jest-environment jsdom
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

const sendMessage = chrome.runtime.sendMessage as jest.Mock;

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
  // Each handler watches the body and sets a short timer.
  // A fresh body and fake timers stop one test's handler from touching the next test.
  beforeEach(() => {
    jest.useFakeTimers();
    sendMessage.mockReset();
    const body = document.createElement('body');
    body.innerHTML = storeCardHtml;
    document.documentElement.replaceChild(body, document.body);
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
