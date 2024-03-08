export const renderScore2PchomeGridList = (bookItemEl, {goodreads}) => {
	// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('bookItemEl', bookItemEl)
	const targetElement = bookItemEl.querySelector('.price_box');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = generateBookBlockRatingDiv_inNumbers({ goodreads })

		// wrap into div
		const ratingBriefEl = document.createElement('div');
		ratingBriefEl.appendChild(ratingEl);

		// targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
		targetElement.insertAdjacentHTML('beforebegin', ratingBriefEl.outerHTML);
		// targetElement.appendChild(ratingEl)
	} else {
		console.error('renderScore2KoboSearhResultItem Target element not found');
  }
}

export const renderScore2PchomeRowList = (bookItemEl, {goodreads}) => {
	// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('bookItemEl', bookItemEl)
	const targetElement = bookItemEl.querySelector('.msg_box');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = generateBookBlockRatingDiv_inNumbers({ goodreads })

		// wrap into div
		const ratingBriefEl = document.createElement('li');
		ratingBriefEl.appendChild(ratingEl);

		targetElement.insertAdjacentHTML('afterbegin', ratingEl.outerHTML);
		// bookItemEl.insertAdjacentHTML('beforeend', ratingBriefEl.outerHTML);
		// targetElement.insertBefore(ratingEl)
	} else {
		console.error('renderScore2PchomeRowList Target element not found');
  }
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

	// // Create and append the icon element
	// const iconSpan = document.createElement('span');
	// iconSpan.classList.add('goodreads-icon');
	// ratingDiv.appendChild(iconSpan);

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

export const renderScore2PchomeBookPage = (bookItemEl, {goodreads}) => {
  	// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('bookItemEl', bookItemEl)
	const targetElement = bookItemEl.querySelector('#SloganContainer');

	// Check if the target element exists
	if (targetElement) {


		// Insert the new element next to the target element
		const ratingEl = generateBookBlockRatingDiv_inNumbers({ goodreads })
    
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
		targetElement.insertAdjacentHTML('afterend', ratingBriefEl.outerHTML);
		// targetElement.appendChild(ratingEl)
	} else {
		console.error('renderScore2PchomeBookPage Target element not found');
  }
}