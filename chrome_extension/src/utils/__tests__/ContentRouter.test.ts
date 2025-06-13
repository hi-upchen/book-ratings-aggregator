import { ContentRouter, RetailerHandler } from '../ContentRouter';

// Mock the global location object for testing
const mockLocation = {
  href: 'https://www.example.com'
};

// Mock console methods to test logging
const mockConsoleLog = jest.fn();

// Mock document object
const mockDocument = {} as Document;

// Setup global mocks
beforeAll(() => {
  Object.defineProperty(global, 'location', {
    value: mockLocation,
    writable: true
  });
  
  Object.defineProperty(global, 'console', {
    value: {
      ...console,
      log: mockConsoleLog
    },
    writable: true
  });
  
  Object.defineProperty(global, 'document', {
    value: mockDocument,
    writable: true
  });
});

// Test handler implementations
class TestKoboHandler implements RetailerHandler {
  name = 'Kobo';
  matches = jest.fn((url: string) => url.includes('kobo.com'));
  handle = jest.fn((document: Document) => {});
}

class TestPChomeHandler implements RetailerHandler {
  name = 'PChome';
  matches = jest.fn((url: string) => url.includes('pchome.com.tw'));
  handle = jest.fn((document: Document) => {});
}

class TestBokelaiHandler implements RetailerHandler {
  name = 'Bokelai';
  matches = jest.fn((url: string) => url.includes('books.com.tw'));
  handle = jest.fn((document: Document) => {});
}

describe('ContentRouter', () => {
  let router: ContentRouter;
  let koboHandler: TestKoboHandler;
  let pchomeHandler: TestPChomeHandler;
  let bokelaiHandler: TestBokelaiHandler;

  beforeEach(() => {
    router = new ContentRouter();
    koboHandler = new TestKoboHandler();
    pchomeHandler = new TestPChomeHandler();
    bokelaiHandler = new TestBokelaiHandler();
    
    // Clear all mocks
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    
    // Reset location
    mockLocation.href = 'https://www.example.com';
  });

  describe('Handler Registration', () => {
    it('should register a single handler successfully', () => {
      router.register(koboHandler);
      
      expect(router.getHandlerCount()).toBe(1);
      expect(router.getRegisteredHandlers()).toEqual(['Kobo']);
    });

    it('should register multiple handlers successfully', () => {
      router.register(koboHandler);
      router.register(pchomeHandler);
      router.register(bokelaiHandler);
      
      expect(router.getHandlerCount()).toBe(3);
      expect(router.getRegisteredHandlers()).toEqual(['Kobo', 'PChome', 'Bokelai']);
    });

    it('should throw error when registering duplicate handler names', () => {
      router.register(koboHandler);
      
      const duplicateHandler = new TestKoboHandler();
      expect(() => router.register(duplicateHandler)).toThrow(
        'Handler with name "Kobo" is already registered'
      );
    });

    it('should allow handlers with different names but same functionality', () => {
      router.register(koboHandler);
      
      const similarHandler: RetailerHandler = {
        name: 'Kobo Alternative',
        matches: (url: string) => url.includes('kobo.com'),
        handle: (document: Document) => {}
      };
      
      expect(() => router.register(similarHandler)).not.toThrow();
      expect(router.getHandlerCount()).toBe(2);
    });
  });

  describe('Handler Unregistration', () => {
    beforeEach(() => {
      router.register(koboHandler);
      router.register(pchomeHandler);
      router.register(bokelaiHandler);
    });

    it('should unregister existing handler successfully', () => {
      const result = router.unregister('PChome');
      
      expect(result).toBe(true);
      expect(router.getHandlerCount()).toBe(2);
      expect(router.getRegisteredHandlers()).toEqual(['Kobo', 'Bokelai']);
    });

    it('should return false when unregistering non-existent handler', () => {
      const result = router.unregister('NonExistent');
      
      expect(result).toBe(false);
      expect(router.getHandlerCount()).toBe(3);
    });

    it('should handle unregistering from empty router', () => {
      const emptyRouter = new ContentRouter();
      const result = emptyRouter.unregister('Kobo');
      
      expect(result).toBe(false);
      expect(emptyRouter.getHandlerCount()).toBe(0);
    });
  });

  describe('Handler Clearing', () => {
    it('should clear all handlers', () => {
      router.register(koboHandler);
      router.register(pchomeHandler);
      
      router.clear();
      
      expect(router.getHandlerCount()).toBe(0);
      expect(router.getRegisteredHandlers()).toEqual([]);
    });

    it('should handle clearing empty router', () => {
      router.clear();
      
      expect(router.getHandlerCount()).toBe(0);
      expect(router.getRegisteredHandlers()).toEqual([]);
    });
  });

  describe('URL Routing', () => {
    beforeEach(() => {
      router.register(koboHandler);
      router.register(pchomeHandler);
      router.register(bokelaiHandler);
    });

    it('should route to matching handler using current location', () => {
      mockLocation.href = 'https://www.kobo.com/book/some-book';
      
      router.route();
      
      expect(koboHandler.matches).toHaveBeenCalledWith('https://www.kobo.com/book/some-book');
      expect(koboHandler.handle).toHaveBeenCalledWith(mockDocument);
      expect(pchomeHandler.handle).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Handling Kobo page:',
        'https://www.kobo.com/book/some-book'
      );
    });

    it('should route to matching handler using provided URL', () => {
      const testUrl = 'https://24h.pchome.com.tw/books/prod/123';
      
      router.route(testUrl);
      
      expect(pchomeHandler.matches).toHaveBeenCalledWith(testUrl);
      expect(pchomeHandler.handle).toHaveBeenCalledWith(mockDocument);
      expect(koboHandler.handle).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('Handling PChome page:', testUrl);
    });

    it('should route to first matching handler when multiple match', () => {
      // Create two handlers that both match the same URL
      const handler1: RetailerHandler = {
        name: 'Handler1',
        matches: jest.fn(() => true),
        handle: jest.fn()
      };
      const handler2: RetailerHandler = {
        name: 'Handler2', 
        matches: jest.fn(() => true),
        handle: jest.fn()
      };
      
      const testRouter = new ContentRouter();
      testRouter.register(handler1);
      testRouter.register(handler2);
      
      testRouter.route('https://test.com');
      
      expect(handler1.handle).toHaveBeenCalled();
      expect(handler2.handle).not.toHaveBeenCalled();
    });

    it('should log message when no handler matches', () => {
      const testUrl = 'https://unknown-site.com';
      
      router.route(testUrl);
      
      expect(koboHandler.handle).not.toHaveBeenCalled();
      expect(pchomeHandler.handle).not.toHaveBeenCalled();
      expect(bokelaiHandler.handle).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith('No handler found for URL:', testUrl);
    });

    it('should handle routing with empty router', () => {
      const emptyRouter = new ContentRouter();
      const testUrl = 'https://www.kobo.com';
      
      emptyRouter.route(testUrl);
      
      expect(mockConsoleLog).toHaveBeenCalledWith('No handler found for URL:', testUrl);
    });
  });

  describe('Specific Retailer URL Matching', () => {
    beforeEach(() => {
      router.register(koboHandler);
      router.register(pchomeHandler);
      router.register(bokelaiHandler);
    });

    it('should match Kobo URLs correctly', () => {
      const koboUrls = [
        'https://www.kobo.com/book/some-book',
        'https://www.kobo.com/search?query=test',
        'https://www.kobo.com/ebook/book-title'
      ];

      koboUrls.forEach(url => {
        router.route(url);
        expect(koboHandler.handle).toHaveBeenCalledWith(mockDocument);
        jest.clearAllMocks();
      });
    });

    it('should match PChome URLs correctly', () => {
      const pchomeUrls = [
        'https://24h.pchome.com.tw/books/prod/123',
        'https://24h.pchome.com.tw/books/store/456'
      ];

      pchomeUrls.forEach(url => {
        router.route(url);
        expect(pchomeHandler.handle).toHaveBeenCalledWith(mockDocument);
        jest.clearAllMocks();
      });
    });

    it('should match Bokelai URLs correctly', () => {
      const bokelaiUrls = [
        'https://www.books.com.tw/products/123',
        'https://activity.books.com.tw/crosscat/456'
      ];

      bokelaiUrls.forEach(url => {
        router.route(url);
        expect(bokelaiHandler.handle).toHaveBeenCalledWith(mockDocument);
        jest.clearAllMocks();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle handler that throws during execution', () => {
      const errorHandler: RetailerHandler = {
        name: 'ErrorHandler',
        matches: () => true,
        handle: jest.fn(() => {
          throw new Error('Handler execution failed');
        })
      };

      router.register(errorHandler);

      // The router doesn't catch errors, so this should throw
      expect(() => router.route('https://test.com')).toThrow('Handler execution failed');
    });

    it('should handle handler with invalid matches function', () => {
      const invalidHandler: RetailerHandler = {
        name: 'InvalidHandler',
        matches: jest.fn(() => {
          throw new Error('Matches function failed');
        }),
        handle: jest.fn()
      };

      router.register(invalidHandler);

      // The router doesn't catch errors in matches, so this should throw
      expect(() => router.route('https://test.com')).toThrow('Matches function failed');
    });
  });

  describe('Integration Test', () => {
    it('should handle complete workflow correctly', () => {
      // Register handlers
      router.register(koboHandler);
      router.register(pchomeHandler);
      
      // Verify registration
      expect(router.getRegisteredHandlers()).toEqual(['Kobo', 'PChome']);
      
      // Route to Kobo
      router.route('https://www.kobo.com/book/test');
      expect(koboHandler.handle).toHaveBeenCalledWith(mockDocument);
      
      // Route to PChome
      router.route('https://24h.pchome.com.tw/books/prod/123');
      expect(pchomeHandler.handle).toHaveBeenCalledWith(mockDocument);
      
      // Unregister Kobo
      router.unregister('Kobo');
      expect(router.getRegisteredHandlers()).toEqual(['PChome']);
      
      // Route to Kobo again (should not match)
      router.route('https://www.kobo.com/book/test');
      expect(mockConsoleLog).toHaveBeenLastCalledWith(
        'No handler found for URL:',
        'https://www.kobo.com/book/test'
      );
      
      // Clear all handlers
      router.clear();
      expect(router.getHandlerCount()).toBe(0);
    });
  });
});