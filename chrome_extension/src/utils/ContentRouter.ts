/**
 * Interface for retailer-specific handlers that process book data on different retailer websites.
 * Each handler is responsible for detecting and processing books on their specific retailer site.
 */
export interface RetailerHandler {
  /** Human-readable name of the retailer (e.g., "Kobo", "PChome") */
  name: string;
  
  /** 
   * Determines if this handler should process the given URL
   * @param url - The current page URL to check
   * @returns true if this handler can process the URL, false otherwise
   */
  matches: (url: string) => boolean;
  
  /** 
   * Processes the current page to extract book data and inject ratings
   * @param document - The DOM document to process
   */
  handle: (document: Document) => void;
}

/**
 * Content script router that manages multiple retailer handlers and routes requests
 * based on the current page URL. This enables a clean separation of concerns where
 * each retailer has its own dedicated handler class.
 * 
 * @example
 * ```typescript
 * const router = new ContentRouter();
 * router.register(new KoboHandler());
 * router.register(new PChomeHandler());
 * router.route(); // Automatically detects URL and calls appropriate handler
 * ```
 */
export class ContentRouter {
  /** Array of registered retailer handlers */
  private handlers: RetailerHandler[] = [];
  
  /**
   * Registers a new retailer handler with the router
   * @param handler - The retailer handler to register
   * @throws Error if a handler with the same name is already registered
   */
  register(handler: RetailerHandler): void {
    // Check for duplicate handler names to prevent conflicts
    const existingHandler = this.handlers.find(h => h.name === handler.name);
    if (existingHandler) {
      throw new Error(`Handler with name "${handler.name}" is already registered`);
    }
    
    this.handlers.push(handler);
  }
  
  /**
   * Routes the current page to the appropriate handler based on URL matching.
   * Only the first matching handler will be executed.
   * @param url - Optional URL to route (defaults to current page URL)
   */
  route(url?: string): void {
    const currentUrl = url || location.href;
    const handler = this.handlers.find(h => h.matches(currentUrl));
    
    if (handler) {
      console.log(`Handling ${handler.name} page:`, currentUrl);
      handler.handle(document);
    } else {
      console.log('No handler found for URL:', currentUrl);
    }
  }
  
  /**
   * Returns the names of all registered handlers for debugging purposes
   * @returns Array of handler names
   */
  getRegisteredHandlers(): string[] {
    return this.handlers.map(h => h.name);
  }
  
  /**
   * Unregisters a handler by name
   * @param name - The name of the handler to unregister
   * @returns true if handler was found and removed, false otherwise
   */
  unregister(name: string): boolean {
    const index = this.handlers.findIndex(h => h.name === name);
    if (index !== -1) {
      this.handlers.splice(index, 1);
      return true;
    }
    return false;
  }
  
  /**
   * Clears all registered handlers
   */
  clear(): void {
    this.handlers = [];
  }
  
  /**
   * Gets the number of registered handlers
   * @returns Number of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.length;
  }
}