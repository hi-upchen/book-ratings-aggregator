
console.log('background scripting is executing!!')
import * as cheerio from 'cheerio';

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

			console.log('got message FETCH_RATING_WITH_BOOK_TITLE', message)

			let response = await fetchGoodreadsRatingbyBookName(message.data)
			sendResponse(response)
		}
	})()

	return true
});

const fetchGoodreadsRatingbyBookName = async ({ title, subtitle }) => {
	// fetchGoodreadsRatingbyBookName(bookName: string)
	let found = false
	let greadsBookUrl, 
		greadsBookTitle, 
		rating, 
		numRatings

	let bookTitleToSearch = title
	if (subtitle && isEnglish(subtitle)) {
		bookTitleToSearch = subtitle
		console.log(`Use english book name ${bookTitleToSearch} to search instead of ${title}`)
	}

	// Step 1: Fetch HTML content of webpage
	const response = await fetch(`https://www.goodreads.com/search?q=${encodeURIComponent(bookTitleToSearch)}`);
	const htmlContent = await response.text();

	// Step 2: Create a new HTML document
	// const doc = document.createElement('div');
	// doc.innerHTML = htmlContent
	// const parser = new DOMParser();
	// const doc = parser.parseFromString(htmlContent, 'text/html');
	// Step 4: Use Cheerio selectors to find the element in the fetched HTML
	const $ = cheerio.load(htmlContent);

	const foundBookEl = $('table.tableList tr[itemtype="http://schema.org/Book"]').first();
	console.log('foundBookEl', foundBookEl);

	if (!foundBookEl.length) {
		console.warn(`Cannot find book with name ${title}`);
		return { found, rating, numRatings};
	}

	found = true

	foundBookEl.find('a.bookTitle').each((index, element) => {
		greadsBookUrl = $(element).attr('href');
		greadsBookTitle = $(element).text().trim();
		console.log('greadsBookUrl', greadsBookUrl);
		console.log('greadsBookTitle', greadsBookTitle);
	});

	foundBookEl.find('.minirating').each((index, element) => {
		const minratingTxt = $(element).text() || '';
		const ratingRegex = /(\d+\.\d{2}) avg rating — ([\d,]+) ratings/;
		const match = minratingTxt.match(ratingRegex);
		if (match) {
			rating = parseFloat(match[1]);
			numRatings = parseInt(match[2].replace(/,/g, ''));
			console.log('Rating:', rating);
			console.log('Number of Ratings:', numRatings);
		} else {
			console.log('No match found for string:', minratingTxt);
		}
	});


	// Do something with the target element
	// console.log(targetElement);

	return { found, 
		rating, 
		numRatings,
		url: `https://www.goodreads.com${greadsBookUrl}`,
		title: greadsBookTitle } || {}
}
