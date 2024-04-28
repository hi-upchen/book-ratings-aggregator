import * as cheerio from 'cheerio';
import {
	RetrievedGoodreadsBookInfo, 
	RetrievedKoboBookInfo, 
	RetrievedPchomeBookInfo } from 'types/RetrievedBookInfo'

function isChinese(str: string): boolean {
	// Regular expression to match Chinese characters (both simplified and traditional)
	const cleanstr = str.replace(/[^\u4E00-\u9FFF\u3400-\u4DBFa-zA-Z]/g, '');
	const chineseRegex: RegExp = /^[\u4E00-\u9FFF\u3400-\u4DBF]+$/;
	return chineseRegex.test(cleanstr);
}

function isEnglish(str: string): boolean {
	// Regular expression to match English letters
	const cleanstr = str.replace(/[^\u4E00-\u9FFF\u3400-\u4DBFa-zA-Z]/g, '');
	const englishRegex: RegExp = /^[a-zA-Z]+$/;
	return englishRegex.test(cleanstr);
}

function containsChinese(str: string): boolean {
	// Regular expression to match Chinese characters
	const chineseRegex: RegExp = /[\u4E00-\u9FFF]/;
	return chineseRegex.test(str);
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		// Check the message type
		if (message.type === 'greeting') {
			// Handle greeting message
			console.log('Received greeting from content script:', message.data);

			// Send a response back to the content script
			sendResponse({ type: 'response', data: 'Hello from the background script!' });
		} else if (message.type === 'otherMessageType') {
			// Handle other types of messages
			// ...
		} else if (message.type === 'FETCH_RATING_WITH_BOOK_TITLE') {
			console.log('FETCH_RATING_WITH_BOOK_TITLE', message.data)

			// Generate the storage key
			const storageKey = message.data.title + (message.data.subtitle ? '-' + message.data.subtitle : '');

			let fetchedBook = {}

			// Check if the book rating is stored locally
			chrome.storage.local.get(storageKey, async (result) => {
				const storedData = result[storageKey];
				if (storedData) {
					// Use stored data
					// console.log('Found stored data with rating for', storageKey, storedData);
					sendResponse(storedData);
				} else {
					// Fetch from Goodreads
					console.log('Search Goodreads:', message.data);
					let response = await fetchGoodreadsRatingbyBookName(message.data);
					// Save fetched data to local storage
					const timestamp = Date.now();
					chrome.storage.local.set({ [storageKey]: { ...response, timestamp } });
					chrome.storage.local.set({ [message.data.title]: { ...response, timestamp } });

					sendResponse(response);

					// Send goodreads data to the server
					fetchedBook = {goodreads: {...response, title: message.data.title, subtitle: message.data.subtitle}}
					sendDataToServer(fetchedBook);
				}

				// only send to pchome, kobo books to server when it's new to local
				if ( !storedData || message.data.book?.isbn || message.data.book?.rating) {
					sendDataToServer({
						[message.data.book.source]: message.data.book
					});
				}
			});
		}
	})()

	return true
});

const fetchGoodreadsRatingbyBookName = async ({ title, subtitle }) : Promise<RetrievedGoodreadsBookInfo>=> {
	// fetchGoodreadsRatingbyBookName(bookName: string)
	let found = false
	let greadsBookUrl,
		greadsBookTitle,
		rating,
		numRatings

	let bookTitleToSearch = title
	if ( !containsChinese(title)) {
		bookTitleToSearch = title
		console.log(`Use non-chinese book name ${bookTitleToSearch} to search`)
	} else if (subtitle && !containsChinese(subtitle)) {
		bookTitleToSearch = subtitle
		console.log(`Use original book name ${bookTitleToSearch} to search instead of ${title}`)
	}

	// Step 1: Fetch HTML content of webpage
	const response = await fetch(`https://www.goodreads.com/search?q=${encodeURIComponent(bookTitleToSearch)}`);
	const htmlContent = await response.text();

	// Step 2: Create a new HTML document
	const $ = cheerio.load(htmlContent);

	const foundBookEl = $('table.tableList tr[itemtype="http://schema.org/Book"]').first();

	if (!foundBookEl.length) {
		console.warn(`Cannot find book with name ${title}`);
		return { found, rating, numRatings };
	}

	found = true

	foundBookEl.find('a.bookTitle').each((index, element) => {
		greadsBookUrl = $(element).attr('href');
		greadsBookTitle = $(element).text().trim();
	});

	foundBookEl.find('.minirating').each((index, element) => {
		const minratingTxt = $(element).text() || '';
		const ratingRegex = /(\d+\.\d{2}) avg rating — ([\d,]+) rating/;
		const match = minratingTxt.match(ratingRegex);
		if (match) {
			rating = parseFloat(match[1]);
			numRatings = parseInt(match[2].replace(/,/g, ''));
		} else {
			console.warn('No match found for string:', minratingTxt);
		}
	});


	// Do something with the target element
	// console.log(targetElement);

	return {
		found,
		rating,
		numRatings,
		url: `https://www.goodreads.com${greadsBookUrl}`,
		title: greadsBookTitle
	} || {
		found: false
	}
}


/**
 * Cleans cached Goodreads data based on specified criteria.
 * Deletes entries from local storage according to timestamp and response properties.
 */
const cleanSomeCachedGoodreads = () => {
	chrome.storage.local.get(null, (result) => {
			Object.keys(result).forEach((key) => {
					// Check timestamp and response properties
					const { timestamp, found, numReviews } = result[key];
					const now = Date.now();
					const daysElapsed = timestamp ? (now - timestamp) / (1000 * 60 * 60 * 24) : 21;

					// Check conditions for deletion
					if (!found && daysElapsed >= 3 && Math.random() < 0.3) {
							chrome.storage.local.remove(key);
							console.log(`remove title:${key} daysElapsed:${daysElapsed} from cache`)
					} else if (numReviews <= 100 && daysElapsed >= 7 && Math.random() < 0.3) {
							chrome.storage.local.remove(key);
							console.log(`remove title:${key} daysElapsed:${daysElapsed} from cache`)
					} else if (numReviews <= 1000 && daysElapsed >= 14 && Math.random() < 0.3) {
							chrome.storage.local.remove(key);
							console.log(`remove title:${key} daysElapsed:${daysElapsed} from cache`)
					} else if (numReviews > 1000 && daysElapsed >= 14 && Math.random() < 0.1) {
							chrome.storage.local.remove(key);
							console.log(`remove title:${key} daysElapsed:${daysElapsed} from cache`)
					}
			});
	});
}
cleanSomeCachedGoodreads()


const sendDataToServer = async (data) => {
	try {
		let serverUrl = '';

		if (process.env.NODE_ENV === 'development') {
				serverUrl = 'http://localhost:3000/api/book';
		} else {
				serverUrl = 'https://book-ratings-aggregator.runawayup.com/api/book';
		}

		const serverResponse = await fetch(serverUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});
		const responseData = await serverResponse.json();
		console.log('sendDataToServer response:', responseData.goodreads?.title || responseData.kobo?.title ||  responseData.pchome?.title || responseData.bokelai?.title, responseData);
	} catch (error) {
		console.error('Error sending data to server:', error);
	}
}