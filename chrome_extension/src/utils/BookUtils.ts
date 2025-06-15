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
	cleanTitle = cleanTitle.replace(/^HyRead\s*/g, '');
	cleanTitle = cleanTitle.replace(/^Readmoo\s*讀墨\s*/g, '');
	cleanTitle = cleanTitle.replace(/\s*（Pubu電子書）/g, '');
	cleanTitle = cleanTitle.replace(/\s*\(Kob\/電子書\)/g, '');

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
 * Resolve the title looks like a second hand book or not
 * @param title The book title
 * @returns Boolean
 */
export const resolveIsSecondHand = (title:string): Boolean => {
	return title.indexOf('二手')>=0
}

/**
 * Resolve the title looks like a physical book or not
 * @param title The book title
 * @returns Boolean
 */
export const resolveBookFormat = (title: string): String => {
	let format = 'physical';
	if (resolveIsDigital(title)) {
		format = 'digital';
	} else if (resolveIsDigital(title)) {
		format = 'second-hand';
	}

	return format
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
	const isbnRegex = /ISBN\/ISSN：\s*(\d+)|ISBN：\s*(\d+)/;
	const match = info.match(isbnRegex);
	return match ? match[1] || match[2] : null;
};


/**
 * Extracts the price from the given information string.
 * @param info The information string containing price details.
 * @returns The extracted price or null if not found.
 */
export const extractPriceFromBookInfo = (info: string): string | null => {
	const priceRegex = /(\d+)\s*元|\$(\d+)|NT\$\s*(\d+)/g;
	let match;
	let lastMatch = null;
	while ((match = priceRegex.exec(info)) !== null) {
		lastMatch = match[1] || match[2] || match[3]; // Check if any of the groups matched
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


interface RatingConfig {
	includeIcon?: boolean;
	iconClass?: string;
	containerClasses?: string[];
}

/**
 * Generate the Rating Element
 * @param goodreads Goodreads score data
 * @param config Configuration options for the rating display
 * @returns HTMLElement
 * @example
 * <div class="goodreads-ratings-summary" aria-label="Rated 4.3 out of 5 stars" translate="no">
 *   <span class="goodreads-icon"></span> <!-- if includeIcon: true -->
 *   <span class="star staticStar p10" role="presentation"></span>
 *   <span class="bra-ratings">4.3</span>
 *   <span class="bra-num-ratings">10k</span>
 * </div>
 */
export const generateBookBlockRatingDiv_inNumbers = (
	{ goodreads }, 
	config: RatingConfig = {}
): HTMLElement => {
	const { includeIcon = false, iconClass = 'goodreads-icon', containerClasses = [] } = config;
	let { rating, numRatings, url, title } = goodreads
	
	// Create a div element for the star rating
	const ratingDiv = document.createElement('div');
	ratingDiv.classList.add('bra-rating-content');
	if (containerClasses.length > 0) {
		ratingDiv.classList.add(...containerClasses);
	}
	ratingDiv.setAttribute('aria-label', `Rated ${rating} out of 5 stars`);
	ratingDiv.setAttribute('translate', 'no');

	// Create and append the icon element if requested
	if (includeIcon) {
		const iconSpan = document.createElement('span');
		iconSpan.classList.add('bra-goodreads-icon');
		ratingDiv.appendChild(iconSpan);
	}

	// Add star
	const starLi = document.createElement('span');
	starLi.classList.add('bra-star-interactive', 'bra-star', 'p10');
	starLi.setAttribute('role', 'presentation');
	ratingDiv.appendChild(starLi);

	// Add ratings
	const totalRatingsSpan = document.createElement('span');
	totalRatingsSpan.classList.add('bra-rating-score');
	totalRatingsSpan.textContent = String(rating);
	ratingDiv.appendChild(totalRatingsSpan);

	// Add num of ratings
	const numRatingsSpan = document.createElement('span');
	numRatingsSpan.classList.add('bra-rating-count');
	numRatingsSpan.textContent = formatNumberToKMStyle(numRatings)
	ratingDiv.appendChild(numRatingsSpan);

	return ratingDiv;
}

/**
 * Generate the Rating Element with Link
 * @param Goodreads score
 * @returns String 
 * @example
 * <a href="https://www.goodreads.com/book/show/12345678" title="Book Title 4.3 avg rating — 10k ratings" target="_blank">
 *   <div class="goodreads-ratings-summary" aria-label="Rated 4.3 out of 5 stars" translate="no">
 *     <span class="goodreads-icon"></span>
 *     <span class="star staticStar p10" role="presentation"></span>
 *     <span class="bra-ratings">4.3</span>
 *     <span class="bra-num-ratings">10k</span>
 *   </div>
 * </a>
 */
export const generateBookRatingWithLink = ({ goodreads }) : HTMLElement => {
	// Generate the rating element without rating
	const ratingEl = generateBookBlockRatingDiv_inNumbers({ goodreads });

	// Create and append the icon element
	const iconSpan = document.createElement('span');
	iconSpan.classList.add('bra-goodreads-icon');
	ratingEl.insertAdjacentHTML('afterbegin', iconSpan.outerHTML);

	// Wrap into an anchor tag
	const ratingBriefEl = document.createElement('a');
	ratingBriefEl.classList.add('bra-rating-link-wrapper');
	ratingBriefEl.href = goodreads.url;
	ratingBriefEl.title = `${goodreads.title} ${goodreads.rating} avg rating — ${formatNumberToKMStyle(goodreads.numRatings)} ratings`;
	ratingBriefEl.target = "_blank";
	ratingBriefEl.appendChild(ratingEl);

	return ratingBriefEl;
}