
// 博客來
import {RetrievedGoodreadsBookInfo, RetrievedBooksBookInfo} from 'types/RetrievedBookInfo'
import * as BookUtils from './../BookUtils.ts';

/**
 * Resolve the book info from breadcrumb texts
 * @param breadcrumbTexts Array<String>
 * @returns Object | null
 */
export const resolveBookInfoFromBreadcrumbText = (breadcrumbTexts: Array<String>): 
  { 
    language: String, 
    format?: "digital" | "physical" | "audio",
    isMagazine: Boolean
  } | null => {

  if ( !breadcrumbTexts || breadcrumbTexts.length==0) {
    return null
  }

  const bookBreadcrumbInfoMap = {
    "中文電子書": {language: 'zh-TW', format: 'digital', isMagazine: false},
    "中文書": {language: 'zh-TW', format: 'physical', isMagazine: false},
    
    "簡體書": {language: 'zh-CN', format: 'physical', isMagazine: false},
    "日文書．MOOK": {language: 'ja', format: 'physical', isMagazine: true},

    "中文雜誌": {language: 'zh-TW', format: 'physical', isMagazine: true},
    "電子雜誌": {language: null, format: 'physical', isMagazine: true},
    "有聲書": {language: null, format: 'audio', isMagazine: false}, 

    "外文書": {language: 'en-US', format: 'physical', isMagazine: false},
  }

  for (let key in bookBreadcrumbInfoMap) {
    const v = bookBreadcrumbInfoMap[key]
    if (breadcrumbTexts.indexOf(key)>=0) {
      return v
    }
  }

  return null
}

export const renderScore2BookPage = (bookItemEl, { goodreads }: { goodreads: RetrievedGoodreadsBookInfo }) => {
  const targetElement = bookItemEl.querySelector('h1')?.parentNode; // use the first one

  // Check if the target element exists
  if (targetElement) {
    // Insert the new element next to the target element
    const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads })

    // Create and append the icon element
    const iconSpan = document.createElement('span');
    iconSpan.classList.add('goodreads-icon');
    ratingEl.insertAdjacentHTML('afterbegin', iconSpan.outerHTML);

    // wrap into div
    const ratingBriefEl = document.createElement('a');
    ratingBriefEl.href = goodreads.url;
    ratingBriefEl.title = `${goodreads.title} ${goodreads.rating} avg rating — ${goodreads.numRatings.toLocaleString()} ratings`;
    ratingBriefEl.target = "_blank";
    ratingBriefEl.appendChild(ratingEl);

    // targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
    targetElement.insertAdjacentHTML('beforeEnd', ratingBriefEl.outerHTML);
    // targetElement.appendChild(ratingEl)
  } else {
    console.error('renderScore2BookPage Target element not found');
  }
}

export const handleBookDetailPage = (document) => {
  // determine it's a book or not
	const breadcrumbEls = document.querySelectorAll('#breadcrumb-trail li')
	const breadcrumbTexts = Array.from(breadcrumbEls).map((el) => el.textContent?.trim())	
	let bookTypeInfo = resolveBookInfoFromBreadcrumbText(breadcrumbTexts)

	const bookContainerEl = document.querySelector('.main_wrap')
	if (bookContainerEl && bookTypeInfo && bookTypeInfo.isMagazine==false && bookTypeInfo.format!=="audio") {
		// extract infos
		let bookTitleEl = bookContainerEl.querySelector('h1');
		let bookTitle = bookTitleEl.textContent;
		bookTitle = BookUtils.cleanBookTitle(bookTitle)
		
		// Check if there's an h2 element next to bookTitleEl
		let bookSubTitle = null;
		let nextElement = bookTitleEl.nextElementSibling;
		if (nextElement && nextElement.tagName.toLowerCase() === 'h2') {
			bookSubTitle = nextElement.textContent;
		}

		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null
		bookSubTitle = bookSubTitle ? BookUtils.cleanBookTitle(bookSubTitle) : null

		if (!bookTitle || bookTitle === '') {
			return
		}

		// extra the book link
		let url = window.location.href

		// extract author, isbn
		const bookInfoTopEls = bookContainerEl.querySelectorAll('.type02_p003 ul li')
		let author, isbn;
		if (bookInfoTopEls) {
			bookInfoTopEls.forEach((el: HTMLElement) => {
				author = BookUtils.extractAuthorFromBookInfo(el.textContent.trim()) ?? author
			});
		}

		// extract isbn
		const bookInfoBottomEls = bookContainerEl.querySelectorAll('.bd li')
		if (bookInfoBottomEls) {
			bookInfoBottomEls.forEach((el: HTMLElement) => {
				isbn = BookUtils.extractISBNFromBookInfo(el.textContent.trim()) ?? isbn 
			});
		}

		// extract thumbnailUrl
		const bookThumbEl = bookContainerEl.querySelector('img.cover')
		let thumbnailUrl = bookThumbEl?.getAttribute('src') ?? null

		// extract pricing
		let priceEls = bookContainerEl.querySelectorAll('.price01')
		let price = priceEls[priceEls.length-1].textContent ?? null
		let currency = 'TWD';

		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: bookSubTitle,
				book: {
					source: 'bokelai',
					title: bookTitle,
					subtitle: bookSubTitle,
					author,
					url,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format: bookTypeInfo.format,
					isbn
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
				renderScore2BookPage(bookContainerEl, { goodreads: response })
			}
		});

	}
}

export const handleHomePage = document => {
  console.log('handleHomePage executed', document.querySelectorAll('section[the_area="bk"] .item'))
  const bkSectionItemEls = document.querySelectorAll('section[the_area="bk"] .item')
	
	bkSectionItemEls.forEach(bkSectionItem => {
		let bookTitle = bkSectionItem.querySelector('.prod-name').textContent
		let originalBookTitle = bookTitle
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

		let url = bkSectionItem.querySelector('a').getAttribute('href')

		if ( !url || !url.includes("/products/")) {
			console.log('Skip', bookTitle, bkSectionItem)
			return // skip this item
		}

		let thumbnailUrl = bkSectionItem.querySelector('img').getAttribute('src')
		
		let prodPriceEls = bkSectionItem.querySelectorAll('.prod-price strong')
		let price = prodPriceEls.length>0 ? prodPriceEls[prodPriceEls.length-1].textContent : null
		let currency = 'TWD'
		
		let format = BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical'

		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: null,
				book: {
					source: 'bokelai',
					title: bookTitle,
					subtitle: null,
					author: null,
					url,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format,
					isbn: null
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
        const targetElement =  bkSectionItem.querySelector('.img-wrap')

        if ( !targetElement) {
          console.error('Cannot find the .item-info for given', bkSectionItem)
          return
        }
      
        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response })
        targetElement.insertAdjacentHTML('beforeEnd', ratingEl.outerHTML);
			}
		});
	})
}

export const handleCategorySlideShow = (document) => {
  // sample page:
  // https://www.books.com.tw/web/books/
  // https://www.books.com.tw/web/cebook_new/?loc=P_recommendprod_bk_cat_2_1
  // https://www.books.com.tw/web/books_topm_01/?loc=P_recommendprod_bk_cat_1_7

  const slideShowItemEls = document.querySelectorAll('.type02_m014 .item')
  slideShowItemEls.forEach(el => {
		// let bookTitle, bookSubTitle
		let bookTitle = el.querySelector('h4').textContent
    let originalBookTitle = bookTitle
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

    let url = el.querySelector('h4 a').getAttribute('href')
    

		// extract author, isbn
		const bookInfoEls = el.querySelectorAll('.msg li')
		let author, isbn;
		if (bookInfoEls) {
			bookInfoEls.forEach((el: HTMLElement) => {
				author = BookUtils.extractAuthorFromBookInfo(el.textContent.trim()) ?? author
			});
		}

		// extract thumbnailUrl
		const bookThumbEl = el.querySelector('img.cover')
		let thumbnailUrl = bookThumbEl?.getAttribute('src') ?? null

		// extract pricing
		let priceEls = el.querySelectorAll('.price_a strong')
		let price = priceEls[priceEls.length-1].textContent ?? null
		let currency = 'TWD';


		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: null,
				book: {
					source: 'bokelai',
					title: bookTitle,
					subtitle: null,
					author,
					url,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
					isbn: null
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
        // render to the item
        const targetElement =  el.querySelector('h4')

        if ( !targetElement) {
          console.error('Cannot find the .item-info for given el', el)
          return 
        }
      
        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response })
        targetElement.insertAdjacentHTML('afterEnd', ratingEl.outerHTML);
			}
		});

  })
}

export const handleBookRankingList = (document) => {
  // sample page:
  // https://www.books.com.tw/web/sys_saletopb/books/?attribute=7
  // https://www.books.com.tw/web/books/


  const bookEls = document.querySelectorAll('.type02_m035 .item, .type02_m072 .item')
  bookEls.forEach(el => {
		// let bookTitle, bookSubTitle
		let bookTitle = el.querySelector('h4').textContent
    let originalBookTitle = bookTitle
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

    let url = el.querySelector('h4 a').getAttribute('href')
    

		// extract author, isbn
		const bookInfoEls = el.querySelectorAll('.msg li')
		let author, isbn;
		if (bookInfoEls) {
			bookInfoEls.forEach((el: HTMLElement) => {
				author = BookUtils.extractAuthorFromBookInfo(el.textContent.trim()) ?? author
			});
		}

		// extract thumbnailUrl
		const bookThumbEl = el.querySelector('img.cover')
		let thumbnailUrl = bookThumbEl?.getAttribute('src') ?? null

		// extract pricing
		let priceEls = el.querySelectorAll('.price_a strong')
		let price = priceEls[priceEls.length-1].textContent ?? null
		let currency = 'TWD';


		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: null,
				book: {
					source: 'bokelai',
					title: bookTitle,
					subtitle: null,
					author,
					url,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
					isbn: null
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
        // render to the item
        const targetElement =  el.querySelector('h4')

        if ( !targetElement) {
          console.error('Cannot find the .item-info for given el', el)
          return 
        }
      
        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response })
        targetElement.insertAdjacentHTML('afterEnd', ratingEl.outerHTML);
			}
		});

  })
}

export const handleTwoColumnBookList = (document) => {
  // sample page:
  // https://www.books.com.tw/web/sys_selbooks/books/?loc=P_recommendprod_bk_cat_1_5
  // https://www.books.com.tw/web/books/

  const bookEls = document.querySelectorAll('.type02_m008 > .alpha, .type02_m008 > .omega, .type02_m008 > .mod_a')
  console.log('bookEls', bookEls)
  bookEls.forEach(el => {
		// let bookTitle, bookSubTitle
		let bookTitle = el.querySelector('h4').textContent
    let originalBookTitle = bookTitle
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

    let url = el.querySelector('h4 a').getAttribute('href')
    
		// extract author, isbn
		const bookInfoEls = el.querySelectorAll('.msg li')
		let author, isbn, price;
		
    bookInfoEls.forEach((el: HTMLElement) => {
      author = BookUtils.extractAuthorFromBookInfo(el.textContent.trim()) ?? author
      price = BookUtils.extractPriceFromBookInfo(el.textContent.trim()) ?? price

    });

		// extract thumbnailUrl
		const bookThumbEl = el.querySelector('img.cover')
		let thumbnailUrl = bookThumbEl?.getAttribute('src') ?? null

		let currency = 'TWD';

		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: null,
				book: {
					source: 'bokelai',
					title: bookTitle,
					subtitle: null,
					author,
					url,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
					isbn: null
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
        // render to the item
        const targetElement =  el.querySelector('h4')

        if ( !targetElement) {
          console.error('Cannot find the .item-info for given el', el)
          return 
        }
      
        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response })
        targetElement.insertAdjacentHTML('afterEnd', ratingEl.outerHTML);
			}
		});

  })
}

export const handleCrosscat3Column = (document) => {
  // sample page:
  // https://activity.books.com.tw/crosscat/show/A00000069231

  // .mod_028 .table_td.w_280 => https://activity.books.com.tw/crosscat/show/A00000069231 TOP1
  // .mod_034 .table_td.w_220 => TOP2&3 (two column)
  // .mod_037 .table_td => 3 column
  // .mod_038 .table_td => 4 column
  // .mod_039 .table_td => 5 column
  const bookEls = document.querySelectorAll('.mod_037 .table_td, .mod_039 .table_td, .mod_034 .table_td.w_220, .mod_028 .table_td.w_280, .mod_038 .table_td')
  
  bookEls.forEach(el => {
		// let bookTitle, bookSubTitle
		let bookTitle = el.querySelector('h4').textContent
    let originalBookTitle = bookTitle
		bookTitle = bookTitle ? BookUtils.cleanBookTitle(bookTitle) : null

    if ( !bookTitle) {
      return // skip 
    }

    let url = el.querySelector('h4 a').getAttribute('href')
    
		// extract author, isbn
		const bookInfoEls = el.querySelectorAll('.list_details li')
		let author, isbn, price;
    
    bookInfoEls.forEach((el: HTMLElement) => {
      author = BookUtils.extractAuthorFromBookInfo(el.textContent.trim()) ?? author
    });

    price = BookUtils.extractPriceFromBookInfo(el.querySelector('.list_details').textContent.trim())
    console.log(originalBookTitle, 'BookUtils.resolveIsDigital', BookUtils.resolveIsDigital(originalBookTitle))

		// extract thumbnailUrl
		const bookThumbEl = el.querySelector('img.cover, img.ban')
		let thumbnailUrl =  bookThumbEl?.getAttribute('data-original') || bookThumbEl?.getAttribute('src') || null

		let currency = 'TWD';

		// Send a message to the background script
		chrome.runtime.sendMessage({
			type: 'FETCH_RATING_WITH_BOOK_TITLE',
			data: {
				title: bookTitle,
				subtitle: null,
				book: {
					source: 'bokelai',
					title: bookTitle,
					subtitle: null,
					author,
					url,
					thumbnailUrl,
					rating: null,
					numRatings: null,
					price,
					currency,
					format: BookUtils.resolveIsDigital(originalBookTitle) ? 'ebook' : 'physical',
					isbn: null
				}
			}
		}, {}, (response) => {
			// Handle response from the background script
			console.log('Received ', bookTitle, response);

			if (response.found) {
        // render to the item
        const targetElement =  el.querySelector('h4')

        if ( !targetElement) {
          console.error('Cannot find the .item-info for given el', el)
          return 
        }
      
        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response })
        targetElement.insertAdjacentHTML('afterEnd', ratingEl.outerHTML);
			}
		});

  })
}