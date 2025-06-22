/**
 * Tests for Logger utility to verify environment-based logging behavior
 */

import Logger from '../Logger';

// Mock console methods to capture calls
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();
const mockConsoleWarn = jest.fn();

beforeEach(() => {
  // Clear all mocks before each test
  mockConsoleLog.mockClear();
  mockConsoleError.mockClear();
  mockConsoleWarn.mockClear();

  // Replace console methods with mocks
  console.log = mockConsoleLog;
  console.error = mockConsoleError;
  console.warn = mockConsoleWarn;
});

afterEach(() => {
  // Restore original console methods
  jest.restoreAllMocks();
});

describe('Logger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterAll(() => {
    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      // Force re-evaluation of Logger class
      jest.resetModules();
    });

    it('should log info messages in production', () => {
      const Logger = require('../Logger').default;
      Logger.info('Extension loaded');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('Extension loaded');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });

    it('should log error messages in production', () => {
      const Logger = require('../Logger').default;
      Logger.error('Critical error');
      
      expect(mockConsoleError).toHaveBeenCalledWith('Critical error');
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });

    it('should log warn messages in production', () => {
      const Logger = require('../Logger').default;
      Logger.warn('Warning message');
      
      expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it('should NOT log debug messages in production', () => {
      const Logger = require('../Logger').default;
      Logger.debug('Debug information');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should NOT log trace messages in production', () => {
      const Logger = require('../Logger').default;
      Logger.trace('Trace information');
      
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      // Force re-evaluation of Logger class
      jest.resetModules();
    });

    it('should log info messages in development', () => {
      const Logger = require('../Logger').default;
      Logger.info('Extension loaded');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('Extension loaded');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });

    it('should log error messages in development', () => {
      const Logger = require('../Logger').default;
      Logger.error('Critical error');
      
      expect(mockConsoleError).toHaveBeenCalledWith('Critical error');
      expect(mockConsoleError).toHaveBeenCalledTimes(1);
    });

    it('should log warn messages in development', () => {
      const Logger = require('../Logger').default;
      Logger.warn('Warning message');
      
      expect(mockConsoleWarn).toHaveBeenCalledWith('Warning message');
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });

    it('should log debug messages in development', () => {
      const Logger = require('../Logger').default;
      Logger.debug('Debug information');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[DEBUG]', 'Debug information');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });

    it('should log trace messages in development', () => {
      const Logger = require('../Logger').default;
      Logger.trace('Trace information');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('[TRACE]', 'Trace information');
      expect(mockConsoleLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple arguments', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();
    });

    it('should handle multiple arguments correctly', () => {
      const Logger = require('../Logger').default;
      const testObj = { title: 'Test Book', author: 'Test Author' };
      
      Logger.info('Processing book:', testObj);
      Logger.debug('Extracted data:', testObj, 'additional info');
      
      expect(mockConsoleLog).toHaveBeenCalledWith('Processing book:', testObj);
      expect(mockConsoleLog).toHaveBeenCalledWith('[DEBUG]', 'Extracted data:', testObj, 'additional info');
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
    });
  });
});