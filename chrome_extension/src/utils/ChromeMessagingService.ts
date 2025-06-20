import { RetrievedGoodreadsBookInfo } from 'types/RetrievedBookInfo';

export interface BookData {
  source: string;
  title: string;
  subtitle?: string;
  author?: string;
  url: string;
  thumbnailUrl?: string;
  rating?: number;
  numRatings?: number;
  price?: number;
  currency?: string;
  format?: string;
  isbn?: string;
}

export interface RatingResponse extends RetrievedGoodreadsBookInfo {
  found: boolean;
}

export class ChromeMessagingService {
  /**
   * Sends a message to the background script to fetch Goodreads rating data
   * @param bookData Book information to send for rating lookup
   * @returns Promise that resolves with rating response
   */
  static async fetchRating(bookData: BookData): Promise<RatingResponse> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'FETCH_RATING_WITH_BOOK_TITLE',
        data: {
          title: bookData.title,
          subtitle: bookData.subtitle,
          book: bookData
        }
      }, {}, (response) => {
        // console.log('Received rating for', bookData.title, response);
        resolve(response);
      });
    });
  }

  /**
   * Sends a message to the background script and handles the response with a callback
   * @param bookData Book information to send
   * @param callback Function to call with the response
   */
  static fetchRatingWithCallback(
    bookData: BookData, 
    callback: (response: RatingResponse) => void
  ): void {
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        title: bookData.title,
        subtitle: bookData.subtitle,
        book: bookData
      }
    }, {}, (response) => {
      // console.log('Received rating for', bookData.title, response);
      callback(response);
    });
  }
}