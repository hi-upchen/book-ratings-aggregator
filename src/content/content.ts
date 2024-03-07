console.log('content script executed!!')

import { cleanBookTitle,
	renderScore2KoboBookPage,
	generateBookPageRatingDiv,
	renderScore2KoboBookBlock,
	generateBookBlockRatingDiv,
	renderScore2KoboSearhResultItem } from './kobo.ts';


if (location.href.match(/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/)) {
	// The current URL matches the pattern
	console.log('The current URL is a Kobo eBook page.');
} else if (location.href.match(/^https:\/\/www\.kobo\.com\/.*\/search.*/)) {
	// The current URL matches the pattern
	console.log('The current URL is a Kobo search page.');
} else {
	// The current URL does not match the pattern
	console.log('The current URL is not a Kobo eBook page.');
}


if (location.href.match(/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/)) {
	// The current URL matches the pattern
	console.log('The current URL is a Kobo eBook page.');

	let bookTitle, bookSubTitle
	const bookTitleEl = document.querySelector('.title.product-field')
	bookTitle = bookTitleEl ? bookTitleEl.textContent : null
	bookTitle = bookTitle ? cleanBookTitle(bookTitle) : null

	const bookSubTitleEL = document.querySelector('.subtitle.product-field')
	bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null
	bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null

	if (bookTitle || bookSubTitle) {
		// console.log('sendMessage', bookTitle, bookSubTitle)
		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: { title: bookTitle, subtitle: bookSubTitle }
		}, {}, (response) => {
			let { found, rating, numRatings } = response
			// Handle response from the background script
			// console.log('Received response from background script:', response);

			if (found) {
				renderScore2KoboBookPage({ goodreads: response })
			}
		});
	}
}

// handle book containers, general book listing page eg home page, plus page, read more section
const handleBookList = () => {
	let bookDetailContainerEls = document.querySelectorAll('.book-details-container')

	bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
		let bookTitle, bookSubTitle

		// fetch book title
		const bookTitleEl = bookDetailContainerEl.querySelector('.title')
		bookTitle = bookTitleEl ? bookTitleEl.textContent : null
		bookTitle = bookTitle ?  cleanBookTitle(bookTitle) : null

		if (!bookTitle || bookTitle === '') {
			return
		}

		// console.log('sendMessage detail', bookTitle)
		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: { title: bookTitle, subtitle: null }
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
				renderScore2KoboBookBlock(bookDetailContainerEl, { goodreads: response })
			}
		});
	})
}

// since the list may load async, we need to monitor when its loaded
// Function to check if the element exists and execute the function
function checkElement() {
	const element = document.querySelector('.book-details-container');
	if (element) {
		clearInterval(interval); // If element exists, clear the interval and execute the function
		handleBookList();
	}
}

// Set interval to periodically check for the element
const interval = setInterval(checkElement, 2000); // Monitor every two seconds
setTimeout(() => {
	clearInterval(interval);
}, 120000); // 120000 milliseconds = 120 seconds


// handle the search page starts
const handleKoboSearchList = () => {
	let listBookItemEls = document.querySelectorAll('.result-items .book')

	listBookItemEls.forEach(bookItemEl => {
		const bookTitleEl = bookItemEl.querySelector('.title')
		let bookTitle = bookTitleEl ? bookTitleEl.textContent : null
		bookTitle = bookTitle ?  cleanBookTitle(bookTitle) : null

		const bookSubTitleEL = bookItemEl.querySelector('.subtitle')
		let bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null
		bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null

		if (!bookTitle || bookTitle === '') {
			return
		}

		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: { title: bookTitle, subtitle: bookSubTitle }
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
				renderScore2KoboSearhResultItem(bookItemEl, { goodreads: response })
			}
		});
	})
}
handleKoboSearchList()