import { RetailerHandler } from 'utils/ContentRouter';
import { ChromeMessagingService, BookData } from 'utils/ChromeMessagingService';
import { getCurrentPageRootUrl, findClosestAnchorElement } from 'utils/DomUtils';
import * as BookUtils from 'utils/BookUtils';
import { 
  renderScore2KoboBookPage,
  renderScore2KoboBookBlock,
  renderScore2KoboSearhResultItem,
  extractRatingAndNumRatings,
  extractPriceAndCurrency
} from './utils';

export class KoboHandler implements RetailerHandler {
  name = 'Kobo';

  matches(url: string): boolean {
    return /www\.kobo\.com/.test(url);
  }

  handle(document: Document): void {
    if (/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/.test(location.href)) {
      this.handleBookDetailPage();
    } else {
      this.handleBookListPages();
    }
  }

  private handleBookDetailPage(): void {
    let bookTitle: string | null, bookSubTitle: string | null;
    
    const bookTitleEl = document.querySelector('.title.product-field');
    bookTitle = bookTitleEl ? bookTitleEl.textContent : null;
    bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

    const bookSubTitleEL = document.querySelector('.subtitle.product-field');
    bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null;
    bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null;

    let authorEl = document.querySelector('.contributor-name');
    let author = authorEl?.textContent;
    author = author ? author.trim() : null;

    if (bookTitle || bookSubTitle) {
      const bookData: BookData = {
        source: 'kobo',
        title: bookTitle || '',
        subtitle: bookSubTitle || undefined,
        author: author || undefined,
        url: location.href,
        format: 'ebook'
      };

      ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
        if (response.found) {
          renderScore2KoboBookPage({ goodreads: response });
        }
      });
    }
  }

  private handleBookListPages(): void {
    this.handleKoboBookList();
    this.handleKoboSearchList();
  }

  private handleKoboBookList(): void {
    console.log('handleKoboBookList');
    const bookDetailContainerEls = document.querySelectorAll('.book-details-container');

    bookDetailContainerEls.forEach((bookDetailContainerEl) => {
      let bookTitle: string | null;

      // fetch book title
      const bookTitleEl = bookDetailContainerEl.querySelector('.title');
      bookTitle = bookTitleEl ? bookTitleEl.textContent : null;
      bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

      // fetch author
      const authorEl = bookDetailContainerEl.querySelector('.attribution.product-field .contributor-name')
        || bookDetailContainerEl.querySelector('.attribution.product-field');

      let author = authorEl?.textContent;
      author = author ? author.trim() : null;

      // fetch link
      let hrefEl = findClosestAnchorElement(bookDetailContainerEl);
      let url = hrefEl ? getCurrentPageRootUrl() + hrefEl.getAttribute('href') : null;

      // fetch ratings & number of ratings
      let { rating, numRatings } = extractRatingAndNumRatings(hrefEl?.querySelector('.kobo.star-rating')?.getAttribute('aria-label')) || {};

      // fetch pricing
      let pricingEl = bookDetailContainerEl.querySelector('.product-field.price .alternate-price-style')
        || bookDetailContainerEl.querySelector('.product-field.price .price-value');
      let { price, currency } = extractPriceAndCurrency(pricingEl?.textContent) || {};

      // fetch thumbnailUrl
      let coverImgEl = hrefEl?.querySelector('img.cover-image');
      let thumbnailUrl = coverImgEl?.getAttribute('src');
      thumbnailUrl = thumbnailUrl && thumbnailUrl.startsWith('//') ? 'https:' + thumbnailUrl : thumbnailUrl;

      if (!bookTitle || bookTitle === '') {
        return;
      }

      const bookData: BookData = {
        source: 'kobo',
        title: bookTitle,
        author: author || undefined,
        url: url || '',
        thumbnailUrl: thumbnailUrl || undefined,
        rating: rating || undefined,
        numRatings: numRatings || undefined,
        price: price || undefined,
        currency: currency || undefined,
        format: 'ebook'
      };

      ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
        if (response.found) {
          renderScore2KoboBookBlock(bookDetailContainerEl, { goodreads: response });
        }
      });
    });

    // Monitor for dynamically loaded content
    this.monitorKoboBookList();
  }

  private monitorKoboBookList(): void {
    const checkKoboBookBlockElement = () => {
      const element = document.querySelector('.book-details-container');
      if (element) {
        clearInterval(interval);
        this.handleKoboBookList();
      }
    };

    const interval = setInterval(checkKoboBookBlockElement, 2000);
    setTimeout(() => {
      clearInterval(interval);
    }, 120000);
  }

  private handleKoboSearchList(): void {
    const listBookItemEls = document.querySelectorAll('.result-items .book');

    listBookItemEls.forEach(bookItemEl => {
      const bookTitleEl = bookItemEl.querySelector('.title');
      let bookTitle = bookTitleEl ? bookTitleEl.textContent : null;
      bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

      const bookSubTitleEL = bookItemEl.querySelector('.subtitle');
      let bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null;
      bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null;

      // fetch author
      const authorEl = bookItemEl.querySelector('.contributors.product-field .synopsis-text');
      let author = authorEl?.textContent;
      author = author ? author.trim() : null;

      // fetch link
      let hrefEl = bookItemEl.querySelector('.item-link-underlay');
      let url = hrefEl ? getCurrentPageRootUrl() + (hrefEl as HTMLElement).getAttribute('href') : null;

      // fetch ratings & number of ratings
      let { rating, numRatings } = extractRatingAndNumRatings(bookItemEl.querySelector('.kobo.star-rating')?.getAttribute('aria-label')) || {};

      // fetch pricing
      let pricingEl = bookItemEl.querySelector('.product-field.price .alternate-price-style')
        || bookItemEl.querySelector('.product-field.price .price-value');
      let { price, currency } = extractPriceAndCurrency(pricingEl?.textContent) || {};

      // fetch from json
      let thumbnailUrl: string | undefined, bookFormat: string | undefined;
      const scriptTag = bookItemEl.querySelector('script[type="application/ld+json"]');
      if (scriptTag) {
        try {
          const jsonDataString = scriptTag.textContent?.trim();
          if (jsonDataString) {
            const jsonData = JSON.parse(jsonDataString);

            url = jsonData.data?.url ? jsonData.data.url : url;

            thumbnailUrl = jsonData.data?.thumbnailUrl;
            thumbnailUrl = thumbnailUrl && thumbnailUrl.startsWith('//') ? 'https:' + thumbnailUrl : thumbnailUrl;

            bookFormat = jsonData.data?.bookFormat?.toLowerCase();
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
        }
      }

      if (!bookTitle || bookTitle === '') {
        return;
      }

      const bookData: BookData = {
        source: 'kobo',
        title: bookTitle,
        subtitle: bookSubTitle || undefined,
        author: author || undefined,
        url: url || '',
        thumbnailUrl: thumbnailUrl || undefined,
        rating: rating || undefined,
        numRatings: numRatings || undefined,
        price: price || undefined,
        currency: currency || undefined,
        format: bookFormat || 'ebook'
      };

      ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
        if (response.found) {
          renderScore2KoboSearhResultItem(bookItemEl, { goodreads: response });
        }
      });
    });
  }
}