import {
	RetrievedGoodreadsBookInfo, 
	RetrievedKoboBookInfo, 
	RetrievedPchomeBookInfo } from 'types/RetrievedBookInfo'

import * as BookUtils from 'utils/BookUtils';

/**
 * Extracts the rating and number of ratings from the given string.
 * @param ratingString The string containing the rating and number of ratings.
 * @returns An object containing the extracted rating and number of ratings.
 */
export const extractRatingAndNumRatings = (ratingString: string): { rating: number, numRatings: number } | null => {
	if ( !ratingString || ratingString==='') {
		return null;
	}

	const regex = /Rated ([\d.]+) out of 5 stars\s*(with (\d+) ratings)?/;
	const match = ratingString.match(regex);

	if (match) {
			const rating = parseFloat(match[1]);
			const numRatings = match[3] ? parseInt(match[3]) : null;
			return { rating, numRatings };
	}

	return null; // Return null if the string format doesn't match
}

/**
 * Extracts the price and currency text from the given subtext.
 * @param subtext The subtext containing the price and currency.
 * @returns An object containing the extracted price and currency.
 */
export const extractPriceAndCurrency = (subtext: string): { price: Number, currency: string } => {
	if (!subtext) {
		return {price:null, currency:null}
	}

	// Use regular expressions to extract the price and currency
	const priceRegex = /(NT)?\$(\d+(\.\d+)?)\s*(\w+)?/i;
	const matches = subtext.match(priceRegex);
	
	// Check if matches were found
	if (matches && matches.length >= 5) {
			// Extract the price and currency
			const price = parseFloat(matches[2]);
			const currency = matches[4]?.toUpperCase() || 'NTD'; // Extracted currency, converted to uppercase

			return { price, currency };
	} else {
			return {price: null, currency: null}
	}
}

export const renderScore2KoboBookPage = async ({ goodreads }: {goodreads: RetrievedGoodreadsBookInfo}) => {
	// find the target place
	// const targetElement = document.querySelector('#RatingsBrief');
	const targetElement = document.querySelector('.sidebar-group .category-rankings');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = generateBookPageRatingDiv({ goodreads })

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

export const generateBookPageRatingDiv = ({ goodreads }: {goodreads: RetrievedGoodreadsBookInfo}): HTMLElement => {
	const maxRating = 5
	const {title, rating, numRatings, url} = goodreads

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
	totalRatingsSpan.textContent = ''+rating
	aElement.appendChild(totalRatingsSpan);

	// Add num of ratings
	const numRatingsSpan = document.createElement('span');
	numRatingsSpan.classList.add('bra-num-ratings');
	numRatingsSpan.textContent = BookUtils.formatNumberToKMStyle(numRatings)
	aElement.appendChild(numRatingsSpan);

	const rightParenthesis = document.createElement('span');
	rightParenthesis.textContent = ')';
	aElement.appendChild(rightParenthesis);

	return aElement
}

export const renderScore2KoboBookBlock = async (bookBlockEL, { goodreads }: {goodreads: RetrievedGoodreadsBookInfo}) => {
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


export const generateBookBlockRatingDiv_inNumbers = ({ goodreads }: {goodreads: RetrievedGoodreadsBookInfo}): HTMLElement => {
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
	totalRatingsSpan.textContent = ''+rating
	ratingDiv.appendChild(totalRatingsSpan);

	// Add num of ratings
	const numRatingsSpan = document.createElement('span');
	numRatingsSpan.classList.add('bra-num-ratings');
	numRatingsSpan.textContent = BookUtils.formatNumberToKMStyle(numRatings)
	ratingDiv.appendChild(numRatingsSpan);

	return ratingDiv;
}

export const generateBookBlockRatingDiv_AllStarts = ({ goodreads }: {goodreads: RetrievedGoodreadsBookInfo}): HTMLElement => {
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

export const renderScore2KoboSearhResultItem = async (bookItemEl, {goodreads}: {goodreads: RetrievedGoodreadsBookInfo}) => {
	// find the target place
	// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('renderScore2KoboSearhResultItem bookItemEl', bookItemEl, goodreads)
	const targetElement = bookItemEl.querySelector('.star-rating') || bookItemEl.querySelector('.synopsis')

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