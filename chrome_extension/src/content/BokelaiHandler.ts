import { RetailerHandler } from 'utils/ContentRouter';
import { observeNodeAppearance } from 'utils/DomUtils';
import * as bokelai from './bokelai';

export class BokelaiHandler implements RetailerHandler {
  name = 'Bokelai (博客來)';

  matches(url: string): boolean {
    return /www\.books\.com\.tw/.test(url) || /activity\.books\.com\.tw/.test(url);
  }

  handle(document: Document): void {
    if (/www\.books\.com\.tw\/products.*/.test(location.href)) {
      // book detail pages
      bokelai.handleBookDetailPage(document);
    } else if (/www\.books\.com\.tw\/.*book.*/.test(location.href)) {
      // 博客來小分頁, https://www.books.com.tw/web/books/
      bokelai.handleCategorySlideShow(document);
      bokelai.handleBookRankingList(document);
      bokelai.handleTwoColumnBookList(document);
    } else if (/activity\.books\.com\.tw\/crosscat/.test(location.href)) {
      // 博客來小活動頁面, https://activity.books.com.tw/crosscat/show/A00000069231
      bokelai.handleCrosscat3Column(document);
    } else if (/www\.books\.com\.tw\//.test(location.href)) {
      // 博客來首頁, should be put at last priority
      this.handleHomePage(document);
    }
  }

  private handleHomePage(document: Document): void {
    let homepageObserver: MutationObserver | undefined;
    let executed = false; // Flag to track if the function has been executed

    // Function to handle the homepage
    const handleHomePageOnce = () => {
      if (!executed) { // Check if the function has not been executed already
        bokelai.handleHomePage(document); // Execute the function
        executed = true; // Set the flag to indicate that the function has been executed
        if (homepageObserver) {
          homepageObserver.disconnect(); // Disconnect the observer
        }
      }
    };

    // Check if the initial condition is already met
    if (document.querySelectorAll('section[the_area="bk"] .item').length > 0) {
      // If the condition is met, execute the function immediately
      handleHomePageOnce();
    } else {
      // If the condition is not met, set up a MutationObserver to monitor the DOM changes
      homepageObserver = new MutationObserver(function (mutationsList, observer) {
        // Check if the condition is met after each mutation
        if (document.querySelectorAll('section[the_area="bk"] .item').length > 0) {
          handleHomePageOnce();
        }
      });

      // Start observing the DOM with the specified configuration
      homepageObserver.observe(document.body, { subtree: true, childList: true });
    }
  }
}