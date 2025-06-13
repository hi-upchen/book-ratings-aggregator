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
    console.log('KoboHandler: Handling page', location.href);
    if (/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/.test(location.href)) {
      this.handleBookDetailPage();
    } else if (/^https:\/\/www\.kobo\.com\/[a-z]{2}\/[a-z]{2}.*/.test(location.href)) {
      // Homepage pattern like https://www.kobo.com/tw/zh
      this.handleHomePage();
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

  private handleHomePage(): void {
    console.log('handleHomePage');
    
    // Use MutationObserver to wait for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.processHomepageBooks();
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also process any books that are already loaded
    setTimeout(() => {
      this.processHomepageBooks();
    }, 1000);

    // Stop observing after 30 seconds
    setTimeout(() => {
      observer.disconnect();
    }, 30000);
  }

  private processHomepageBooks(): void {
    // Use generic approach - find any links that contain '/ebook/' (book detail links)
    const bookLinks = document.querySelectorAll('a[href*="/ebook/"]');
    console.log(`Found ${bookLinks.length} ebook links on homepage`);
    
    let processedCount = 0;
    
    bookLinks.forEach((linkEl: Element) => {
      const bookContainer = linkEl.closest('div, article, section, li') || linkEl.parentElement;
      if (bookContainer && !bookContainer.classList.contains('bra-processed')) {
        this.processHomepageBookItem(bookContainer);
        processedCount++;
      }
    });
    
    if (processedCount > 0) {
      console.log(`Processed ${processedCount} new homepage books`);
    }
  }

  private processHomepageBookItem(bookEl: Element): void {
    // Skip if already processed or if rating already exists
    if (bookEl.classList.contains('bra-processed') || 
        bookEl.querySelector('.kobo-homepage-rating')) {
      return;
    }
    
    // Mark as processed at the start to prevent duplicates
    bookEl.classList.add('bra-processed');

    // Try to extract book information from various possible structures
    let bookTitle: string | null = null;
    let bookUrl: string | null = null;
    let author: string | null = null;

    // Try multiple selectors for title
    const titleSelectors = ['.title', '.book-title', 'h3', 'h4', '[data-title]', '.product-title'];
    for (const titleSelector of titleSelectors) {
      const titleEl = bookEl.querySelector(titleSelector);
      if (titleEl) {
        bookTitle = titleEl.textContent?.trim() || null;
        if (bookTitle) break;
      }
    }

    // Try to find the book URL
    const linkEl = bookEl.querySelector('a') || findClosestAnchorElement(bookEl);
    if (linkEl) {
      const href = linkEl.getAttribute('href');
      bookUrl = href ? (href.startsWith('/') ? getCurrentPageRootUrl() + href : href) : null;
    }

    // Try to find author
    const authorSelectors = ['.author', '.contributor', '.by-author', '[data-author]'];
    for (const authorSelector of authorSelectors) {
      const authorEl = bookEl.querySelector(authorSelector);
      if (authorEl) {
        author = authorEl.textContent?.trim() || null;
        if (author) break;
      }
    }

    if (bookTitle) {
      bookTitle = BookUtils.cleanBookTitle(bookTitle);
      
      const bookData: BookData = {
        source: 'kobo',
        title: bookTitle,
        author: author || undefined,
        url: bookUrl || location.href,
        format: 'ebook'
      };

      ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
        if (response.found) {
          this.renderHomepageBookRating(bookEl, response);
        }
      });
    }
  }

  private renderHomepageBookRating(bookEl: Element, goodreads: any): void {
    // Find the best place to insert the rating
    let targetElement: Element | null = null;
    
    // Try to find existing rating or a good insertion point
    const insertionSelectors = [
      '[data-testid="rating"]', // After the kobo rating
      '[data-testid="spotlight-rating"]', // The homepage spotlight book rating
      '[data-testid="carousel-card-contributors"]', // After the author section
      'div.kobo.star-rating'
    ];

    for (const selector of insertionSelectors) {
      targetElement = bookEl.querySelector(selector);
      if (targetElement) break;
    }

    if (targetElement) {
      // Create rating element
      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
      
      // Wrap in container with appropriate classes
      const ratingContainer = document.createElement('div');
      ratingContainer.classList.add('goodreads-ratings-summary', 'kobo-homepage-rating');
      ratingContainer.appendChild(ratingEl);

      // Insert the rating
      targetElement.insertAdjacentElement('afterend', ratingContainer);

      console.log('Inserted homepage book rating for:', goodreads.title, targetElement);
    } else {
      console.log('No suitable insertion point found for homepage book rating');
    }
  }
}