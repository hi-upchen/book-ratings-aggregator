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

	return cleanTitle.trim();
}

export const renderScore2KoboBookPage = async ({ goodreads: { rating, numRatings, url, title } }) => {
	// find the target place
	// const targetElement = document.querySelector('#RatingsBrief');
	const targetElement = document.querySelector('.sidebar-group .category-rankings');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = generateBookPageRatingDiv({ goodreads: { rating, numRatings, url, title } })

		// wrap into div
		const ratingBriefEl = document.createElement('div');
		ratingBriefEl.classList.add('book-ratings-aggregator', 'RatingsBrief');
		ratingBriefEl.appendChild(ratingEl);

		// targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
		targetElement.insertAdjacentHTML('beforebegin', ratingBriefEl.outerHTML);
		// targetElement.appendChild(ratingEl)
	} else {
		console.error('renderScore2KoboBookPage Target element not found');
	}
}

export const generateBookPageRatingDiv = ({ goodreads: { rating, numRatings, url, title } }): HTMLElement => {
	const maxRating = 5

	// Create the main "a" element
	const aElement = document.createElement('a');
	aElement.classList.add('ratings-summary', 'goodreads-ratings-summary');
	aElement.setAttribute('href', url); // link to goodreads
	aElement.setAttribute('target', '_blank'); // Set to open in a new window/tab
	aElement.setAttribute('title', `${title} ${rating} avg rating — ${numRatings.toLocaleString()} ratings`); // Set the title attribute

	// Create the main div element with the rating stars
	const ratingStarsDiv = document.createElement('div');
	ratingStarsDiv.classList.add('rating-stars');

	// Add aria-label attribute to the main div
	ratingStarsDiv.setAttribute('aria-label', `${maxRating}分中的${rating}分`);

	// Create the div for the hidden rating average
	const ratingAverageDiv = document.createElement('div');
	ratingAverageDiv.classList.add('rating-average');
	ratingAverageDiv.setAttribute('hidden', 'hidden');
	ratingAverageDiv.textContent = rating.toFixed(1);
	ratingStarsDiv.appendChild(ratingAverageDiv);

	// Create the ul element for the stars
	const starsUl = document.createElement('ul');
	starsUl.classList.add('stars', 'read-only');
	starsUl.setAttribute('role', 'img');
	starsUl.setAttribute('aria-label', `Rated ${rating.toFixed(1)} out of ${maxRating} stars with ${numRatings} ratings`);

	// Calculate the number of full stars and half star
	const fullStars = Math.floor((rating / maxRating) * 5);
	const hasHalfStar = rating % 1 !== 0;

	// Create full star li elements
	for (let i = 0; i < fullStars; i++) {
		const starLi = document.createElement('li');
		// starLi.classList.add('star', 'full');
		starLi.classList.add('star', 'staticStar', 'p10');
		starLi.setAttribute('role', 'presentation');
		starsUl.appendChild(starLi);
	}

	// Create half star li element if applicable
	if (hasHalfStar) {
		const halfStarLi = document.createElement('li');
		halfStarLi.classList.add('star', 'staticStar');
		// halfStarLi.classList.add('star', 'half');
		const roundedHalfStar = (rating % 1) * 10;
		// Round the half star value to the nearest multiple of 3 or 10
		const roundedPValue = roundedHalfStar <= 1.5 ? 0 : roundedHalfStar <= 4.5 ? 3 : roundedHalfStar <= 8 ? 6 : 10;
		halfStarLi.classList.add('p' + roundedPValue);

		halfStarLi.setAttribute('role', 'presentation');
		starsUl.appendChild(halfStarLi);
	}

	// Create empty star li elements
	for (let i = fullStars + (hasHalfStar ? 1 : 0); i < maxRating; i++) {
		const starLi = document.createElement('li');
		starLi.classList.add('star', 'staticStar', 'p0');
		starLi.setAttribute('role', 'presentation');
		starsUl.appendChild(starLi);
	}

	// Append the ul element to the main div
	ratingStarsDiv.appendChild(starsUl);

	// Append the rating stars div to the "a" element
	aElement.appendChild(ratingStarsDiv);

	// Create and append the icon element
	const iconSpan = document.createElement('span');
	iconSpan.classList.add('goodreads-icon');
	aElement.appendChild(iconSpan);

	const leftParenthesis = document.createElement('span');
	leftParenthesis.textContent = '(';
	aElement.appendChild(leftParenthesis);

	// Add ratings
	const totalRatingsSpan = document.createElement('span');
	totalRatingsSpan.classList.add('bra-ratings');
	totalRatingsSpan.textContent = rating
	aElement.appendChild(totalRatingsSpan);

	// Add num of ratings
	const numRatingsSpan = document.createElement('span');
	numRatingsSpan.classList.add('bra-num-ratings');
	numRatingsSpan.textContent = formatNumberToKMStyle(numRatings)
	aElement.appendChild(numRatingsSpan);

	const rightParenthesis = document.createElement('span');
	rightParenthesis.textContent = ')';
	aElement.appendChild(rightParenthesis);

	return aElement
}

export const renderScore2KoboBookBlock = async (bookBlockEL, { goodreads }) => {
	// Select the element with class '.book-detail-line.price'
	const priceElement = bookBlockEL.querySelector('.book-detail-line.price');
	let ratingBookDetailLineEl

	// Check if the price element exists
	if (priceElement) {
		// Get the next sibling element, which is the one after the price element
		const nextElement = priceElement.nextElementSibling;

		// Check if the next sibling element exists and has the class '.book-detail-line'
		if (nextElement && nextElement.classList.contains('book-detail-line')) {
			// Found the element '.book-detail-line' right after '.book-detail-line.price'
			ratingBookDetailLineEl = nextElement
		} else {
			console.warn('No element .book-detail-line found right after .book-detail-line.price');
		}
	} else {
		console.warn('Cannot find the .book-detail-line.price element for', bookBlockEL)
		return
	}

	if (!ratingBookDetailLineEl) {
		console.warn('Cannot find the rating element for', bookBlockEL)
		return
	}

	let el = generateBookBlockRatingDiv_inNumbers({goodreads})

	// wrap into div
	const bookBlockRating = document.createElement('div');
	bookBlockRating.classList.add('book-detail-line', 'bra-book-block-rating');
	bookBlockRating.appendChild(el);

	priceElement.insertAdjacentHTML('beforebegin', bookBlockRating.outerHTML);
}

function formatNumberToKMStyle(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'm';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(num>10000 ? 0:1) + 'k';
  } else {
    return num.toLocaleString();
  }
}

export const generateBookBlockRatingDiv_inNumbers = ({ goodreads }): HTMLElement => {
	const maxRating = 5
	let { rating, numRatings, url, title } = goodreads
	
	// Create a div element for the star rating
	const ratingDiv = document.createElement('div');
	ratingDiv.classList.add('goodreads-ratings-summary');
	ratingDiv.setAttribute('aria-label', `Rated ${rating} out of 5 stars`);
	ratingDiv.setAttribute('translate', 'no');

	// Create and append the icon element
	const iconSpan = document.createElement('span');
	iconSpan.classList.add('goodreads-icon');
	ratingDiv.appendChild(iconSpan);

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

export const generateBookBlockRatingDiv_AllStarts = ({ goodreads }): HTMLElement => {
	const maxRating = 5
	let { rating, numRatings, url, title } = goodreads
	
	// Create a div element for the star rating
	const ratingDiv = document.createElement('div');
	ratingDiv.classList.add('kobo', 'star-rating', 'goodreads-ratings-summary');
	ratingDiv.setAttribute('role', 'img');
	ratingDiv.setAttribute('aria-label', `Rated ${rating} out of 5 stars`);
	ratingDiv.setAttribute('translate', 'no');

	// Calculate the number of full stars and half star
	const fullStars = Math.floor((rating / maxRating) * 5);
	const hasHalfStar = rating % 1 !== 0;

	// Create full star li elements
	for (let i = 0; i < fullStars; i++) {
		const starLi = document.createElement('span');
		// starLi.classList.add('star', 'full');
		starLi.classList.add('star', 'staticStar', 'p10');
		starLi.setAttribute('role', 'presentation');
		ratingDiv.appendChild(starLi);
	}

	// Create half star li element if applicable
	if (hasHalfStar) {
		const halfStarLi = document.createElement('span');
		halfStarLi.classList.add('star', 'staticStar');
		// halfStarLi.classList.add('star', 'half');
		const roundedHalfStar = (rating % 1) * 10;
		// Round the half star value to the nearest multiple of 3 or 10
		const roundedPValue = roundedHalfStar <= 1.5 ? 0 : roundedHalfStar <= 4.5 ? 3 : roundedHalfStar <= 8 ? 6 : 10;
		halfStarLi.classList.add('p' + roundedPValue);

		halfStarLi.setAttribute('role', 'presentation');
		ratingDiv.appendChild(halfStarLi);
	}

	// Create empty star li elements
	for (let i = fullStars + (hasHalfStar ? 1 : 0); i < maxRating; i++) {
		const starLi = document.createElement('span');
		starLi.classList.add('star', 'staticStar', 'p0');
		starLi.setAttribute('role', 'presentation');
		ratingDiv.appendChild(starLi);
	}

	// Create and append the icon element
	const iconSpan = document.createElement('span');
	iconSpan.classList.add('goodreads-icon');
	ratingDiv.appendChild(iconSpan);

	return ratingDiv;


}

export const renderScore2KoboSearhResultItem = async (bookItemEl, {goodreads}) => {
	// find the target place
	// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('bookItemEl', bookItemEl)
	const targetElement = bookItemEl.querySelector('.star-rating');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = generateBookPageRatingDiv({ goodreads })

		// wrap into div
		const ratingBriefEl = document.createElement('div');
		ratingBriefEl.classList.add('kobo','star-rating');
		ratingBriefEl.appendChild(ratingEl);

		// targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
		targetElement.insertAdjacentHTML('afterend', ratingBriefEl.outerHTML);
		// targetElement.appendChild(ratingEl)
	} else {
		console.error('renderScore2KoboSearhResultItem Target element not found');
	}
}