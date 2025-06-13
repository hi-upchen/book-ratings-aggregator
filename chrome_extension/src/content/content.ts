console.log('content script executed!!')

import {
	renderScore2KoboBookPage,
	renderScore2KoboBookBlock,
	renderScore2KoboSearhResultItem,
	extractRatingAndNumRatings,
	extractPriceAndCurrency
} from './kobo';



import * as pchome from './pchome';
let { renderScore2PchomeRowList,
	renderScore2PchomeGridList,
	renderScore2PchomeBookPage,
	renderScore2PchomeRegionBlock4 } = pchome

import * as bokelai from './bokelai';
import * as taaze from './taaze';
import * as BookUtils from 'utils/BookUtils';
import * as DomUtils from 'utils/DomUtils';

// Kobo Site
if (location.href.match(/www\.kobo\.com/)) {
	if (location.href.match(/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/)) {
		// kobo detail book page

		let bookTitle, bookSubTitle
		const bookTitleEl = document.querySelector('.title.product-field')
		bookTitle = bookTitleEl ? bookTitleEl.textContent : null
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

		const bookSubTitleEL = document.querySelector('.subtitle.product-field')
		bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null
		bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null

		let authorEl = document.querySelector('.contributor-name')
		let author = authorEl?.textContent
		author = author ? author.trim() : null

		if (bookTitle || bookSubTitle) {
			// console.log('sendMessage', bookTitle, bookSubTitle)
			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: {
					title: bookTitle,
					subtitle: bookSubTitle,
					book: {
						source: 'kobo',
						title: bookTitle,
						subtitle: bookSubTitle,
						author: author,
						url: location.href,
						rating: null,
						numRatings: null,
						format: 'ebook'
					}
				}
			}, {}, (response) => {
				let { found, rating, numRatings } = response
				// Handle response from the background script
				console.log('Received ', bookTitle, response);

				if (found) {
					renderScore2KoboBookPage({ goodreads: response })
				}
			});
		}
	}

	// handle book containers, general book listing page eg home page, plus page, read more section
	const handleKoboBookList = () => {
		console.log('handleKoboBookList')
		let bookDetailContainerEls = document.querySelectorAll('.book-details-container')

		bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
			let bookTitle, bookSubTitle

			// fetch book title
			const bookTitleEl = bookDetailContainerEl.querySelector('.title')
			bookTitle = bookTitleEl ? bookTitleEl.textContent : null
			bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

			// fetch author
			const authorEl = bookDetailContainerEl.querySelector('.attribution.product-field .contributor-name')
				|| bookDetailContainerEl.querySelector('.attribution.product-field')

			let author = authorEl?.textContent
			author = author ? author.trim() : null

			// fetch link
			let hrefEl = findClosestAnchorElement(bookDetailContainerEl)
			let url = hrefEl ? getCurrentPageRootUrl() + hrefEl.getAttribute('href') : null

			// fetch ratings & number of ratings

			let { rating, numRatings } = extractRatingAndNumRatings(hrefEl.querySelector('.kobo.star-rating')?.getAttribute('aria-label')) || {}
			console.log("hrefEl.querySelector('.kobo.star-rating')", hrefEl.querySelector('.kobo.star-rating'), hrefEl.querySelector('.kobo.star-rating')?.getAttribute('aria-label'))
			console.log(rating, numRatings)

			// fetch pricing
			let pricingEl = bookDetailContainerEl.querySelector('.product-field.price .alternate-price-style')
				|| bookDetailContainerEl.querySelector('.product-field.price .price-value')
			let { price, currency } = extractPriceAndCurrency(pricingEl?.textContent)

			// fetch thumbnailUrl
			let coverImgEl = hrefEl.querySelector('img.cover-image')
			let thumbnailUrl = coverImgEl?.getAttribute('src')
			thumbnailUrl = thumbnailUrl && thumbnailUrl.startsWith('//') ? 'https:' + thumbnailUrl : thumbnailUrl;

			if (!bookTitle || bookTitle === '') {
				return
			}

			console.log('sendMessage detail', bookTitle)
			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: {
					title: bookTitle,
					subtitle: null,
					book: {
						source: 'kobo',
						title: bookTitle,
						subtitle: null,
						author,
						url,
						thumbnailUrl,
						rating,
						numRatings,
						price,
						currency,
						format: 'ebook'
					}
				}
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
	const checkKoboBookBlockElement = () => {
		const element = document.querySelector('.book-details-container');
		if (element) {
			clearInterval(interval); // If element exists, clear the interval and execute the function
			handleKoboBookList();
		}
	}

	// Set interval to periodically check for the element
	const interval = setInterval(checkKoboBookBlockElement, 2000); // Monitor every two seconds
	setTimeout(() => {
		clearInterval(interval);
	}, 120000); // 120000 milliseconds = 120 seconds


	// handle the search page starts
	const handleKoboSearchList = () => {
		let listBookItemEls = document.querySelectorAll('.result-items .book')

		listBookItemEls.forEach(bookItemEl => {
			const bookTitleEl = bookItemEl.querySelector('.title')
			let bookTitle = bookTitleEl ? bookTitleEl.textContent : null
			bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

			const bookSubTitleEL = bookItemEl.querySelector('.subtitle')
			let bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null
			bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null

			// fetch author
			const authorEl = bookItemEl.querySelector('.contributors.product-field .synopsis-text')
			let author = authorEl?.textContent
			author = author ? author.trim() : null

			// fetch link
			let hrefEl = bookItemEl.querySelector('.item-link-underlay')
			let url = hrefEl ? getCurrentPageRootUrl() + hrefEl.getAttribute('href') : null

			// fetch ratings & number of ratings
			let { rating, numRatings } = extractRatingAndNumRatings(bookItemEl.querySelector('.kobo.star-rating')?.getAttribute('aria-label')) || {}

			// fetch pricing
			let pricingEl = bookItemEl.querySelector('.product-field.price .alternate-price-style')
				|| bookItemEl.querySelector('.product-field.price .price-value')
			let { price, currency } = extractPriceAndCurrency(pricingEl?.textContent)

			// fetch from json
			const scriptTag = bookItemEl.querySelector('script[type="application/ld+json"]');
			let thumbnailUrl, bookFormat, type
			if (scriptTag) {
				try {
					const jsonDataString = scriptTag.textContent.trim();
					const jsonData = JSON.parse(jsonDataString);

					url = jsonData.data?.url ? jsonData.data.url : url

					thumbnailUrl = jsonData.data?.thumbnailUrl
					thumbnailUrl = thumbnailUrl && thumbnailUrl.startsWith('//') ? 'https:' + thumbnailUrl : thumbnailUrl;

					bookFormat = jsonData.data?.bookFormat?.toLowerCase()
					type = jsonData.data['@type']
				} catch (error) {
					console.error('Error parsing JSON:', error);
				}
			}


			if (!bookTitle || bookTitle === '') {
				return
			}

			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: {
					title: bookTitle,
					subtitle: bookSubTitle,
					book: {
						source: 'kobo',
						title: bookTitle,
						subtitle: bookSubTitle,
						author,
						url,
						thumbnailUrl,
						rating: rating,
						numRatings: numRatings,
						price,
						currency,
						format: bookFormat
					}
				}
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
}

// pchome books
if (location.href.match(/24h.pchome.com.tw\/books\/prod*/)) { // book detail pages
	console.log('found pchome book page', location.href)
	const handlePchomeBookDetail = () => {
		let bookContainer = document.querySelector('#DescrbContainer')

		if (!bookContainer) {
			console.error('Cannot find the book element')
			return
		}

		let bookTitle, bookSubTitle
		const bookTitleEl = bookContainer.querySelector('#NickContainer')
		bookTitle = bookTitleEl ? bookTitleEl.textContent : null
		const originalBookTitle = bookTitle
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

		// const bookSubTitleEL = bookContainer.querySelector('#SloganContainer')
		// bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null
		// bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null
		// bookSubTitle = bookSubTitle && bookSubTitle.indexOf('')>=0 ? null : bookSubTitle //  means the non-utf8 code which cannot show in the pchome pages

		if (!bookTitle || bookTitle === '') {
			console.error('Book Title is empty')
			return
		}

		// extract author, isbn
		const bookInfoEl = bookContainer.querySelector('#bookInfo')
		let author, isbn;
		if (bookInfoEl) {
			Array.from(bookInfoEl.children).forEach((child) => {
				author = BookUtils.extractAuthorFromBookInfo(child.textContent.trim()) ?? author
				isbn = BookUtils.extractISBNFromBookInfo(child.textContent.trim()) ?? isbn
			});
		}

		// extract thumbnailUrl
		const bookThumbEl = document.querySelector('#ImgContainer img')
		let thumbnailUrl = bookThumbEl?.getAttribute('src') ?? null

		// extract pricing
		let priceEls = document.querySelectorAll('#PaymentContainer .price .value')
		let price = priceEls.length ? parseInt(priceEls[priceEls.length - 1].textContent, 10) : null
		let currency = document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute('content');

		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: bookSubTitle,
				book: {
					source: 'pchome',
					title: bookTitle,
					subtitle: bookSubTitle,
					author,
					url: window.location.href,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
					isbn
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
				renderScore2PchomeBookPage(bookContainer, { goodreads: response })
			}
		});
	}

	setTimeout(() => {
		handlePchomeBookDetail() // execute when all the pchome home script finished and the title populated
	}, 100);

} else if (location.href.match(/pchome.com.tw\/books\/store*/)) { // listing pages
	////// grid book list
	const handlePchomeBookGridList = () => {
		// let bookDetailContainerEls = document.querySelectorAll('#ProdGridContainer .prod_info')
		let bookDetailContainerEls = document.querySelectorAll('.prod_info')

		bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
			let bookTitle, bookSubTitle

			// fetch book title
			const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a')
			bookTitle = bookTitleEl?.childNodes?.length ? bookTitleEl.childNodes[bookTitleEl.childNodes.length - 1].textContent : null
			const originalBookTitle = bookTitle
			bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null



			if (!bookTitle || bookTitle === '') {
				return
			}

			// extra the book link
			let url = bookTitleEl?.getAttribute('href') ?? null

			// extract author, isbn
			const bookInfoEl = bookDetailContainerEl.querySelector('.msg_box')
			let author, isbn;
			if (bookInfoEl) {
				Array.from(bookInfoEl.children).forEach((child: HTMLElement) => {
					author = BookUtils.extractAuthorFromBookInfo(child.textContent.trim()) ?? author
					isbn = BookUtils.extractISBNFromBookInfo(child.textContent.trim()) ?? isbn
				});
			}

			// extract thumbnailUrl
			const bookThumbEl = findSiblingElementBySelector(bookDetailContainerEl as HTMLElement, 'a.prod_img')
			let thumbnailUrl = bookThumbEl?.querySelector('img')?.getAttribute('src') ?? null

			// extract pricing
			let priceEls = bookDetailContainerEl.querySelectorAll('.price_box .price .value')
			let price = priceEls.length ? parseInt(priceEls[priceEls.length - 1].textContent, 10) : null
			let currency = 'TWD';

			// console.log('sendMessage detail', bookTitle)
			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: {
					title: bookTitle,
					subtitle: null,
					book: {
						source: 'pchome',
						title: bookTitle,
						subtitle: bookSubTitle,
						author,
						url,
						thumbnailUrl,
						rating: null,
						numRatings: null,
						price,
						currency,
						format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
						isbn
					}
				}
			}, {}, (response) => {
				// Handle response from the background script
				console.log('Received ', bookTitle, response);

				if (response.found) {
					renderScore2PchomeGridList(bookDetailContainerEl, { goodreads: response })
				}
			});
			return
		})
	}

	////// row book list
	const handlePchomeBookRowList = () => {
		let bookDetailContainerEls = document.querySelectorAll('#ProdListContainer .col3f')

		bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
			let bookTitle, bookSubTitle

			// fetch book title
			const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a')

			bookTitle = bookTitleEl?.childNodes?.length ? bookTitleEl.childNodes[bookTitleEl.childNodes.length - 1].textContent : null
			const originalBookTitle = bookTitle
			bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

			if (!bookTitle || bookTitle === '') {
				return
			}

			// extra the book link
			let url = bookTitleEl?.getAttribute('href') ?? null

			// extract author, isbn
			const bookInfoEl = bookDetailContainerEl.querySelector('.msg_box')
			let author, isbn;
			if (bookInfoEl) {
				Array.from(bookInfoEl.children).forEach((child: HTMLElement) => {
					author = BookUtils.extractAuthorFromBookInfo(child.textContent.trim()) ?? author
					isbn = BookUtils.extractISBNFromBookInfo(child.textContent.trim()) ?? isbn
				});
			}

			// extract thumbnailUrl
			const bookThumbEl = bookDetailContainerEl.querySelector('.prod_img')
			let thumbnailUrl = bookThumbEl?.querySelector('img')?.getAttribute('src') ?? null

			// extract pricing
			let priceEls = bookDetailContainerEl.querySelectorAll('.price_box .price .value')
			let price = priceEls.length ? parseInt(priceEls[priceEls.length - 1].textContent, 10) : null
			let currency = 'TWD';

			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: {
					title: bookTitle,
					subtitle: null,
					book: {
						source: 'pchome',
						title: bookTitle,
						subtitle: bookSubTitle,
						author,
						url,
						thumbnailUrl,
						rating: null,
						numRatings: null,
						price,
						currency,
						format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
						isbn
					}
				}
			}, {}, (response) => {
				// Handle response from the background script
				console.log('Received ', bookTitle, response);

				if (response.found) {
					renderScore2PchomeRowList(bookDetailContainerEl, { goodreads: response })
				}
			});

			return
		})
	}

	///// monitor ajax changes
	let funcHasExecuted; // Define the observer variable outside the function
	const registerMonitorPageChanges = () => {
		if (funcHasExecuted) {
			// If observer is already defined, do nothing
			return;
		}
		funcHasExecuted = true

		// Select the target node
		let monitoredNodeNCallbackFnMap: Array<{ node: Element, callback: Function }> = [
			{
				node: document.querySelector('#ProdGridContainer'),
				callback: handlePchomeBookGridList
			},
			{
				node: document.querySelector('#ProdListContainer'),
				callback: handlePchomeBookRowList
			}
		]

		// Options for the observer (which mutations to observe)
		var config = { childList: true, subtree: false };

		monitoredNodeNCallbackFnMap.forEach((item: { node: Element, callback: Function }) => {
			let timer;

			// Create an observer instance linked to the callback function
			let observer = new MutationObserver((mutationsList, observer) => {
				clearTimeout(timer);
				// console.log('A child node has been added or removed.');
				// Set a new timer to execute the callback after 500 milliseconds (adjust as needed)
				timer = setTimeout(() => item.callback(), 500);
			});

			// Start observing the target node for configured mutations
			observer.observe(item.node, config);
		});
	}
	registerMonitorPageChanges()
} else if (location.href.match(/pchome.com.tw\/books\/region*/) || location.href.match(/pchome.com.tw\/books\/newarrival*/)) { // region home page
	const handlePchomeRegionHomePageGridList = () => {
		// let bookDetailContainerEls = document.querySelectorAll('#Block2Container .prod_info, #Block4Container .prod_info, #Block5Container .prod_info, #newarrival')
		let bookDetailContainerEls = document.querySelectorAll('.prod_info')

		bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
			let bookTitle, bookSubTitle

			// fetch book title
			const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a')

			// Initialize an empty string to store the extracted text
			bookTitle = '';
			// Iterate through the child nodes of the <a> element
			bookTitleEl.childNodes.forEach(node => {
				// console.log('node.nodeName.toLowerCase()', node.nodeName.toLowerCase(), node)
				if (node.nodeType === Node.TEXT_NODE || node.nodeName.toLowerCase() === 'b') {
					// console.log('node.nodeType', node.nodeName, node.nodeType, node, node.textContent)
					bookTitle += node.textContent;
				}
			});

			// bookTitle = bookTitleEl?.firstChild?.textContent
			const originalBookTitle = bookTitle
			bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

			let url = bookTitleEl?.getAttribute('href') ?? null

			if (!bookTitle || bookTitle === '') {
				return
			}

			// extract author, isbn
			const bookInfoEl = bookDetailContainerEl.querySelector('.msg_box')
			let author, isbn;
			if (bookInfoEl) {
				Array.from(bookInfoEl.children).forEach((child: HTMLElement) => {
					author = BookUtils.extractAuthorFromBookInfo(child.textContent.trim()) ?? author
					isbn = BookUtils.extractISBNFromBookInfo(child.textContent.trim()) ?? isbn
				});
			}

			// extract thumbnailUrl
			const bookThumbEl = findSiblingElementBySelector(bookDetailContainerEl as HTMLElement, 'a.prod_img')
			let thumbnailUrl = bookThumbEl?.querySelector('img')?.getAttribute('src') ?? null

			// extract pricing
			let priceEls = bookDetailContainerEl.querySelectorAll('.price_box .price .value')
			let price = priceEls.length ? parseInt(priceEls[priceEls.length - 1].textContent, 10) : null
			let currency = 'TWD';

			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: {
					title: bookTitle,
					subtitle: null,
					book: {
						source: 'pchome',
						title: bookTitle,
						subtitle: bookSubTitle,
						author,
						url,
						thumbnailUrl,
						rating: null,
						numRatings: null,
						price,
						currency,
						format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
						isbn
					}
				}
			}, {}, (response) => {
				// Handle response from the background script
				console.log('Received ', bookTitle, response);

				if (response.found) {
					renderScore2PchomeRegionBlock4(bookDetailContainerEl, { goodreads: response })
				}
			});

			return
		})
	}

	setTimeout(() => {
		handlePchomeRegionHomePageGridList()
	}, 500);
}

// 博客來 Site
if (location.href.match(/www.books.com.tw\/products.*/)) { // book detail pages
	bokelai.handleBookDetailPage(document)
} else if (location.href.match(/www.books.com.tw\/.*book.*/)) { // 博客來小分頁, https://www.books.com.tw/web/books/
	bokelai.handleCategorySlideShow(document)
	bokelai.handleBookRankingList(document)
	bokelai.handleTwoColumnBookList(document)
} else if (location.href.match(/activity.books.com.tw\/crosscat/)) { // 博客來小活動頁面, https://activity.books.com.tw/crosscat/show/A00000069231
	bokelai.handleCrosscat3Column(document)
} else if (location.href.match(/www.books.com.tw/)) { // 博客來首頁, should be put at last priority
	let homepageObserver
	let executed = false; // Flag to track if the function has been executed

	// Function to handle the homepage
	const handleHomePageOnce = () => {
		if (!executed) { // Check if the function has not been executed already
			bokelai.handleHomePage(document); // Execute the function
			executed = true; // Set the flag to indicate that the function has been executed
			if (homepageObserver) {
				homepageObserver.disconnect(); // Disconnect the observer
			}
		}
	};

	// Check if the initial condition is already met
	if (document.querySelectorAll('section[the_area="bk"] .item').length > 0) {
		// If the condition is met, execute the function immediately
		handleHomePageOnce();
	} else {
		// If the condition is not met, set up a MutationObserver to monitor the DOM changes
		homepageObserver = new MutationObserver(function (mutationsList, observer) {
			// Check if the condition is met after each mutation
			if (document.querySelectorAll('section[the_area="bk"] .item').length > 0) {
				handleHomePageOnce();
			}
		});

		// Start observing the DOM with the specified configuration
		homepageObserver.observe(document.body, { subtree: true, childList: true });
	}
}

// 讀冊 taaze
if (location.href.match(/www.taaze.tw\/index.html/)) { // index page
	DomUtils.observeNodeAppearance('.bookGrid:not(.bra-processed)', () => {taaze.handleHomePage(document)})
	DomUtils.observeNodeAppearance('.avivid_item:not(.bra-processed)', () => { taaze.handleBookDetailAvividItems(document); }); // 其他人也看了, 你剛剛看了
} else if (location.href.match(/www.taaze.tw\/products/) || location.href.match(/www.taaze.tw\/usedList/)) { // book detail pages
	taaze.handleBookDetailPage(document);
	DomUtils.observeNodeAppearance('.avivid_item:not(.bra-processed)', () => { taaze.handleBookDetailAvividItems(document); }); // 其他人也看了, 你剛剛看了
} else if (location.href.match(/www.taaze.tw\/rwd_list/)) { 
	// sample https://www.taaze.tw/rwd_list.html?t=14&k=01&d=00
	// sample https://www.taaze.tw/rwd_listView.html?t=14&k=01&d=00&a=00&c=030000000000&l=1
	
	DomUtils.observeNodeAppearance('.bookGridByListView:not(.bra-processed), .listBookGrid:not(.bra-processed)', 
		() => { taaze.handleRWDListPage(document); });
	DomUtils.observeNodeAppearance('.avivid_item:not(.bra-processed)', 
		() => { taaze.handleBookDetailAvividItems(document); }); // 其他人也看了, 你剛剛看了

	taaze.handleRWDListPageBestSellArea(document);
} else if (location.href.match(/www.taaze.tw\/rwd_searchResult/)) { // 搜尋頁面
	DomUtils.observeNodeAppearance('.info_frame:not(.bra-processed)', () => { taaze.handleSearchPage(document); });
} else if (location.href.match(/activity.taaze.tw\/home/)) { // 活動頁面
	// https://activity.taaze.tw/activity_y.html?masNo=1000688028&tmpName=imgUntil&_gl=1*1f4c50x*_gcl_au*MTMzNzEzNzgzNC4xNzE2MDAwNzEy*_ga*MTgyNDA0Njg3NS4xNzA2ODU3ODc4*_ga_CK2C80VFK8*MTcxNjEwMTcwMS4zLjEuMTcxNjEwNTI2Ny41NS4wLjA.
	DomUtils.observeNodeAppearance('.act_products:not(.bra-processed)', () => { taaze.handleActivityHomePage(document); });
	taaze.handleActivityHomePage(document)
} else if (location.href.match(/activity.taaze.tw\/activity_y/) || location.href.match(/activity.taaze.tw\/toActivityUnitItem/) ) { // 額外的活動頁面
	// https://activity.taaze.tw/activity_y.html?masNo=1000687646&tmpName=imgUntil
	// https://activity.taaze.tw/toActivityUnitItem.html?unitNO=1000440965&masNo=1000687646&current_page=1&tmpName=imgUntil#bodys
	taaze.handleActivityUnitPage(document)

}

function findClosestAnchorElement(element) {
	let parentElement = element.parentElement;

	// Traverse up the DOM tree until we find the closest <a> element or reach the top (document)
	while (parentElement !== null) {
		if (parentElement.tagName === 'A') {
			return parentElement; // Found the closest <a> element
		}
		parentElement = parentElement.parentElement; // Move up to the parent element
	}

	return null; // No <a> element found in the ancestor elements
}

/**
 * Finds the first sibling element of the given HTML element that matches the provided CSS selector.
 * @param element The HTML element whose sibling is to be found.
 * @param selector The CSS selector used to find the sibling element.
 * @param direction The direction to search for the sibling element. Use 'previous' to search preceding siblings, 'next' to search following siblings, or 'both' to search in both directions. Default is 'both'.
 * @returns The first sibling element matching the selector, or null if not found.
 */
function findSiblingElementBySelector(element: HTMLElement, selector: string, direction: 'previous' | 'next' | 'both' = 'both'): HTMLElement | null {
	let sibling: HTMLElement | null = null;

	if (direction === 'previous' || direction === 'both') {
		sibling = element.previousElementSibling as HTMLElement;
		while (sibling) {
			if (sibling.matches(selector)) {
				return sibling;
			}
			sibling = sibling.previousElementSibling as HTMLElement;
		}
	}

	if (direction === 'next' || direction === 'both') {
		sibling = element.nextElementSibling as HTMLElement;
		while (sibling) {
			if (sibling.matches(selector)) {
				return sibling;
			}
			sibling = sibling.nextElementSibling as HTMLElement;
		}
	}

	return null;
}

function getCurrentPageRootUrl(): string {
	// Get the protocol, hostname, and port of the current page
	const { protocol, hostname, port } = window.location;

	// Construct the root URL with the ending '/'
	const rootUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;

	return rootUrl;
}