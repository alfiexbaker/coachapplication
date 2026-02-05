/**
 * Typed Error Classes
 *
 * All services throw these instead of generic Error objects.
 * All screens catch and display them via ErrorState component.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Not found') {
    super(404, 'NOT_FOUND', message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict') {
    super(409, 'CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network error — check your connection') {
    super(0, 'NETWORK_ERROR', message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message = 'Too many requests — please try again later') {
    super(429, 'RATE_LIMITED', message);
    this.name = 'RateLimitError';
  }
}
