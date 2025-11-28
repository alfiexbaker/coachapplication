/**
 * Advanced logging utility for debugging user interactions and navigation
 *
 * Features:
 * - Color-coded console output for different log levels
 * - Automatic timestamp and context tracking
 * - Click/press event tracking
 * - Navigation event tracking
 * - Error tracking with stack traces
 * - Performance timing
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'event';

interface LogContext {
  component?: string;
  screen?: string;
  user?: string;
  role?: string;
  [key: string]: any;
}

class Logger {
  private context: LogContext = {};
  private enabled = __DEV__; // Only log in development

  /**
   * Set global context for all subsequent logs
   */
  setContext(context: LogContext) {
    this.context = { ...this.context, ...context };
  }

  /**
   * Clear global context
   */
  clearContext() {
    this.context = {};
  }

  /**
   * Format log message with timestamp and context
   */
  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    let contextStr = '';
    if (Object.keys(this.context).length > 0) {
      contextStr = ` [${Object.entries(this.context)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')}]`;
    }

    const tag = level.toUpperCase();

    return `[${tag}] [${timestamp}]${contextStr} ${message}`;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(this.format('debug', message), data || '');
  }

  /**
   * Log an info message
   */
  info(message: string, data?: any) {
    if (!this.enabled) return;
    console.info(this.format('info', message), data || '');
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: any) {
    if (!this.enabled) return;
    console.warn(this.format('warn', message), data || '');
  }

  /**
   * Log an error with stack trace
   */
  error(message: string, error?: Error | any) {
    if (!this.enabled) return;
    console.error(this.format('error', message));
    if (error) {
      if (error instanceof Error) {
        console.error('Stack:', error.stack);
        console.error('Message:', error.message);
      } else {
        console.error('Error data:', error);
      }
    }
  }

  /**
   * Log a success message
   */
  success(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(this.format('success', message), data || '');
  }

  /**
   * Log an event (user interaction, navigation, etc.)
   */
  event(message: string, data?: any) {
    if (!this.enabled) return;
    console.log(this.format('event', message), data || '');
  }

  /**
   * Log a press/click event
   */
  press(elementName: string, metadata?: any) {
    this.event(`PRESS: ${elementName}`, metadata);
  }

  /**
   * Log navigation event
   */
  navigate(from: string, to: string, params?: any) {
    this.event(`NAVIGATE: ${from} → ${to}`, params);
  }

  /**
   * Create a scoped logger for a specific component/screen
   */
  scope(scopeName: string, additionalContext?: LogContext): ScopedLogger {
    return new ScopedLogger(this, scopeName, additionalContext);
  }

  /**
   * Time a function execution
   */
  async time<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
    const start = performance.now();
    this.debug(`TIMER START: ${label}`);
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.debug(`TIMER END: ${label} (${duration.toFixed(2)}ms)`);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`TIMER FAILED: ${label} (${duration.toFixed(2)}ms)`, error);
      throw error;
    }
  }

  /**
   * Group logs together
   */
  group(label: string) {
    if (!this.enabled) return;
    console.group(label);
  }

  groupEnd() {
    if (!this.enabled) return;
    console.groupEnd();
  }
}

/**
 * Scoped logger that automatically includes component/screen context
 */
class ScopedLogger {
  constructor(
    private parent: Logger,
    private scope: string,
    private additionalContext?: LogContext
  ) {}

  private prefix(message: string): string {
    return `[${this.scope}] ${message}`;
  }

  debug(message: string, data?: any) {
    this.parent.debug(this.prefix(message), data);
  }

  info(message: string, data?: any) {
    this.parent.info(this.prefix(message), data);
  }

  warn(message: string, data?: any) {
    this.parent.warn(this.prefix(message), data);
  }

  error(message: string, error?: Error | any) {
    this.parent.error(this.prefix(message), error);
  }

  success(message: string, data?: any) {
    this.parent.success(this.prefix(message), data);
  }

  event(message: string, data?: any) {
    this.parent.event(this.prefix(message), data);
  }

  press(elementName: string, metadata?: any) {
    this.parent.press(`${this.scope}.${elementName}`, metadata);
  }

  navigate(to: string, params?: any) {
    this.parent.navigate(this.scope, to, params);
  }

  group(label: string) {
    this.parent.group(`${this.scope}: ${label}`);
  }

  groupEnd() {
    this.parent.groupEnd();
  }
}

// Export singleton instance
export const logger = new Logger();

// Export helper for creating scoped loggers
export const createLogger = (scope: string, context?: LogContext) => {
  return logger.scope(scope, context);
};
