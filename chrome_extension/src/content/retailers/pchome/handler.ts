import { RetailerHandler } from 'utils/ContentRouter';
import { ChromeMessagingService, BookData } from 'utils/ChromeMessagingService';
import { findSiblingElementBySelector, getCurrentPageRootUrl, findClosestAnchorElement } from 'utils/DomUtils';
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
   * Routes to appropriate handler based on URL pattern.
   * @param document - The document to process
   */
  handle(document: Document): void {
    console.log('PChomeHandler: Handling page', location.href);
    
    // Add retailer theme class
    document.body.classList.add('bra-retailer-pchome');
    
    if (/24h\.pchome\.com\.tw\/books\/prod.*/.test(location.href)) {
      this.handleBookDetailPage();
    } else {
      this.handleListingPages();
    }
  }

  /**
   * Handles individual book detail pages.
   * Processes the main book information and fetches Goodreads rating.
   */
  private handleBookDetailPage(): void {    
    setTimeout(() => {
      const bookContainer = document.querySelector('#DescrbContainer');

      if (!bookContainer || bookContainer.classList.contains('bra-processed')) {
        return;
      }

      // Mark as processed to prevent duplicates
      bookContainer.classList.add('bra-processed');

      const bookData = this.extractDetailPageBookData(bookContainer);
      if (!bookData) {
        console.error('PChomeHandler: Unable to extract book data from detail page');
        return;
      }

      ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
        if (response.found) {
          this.renderDetailPageBookRating(bookContainer, response);
        }
      });
    }, 100);
  }

  /**
   * Handles listing pages, region pages, and store pages.
   * Processes existing book lists and sets up dynamic content monitoring.
   */
  private handleListingPages(): void {
    // Process any books that are already loaded
    this.processBookLists();
    
    // Set up observer for dynamically loaded content
    this.startBookListObserver();
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
   * Sets up a MutationObserver to monitor for dynamically loaded book content.
   * Automatically processes new books as they appear and stops after 30 seconds.
   */
  private startBookListObserver(): void {
    // Use MutationObserver to watch for dynamically loaded book lists
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          this.processBookLists();
        }
      });
    });

    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also process any books that are already loaded (delayed for dynamic content)
    setTimeout(() => {
      this.processBookLists();
    }, 100);

    // Stop observing after 30 seconds
    setTimeout(() => {
      observer.disconnect();
    }, 30000);
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

  private handleRegionPages(): void {
    setTimeout(() => {
      const bookDetailContainerEls = document.querySelectorAll('.prod_info');

      bookDetailContainerEls.forEach((bookDetailContainerEl) => {
        this.processRegionPageItem(bookDetailContainerEl as HTMLElement);
      });
    }, 500);
  }

  private processRegionPageItem(bookDetailContainerEl: HTMLElement): void {
    let bookTitle = '';

    // fetch book title
    const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a') as HTMLElement;

    // Iterate through the child nodes of the <a> element
    bookTitleEl?.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE || node.nodeName.toLowerCase() === 'b') {
        bookTitle += node.textContent;
      }
    });

    const originalBookTitle = bookTitle;
    bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

    let url = bookTitleEl?.getAttribute('href') ?? undefined;

    if (!bookTitle || bookTitle === '') {
      return;
    }

    // extract author, isbn
    const bookInfoEl = bookDetailContainerEl.querySelector('.msg_box');
    let author: string | undefined, isbn: string | undefined;
    if (bookInfoEl) {
      Array.from(bookInfoEl.children).forEach((child: HTMLElement) => {
        author = BookUtils.extractAuthorFromBookInfo(child.textContent?.trim() || '') ?? author;
        isbn = BookUtils.extractISBNFromBookInfo(child.textContent?.trim() || '') ?? isbn;
      });
    }

    // extract thumbnailUrl
    const bookThumbEl = findSiblingElementBySelector(bookDetailContainerEl, 'a.prod_img');
    let thumbnailUrl = bookThumbEl?.querySelector('img')?.getAttribute('src') ?? undefined;

    // extract pricing
    let priceEls = bookDetailContainerEl.querySelectorAll('.price_box .price .value');
    let price = priceEls.length ? parseInt((priceEls[priceEls.length - 1] as HTMLElement).textContent || '0', 10) : undefined;
    let currency = 'TWD';

    const bookData: BookData = {
      source: 'pchome',
      title: bookTitle,
      author,
      url: url || '',
      thumbnailUrl,
      price,
      currency,
      format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
      isbn
    };
  }

  /**
   * Extracts book data from a list item container.
   * @param bookContainer - The book container element
   * @returns BookData object or null if extraction fails
   */
  private extractBookData(bookContainer: HTMLElement): BookData | null {
    // Extract book information using flexible selectors
    let bookTitle: string | null = null;
    let author: string | null = null;
    let bookUrl: string | null = null;
    let isbn: string | null = null;
    let thumbnailUrl: string | undefined = undefined;
    let price: number | undefined = undefined;
    
    // Try multiple selectors for title
    const titleSelectors = ['.c-prodInfoV2__title'];
    for (const selector of titleSelectors) {
      const titleEl = bookContainer.querySelector(selector);
      if (titleEl?.textContent?.trim()) {
        bookTitle = BookUtils.cleanBookTitle(titleEl.textContent.trim());
        break;
      }
    }
    
    // // Try multiple selectors for author and ISBN
    // const metadataSelectors = ['.msg_box'];
    // for (const selector of metadataSelectors) {
    //   const metadataEl = bookContainer.querySelector(selector);
    //   if (metadataEl?.textContent?.trim()) {
    //     const text = metadataEl.textContent.trim();
    //     author = author || BookUtils.extractAuthorFromBookInfo(text);
    //     isbn = isbn || BookUtils.extractISBNFromBookInfo(text);
    //   }
    // }
    
    // Try multiple selectors for thumbnail
    const thumbnailSelectors = ['.c-prodInfoV2__img img', 'img'];
    for (const selector of thumbnailSelectors) {
      const imgEl = bookContainer.querySelector(selector);
      if (imgEl?.getAttribute('src')) {
        thumbnailUrl = imgEl.getAttribute('src') || undefined;
        break;
      }
    }
    
    // Try multiple selectors for price
    const priceSelectors = ['.c-prodInfoV2__priceBar .c-prodInfoV2__priceValue', '.c-prodInfoV2__priceBar .o-prodPrice__price'];
    for (const selector of priceSelectors) {
      const priceEls = bookContainer.querySelectorAll(selector);
      if (priceEls.length > 0) {
        const priceText = (priceEls[priceEls.length - 1] as HTMLElement).textContent;
        price = priceText ? parseInt(priceText, 10) : undefined;
        break;
      }
    }
    
    // Extract URL
    const linkEl = bookContainer.querySelector('a[href*="/prod/"]');
    bookUrl = linkEl?.getAttribute('href') || '';
    
    if (!bookTitle) return null;
    
    const originalBookTitle = bookTitle;
    
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
   * Extracts book data from a detail page container.
   * @param bookContainer - The detail page book container
   * @returns BookData object or null if extraction fails
   */
  private extractDetailPageBookData(bookContainer: Element): BookData | null {
    // Implementation for detail page extraction
    const titleEl = document.querySelector('#DescrbContainer .prod_name');
    const bookTitle = titleEl?.textContent?.trim();
    
    if (!bookTitle) {
      return null;
    }
    
    const cleanTitle = BookUtils.cleanBookTitle(bookTitle);
    
    // Extract other metadata similar to list items
    const { author, isbn } = this.extractMetadataFromContainer(bookContainer as HTMLElement);
    const thumbnailUrl = this.extractThumbnailFromContainer(bookContainer as HTMLElement);
    const { price, currency } = this.extractPriceFromContainer(bookContainer as HTMLElement);
    
    return {
      source: 'pchome',
      title: cleanTitle,
      author,
      url: location.href,
      thumbnailUrl,
      price,
      currency,
      format: BookUtils.resolveIsDigital(bookTitle) ? 'ebook' : 'physical',
      isbn
    };
  }

  /**
   * Extracts title from title element, handling complex layouts with multiple child nodes.
   * @param titleElement - The title element to extract from
   * @returns Extracted title or null
   */
  private extractTitleFromElement(titleElement: HTMLElement): string | null {
    if (!titleElement) return null;
    
    // Handle simple case first
    if (titleElement.childNodes.length === 1) {
      return titleElement.textContent?.trim() || null;
    }
    
    // Handle complex case (region pages) - iterate through child nodes
    let bookTitle = '';
    titleElement.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE || node.nodeName.toLowerCase() === 'b') {
        bookTitle += node.textContent;
      }
    });
    
    // Fallback to last text node (grid/row pages)
    if (!bookTitle && titleElement.childNodes.length) {
      const lastNode = titleElement.childNodes[titleElement.childNodes.length - 1] as Text;
      bookTitle = lastNode.textContent || '';
    }
    
    return bookTitle.trim() || null;
  }
  
  /**
   * Extracts author and ISBN metadata from book container.
   * @param bookContainer - The book container element
   * @returns Object containing author and isbn
   */
  private extractMetadataFromContainer(bookContainer: HTMLElement): { author?: string, isbn?: string } {
    const bookInfoEl = bookContainer.querySelector('.msg_box');
    let author: string | undefined, isbn: string | undefined;
    
    if (bookInfoEl) {
      Array.from(bookInfoEl.children).forEach((child: HTMLElement) => {
        author = BookUtils.extractAuthorFromBookInfo(child.textContent?.trim() || '') ?? author;
        isbn = BookUtils.extractISBNFromBookInfo(child.textContent?.trim() || '') ?? isbn;
      });
    }
    
    return { author, isbn };
  }
  
  /**
   * Extracts thumbnail URL from book container using multiple strategies.
   * @param bookContainer - The book container element
   * @returns Thumbnail URL or undefined
   */
  private extractThumbnailFromContainer(bookContainer: HTMLElement): string | undefined {
    // Try different thumbnail extraction strategies
    let bookThumbEl = findSiblingElementBySelector(bookContainer, 'a.prod_img');
    if (!bookThumbEl) {
      bookThumbEl = bookContainer.querySelector('.prod_img');
    }
    
    return bookThumbEl?.querySelector('img')?.getAttribute('src') ?? undefined;
  }
  
  /**
   * Extracts price and currency from book container.
   * @param bookContainer - The book container element
   * @returns Object containing price and currency
   */
  private extractPriceFromContainer(bookContainer: HTMLElement): { price?: number, currency: string } {
    const priceEls = bookContainer.querySelectorAll('.price_box .price .value');
    const price = priceEls.length ? parseInt((priceEls[priceEls.length - 1] as HTMLElement).textContent || '0', 10) : undefined;
    const currency = 'TWD';
    
    return { price, currency };
  }
  
  /**
   * Renders the Goodreads rating on a book detail page.
   * @param bookContainer - The container element for the book
   * @param goodreads - The Goodreads rating data
   */
  private renderDetailPageBookRating(bookContainer: Element, goodreads: any): void {
    const targetElement = bookContainer.querySelector('#SloganContainer');
    
    if (targetElement) {
      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
      targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
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
        const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
        const ratingContainer = document.createElement('div');
        ratingContainer.classList.add('bra-rating-wrapper');
        ratingContainer.appendChild(ratingEl);
        
        targetElement.insertAdjacentElement(strategy.position, ratingContainer);
        console.log('Inserted book list item rating for:', goodreads.title, targetElement);
        break;
      }
    }
  }
}