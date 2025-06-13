import {
	RetrievedGoodreadsBookInfo, 
	RetrievedKoboBookInfo, 
	RetrievedPchomeBookInfo } from 'types/RetrievedBookInfo'

import * as BookUtils from 'utils/BookUtils';
	
export const renderScore2PchomeGridList = (bookItemEl, {goodreads}: {goodreads: RetrievedGoodreadsBookInfo}) => {
	// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('bookItemEl', bookItemEl)
	const targetElement = bookItemEl.querySelector('.price_box');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = BookUtils.generateBookBlockRatingDiv_inNumbers({ goodreads })

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

export const renderScore2PchomeRowList = (bookItemEl, {goodreads}: {goodreads: RetrievedGoodreadsBookInfo}) => {
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


export const renderScore2PchomeBookPage = (bookItemEl, {goodreads}: {goodreads: RetrievedGoodreadsBookInfo}) => {
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

export const renderScore2PchomeRegionBlock4 = (bookItemEl, {goodreads}: {goodreads: RetrievedGoodreadsBookInfo}) => {
		// const targetElement = document.querySelector('#RatingsBrief');
	// console.log('bookItemEl', bookItemEl)
	const targetElement = bookItemEl.querySelector('.prod_name');

	// Check if the target element exists
	if (targetElement) {
		// Insert the new element next to the target element
		const ratingEl = generateBookBlockRatingDiv_inNumbers({ goodreads })
		
		// // Create and append the icon element
		// const iconSpan = document.createElement('span');
		// iconSpan.classList.add('goodreads-icon');
		// ratingEl.insertAdjacentHTML('afterbegin', iconSpan.outerHTML);

		// // wrap into div
		// const ratingBriefEl = document.createElement('a');
		// ratingBriefEl.href = goodreads.url;
		// ratingBriefEl.title = `${goodreads.title} ${goodreads.rating} avg rating — ${goodreads.numRatings.toLocaleString()} ratings`;
		// ratingBriefEl.target = "_blank";
		// ratingBriefEl.appendChild(ratingEl);

		// targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
		targetElement.insertAdjacentHTML('afterend', ratingEl.outerHTML);
		// targetElement.insertAdjacentHTML('afterend', ratingBriefEl.outerHTML);
		// targetElement.appendChild(ratingEl)
	} else {
		console.error('renderScore2PchomeBookPage Target element not found');
	}
}