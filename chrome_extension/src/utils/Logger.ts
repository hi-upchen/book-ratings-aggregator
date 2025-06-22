/**
 * Centralized logging utility for Chrome extension
 * Provides environment-based log level control for development vs production builds
 */
class Logger {
  private static isDev = process.env.NODE_ENV === 'development';
  
  /**
   * Always log - essential for production monitoring
   * Use for: extension loaded notifications, key operational status
   */
  static info(...args: any[]): void {
    console.log(...args);
  }
  
  /**
   * Always log - critical for production debugging
   * Use for: API failures, critical errors, processing failures
   */
  static error(...args: any[]): void {
    console.error(...args);
  }
  
  /**
   * Always log - important warnings
   * Use for: fallback scenarios, missing elements, unexpected conditions
   */
  static warn(...args: any[]): void {
    console.warn(...args);
  }
  
  /**
   * Only in development - detailed debugging
   * Use for: extracted data, processing results, intermediate values
   */
  static debug(...args: any[]): void {
    if (this.isDev) console.log('[DEBUG]', ...args);
  }
  
  /**
   * Only in development - verbose tracing
   * Use for: step-by-step processing, selector attempts, container finding
   */
  static trace(...args: any[]): void {
    if (this.isDev) console.log('[TRACE]', ...args);
  }
}

export default Logger;