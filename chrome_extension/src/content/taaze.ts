import * as BookUtils from 'utils/BookUtils';
import * as DomUtils from 'utils/DomUtils';

export const handleHomePage = (document: Document): void => {
  let bookEls = document.querySelectorAll('.bookGrid:not(.bra-processed)');

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('.prod_TitleMain')?.textContent;
    let author = BookUtils.extractAuthorFromBookInfo(bookEl.querySelector('.prod_author')?.textContent);
    let price = BookUtils.extractPriceFromBookInfo(bookEl.querySelector('.discPrice')?.textContent);
    let url = bookEl.querySelector('a')?.getAttribute('href');
    let thumbnailUrl = bookEl.querySelector('img')?.getAttribute('src');
    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(bookTitle);

    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }
    
    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: author,
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
        const targetElement = bookEl.querySelector('.prod_TitleMain')

        if (!targetElement) {
          console.error('Cannot find the .prod_TitleMain for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        const liElement = document.createElement('li');
        liElement.appendChild(ratingEl);
        targetElement.insertAdjacentElement('afterend', liElement);
      }
    });
  });
};

export const handleBookDetailPage = (document: Document): void => {
  // resolve the book info from breadcrumb texts
  let breadcrumbEls;
  if (resolveIsInSecondHandPage(document)) {
    breadcrumbEls = document.querySelectorAll('.site_map span, .site_map li'); // 二手書頁面
  } else {
    let candidateBreadcrumbEls = document.querySelectorAll('.col-xs-12 li a')

    for (let i = 0; i < candidateBreadcrumbEls.length; i++) {
      if (candidateBreadcrumbEls[i].innerHTML.includes('首頁')) {
        let parentUlEl = candidateBreadcrumbEls[i].closest('ul');
        breadcrumbEls = parentUlEl.querySelectorAll('li');
        break;
      }
    }
  }
  
  let breadcrumbTexts = Array.from(breadcrumbEls).map((el) => el.textContent.trim());
  let {language, format, isMagazine} = resolveBookInfoFromBreadcrumbText(breadcrumbTexts) || {};
  
  if (isMagazine) {
    return; // Skip if it is a magazine
  }

  // extract the book info
  let bookTitle = document.querySelector('h1#ga4ProdTitle')?.textContent;
  format = format || BookUtils.resolveBookFormat(bookTitle);
  bookTitle = BookUtils.cleanBookTitle(bookTitle);

  let bookSubTitle = document.querySelector('.row h2')?.textContent?.trim();
  
  let author = BookUtils.extractAuthorFromBookInfo(document.querySelector('.authorBrand p')?.textContent);
  let price = BookUtils.extractPriceFromBookInfo(document.querySelector('.price')?.textContent);
  let url = location.href;
  let thumbnailUrl = document.querySelector('div.col-sm-8.col-md-9 > div > div:nth-child(1) > a > img:nth-child(1)')?.getAttribute('src');
  let currency = 'TWD';
  let isbn = BookUtils.extractISBNFromBookInfo(Array.from(document.querySelectorAll('.prodInfo_boldSpan')).map(el => el.textContent).join(' '));

  if (!bookTitle) {
    console.error('Cannot find the book title');
    return; // Skip if bookTitle is empty
  }
  
  // Send a message to the background script
  chrome.runtime.sendMessage({
    type: 'FETCH_RATING_WITH_BOOK_TITLE',
    data: {
      book: {
        source: 'taaze',
        title: bookTitle,
        subtitle: bookSubTitle,
        author: author,
        url,
        thumbnailUrl,
        rating: null,
        numRatings: null,
        price,
        currency,
        format: format,
        isbn: isbn
      }
    }
  }, {}, (response) => {
    // Handle response from the background script
    console.log('Received ', bookTitle, response);

    if (response.found) {
      const targetElement = document.querySelector('.authorBrand')

      if (!targetElement) {
        console.error('Cannot find the .authorBrand');
        return
      }

      const ratingEl = BookUtils.generateBookRatingWithLink({ goodreads: response });
      // const liElement = document.createElement('li');
      targetElement.insertAdjacentElement('beforebegin', ratingEl);
    }
  });

  // show ratings in 近期最多人購買, 收藏這本書的人也收藏了
  handleBookDetailCarousel(document);
}

// 近期最多人購買
export const handleBookDetailCarousel = (document: Document): void => {
  let bookEls = document.querySelectorAll('.carousel-inner .item .talkelookGrid2');

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('.prod_TitleMain')?.textContent?.trim();
    let author = null;
    let price = BookUtils.extractPriceFromBookInfo(bookEl.querySelector('.bookCaption')?.textContent);
    let url = bookEl.querySelector('a')?.getAttribute('href');
    url = DomUtils.ensureAbsoluteUrl(url);
    let thumbnailUrl = bookEl.querySelector('img')?.getAttribute('src');
    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(bookTitle);

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }
    
    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: author,
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
        const targetElement = bookEl.querySelector('.prod_TitleMain')

        if (!targetElement) {
          console.error('Cannot find the .prod_TitleMain for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('afterend', ratingEl);
      }
    });

    // remove the position fixed styles
    const elements = bookEl.querySelectorAll('[style*="position:absolute;bottom:0px"]');
    elements.forEach((element) => {
      element.removeAttribute('style');
    });
  });
}

// 其他人也看了, 你剛剛看了
export const handleBookDetailAvividItems = (document: Document): void => {
  let bookEls = document.querySelectorAll('.avivid_item:not(.bra-processed)');
  console.log('handleBookDetailAvividItems', bookEls);

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('.avivid_item_title')?.textContent?.trim();
    let price = BookUtils.extractPriceFromBookInfo(bookEl.querySelector('.avivid_sale_price')?.textContent);
    let url = bookEl.getAttribute('onclick')?.match(/'(.*?)'/)?.[1];
    let thumbnailUrl = bookEl.querySelector('.avivid_other_image')?.style.backgroundImage?.match(/url\(['"](.+?)['"]\)/)?.[1];
    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(bookTitle);

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }
    
    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
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
        const targetElement = bookEl.querySelector('.avivid_item_title')

        if (!targetElement) {
          console.error('Cannot find the .avivid_item_title for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('afterend', ratingEl);
      }
    });
  })
}

export const handleRWDListPage = (document: Document): void => {
  let bookEls = document.querySelectorAll('.bookGridByListView:not(.bra-processed), .listBookGrid:not(.bra-processed)');

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('.prod_TitleMain')?.textContent;
    bookTitle = BookUtils.cleanBookTitle(bookTitle);
    let author = BookUtils.extractAuthorFromBookInfo(bookEl.querySelector('.prod_author')?.textContent);
    let price = BookUtils.extractPriceFromBookInfo(bookEl.querySelector('.discPrice')?.textContent);
    let url = bookEl.querySelector('a')?.getAttribute('href');
    url = DomUtils.ensureAbsoluteUrl(url);
    let thumbnailUrl = bookEl.querySelector('img')?.getAttribute('src');
    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(bookEl.querySelector('.discPrice')?.textContent);

    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }
    
    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: author,
          url,
          thumbnailUrl,
          rating: null,
          numRatings: null,
          price,
          currency,
          format: format,
          isbn: null
        }
      }
    }, {}, (response) => {
      // Handle response from the background script
      console.log('Received ', bookTitle, response);

      if (response.found) {
        const targetElement = bookEl.querySelector('.prod_TitleMain')

        if (!targetElement) {
          console.error('Cannot find the .prod_TitleMain for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('afterend', ratingEl);
      }
    });
  })
}

export const handleRWDListPageBestSellArea = (document: Document): void => {
  let bookEls = document.querySelectorAll('.bestSell .bestSellArea:not(.bra-processed)');

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('strong a')?.textContent;
    bookTitle = BookUtils.cleanBookTitle(bookTitle);
    let author = BookUtils.extractAuthorFromBookInfo(bookEl.querySelector('.author')?.textContent);
    let price = BookUtils.extractPriceFromBookInfo(bookEl.querySelector('.discPrice')?.textContent);
    let url = bookEl.querySelector('a')?.getAttribute('href');
    url = DomUtils.ensureAbsoluteUrl(url);
    
    let thumbnailUrl;
    if (!thumbnailUrl) {
      const style = bookEl.querySelector('.prodImg')?.getAttribute('style');
      const match = style?.match(/url\(['"](.+?)['"]\)/);
      if (match) {
      thumbnailUrl = match[1];
      }
    }

    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(bookEl.querySelector('.discPrice')?.textContent);

    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }
    

    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: author,
          url,
          thumbnailUrl,
          rating: null,
          numRatings: null,
          price,
          currency,
          format: format,
          isbn: null
        }
      }
    }, {}, (response) => {
      // Handle response from the background script
      console.log('Received ', bookTitle, response);

      if (response.found) {
        const targetElement = bookEl.querySelector('.author')

        if (!targetElement) {
          console.error('Cannot find the .author for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('beforebegin', ratingEl);
      }
    });
  })
}

export const handleSearchPage =  (document: Document): void => {
  let bookEls = document.querySelectorAll('.info_frame:not(.bra-processed)');

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('h4')?.textContent;
    let originalBookTitle = bookTitle
    bookTitle = BookUtils.cleanBookTitle(bookTitle);
    let author = BookUtils.extractAuthorFromBookInfo(bookEl.querySelector('.author')?.textContent);
    let price = BookUtils.extractPriceFromBookInfo(bookEl.querySelector('.discPrice1')?.textContent);
    let url = bookEl.querySelector('.cover_frame')?.getAttribute('href');
    url = DomUtils.ensureAbsoluteUrl(url);
    
    let thumbnailUrl;
    if (!thumbnailUrl) {
      const style = bookEl.querySelector('.cover_frame')?.getAttribute('style');
      const match = style?.match(/url\(['"](.+?)['"]\)/);
      if (match) {
      thumbnailUrl = match[1];
      }
    }

    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(originalBookTitle);

    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }
    

    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: author,
          url,
          thumbnailUrl,
          rating: null,
          numRatings: null,
          price,
          currency,
          format: format,
          isbn: null
        }
      }
    }, {}, (response) => {
      // Handle response from the background script
      console.log('Received ', bookTitle, response);

      if (response.found) {
        const targetElement = bookEl.querySelector('.author')

        if (!targetElement) {
          console.error('Cannot find the .author for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('beforebegin', ratingEl);
      }
    });
  })
}

export const handleActivityHomePage = (document: Document): void => {
  let bookEls = document.querySelectorAll('.act_products:not(.bra-processed)');

  bookEls.forEach((bookEl) => {
    let bookTitle = bookEl.querySelector('a')?.textContent;
    let originalBookTitle = bookTitle
    bookTitle = BookUtils.cleanBookTitle(bookTitle);
    let author = null
    let price = BookUtils.extractPriceFromBookInfo(bookEl.textContent)
    let url = bookEl.querySelector('a')?.getAttribute('href');
    url = DomUtils.ensureAbsoluteUrl(url);
    
    let thumbnailUrl = null;
    if (!thumbnailUrl) {
      const styleElements = Array.from(bookEl.querySelectorAll('[style]'));
      const style = styleElements.find((el) => {
        const backgroundImage = el.style.backgroundImage;
        return backgroundImage && backgroundImage.includes('url');
      })?.getAttribute('style');
      const match = style?.match(/url\(['"](.+?)['"]\)/);
      if (match) {
        thumbnailUrl = match[1];
      }
    }

    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(originalBookTitle);

    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }

    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: null,
          url,
          thumbnailUrl,
          rating: null,
          numRatings: null,
          price,
          currency,
          format: format,
          isbn: null
        }
      }
    }, {}, (response) => {
      // Handle response from the background script
      console.log('Received ', bookTitle, response);

      if (response.found) {
        const targetElement = bookEl.querySelectorAll('li')[0];

        if (!targetElement) {
          console.error('Cannot find the 2nd li for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('beforebegin', ratingEl);
      }
    });
  })
}

export const handleActivityUnitPage = (document: Document): void => {
  let bookImgEls = document.querySelectorAll('.center .books:not(.bra-processed)');

  bookImgEls.forEach((bookImgEl) => {
    let bookEl = bookImgEl.parentNode

    let bookTitle = bookEl.querySelector('.nameDiv a')?.textContent;
    let originalBookTitle = bookTitle
    bookTitle = BookUtils.cleanBookTitle(bookTitle);
    let author = null
    let price = BookUtils.extractPriceFromBookInfo(bookEl.textContent)
    let url = bookEl.querySelector('.nameDiv a')?.getAttribute('href');
    url = DomUtils.ensureAbsoluteUrl(url);

    let thumbnailUrl = bookEl.querySelector('img')?.getAttribute('src');

    let currency = 'TWD';
    let format = BookUtils.resolveBookFormat(originalBookTitle);

    bookEl.classList.add('bra-processed'); // Add processed class to prevent duplicate processing

    if (!bookTitle) {
      return; // Skip if bookTitle is empty
    }

    // Send a message to the background script
    chrome.runtime.sendMessage({
      type: 'FETCH_RATING_WITH_BOOK_TITLE',
      data: {
        book: {
          source: 'taaze',
          title: bookTitle,
          subtitle: null,
          author: null,
          url,
          thumbnailUrl,
          rating: null,
          numRatings: null,
          price,
          currency,
          format: format,
          isbn: null
        }
      }
    }, {}, (response) => {
      // Handle response from the background script
      console.log('Received ', bookTitle, response);

      if (response.found) {
        const targetElement = bookEl.querySelector('.nameDiv');

        if (!targetElement) {
          console.error('Cannot find the 2nd li for given', bookEl);
          return
        }

        const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads: response });
        targetElement.insertAdjacentElement('afterend', ratingEl);
      }
    });

  })
}

/**
 * Resolve the book info from breadcrumb texts
 * @param breadcrumbTexts Array<String>
 * @returns Object | null
 */
export const resolveBookInfoFromBreadcrumbText = (breadcrumbTexts: Array<String>): 
  { 
    language: String, 
    format?: "digital" | "physical" | "audio" | "second-hand",
    isMagazine: Boolean
  } | null => {

  if ( !breadcrumbTexts || breadcrumbTexts.length==0) {
    return null
  }

  const bookBreadcrumbInfoMap = {
    "雜誌": {language: 'zh-TW', format: 'physical', isMagazine: true},

    "二手中文書": {language: 'zh-TW', format: 'second-hand', isMagazine: false},
    "中文電子書": {language: 'zh-TW', format: 'digital', isMagazine: false},
    "中文書": {language: 'zh-TW', format: 'physical', isMagazine: false}
  }

  for (let key in bookBreadcrumbInfoMap) {
    const v = bookBreadcrumbInfoMap[key]
    
    for (let i in  breadcrumbTexts) {
      if (breadcrumbTexts[i].includes(key)) {
        return v
      }
    } 
  }

  return null
}


function resolveIsInSecondHandPage(document): Boolean {
  return location.href.includes('usedList');
}