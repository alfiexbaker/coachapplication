/**
 * Centralized HTTP Client Service
 *
 * Provides a robust HTTP client abstraction with:
 * - Retry logic with exponential backoff
 * - Auth token injection
 * - Error normalization
 * - Request/response logging
 * - Timeout handling
 * - Request interceptors for extensibility
 *
 * Usage:
 * ```typescript
 * import { httpClient, HttpError } from '@/services/http-client';
 *
 * // Set auth token (call after login)
 * httpClient.setAuthToken(userToken);
 *
 * // Make requests
 * const users = await httpClient.get<User[]>('/users');
 * const created = await httpClient.post<User>('/users', { name: 'John' });
 * ```
 */

import { logger } from '@/utils/logger';
import { config } from '@/services/config-service';

// ============================================================================
// Types
// ============================================================================

export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

export type RequestInterceptor = (
  url: string,
  options: RequestInit
) => RequestInit | Promise<RequestInit>;

export type ResponseInterceptor = (
  response: Response,
  url: string
) => Response | Promise<Response>;

export type ErrorInterceptor = (
  error: Error,
  url: string,
  attempt: number
) => Error | Promise<Error>;

// ============================================================================
// HTTP Error Class
// ============================================================================

export class HttpError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly url: string;
  public readonly responseBody?: string;

  constructor(
    status: number,
    message: string,
    options?: {
      statusText?: string;
      url?: string;
      responseBody?: string;
    }
  ) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.statusText = options?.statusText || '';
    this.url = options?.url || '';
    this.responseBody = options?.responseBody;
  }

  /**
   * Check if error is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * Check if error is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= 500;
  }

  /**
   * Check if error is an authentication error (401)
   */
  isAuthError(): boolean {
    return this.status === 401;
  }

  /**
   * Check if error is a forbidden error (403)
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * Check if error is a not found error (404)
   */
  isNotFound(): boolean {
    return this.status === 404;
  }

  /**
   * Check if error is a timeout
   */
  isTimeout(): boolean {
    return this.status === 0 && this.message.includes('timeout');
  }

  /**
   * Check if error is a network error
   */
  isNetworkError(): boolean {
    return this.status === 0 && !this.isTimeout();
  }
}

// ============================================================================
// HTTP Client Class
// ============================================================================

class HttpClient {
  private config: HttpClientConfig;
  private authToken: string | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(clientConfig: Partial<HttpClientConfig> = {}) {
    this.config = {
      baseUrl: config.apiBaseUrl || 'https://api.example.com',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...clientConfig,
    };
  }

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Set the authentication token for all requests
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    logger.debug('[HTTP] Auth token updated', { hasToken: !!token });
  }

  /**
   * Get current auth token (for debugging/testing)
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<HttpClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.debug('[HTTP] Config updated', this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<HttpClientConfig> {
    return { ...this.config };
  }

  // ==========================================================================
  // Interceptors
  // ==========================================================================

  /**
   * Add a request interceptor
   * Called before each request, can modify request options
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add a response interceptor
   * Called after each successful response
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  /**
   * Add an error interceptor
   * Called when an error occurs, can transform errors
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index > -1) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  // ==========================================================================
  // HTTP Methods
  // ==========================================================================

  /**
   * Make a GET request
   */
  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  // ==========================================================================
  // Core Request Logic
  // ==========================================================================

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildUrl(path);
    const maxRetries = options?.retries ?? this.config.retryAttempts;
    const timeout = options?.timeout ?? this.config.timeout;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        // Build request options
        let fetchOptions: RequestInit = {
          method,
          headers: this.buildHeaders(options),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        };

        // Run request interceptors
        for (const interceptor of this.requestInterceptors) {
          fetchOptions = await interceptor(url, fetchOptions);
        }

        logger.debug(`[HTTP] ${method} ${path}`, {
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          timeout,
        });

        let response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        // Run response interceptors
        for (const interceptor of this.responseInterceptors) {
          response = await interceptor(response, url);
        }

        if (!response.ok) {
          const responseBody = await this.safeReadBody(response);
          throw new HttpError(response.status, this.extractErrorMessage(responseBody), {
            statusText: response.statusText,
            url,
            responseBody,
          });
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          if (!text) {
            logger.debug(`[HTTP] ${method} ${path} - Success (empty response)`);
            return undefined as T;
          }
          // Try to parse as JSON anyway
          try {
            const data = JSON.parse(text);
            logger.debug(`[HTTP] ${method} ${path} - Success`);
            return data as T;
          } catch {
            logger.debug(`[HTTP] ${method} ${path} - Success (text response)`);
            return text as unknown as T;
          }
        }

        const data = await response.json();
        logger.debug(`[HTTP] ${method} ${path} - Success`);
        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        // Run error interceptors
        let processedError = error as Error;
        for (const interceptor of this.errorInterceptors) {
          processedError = await interceptor(processedError, url, attempt);
        }

        // Check if we should retry
        if (attempt < maxRetries && this.isRetryable(processedError)) {
          const delay = this.calculateRetryDelay(attempt);
          logger.warn(`[HTTP] Retry ${attempt + 1}/${maxRetries} for ${path}`, {
            error: processedError.message,
            nextRetryIn: delay,
          });
          await this.delay(delay);
          continue;
        }

        // Normalize and throw the final error
        throw this.normalizeError(processedError, url);
      }
    }

    // This should never be reached due to the throw in the catch block
    throw new HttpError(0, 'Max retries exceeded', { url });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private buildUrl(path: string): string {
    // Handle absolute URLs
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.config.baseUrl}${normalizedPath}`;
  }

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    };

    // Add auth token if available and not skipped
    if (this.authToken && !options?.skipAuth) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private isRetryable(error: unknown): boolean {
    // Don't retry abort errors (timeout handled separately)
    if (error instanceof Error && error.name === 'AbortError') {
      // Only retry timeout if it's not the last attempt
      return true;
    }

    // Retry on HTTP errors for 5xx status codes
    if (error instanceof HttpError) {
      return error.isServerError();
    }

    // Retry on network errors
    return true;
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private normalizeError(error: unknown, url: string): HttpError {
    if (error instanceof HttpError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new HttpError(0, 'Request timeout', { url });
      }
      return new HttpError(0, error.message || 'Network error', { url });
    }

    return new HttpError(0, 'Unknown error occurred', { url });
  }

  private async safeReadBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }

  private extractErrorMessage(responseBody: string): string {
    if (!responseBody) {
      return 'Request failed';
    }

    try {
      const parsed = JSON.parse(responseBody);
      // Handle common error response formats
      return (
        parsed.message ||
        parsed.error ||
        parsed.errorMessage ||
        parsed.errors?.[0]?.message ||
        responseBody
      );
    } catch {
      return responseBody;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const httpClient = new HttpClient();

// ============================================================================
// Factory for Custom Instances
// ============================================================================

/**
 * Create a new HTTP client instance with custom configuration
 * Useful for different API endpoints or services
 */
export function createHttpClient(clientConfig?: Partial<HttpClientConfig>): HttpClient {
  return new HttpClient(clientConfig);
}
