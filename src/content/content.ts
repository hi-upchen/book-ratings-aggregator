console.log('content script executed!!')

import { cleanBookTitle,
	renderScore2KoboBookPage,
	generateBookPageRatingDiv,
	renderScore2KoboBookBlock,
	renderScore2KoboSearhResultItem } from './kobo.ts';

import {renderScore2PchomeRowList, 
	renderScore2PchomeGridList,
	renderScore2PchomeBookPage,
	renderScore2PchomeRegionBlock4} from './pchome.ts'


// Kobo Site
if (location.href.match(/www\.kobo\.com/)) {
	if (location.href.match(/^https:\/\/www\.kobo\.com\/.*\/ebook\/.*/)) {
		// The current URL matches the pattern
		// console.log('The current URL is a Kobo eBook page.');
	
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
	const handleKoboBookList = () => {
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
	function checkKoboBookBlockElement() {
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
}

// pchome books
if (location.href.match(/24h.pchome.com.tw\/books\/prod*/)) { // book detail pages
	console.log('found pchome book page', location.href)
	const handlePchomeBookDetail = () => {
		let bookContainer = document.querySelector('#DescrbContainer')

		if ( !bookContainer) {
			console.error('Cannot find the book element')
			return
		}

		let bookTitle, bookSubTitle
		const bookTitleEl = bookContainer.querySelector('#NickContainer')
		bookTitle = bookTitleEl ? bookTitleEl.textContent : null
		bookTitle = bookTitle ? cleanBookTitle(bookTitle) : null

		const bookSubTitleEL = bookContainer.querySelector('#SloganContainer')
		bookSubTitle = bookSubTitleEL ? bookSubTitleEL.textContent : null
		bookSubTitle = bookSubTitle ? bookSubTitle.trim() : null
		bookSubTitle = bookSubTitle && bookSubTitle.indexOf('')>=0 ? null : bookSubTitle //  means the non-utf8 code which cannot show in the pchome pages

		if ( !bookTitle || bookTitle==='') {
			console.error('Book Title is empty')
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
				renderScore2PchomeBookPage(bookContainer, { goodreads: response })
			}
		});
	}
	
	setTimeout(() => {
		handlePchomeBookDetail() // execute when all the pchome home script finished and the title populated
	}, 100);
 
} else if (location.href.match(/pchome.com.tw\/books\/store*/)) { // listing pages
	// console.log('found pchome list page', location.href)

	////// grid book list
	const handlePchomeBookGridList = () => {
		// let bookDetailContainerEls = document.querySelectorAll('#ProdGridContainer .prod_info')
		let bookDetailContainerEls = document.querySelectorAll('.prod_info')

		bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
			let bookTitle, bookSubTitle

			// fetch book title
			const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a')

			bookTitle = bookTitleEl?.childNodes?.length ? bookTitleEl.childNodes[bookTitleEl.childNodes.length - 1].textContent : null
			bookTitle = bookTitle ? cleanBookTitle(bookTitle) : null

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
					renderScore2PchomeGridList(bookDetailContainerEl, { goodreads: response })
				}
			});
			return
		})
	}

	////// row book list
	const handlePchomeBookRowList = () => {
		let bookDetailContainerEls = document.querySelectorAll('#ProdListContainer .c2f')

		bookDetailContainerEls.forEach((bookDetailContainerEl, idx) => {
			let bookTitle, bookSubTitle

			// fetch book title
			const bookTitleEl = bookDetailContainerEl.querySelector('.prod_name a')

			bookTitle = bookTitleEl?.childNodes?.length ? bookTitleEl.childNodes[bookTitleEl.childNodes.length - 1].textContent : null
			bookTitle = bookTitle ? cleanBookTitle(bookTitle) : null

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
		let monitoredNodeNCallbackFnMap: [{node: Element, callback: Function}]= [
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

		monitoredNodeNCallbackFnMap.forEach((item: {node: Element, callback: Function}) => {
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
			bookTitle = bookTitle ? cleanBookTitle(bookTitle) : null

			if (!bookTitle || bookTitle === '') {
				return
			}

			console.log('sendMessage detail', bookTitle)
			// Send a message to the background script
			chrome.runtime.sendMessage({
				type: 'FETCH_RATING_WITH_BOOK_TITLE',
				data: { title: bookTitle, subtitle: null }
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