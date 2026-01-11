"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.logger = void 0;
class Logger {
    constructor() {
        this.context = {};
        this.enabled = typeof __DEV__ !== 'undefined' ? __DEV__ : true; // Only log in development
    }
    /**
     * Set global context for all subsequent logs
     */
    setContext(context) {
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
    format(level, message, data) {
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
    debug(message, data) {
        if (!this.enabled)
            return;
        console.log(this.format('debug', message), data || '');
    }
    /**
     * Log an info message
     */
    info(message, data) {
        if (!this.enabled)
            return;
        console.info(this.format('info', message), data || '');
    }
    /**
     * Log a warning
     */
    warn(message, data) {
        if (!this.enabled)
            return;
        console.warn(this.format('warn', message), data || '');
    }
    /**
     * Log an error with stack trace
     */
    error(message, error) {
        if (!this.enabled)
            return;
        console.error(this.format('error', message));
        if (error) {
            if (error instanceof Error) {
                console.error('Stack:', error.stack);
                console.error('Message:', error.message);
            }
            else {
                console.error('Error data:', error);
            }
        }
    }
    /**
     * Log a success message
     */
    success(message, data) {
        if (!this.enabled)
            return;
        console.log(this.format('success', message), data || '');
    }
    /**
     * Log an event (user interaction, navigation, etc.)
     */
    event(message, data) {
        if (!this.enabled)
            return;
        console.log(this.format('event', message), data || '');
    }
    /**
     * Log a press/click event
     */
    press(elementName, metadata) {
        this.event(`PRESS: ${elementName}`, metadata);
    }
    /**
     * Log navigation event
     */
    navigate(from, to, params) {
        this.event(`NAVIGATE: ${from} → ${to}`, params);
    }
    /**
     * Create a scoped logger for a specific component/screen
     */
    scope(scopeName, additionalContext) {
        return new ScopedLogger(this, scopeName, additionalContext);
    }
    /**
     * Time a function execution
     */
    async time(label, fn) {
        const start = performance.now();
        this.debug(`TIMER START: ${label}`);
        try {
            const result = await fn();
            const duration = performance.now() - start;
            this.debug(`TIMER END: ${label} (${duration.toFixed(2)}ms)`);
            return result;
        }
        catch (error) {
            const duration = performance.now() - start;
            this.error(`TIMER FAILED: ${label} (${duration.toFixed(2)}ms)`, error);
            throw error;
        }
    }
    /**
     * Group logs together
     */
    group(label) {
        if (!this.enabled)
            return;
        console.group(label);
    }
    groupEnd() {
        if (!this.enabled)
            return;
        console.groupEnd();
    }
}
/**
 * Scoped logger that automatically includes component/screen context
 */
class ScopedLogger {
    constructor(parent, scope, additionalContext) {
        this.parent = parent;
        this.scope = scope;
        this.additionalContext = additionalContext;
    }
    prefix(message) {
        return `[${this.scope}] ${message}`;
    }
    debug(message, data) {
        this.parent.debug(this.prefix(message), data);
    }
    info(message, data) {
        this.parent.info(this.prefix(message), data);
    }
    warn(message, data) {
        this.parent.warn(this.prefix(message), data);
    }
    error(message, error) {
        this.parent.error(this.prefix(message), error);
    }
    success(message, data) {
        this.parent.success(this.prefix(message), data);
    }
    event(message, data) {
        this.parent.event(this.prefix(message), data);
    }
    press(elementName, metadata) {
        this.parent.press(`${this.scope}.${elementName}`, metadata);
    }
    navigate(to, params) {
        this.parent.navigate(this.scope, to, params);
    }
    group(label) {
        this.parent.group(`${this.scope}: ${label}`);
    }
    groupEnd() {
        this.parent.groupEnd();
    }
}
// Export singleton instance
exports.logger = new Logger();
// Export helper for creating scoped loggers
const createLogger = (scope, context) => {
    return exports.logger.scope(scope, context);
};
exports.createLogger = createLogger;
