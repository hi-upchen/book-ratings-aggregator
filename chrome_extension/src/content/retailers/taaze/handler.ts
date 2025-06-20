import { RetailerHandler } from 'utils/ContentRouter';
import { ChromeMessagingService, BookData } from 'utils/ChromeMessagingService';
import * as BookUtils from 'utils/BookUtils';
import * as DomUtils from 'utils/DomUtils';

/**
 * Taaze (讀冊) e-commerce retailer handler for processing book pages and injecting Goodreads ratings.
 * Supports book detail pages, listing pages, search results, homepage, and activity pages.
 */
export class TaazeHandler implements RetailerHandler {
  name = 'Taaze (讀冊)';

  /**
   * Determines if this handler should process the given URL.
   * @param url - The URL to check
   * @returns True if the URL is a Taaze website
   */
  matches(url: string): boolean {
    return /www\.taaze\.tw/.test(url) || /activity\.taaze\.tw/.test(url);
  }

  /**
   * Main entry point for processing Taaze pages.
   * Unified approach that processes both detail content and book listings.
   * @param document - The document to process
   */
  handle(document: Document): void {
    console.log('TaazeHandler: Handling page', location.href);
    
    // Add retailer theme class
    document.body.classList.add('bra-retailer-taaze');
    
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
    if (!/www\.taaze\.tw\/products/.test(location.href) && 
        !/www\.taaze\.tw\/usedList/.test(location.href)) {
      return;
    }

    const bookContainer = document.querySelector('h1#ga4ProdTitle')?.closest('.container') || document.body;
    
    if (!bookContainer || bookContainer.classList.contains('bra-processed')) {
      return;
    }

    // Mark as processed to prevent duplicates
    bookContainer.classList.add('bra-processed');
    const bookData = this.extractBookData(bookContainer as HTMLElement);

    console.log('TaazeHandler: Extracted book data', bookData);

    if (!bookData) {
      console.error('TaazeHandler: Unable to extract book data from detail page');
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
    if (!document.body.classList.contains('bra-retailer-taaze')) {
      document.body.classList.add('bra-retailer-taaze');
    }

    // Find all Taaze book links using generic pattern
    const bookLinks = document.querySelectorAll('a[href*="/products/"]');

    // Collect unique containers using Set
    const uniqueContainers = new Set<Element>();

    bookLinks.forEach((linkEl: Element) => {
      const bookContainer = linkEl.closest('.bookGrid') ||
        linkEl.closest('.talkelookGrid2') ||
        linkEl.closest('.avivid_item') ||
        linkEl.closest('.bookGridByListView') ||
        linkEl.closest('.listBookGrid') ||
        linkEl.closest('.bestSellArea') ||
        linkEl.closest('.info_frame') ||
        linkEl.closest('.act_products') ||
        linkEl.closest('.books') ||
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
      'h1#ga4ProdTitle',           // Detail pages
      '.prod_TitleMain',           // List/grid pages  
      '.avivid_item_title',        // Recommendation items
      'h4',                        // Search results
      '.nameDiv a',                // Activity pages
      'strong a',                  // Best sell area
      'a'                          // Generic fallback
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
    const subtitleEl = bookContainer.querySelector('.row h2');
    if (subtitleEl?.textContent?.trim()) {
      bookSubTitle = subtitleEl.textContent.trim();
    }

    // Try multiple selectors for author
    const authorSelectors = ['.authorBrand p', '.prod_author', '.author'];
    for (const selector of authorSelectors) {
      const authorEl = bookContainer.querySelector(selector);
      if (authorEl?.textContent?.trim()) {
        author = BookUtils.extractAuthorFromBookInfo(authorEl.textContent.trim());
        if (author) break;
      }
    }

    // Try multiple selectors for price
    const priceSelectors = [
      '.price',                    // Detail pages
      '.discPrice',                // Most list pages
      '.discPrice1',               // Search pages
      '.avivid_sale_price'         // Recommendation items
    ];
    for (const selector of priceSelectors) {
      const priceEl = bookContainer.querySelector(selector);
      if (priceEl?.textContent?.trim()) {
        const priceText = BookUtils.extractPriceFromBookInfo(priceEl.textContent.trim());
        price = priceText ? parseInt(priceText, 10) : undefined;
        if (price) break;
      }
    }

    // Try multiple selectors for thumbnail
    const thumbnailSelectors = [
      'div.col-sm-8.col-md-9 > div > div:nth-child(1) > a > img:nth-child(1)', // Detail page
      'img',                       // Generic image
      '.cover_frame',              // Search pages
      '.avivid_other_image'        // Recommendation items
    ];
    for (const selector of thumbnailSelectors) {
      const imgEl = bookContainer.querySelector(selector);
      if (imgEl) {
        if (imgEl.getAttribute('src')) {
          thumbnailUrl = imgEl.getAttribute('src') || undefined;
          break;
        }
        // Handle background images
        const style = imgEl.getAttribute('style');
        if (style) {
          const match = style.match(/url\(['"](.+?)['"]\)/);
          if (match) {
            thumbnailUrl = match[1];
            break;
          }
        }
      }
    }

    // Extract URL
    const linkEl = bookContainer.querySelector('a[href*="/products/"]');
    if (linkEl) {
      bookUrl = linkEl.getAttribute('href') || '';
      bookUrl = DomUtils.ensureAbsoluteUrl(bookUrl);
    } else if (/www\.taaze\.tw\/products/.test(location.href) || /www\.taaze\.tw\/usedList/.test(location.href)) {
      // If no link found but we're on a book detail page, use current URL
      bookUrl = location.href;
    } else {
      bookUrl = '';
    }

    // Extract ISBN (mainly for detail pages)
    const isbnElements = bookContainer.querySelectorAll('.prodInfo_boldSpan');
    if (isbnElements.length > 0) {
      const isbnText = Array.from(isbnElements).map(el => el.textContent).join(' ');
      isbn = BookUtils.extractISBNFromBookInfo(isbnText);
    }

    // Determine format from breadcrumb or title
    if (originalBookTitle) {
      format = BookUtils.resolveBookFormat(originalBookTitle) as string;
      
      // Additional format detection from breadcrumb
      const breadcrumbEls = bookContainer.querySelectorAll('.site_map span, .site_map li, .col-xs-12 li a');
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
      source: 'taaze',
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
    const targetElement = document.querySelector('.authorBrand');

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
      { selector: '.prod_TitleMain', position: 'afterend' as const },    // List/grid pages
      { selector: '.avivid_item_title', position: 'afterend' as const }, // Recommendation items
      { selector: '.author', position: 'beforebegin' as const },         // Search/bestsell pages
      { selector: '.nameDiv', position: 'afterend' as const },           // Activity pages
      { selector: null, position: 'beforeend' as const }                 // Fallback
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

  /**
   * Resolve the book info from breadcrumb texts
   * @param breadcrumbTexts Array of breadcrumb text strings
   * @returns Object with language, format, and magazine detection or null
   */
  private resolveBookInfoFromBreadcrumbText(breadcrumbTexts: Array<string | null | undefined>): 
    { 
      language: string, 
      format?: "digital" | "physical" | "audio" | "second-hand",
      isMagazine: boolean
    } | null {

    if (!breadcrumbTexts || breadcrumbTexts.length === 0) {
      return null;
    }

    const bookBreadcrumbInfoMap: Record<string, any> = {
      "雜誌": {language: 'zh-TW', format: 'physical', isMagazine: true},
      "二手中文書": {language: 'zh-TW', format: 'second-hand', isMagazine: false},
      "中文電子書": {language: 'zh-TW', format: 'digital', isMagazine: false},
      "中文書": {language: 'zh-TW', format: 'physical', isMagazine: false}
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