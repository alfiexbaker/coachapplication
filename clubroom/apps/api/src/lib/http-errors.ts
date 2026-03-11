export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_ROLE_REQUIRED'
  | 'AUTH_GRANT_REQUIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export class ApiProblemError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiProblemError(400, 'VALIDATION_FAILED', message, details);

export const unauthorized = (message: string = 'Unauthorized', details?: unknown) =>
  new ApiProblemError(401, 'AUTH_INVALID_TOKEN', message, details);

export const forbidden = (message: string = 'Forbidden', details?: unknown) =>
  new ApiProblemError(403, 'AUTH_FORBIDDEN', message, details);

export const notFound = (message: string = 'Resource not found', details?: unknown) =>
  new ApiProblemError(404, 'RESOURCE_NOT_FOUND', message, details);

export const serviceUnavailable = (message: string = 'Service unavailable', details?: unknown) =>
  new ApiProblemError(503, 'SERVICE_UNAVAILABLE', message, details);
