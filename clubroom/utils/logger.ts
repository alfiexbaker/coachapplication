/**
 * Advanced logging utility for debugging user interactions and navigation
 *
 * Features:
 * - Config-driven log levels (debug, info, warn, error)
 * - Color-coded console output for different log levels
 * - Automatic timestamp and context tracking
 * - Click/press event tracking
 * - Navigation event tracking
 * - Error tracking with stack traces
 * - Performance timing
 * - Sentry-backed remote logging support in configured non-dev builds
 *
 * Configuration:
 *   Log level and console output are controlled via constants/config.ts
 *   - logging.level: 'debug' | 'info' | 'warn' | 'error'
 *   - logging.enableConsole: boolean
 *   - logging.enableRemote: boolean
 */

import { logging, type LogLevel as ConfigLogLevel } from '@/constants/config';
import {
  addSentryBreadcrumb,
  captureSentryException,
  captureSentryMessage,
} from '@/services/observability/sentry-service';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success' | 'event';

// Log level priority (lower number = more verbose)
const LOG_LEVEL_PRIORITY: Record<ConfigLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Map our log levels to config log levels for filtering
const LOG_LEVEL_MAP: Record<LogLevel, ConfigLogLevel> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  success: 'info', // Success logs at info level
  event: 'debug',  // Events log at debug level
};

interface LogContext {
  component?: string;
  screen?: string;
  user?: string;
  role?: string;
  [key: string]: unknown;
}

const BREADCRUMB_LEVELS: Record<Exclude<LogLevel, 'error'>, 'debug' | 'info' | 'warning' | 'log'> =
  {
    debug: 'debug',
    info: 'info',
    warn: 'warning',
    success: 'info',
    event: 'log',
  };

class Logger {
  private context: LogContext = {};
  private configLevel: ConfigLogLevel = logging.level;
  private consoleEnabled: boolean = logging.enableConsole;
  private remoteEnabled: boolean = logging.enableRemote;

  /**
   * Check if a log level should be output based on config
   */
  private shouldLog(level: LogLevel): boolean {
    const configLevel = LOG_LEVEL_MAP[level];
    return LOG_LEVEL_PRIORITY[configLevel] >= LOG_LEVEL_PRIORITY[this.configLevel];
  }

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
  private format(level: LogLevel, message: string): string {
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
   * Update log level at runtime
   */
  setLogLevel(level: ConfigLogLevel): void {
    this.configLevel = level;
  }

  /**
   * Enable/disable console output at runtime
   */
  setConsoleEnabled(enabled: boolean): void {
    this.consoleEnabled = enabled;
  }

  /**
   * Enable/disable remote logging at runtime
   */
  setRemoteEnabled(enabled: boolean): void {
    this.remoteEnabled = enabled;
  }

  /**
   * Send log to Sentry when remote logging is enabled.
   */
  private sendRemote(level: LogLevel, message: string, data?: unknown): void {
    if (!this.remoteEnabled) return;

    const contexts = {
      logger: {
        context: { ...this.context },
        data,
      },
    };

    if (level === 'error') {
      const payload =
        data && typeof data === 'object' && 'error' in data
          ? (data as { error?: unknown; metadata?: unknown })
          : undefined;
      const error =
        payload?.error instanceof Error ? payload.error : data instanceof Error ? data : undefined;

      if (error) {
        captureSentryException(error, {
          tags: {
            logger_message: message,
          },
          contexts,
        });
        return;
      }

      captureSentryMessage(message, 'error', { contexts });
      return;
    }

    addSentryBreadcrumb(BREADCRUMB_LEVELS[level], message, {
      context: { ...this.context },
      data,
    });
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    if (!this.shouldLog('debug')) return;
    if (this.consoleEnabled) {
      console.log(this.format('debug', message), data ?? '');
    }
    this.sendRemote('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    if (!this.shouldLog('info')) return;
    if (this.consoleEnabled) {
      console.info(this.format('info', message), data ?? '');
    }
    this.sendRemote('info', message, data);
  }

  /**
   * Log a warning
   */
  warn(message: string, data?: unknown): void {
    if (!this.shouldLog('warn')) return;
    if (this.consoleEnabled) {
      console.warn(this.format('warn', message), data ?? '');
    }
    this.sendRemote('warn', message, data);
  }

  /**
   * Log an error with stack trace
   */
  error(message: string, error?: Error | unknown, metadata?: unknown): void {
    if (!this.shouldLog('error')) return;
    if (this.consoleEnabled) {
      console.error(this.format('error', message));
      if (error) {
        if (error instanceof Error) {
          console.error('Stack:', error.stack);
          console.error('Message:', error.message);
        } else {
          console.error('Error data:', error);
        }
      }
      if (metadata !== undefined) {
        console.error('Metadata:', metadata);
      }
    }

    if (error instanceof Error) {
      this.sendRemote('error', message, {
        error,
        metadata,
      });
      return;
    }

    this.sendRemote('error', message, {
      error,
      metadata,
    });
  }

  /**
   * Log a success message
   */
  success(message: string, data?: unknown): void {
    if (!this.shouldLog('success')) return;
    if (this.consoleEnabled) {
      console.log(this.format('success', message), data ?? '');
    }
    this.sendRemote('success', message, data);
  }

  /**
   * Log an event (user interaction, navigation, etc.)
   */
  event(message: string, data?: unknown): void {
    if (!this.shouldLog('event')) return;
    if (this.consoleEnabled) {
      console.log(this.format('event', message), data ?? '');
    }
    this.sendRemote('event', message, data);
  }

  /**
   * Log a press/click event
   */
  press(elementName: string, metadata?: unknown): void {
    this.event(`PRESS: ${elementName}`, metadata);
  }

  /**
   * Log a user action (form submit, create, update, delete)
   */
  action(actionName: string, metadata?: unknown): void {
    this.event(`ACTION: ${actionName}`, metadata);
  }

  /**
   * Log navigation event
   */
  navigate(from: string, to: string, params?: unknown): void {
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
  group(label: string): void {
    if (!this.consoleEnabled) return;
    console.group(label);
  }

  groupEnd(): void {
    if (!this.consoleEnabled) return;
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
    private _additionalContext?: LogContext
  ) {}

  private prefix(message: string): string {
    return `[${this.scope}] ${message}`;
  }

  debug(message: string, data?: unknown): void {
    this.parent.debug(this.prefix(message), data);
  }

  info(message: string, data?: unknown): void {
    this.parent.info(this.prefix(message), data);
  }

  warn(message: string, data?: unknown): void {
    this.parent.warn(this.prefix(message), data);
  }

  error(message: string, error?: Error | unknown): void {
    this.parent.error(this.prefix(message), error);
  }

  success(message: string, data?: unknown): void {
    this.parent.success(this.prefix(message), data);
  }

  event(message: string, data?: unknown): void {
    this.parent.event(this.prefix(message), data);
  }

  press(elementName: string, metadata?: unknown): void {
    this.parent.press(`${this.scope}.${elementName}`, metadata);
  }

  action(actionName: string, metadata?: unknown): void {
    this.parent.action(`${this.scope}.${actionName}`, metadata);
  }

  navigate(to: string, params?: unknown): void {
    this.parent.navigate(this.scope, to, params);
  }

  group(label: string): void {
    this.parent.group(`${this.scope}: ${label}`);
  }

  groupEnd(): void {
    this.parent.groupEnd();
  }
}

// Export singleton instance
export const logger = new Logger();

// Export helper for creating scoped loggers
export const createLogger = (scope: string, context?: LogContext) => {
  return logger.scope(scope, context);
};
