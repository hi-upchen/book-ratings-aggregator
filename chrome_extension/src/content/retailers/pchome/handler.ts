import { RetailerHandler } from 'utils/ContentRouter';
import { ChromeMessagingService, BookData } from 'utils/ChromeMessagingService';
import * as BookUtils from 'utils/BookUtils';

/**
 * PChome e-commerce retailer handler for processing book pages and injecting Goodreads ratings.
 * Supports book detail pages, store listings, region pages, and new arrival pages.
 */
export class PChomeHandler implements RetailerHandler {
  name = 'PChome';

  /**
   * Determines if this handler should process the given URL.
   * @param url - The URL to check
   * @returns True if the URL is a PChome books website
   */
  matches(url: string): boolean {
    return /24h\.pchome\.com\.tw/.test(url);
  }

  /**
   * Main entry point for processing PChome pages.
   * Unified approach that processes both detail content and book listings.
   * @param document - The document to process
   */
  handle(document: Document): void {
    console.log('PChomeHandler: Handling page', location.href);
    
    // Add retailer theme class
    document.body.classList.add('bra-retailer-pchome');
    
    // Process current page content
    this.processBookDetails();
    this.processBookLists();
    
    // Start monitoring for dynamic changes
    this.startObserver();
  }

  /**
   * Processes detail page content if we're on a detail page URL.
   * Only handles the main book detail, not book listings.
   */
  private processBookDetails(): void {
    // Only process if we're on a detail page URL
    if (!/24h\.pchome\.com\.tw\/books\/prod.*/.test(location.href)) {
      return;
    }

    const bookContainer = document.querySelector('#ProdBriefing');
    
    if (!bookContainer || bookContainer.classList.contains('bra-processed')) {
      return;
    }

    // Mark as processed to prevent duplicates
    bookContainer.classList.add('bra-processed');
    const bookData = this.extractBookData(bookContainer as HTMLElement);

    console.log('PChomeHandler: Extracted book data', bookData);

    if (!bookData) {
      console.error('PChomeHandler: Unable to extract book data from detail page');
      return;
    }

    ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
      if (response.found) {
        this.renderDetailPageBookRating(bookContainer, response);
      }
    });
  }


  /**
   * Processes all book lists on the current page using generic link finding.
   * Uses Set-based deduplication to prevent processing the same container multiple times.
   */
  private processBookLists(): void {
    // Add retailer theme class if not present
    if (!document.body.classList.contains('bra-retailer-pchome')) {
      document.body.classList.add('bra-retailer-pchome');
    }

    // Find all PChome book links using generic pattern
    const bookLinks = document.querySelectorAll('a[href*="/prod/"]');

    // Collect unique containers using Set
    const uniqueContainers = new Set<Element>();

    bookLinks.forEach((linkEl: Element) => {
      const href = linkEl.getAttribute('href') || '';
      const bookContainer = linkEl.closest('.swiper-slide') ||
        linkEl.closest('.c-listInfoGrid__item') ||
        linkEl.parentElement;

      // Determine if link should be processed
      let shouldInclude = false;
      if (href.includes('/books/prod/')) {
        shouldInclude = true;
      } else if (href.includes('/prod/')) {
        shouldInclude = bookContainer?.textContent?.includes('電子書') || false;
      }

      if (!shouldInclude) return;

      // Add container to set if not already processed
      if (bookContainer && !bookContainer.classList.contains('bra-processed')) {
        uniqueContainers.add(bookContainer);
      }
    });

    // Process each unique container once
    uniqueContainers.forEach(container => {
      this.processBookListItem(container);
    });
  }

  /**
   * Sets up a MutationObserver to monitor for dynamically loaded content.
   * Processes both detail content and book listings when DOM changes occur.
   */
  private startObserver(): void {
    // Use MutationObserver to watch for dynamically loaded content
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // When DOM changes, re-process everything
          this.processBookDetails(); // Will only process if on detail URL
          this.processBookLists();   // Always process book listings
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also process any content that loads shortly after (delayed for dynamic content)
    setTimeout(() => {
      this.processBookDetails();
      this.processBookLists();
    }, 100);
  }

  /**
   * Processes an individual book item from a list or container.
   * Extracts book metadata and fetches Goodreads rating if available.
   * @param bookEl - The DOM element containing the book information
   */
  private processBookListItem(bookEl: Element): void {
    // Skip if already processed
    if (bookEl.classList.contains('bra-processed')) {
      return;
    }

    // Mark as processed at the start to prevent duplicates
    bookEl.classList.add('bra-processed');

    const bookData = this.extractBookData(bookEl as HTMLElement);
    if (!bookData) {
      return;
    }

    ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
      if (response.found) {
        this.renderBookListItemRating(bookEl, response);
      }
    });
  }

  /**
   * Extracts book data from a list item container.
   * @param bookContainer - The book container element
   * @returns BookData object or null if extraction fails
   */
  private extractBookData(bookContainer: HTMLElement): BookData | null {
    // Extract book information using flexible selectors
    let originalBookTitle: string | null = null;
    let bookTitle: string | null = null;
    let author: string | null = null;
    let bookUrl: string | null = null;
    let isbn: string | null = null;
    let thumbnailUrl: string | undefined = undefined;
    let price: number | undefined = undefined;

    // Try multiple selectors for title
    const titleSelectors = ['.c-prodInfoV2__title', 'h1'];
    for (const selector of titleSelectors) {
      const titleEl = bookContainer.querySelector(selector);
      if (titleEl?.textContent?.trim()) {
        originalBookTitle = titleEl.textContent.trim();
        bookTitle = BookUtils.cleanBookTitle(titleEl.textContent.trim());
        break;
      }
    }

    // Try multiple selectors for thumbnail
    const thumbnailSelectors = ['.c-prodInfoV2__img img', '.swiper-wrapper img', 'img'];
    for (const selector of thumbnailSelectors) {
      const imgEl = bookContainer.querySelector(selector);
      if (imgEl?.getAttribute('src')) {
        thumbnailUrl = imgEl.getAttribute('src') || undefined;
        break;
      }
    }

    // Try multiple selectors for price (prioritize --m variant)
    const priceSelectors = [
      '.c-prodInfoV2__priceValue--m',
      '.c-prodInfoV2__priceBar .c-prodInfoV2__priceValue',
      '.c-prodInfoV2__priceBar .o-prodPrice__price',
      '.o-prodPrice__price'
    ];
    for (const selector of priceSelectors) {
      const priceEls = bookContainer.querySelectorAll(selector);
      if (priceEls.length > 0) {
        const priceText = (priceEls[priceEls.length - 1] as HTMLElement).textContent;
        price = priceText ? parseInt(priceText.replace(/[$,]/g, ''), 10) : undefined;
        break;
      }
    }

    // Extract URL
    const linkEl = bookContainer.querySelector('a[href*="/prod/"]');
    if (linkEl) {
      bookUrl = linkEl.getAttribute('href') || '';
    } else if (/24h\.pchome\.com\.tw\/books\/prod/.test(location.href)) {
      // If no link found but we're on a book detail page, use current URL
      bookUrl = location.href;
    } else {
      bookUrl = '';
    }

    if (!bookTitle) return null;

    return {
      source: 'pchome',
      title: bookTitle,
      author: author || undefined,
      url: bookUrl,
      thumbnailUrl,
      price,
      currency: 'TWD',
      format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
      isbn: isbn || undefined
    };
  }

  /**
   * Renders the Goodreads rating on a book detail page.
   * @param bookContainer - The container element for the book
   * @param goodreads - The Goodreads rating data
   */
  private renderDetailPageBookRating(bookContainer: Element, goodreads: any): void {
    const targetElement = document.querySelector('.c-blockCombine--priceGray');

    if (targetElement) {
      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
      const ratingContainer = document.createElement('div');
      ratingContainer.classList.add('bra-rating-wrapper');
      ratingContainer.appendChild(ratingEl);

      targetElement.insertAdjacentElement('beforebegin', ratingContainer);
    } else {
      console.warn('No suitable insertion point found for detail page book rating');
    }
  }

  /**
   * Renders the Goodreads rating for a book list item using adaptive insertion strategies.
   * @param bookEl - The book container element
   * @param goodreads - The Goodreads rating data
   */
  private renderBookListItemRating(bookEl: Element, goodreads: any): void {
    // Try multiple insertion strategies based on container structure
    const insertionStrategies = [
      // Grid layout strategy
      { selector: '.c-prodInfoV2__priceBar', position: 'beforebegin' as const },
      { selector: null, position: 'beforeend' as const }
    ];

    for (const strategy of insertionStrategies) {
      const targetElement = strategy.selector ?
        bookEl.querySelector(strategy.selector) :
        bookEl;

      if (targetElement) {
        // Check if rating wrapper already exists to prevent duplicates
        const existingRating = targetElement.querySelector('.bra-rating-wrapper') ||
          targetElement.parentElement?.querySelector('.bra-rating-wrapper');
        if (existingRating) {
          console.log('Rating already exists, skipping insertion for:', goodreads.title, 'targetElement', targetElement);
          break;
        }

        const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
        const ratingContainer = document.createElement('div');
        ratingContainer.classList.add('bra-rating-wrapper');
        ratingContainer.appendChild(ratingEl);

        targetElement.insertAdjacentElement(strategy.position, ratingContainer);
        // console.log('Inserted book list item rating for:', goodreads.title, targetElement);
        break;
      }
    }
  }
}