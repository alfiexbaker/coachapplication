export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'AUTH_INVALID_TOKEN'
  | 'AUTH_FORBIDDEN'
  | 'AUTH_ROLE_REQUIRED'
  | 'AUTH_GRANT_REQUIRED'
  | 'RESOURCE_NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'RATE_LIMITED'
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

export const forbidden = (message: string = 'Forbidden', details?: unknown) =>
  new ApiProblemError(403, 'AUTH_FORBIDDEN', message, details);
