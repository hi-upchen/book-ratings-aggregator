import { RetrievedGoodreadsBookInfo } from 'types/RetrievedBookInfo';

/**
 * Simplified PChome utilities - rendering logic moved to handler class.
 * Keeping only pure utility functions that might be needed for special cases.
 */

/**
 * Generates a simple rating display element with numbers only.
 * @param goodreads - The Goodreads rating data
 * @returns HTML element with rating and count
 */
export const generateBookBlockRatingDiv_inNumbers = ({ goodreads }: { goodreads: RetrievedGoodreadsBookInfo }): HTMLElement => {
  const { rating, numRatings } = goodreads;
  
  // Create rating wrapper
  const ratingWrapper = document.createElement('div');
  ratingWrapper.classList.add('bra-rating-content');
  
  // Create rating text
  const ratingText = document.createElement('span');
  ratingText.classList.add('rating-text');
  ratingText.textContent = `${rating.toFixed(1)} (${numRatings.toLocaleString()})`;
  
  // Create icon
  const iconSpan = document.createElement('span');
  iconSpan.classList.add('bra-goodreads-icon');
  
  ratingWrapper.appendChild(iconSpan);
  ratingWrapper.appendChild(ratingText);
  
  return ratingWrapper;
};