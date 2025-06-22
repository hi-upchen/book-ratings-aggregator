import { RetailerHandler } from 'utils/ContentRouter';
import { ChromeMessagingService, BookData } from 'utils/ChromeMessagingService';
import * as BookUtils from 'utils/BookUtils';
import * as DomUtils from 'utils/DomUtils';
import Logger from 'utils/Logger';

/**
 * Bokelai (博客來) e-commerce retailer handler for processing book pages and injecting Goodreads ratings.
 * Supports book detail pages, category pages, homepage, search results, and activity pages.
 */
export class BokelaiHandler implements RetailerHandler {
  name = 'Bokelai (博客來)';

  /**
   * Determines if this handler should process the given URL.
   * @param url - The URL to check
   * @returns True if the URL is a Bokelai website
   */
  matches(url: string): boolean {
    return /www\.books\.com\.tw/.test(url) || /activity\.books\.com\.tw/.test(url);
  }

  /**
   * Main entry point for processing Bokelai pages.
   * Unified approach that processes both detail content and book listings.
   * @param document - The document to process
   */
  handle(document: Document): void {
    Logger.info('BokelaiHandler: Processing page', location.href);
    
    // Add retailer theme class
    document.body.classList.add('bra-retailer-bokelai');
    
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
    if (!/www\.books\.com\.tw\/products/.test(location.href)) {
      return;
    }

    const bookContainer = document.querySelector('.main_wrap');
    
    if (!bookContainer || bookContainer.classList.contains('bra-processed')) {
      return;
    }

    // Mark as processed to prevent duplicates
    bookContainer.classList.add('bra-processed');
    const bookData = this.extractBookData(bookContainer as HTMLElement);

    Logger.debug('BokelaiHandler: Extracted book data', bookData);

    if (!bookData) {
      Logger.error('BokelaiHandler: Unable to extract book data from detail page');
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
    if (!document.body.classList.contains('bra-retailer-bokelai')) {
      document.body.classList.add('bra-retailer-bokelai');
    }

    // Find all Bokelai book links using generic pattern
    const bookLinks = document.querySelectorAll('a[href*="/products/"]');

    // Collect unique containers using Set
    const uniqueContainers = new Set<Element>();

    bookLinks.forEach((linkEl: Element) => {
      const bookContainer = linkEl.closest('.item') ||
        linkEl.closest('.table_td') ||
        linkEl.closest('.mod_a') ||
        linkEl.closest('li') ||
        linkEl.closest('.alpha') ||
        linkEl.closest('.omega') ||
        linkEl.parentElement;

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
   * Extracts book data from a list item container or detail page.
   * @param bookContainer - The book container element
   * @returns BookData object or null if extraction fails
   */
  private extractBookData(bookContainer: HTMLElement): BookData | null {
    // Extract book information using flexible selectors
    let originalBookTitle: string | null = null;
    let bookTitle: string | null = null;
    let bookSubTitle: string | null = null;
    let author: string | null = null;
    let bookUrl: string | null = null;
    let isbn: string | null = null;
    let thumbnailUrl: string | undefined = undefined;
    let price: number | undefined = undefined;
    let format: string = 'physical';

    // Try multiple selectors for title
    const titleSelectors = [
      'h1',                        // Detail pages
      'h4',                        // Category pages, activity pages
      '.prod-name',                 // Homepage items
      'p a' // 瀏覽此商品的人，也瀏覽...
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = bookContainer.querySelector(selector);
      if (titleEl?.textContent?.trim()) {
        originalBookTitle = titleEl.textContent.trim();
        bookTitle = BookUtils.cleanBookTitle(titleEl.textContent.trim());
        break;
      }
    }

    // Try to find subtitle (mainly for detail pages)
    const subtitleEl = bookContainer.querySelector('h1')?.nextElementSibling;
    if (subtitleEl?.tagName.toLowerCase() === 'h2' && subtitleEl.textContent?.trim()) {
      bookSubTitle = BookUtils.cleanBookTitle(subtitleEl.textContent.trim());
    }

    // Try multiple selectors for author
    const authorSelectors = [
      '.type02_p003 ul li',        // Detail pages
      '.msg li',                   // Category pages
      '.list_details li'           // Activity pages
    ];
    for (const selector of authorSelectors) {
      const authorEls = bookContainer.querySelectorAll(selector);
      if (authorEls.length > 0) {
        for (const authorEl of authorEls) {
          const extractedAuthor = BookUtils.extractAuthorFromBookInfo(authorEl.textContent?.trim() || '');
          if (extractedAuthor) {
            author = extractedAuthor;
            break;
          }
        }
        if (author) break;
      }
    }

    // Try multiple selectors for price
    const priceSelectors = [
      '.price01',                  // Detail pages
      '.price_a strong',           // Category pages
      '.prod-price strong',        // Homepage
      '.list_details'              // Activity pages (extract from text)
    ];
    for (const selector of priceSelectors) {
      const priceEls = bookContainer.querySelectorAll(selector);
      if (priceEls.length > 0) {
        const priceEl = priceEls[priceEls.length - 1];
        let priceText = '';
        
        if (selector === '.list_details') {
          // For activity pages, extract price from the entire text
          priceText = BookUtils.extractPriceFromBookInfo(priceEl.textContent?.trim() || '');
        } else {
          priceText = BookUtils.extractPriceFromBookInfo(priceEl.textContent?.trim() || '');
        }
        
        price = priceText ? parseInt(priceText, 10) : undefined;
        if (price) break;
      }
    }

    // Try multiple selectors for thumbnail
    const thumbnailSelectors = [
      'img.cover',                 // Most pages
      'img.ban',                   // Activity pages
      'img'                        // Generic fallback
    ];
    for (const selector of thumbnailSelectors) {
      const imgEl = bookContainer.querySelector(selector);
      if (imgEl) {
        thumbnailUrl = imgEl.getAttribute('data-original') || 
                      imgEl.getAttribute('src') || 
                      undefined;
        if (thumbnailUrl) break;
      }
    }

    // Extract URL
    const linkEl = bookContainer.querySelector('a[href*="/products/"]');
    if (linkEl) {
      bookUrl = linkEl.getAttribute('href') || '';
      bookUrl = DomUtils.ensureAbsoluteUrl(bookUrl);
    } else if (/www\.books\.com\.tw\/products/.test(location.href)) {
      // If no link found but we're on a book detail page, use current URL
      bookUrl = location.href;
    } else {
      bookUrl = '';
    }

    // Extract ISBN (mainly for detail pages)
    const isbnElements = bookContainer.querySelectorAll('.bd li');
    if (isbnElements.length > 0) {
      for (const isbnEl of isbnElements) {
        const extractedIsbn = BookUtils.extractISBNFromBookInfo(isbnEl.textContent?.trim() || '');
        if (extractedIsbn) {
          isbn = extractedIsbn;
          break;
        }
      }
    }

    // Determine format from breadcrumb or title
    if (originalBookTitle) {
      format = BookUtils.resolveBookFormat(originalBookTitle) as string;
      
      // Additional format detection from breadcrumb
      const breadcrumbEls = bookContainer.querySelectorAll('#breadcrumb-trail li');
      if (breadcrumbEls.length > 0) {
        const breadcrumbTexts = Array.from(breadcrumbEls).map(el => el.textContent?.trim());
        const bookInfo = this.resolveBookInfoFromBreadcrumbText(breadcrumbTexts);
        if (bookInfo?.format) {
          format = bookInfo.format;
        }
        if (bookInfo?.isMagazine) {
          return null; // Skip magazines
        }
      }
    }

    if (!bookTitle) return null;

    return {
      source: 'bokelai',
      title: bookTitle,
      subtitle: bookSubTitle || undefined,
      author: author || undefined,
      url: bookUrl,
      thumbnailUrl,
      price,
      currency: 'TWD',
      format: format === 'digital' ? 'ebook' : 'physical',
      isbn: isbn || undefined
    };
  }

  /**
   * Renders the Goodreads rating on a book detail page.
   * @param bookContainer - The container element for the book
   * @param goodreads - The Goodreads rating data
   */
  private renderDetailPageBookRating(bookContainer: Element, goodreads: any): void {
    const targetElement = bookContainer.querySelector('h1')?.parentNode;

    if (targetElement) {
      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
      const ratingContainer = document.createElement('div');
      ratingContainer.classList.add('bra-rating-wrapper');
      ratingContainer.appendChild(ratingEl);

      targetElement.insertAdjacentElement('beforeend', ratingContainer);
    } else {
      Logger.warn('BokelaiHandler: No suitable insertion point found for detail page book rating');
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
      { selector: 'h4', position: 'afterend' as const },              // Category pages, activity pages
      { selector: '.prod-name', position: 'afterend' as const },      // Homepage items
      { selector: '.img-wrap', position: 'beforeend' as const },      // Homepage overlay
      { selector: null, position: 'beforeend' as const }              // Fallback
    ];

    for (const strategy of insertionStrategies) {
      const targetElement = strategy.selector ?
        bookEl.querySelector(strategy.selector) :
        bookEl;

      if (targetElement) {
        // Check if rating wrapper already exists to prevent duplicates
        const existingRating = targetElement.querySelector('.bra-rating-wrapper');
        if (existingRating) {
          Logger.trace('BokelaiHandler: Rating already exists, skipping insertion for:', goodreads.title);
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

  /**
   * Resolve the book info from breadcrumb texts
   * @param breadcrumbTexts Array of breadcrumb text strings
   * @returns Object with language, format, and magazine detection or null
   */
  private resolveBookInfoFromBreadcrumbText(breadcrumbTexts: Array<string | null | undefined>): 
    { 
      language: string, 
      format?: "digital" | "physical" | "audio",
      isMagazine: boolean
    } | null {

    if (!breadcrumbTexts || breadcrumbTexts.length === 0) {
      return null;
    }

    const bookBreadcrumbInfoMap: Record<string, any> = {
      "中文電子書": {language: 'zh-TW', format: 'digital', isMagazine: false},
      "中文書": {language: 'zh-TW', format: 'physical', isMagazine: false},
      "簡體書": {language: 'zh-CN', format: 'physical', isMagazine: false},
      "日文書．MOOK": {language: 'ja', format: 'physical', isMagazine: true},
      "中文雜誌": {language: 'zh-TW', format: 'physical', isMagazine: true},
      "電子雜誌": {language: 'zh-TW', format: 'digital', isMagazine: true},
      "有聲書": {language: 'zh-TW', format: 'audio', isMagazine: false},
      "外文書": {language: 'en-US', format: 'physical', isMagazine: false}
    };

    for (let key in bookBreadcrumbInfoMap) {
      const v = bookBreadcrumbInfoMap[key];
      
      for (let i = 0; i < breadcrumbTexts.length; i++) {
        if (breadcrumbTexts[i]?.includes(key)) {
          return v;
        }
      } 
    }

    return null;
  }
}