import { RetailerHandler } from 'utils/ContentRouter';
import { ChromeMessagingService, BookData } from 'utils/ChromeMessagingService';
import { findSiblingElementBySelector } from 'utils/DomUtils';
import * as BookUtils from 'utils/BookUtils';
import { 
  renderScore2PchomeRowList,
  renderScore2PchomeGridList,
  renderScore2PchomeBookPage,
  renderScore2PchomeRegionBlock4 
} from './utils';

export class PChomeHandler implements RetailerHandler {
  name = 'PChome';

  matches(url: string): boolean {
    return /24h\.pchome\.com\.tw\/books/.test(url);
  }

  handle(document: Document): void {
    if (/24h\.pchome\.com\.tw\/books\/prod.*/.test(location.href)) {
      this.handleBookDetailPage();
    } else if (/pchome\.com\.tw\/books\/store.*/.test(location.href)) {
      this.handleListingPages();
    } else if (/pchome\.com\.tw\/books\/region.*/.test(location.href) || /pchome\.com\.tw\/books\/newarrival.*/.test(location.href)) {
      this.handleRegionPages();
    }
  }

  private handleBookDetailPage(): void {
    console.log('found pchome book page', location.href);
    
    setTimeout(() => {
      const bookContainer = document.querySelector('#DescrbContainer');

      if (!bookContainer) {
        console.error('Cannot find the book element');
        return;
      }

      let bookTitle: string | null;
      const bookTitleEl = bookContainer.querySelector('#NickContainer');
      bookTitle = bookTitleEl ? bookTitleEl.textContent : null;
      const originalBookTitle = bookTitle;
      bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

      if (!bookTitle || bookTitle === '') {
        console.error('Book Title is empty');
        return;
      }

      // extract author, isbn
      const bookInfoEl = bookContainer.querySelector('#bookInfo');
      let author: string | undefined, isbn: string | undefined;
      if (bookInfoEl) {
        Array.from(bookInfoEl.children).forEach((child) => {
          author = BookUtils.extractAuthorFromBookInfo(child.textContent?.trim() || '') ?? author;
          isbn = BookUtils.extractISBNFromBookInfo(child.textContent?.trim() || '') ?? isbn;
        });
      }

      // extract thumbnailUrl
      const bookThumbEl = document.querySelector('#ImgContainer img');
      let thumbnailUrl = bookThumbEl?.getAttribute('src') ?? undefined;

      // extract pricing
      let priceEls = document.querySelectorAll('#PaymentContainer .price .value');
      let price = priceEls.length ? parseInt((priceEls[priceEls.length - 1] as HTMLElement).textContent || '0', 10) : undefined;
      let currency = document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute('content') || undefined;

      const bookData: BookData = {
        source: 'pchome',
        title: bookTitle,
        author,
        url: window.location.href,
        thumbnailUrl,
        price,
        currency,
        format: BookUtils.resolveIsDigital(originalBookTitle || '') ? 'ebook' : 'physical',
        isbn
      };

      ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
        if (response.found) {
          renderScore2PchomeBookPage(bookContainer, { goodreads: response });
        }
      });
    }, 100);
  }

  private handleListingPages(): void {
    this.setupGridListHandler();
    this.setupRowListHandler();
    this.registerMonitorPageChanges();
  }

  private setupGridListHandler(): void {
    const bookDetailContainerEls = document.querySelectorAll('.prod_info');

    bookDetailContainerEls.forEach((bookDetailContainerEl) => {
      this.processGridListItem(bookDetailContainerEl as HTMLElement);
    });
  }

  private processGridListItem(bookDetailContainerEl: HTMLElement): void {
    let bookTitle: string | null;

    // fetch book title
    const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a') as HTMLElement;
    bookTitle = bookTitleEl?.childNodes?.length ? (bookTitleEl.childNodes[bookTitleEl.childNodes.length - 1] as Text).textContent : null;
    const originalBookTitle = bookTitle;
    bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

    if (!bookTitle || bookTitle === '') {
      return;
    }

    // extract the book link
    let url = bookTitleEl?.getAttribute('href') ?? undefined;

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
      format: BookUtils.resolveIsDigital(originalBookTitle || '') ? 'ebook' : 'physical',
      isbn
    };

    ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
      if (response.found) {
        renderScore2PchomeGridList(bookDetailContainerEl, { goodreads: response });
      }
    });
  }

  private setupRowListHandler(): void {
    const bookDetailContainerEls = document.querySelectorAll('#ProdListContainer .col3f');

    bookDetailContainerEls.forEach((bookDetailContainerEl) => {
      this.processRowListItem(bookDetailContainerEl as HTMLElement);
    });
  }

  private processRowListItem(bookDetailContainerEl: HTMLElement): void {
    let bookTitle: string | null;

    // fetch book title
    const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a') as HTMLElement;
    bookTitle = bookTitleEl?.childNodes?.length ? (bookTitleEl.childNodes[bookTitleEl.childNodes.length - 1] as Text).textContent : null;
    const originalBookTitle = bookTitle;
    bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null;

    if (!bookTitle || bookTitle === '') {
      return;
    }

    // extract the book link
    let url = bookTitleEl?.getAttribute('href') ?? undefined;

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
    const bookThumbEl = bookDetailContainerEl.querySelector('.prod_img');
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
      format: BookUtils.resolveIsDigital(originalBookTitle || '') ? 'ebook' : 'physical',
      isbn
    };

    ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
      if (response.found) {
        renderScore2PchomeRowList(bookDetailContainerEl, { goodreads: response });
      }
    });
  }

  private registerMonitorPageChanges(): void {
    let funcHasExecuted = false;

    if (funcHasExecuted) {
      return;
    }
    funcHasExecuted = true;

    // Select the target nodes
    const monitoredNodeNCallbackFnMap: Array<{ node: Element | null, callback: Function }> = [
      {
        node: document.querySelector('#ProdGridContainer'),
        callback: () => this.setupGridListHandler()
      },
      {
        node: document.querySelector('#ProdListContainer'),
        callback: () => this.setupRowListHandler()
      }
    ];

    // Options for the observer
    const config = { childList: true, subtree: false };

    monitoredNodeNCallbackFnMap.forEach((item) => {
      if (!item.node) return;

      let timer: NodeJS.Timeout;

      // Create an observer instance linked to the callback function
      const observer = new MutationObserver(() => {
        clearTimeout(timer);
        timer = setTimeout(() => item.callback(), 500);
      });

      // Start observing the target node for configured mutations
      observer.observe(item.node, config);
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

    ChromeMessagingService.fetchRatingWithCallback(bookData, (response) => {
      if (response.found) {
        renderScore2PchomeRegionBlock4(bookDetailContainerEl, { goodreads: response });
      }
    });
  }
}