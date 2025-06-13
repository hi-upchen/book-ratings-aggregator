export interface RetailerHandler {
  name: string;
  matches: (url: string) => boolean;
  handle: (document: Document) => void;
}

export class ContentRouter {
  private handlers: RetailerHandler[] = [];
  
  register(handler: RetailerHandler): void {
    this.handlers.push(handler);
  }
  
  route(): void {
    const currentUrl = location.href;
    const handler = this.handlers.find(h => h.matches(currentUrl));
    
    if (handler) {
      console.log(`Handling ${handler.name} page:`, currentUrl);
      handler.handle(document);
    } else {
      console.log('No handler found for URL:', currentUrl);
    }
  }
  
  getRegisteredHandlers(): string[] {
    return this.handlers.map(h => h.name);
  }
}