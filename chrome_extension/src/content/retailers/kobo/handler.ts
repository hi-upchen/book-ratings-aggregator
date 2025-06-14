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
    
    // Add retailer theme class
    document.documentElement.classList.add('bra-retailer-kobo');
    
    if (/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/.test(location.href)) {
      this.handleBookDetailPage();
    } else if (/^https:\/\/www\.kobo\.com\/[a-z]{2}\/[a-z]{2}.*/.test(location.href)) {
      // Homepage pattern like https://www.kobo.com/tw/zh
      this.handleHomePage();
    } else {
      this.handleHomePage();
      // this.handleBookListPages();
    }
  }

  private handleBookDetailPage(): void {
    console.log('handleBookDetailPage');
    
    // Process the main book detail first
    this.processDetailPageBook();
    
    // Also process any book lists on the detail page (recommendations, related books, etc.)
    this.processBookLists();
    
    // Set up observer for dynamically loaded book lists
    this.startBookListObserver();
  }

  private processDetailPageBook(): void {
    // Find the main book container - detail pages have one main book section
    const bookContainer = document.querySelector('.sidebar-group') || document.body;
    
    if (!bookContainer || bookContainer.classList.contains('bra-processed')) {
      return;
    }
    
    // Mark as processed to prevent duplicates
    bookContainer.classList.add('bra-processed');
    
    // Extract book information using flexible selectors
    let bookTitle: string | null = null;
    let bookSubTitle: string | null = null;
    let author: string | null = null;
    
    // Try multiple selectors for title
    const titleSelectors = ['.title.product-field'];
    for (const selector of titleSelectors) {
      const titleEl = document.body.querySelector(selector);
      if (titleEl?.textContent?.trim()) {
        bookTitle = BookUtils.cleanBookTitle(titleEl.textContent.trim());
        break;
      }
    }
    
    // Try multiple selectors for subtitle
    const subtitleSelectors = ['.subtitle.product-field'];
    for (const selector of subtitleSelectors) {
      const subtitleEl = document.body.querySelector(selector);
      if (subtitleEl?.textContent?.trim()) {
        bookSubTitle = subtitleEl.textContent.trim();
        break;
      }
    }
    
    // Try multiple selectors for author
    const authorSelectors = ['.contributor-name'];
    for (const selector of authorSelectors) {
      const authorEl = document.body.querySelector(selector);
      if (authorEl?.textContent?.trim()) {
        author = authorEl.textContent.trim();
        break;
      }
    }
    
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
          this.renderDetailPageBookRating(bookContainer, response);
        }
      });
    }
  }

  private renderDetailPageBookRating(bookContainer: Element, goodreads: any): void {
    // Find the best insertion point using multiple selectors
    const insertionSelectors = [
      '.sidebar-group .category-rankings'
    ];
    
    let targetElement: Element | null = null;
    for (const selector of insertionSelectors) {
      targetElement = bookContainer.querySelector(selector);
      if (targetElement) break;
    }
    
    if (targetElement) {
      // Create rating element
      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
      
      // Wrap in container with appropriate classes
      const ratingContainer = document.createElement('div');
      ratingContainer.classList.add('bra-rating-wrapper');
      ratingContainer.appendChild(ratingEl);
      
      // Insert the rating
      targetElement.insertAdjacentElement('beforebegin', ratingContainer);
    } else {
      console.warn('No suitable insertion point found for detail page book rating');
    }
  }

  private handleHomePage(): void {
    // Process any books that are already loaded
    this.processBookLists();
    
    // Set up observer for dynamically loaded content
    this.startBookListObserver();
  }

  private processBookLists(): void {
    // Find all ebook links
    const bookLinks = document.querySelectorAll('a[href*="/ebook/"]');
    
    // Collect unique containers using Set
    const uniqueContainers = new Set<Element>();
    
    bookLinks.forEach((linkEl: Element) => {
      const bookContainer = linkEl.closest('.item-wrapper, [data-testid="carousel-bookcard"], .item-container') || linkEl.parentElement;
      if (bookContainer && !bookContainer.classList.contains('bra-processed')) {
        uniqueContainers.add(bookContainer);
      }
    });
    
    // Process each unique container once
    uniqueContainers.forEach(container => {
      this.processBookListItem(container);
    });
  }

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

  private processBookListItem(bookEl: Element): void {
    // Skip if already processed
    if (bookEl.classList.contains('bra-processed')) {
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
          this.renderBookListItemRating(bookEl, response);
        }
      });
    }
  }

  private renderBookListItemRating(bookEl: Element, goodreads: any): void {
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
      const foundElement = bookEl.querySelector(selector);
      if (foundElement) {
        // Special handling for div.kobo.star-rating - find its parent div.book-detail-line
        if (selector === 'div.kobo.star-rating') {
          const parentDetailLine = foundElement.closest('div.book-detail-line');
          if (parentDetailLine) {
            targetElement = parentDetailLine;
          } else {
            targetElement = foundElement;
          }
        } else {
          targetElement = foundElement;
        }
        break;
      }
    }

    if (targetElement) {
      // Create rating element
      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads });
      
      // Wrap in container with appropriate classes
      const ratingContainer = document.createElement('div');
      ratingContainer.classList.add('bra-rating-wrapper');
      ratingContainer.appendChild(ratingEl);

      // Insert the rating directly
      targetElement.insertAdjacentElement('afterend', ratingContainer);

      console.log('Inserted book list item rating for:', goodreads.title, targetElement);
    } else {
      console.log('No suitable insertion point found for book list item rating');
    }
  }
}