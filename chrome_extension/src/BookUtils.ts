/*************************** 
 * DATA FUNCTIONS 
 ***************************/

/**
 * Cleans a book title by removing text enclosed in parentheses and brackets.
 * @param title - The original book title.
 * @returns The cleaned book title.
 */
export const cleanBookTitle = (title: string): string => {
	// Remove text between "（" and "）"
	let cleanTitle = title.replace(/（[^（）]*）/g, '');

	// Remove text between "【" and "】"
	cleanTitle = cleanTitle.replace(/【[^【】]*】/g, '');

	// for pchome
	cleanTitle = cleanTitle.replace(/\([^\(\))]*\)/g, '');
	// for pchome
	cleanTitle = cleanTitle.replace(/.*今日.*書單/g, '');

	return cleanTitle.trim();
}

/**
 * Resolve the title looks like a digital book or not
 * @param title The book title
 * @returns Boolean
 */
export const resolveIsDigital = (title:string): Boolean => {
  return title.indexOf('電子書')>=0
}

/**
 * Extracts the author from the given information string.
 * @param info The information string containing author details.
 * @returns The extracted author or null if not found.
 */
export const extractAuthorFromBookInfo = (info: string): string | null => {
  info = info.replace(/追蹤作者/g, '')
  info = info.replace(/新功能介紹/g, '')
  info = info.replace(/[ 修改 ]/g, '')
  info = info.replace(/\n/g, ' ');
  info = info.trim()

	const authorRegex = /作者：\s*(.+)/;
	const match = info.match(authorRegex);
	return match ? match[1] : null;
};

/**
* Extracts the ISBN from the given information string.
* @param info The information string containing ISBN details.
* @returns The extracted ISBN or null if not found.
*/
export const extractISBNFromBookInfo = (info: string): string | null => {
	const isbnRegex = /ISBN：\s*(\d+)/;
	const match = info.match(isbnRegex);
	return match ? match[1] : null;
};


/**
 * Extracts the price from the given information string.
 * @param info The information string containing price details.
 * @returns The extracted price or null if not found.
 */
export const extractPriceFromBookInfo = (info: string): string | null => {
  const priceRegex = /(\d+)\s*元|\$(\d+)/g;
  let match;
  let lastMatch = null;
  while ((match = priceRegex.exec(info)) !== null) {
      lastMatch = match[1] || match[2]; // Check if either group 1 or group 2 matched
  }
  return lastMatch;
};

/**
 * Formats a number into a simplified KM style.
 * If the number is greater than or equal to 1,000,000, it returns the number divided by 1,000,000 and appends 'm'.
 * If the number is greater than or equal to 1,000, it returns the number divided by 1,000 and appends 'k'.
 * Otherwise, it returns the number formatted with commas.
 * @param num The number to format.
 * @returns The formatted string.
 * @example
 * // Example usage:
 * const num1 = formatNumberToKMStyle(1500000);
 * // Output: '1.5m'
 * const num2 = formatNumberToKMStyle(5000);
 * // Output: '5k'
 * const num3 = formatNumberToKMStyle(12345);
 * // Output: '12.3k'
 * const num4 = formatNumberToKMStyle(999);
 * // Output: '999'
 */
export const formatNumberToKMStyle = (num: number): string => {
  if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'm';
  } else if (num >= 1000) {
      return (num / 1000).toFixed(num > 10000 ? 0 : 1) + 'k';
  } else {
      return num.toLocaleString();
  }
};


/*************************** 
 * RENDER FUNCTIONS 
 ***************************/


/**
 * Generate the Rating Element
 * @param Goodreads score
 * @returns String 
 * @example
 * <div class="goodreads-ratings-summary" aria-label="Rated 4.3 out of 5 stars" translate="no">
 *   <span class="star staticStar p10" role="presentation"></span>
 *   <span class="bra-ratings">4.3</span>
 *   <span class="bra-num-ratings">10k</span>
 * </div>
 */
export const generateBookBlockRatingDiv_inNumbers = ({ goodreads }): HTMLElement => {
	let { rating, numRatings, url, title } = goodreads
	
	// Create a div element for the star rating
	const ratingDiv = document.createElement('div');
	ratingDiv.classList.add('goodreads-ratings-summary');
	ratingDiv.setAttribute('aria-label', `Rated ${rating} out of 5 stars`);
	ratingDiv.setAttribute('translate', 'no');

	// // Create and append the icon element
	// const iconSpan = document.createElement('span');
	// iconSpan.classList.add('goodreads-icon');
	// ratingDiv.appendChild(iconSpan);

	// Add an start
	const starLi = document.createElement('span');
	// starLi.classList.add('star', 'full');
	starLi.classList.add('star', 'staticStar', 'p10');
	starLi.setAttribute('role', 'presentation');
	ratingDiv.appendChild(starLi);

	// Add ratings
	const totalRatingsSpan = document.createElement('span');
	totalRatingsSpan.classList.add('bra-ratings');
	totalRatingsSpan.textContent = rating
	ratingDiv.appendChild(totalRatingsSpan);

	// Add num of ratings
	const numRatingsSpan = document.createElement('span');
	numRatingsSpan.classList.add('bra-num-ratings');
	numRatingsSpan.textContent = formatNumberToKMStyle(numRatings)
	ratingDiv.appendChild(numRatingsSpan);

	return ratingDiv;
}