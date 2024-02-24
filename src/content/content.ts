console.log('content script executed!!')

let bookTitle, bookSubTitle
const bookTitleEl = document.querySelector('.title.product-field')
bookTitle = bookTitleEl ? bookTitleEl.textContent : null


console.log('bookTitle', bookTitle)


const bookSubTitleEL = document.querySelector('.subtitle.product-field')
bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null


console.log('bookSubTitle', bookSubTitle)



if (bookTitle || bookSubTitle) {
	console.log('sendMessage', bookTitle, bookSubTitle)
	// Send a message to the background script
	chrome.runtime.sendMessage({
		type: 'FETCH_RATING_WITH_BOOK_TITLE',
		data: { title: bookTitle, subtitle: bookSubTitle }
	}, {}, (response) => {
		let { found, rating, numRatings } = response
		// Handle response from the background script
		console.log('Received response from background script:', response);

		if (found) {
			renderScore2KoboBookPage({ goodreads: response })
		}
	});
}

const renderScore2KoboBookPage = async ({ goodreads: { rating, numRatings, url, title } }) => {
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
		console.error('Target element not found');
	}
}

const generateBookPageRatingDiv = ({ goodreads: { rating, numRatings, url, title } }): HTMLElement => {
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

	// Create and append the total ratings span
	const totalRatingsSpan = document.createElement('span');
	totalRatingsSpan.classList.add('total-ratings');
	totalRatingsSpan.setAttribute('aria-hidden', 'true');
	totalRatingsSpan.setAttribute('translate', 'no');
	totalRatingsSpan.textContent = '('+numRatings.toLocaleString()+')';
	aElement.appendChild(totalRatingsSpan);

	console.log('aElement', aElement)
	return aElement
}


// const fetchGoodreadsRatingbyBookName = (bookName: string) => {
// 	// fetchGoodreadsRatingbyBookName(bookName: string)
// }

// TODO functions

// // backend script:
// - fetchGoodreadsRatingbyBookName(bookName: string)
// - fetchGoodreadsRatingbyBookNames([string, ...])

// // frontend script
// - fetchBookInfoFromKoboBookPage(): {title:string, subTitle:string}
// - fetchBooksInfoFromKoboBookListPage(): [{title:string, subTitle:string}, ...]
// - renderScore2KoboBookPage({goodreads: {rating, numRatings, numReviews}})
// - renderScore2KoboListPage({bookName: {goodreads: {rating, numRatings, numReviews}}, ...})