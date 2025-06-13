
/**
 * Observes the appearance of nodes matching the given selector in the document.
 * Executes a callback function when the nodes appear.
 *
 * @param selector - The CSS selector to match the nodes.
 * @param callback - The callback function to execute when the nodes appear.
 * @param config - The configuration options for the MutationObserver.
 */
export const observeNodeAppearance = (selector: string, callback: Function, config?: {
  runOnce?: boolean, // only execute the callback once and then disconnect the observer
  childList?: boolean, // defualt: true
  subtree?: boolean, // defualt: true
}) => {
  config = {  
    runOnce: false, // only execute the callback once and then disconnect the observer
    childList: true,
    subtree: true,
    ...config }

  const observer = new MutationObserver((mutations) => {
    let nodes = document.querySelectorAll(selector);
    if (nodes.length > 0) {
      callback(document);
      
      if (config.runOnce) {
        observer.disconnect();
      }
    }
  });

  observer.observe(document.body, config);
  callback(document);
}

/**
 * Ensures that the given URL is an absolute URL.
 * If the URL starts with '//', it is converted to an absolute URL using the current location's protocol and host.
 *
 * @param url - The URL to ensure as an absolute URL.
 * @returns The absolute URL.
 */
export const ensureAbsoluteUrl = (url: string): string => {
  if (url && url.startsWith('/')) {
    url = location.protocol + '//' + location.host + url;
  }
  return url;
}

/**
 * Gets the current page root URL with protocol and hostname
 * @returns The root URL (e.g., "https://www.example.com")
 */
export const getCurrentPageRootUrl = (): string => {
  const { protocol, hostname, port } = window.location;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

/**
 * Finds the closest anchor element by traversing up the DOM tree
 * @param element The starting element
 * @returns The closest anchor element or null if not found
 */
export const findClosestAnchorElement = (element: Element): HTMLAnchorElement | null => {
  let parentElement = element.parentElement;

  // Traverse up the DOM tree until we find the closest <a> element or reach the top (document)
  while (parentElement !== null) {
    if (parentElement.tagName === 'A') {
      return parentElement as HTMLAnchorElement; // Found the closest <a> element
    }
    parentElement = parentElement.parentElement; // Move up to the parent element
  }

  return null; // No <a> element found in the ancestor elements
};

/**
 * Finds the first sibling element of the given HTML element that matches the provided CSS selector.
 * @param element The HTML element whose sibling is to be found.
 * @param selector The CSS selector used to find the sibling element.
 * @param direction The direction to search for the sibling element. Use 'previous' to search preceding siblings, 'next' to search following siblings, or 'both' to search in both directions. Default is 'both'.
 * @returns The first sibling element matching the selector, or null if not found.
 */
export const findSiblingElementBySelector = (
  element: HTMLElement, 
  selector: string, 
  direction: 'previous' | 'next' | 'both' = 'both'
): HTMLElement | null => {
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
};