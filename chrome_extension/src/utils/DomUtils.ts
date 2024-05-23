
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