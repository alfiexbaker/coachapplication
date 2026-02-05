"use strict";
/**
 * Typed Error Classes
 *
 * All services throw these instead of generic Error objects.
 * All screens catch and display them via ErrorState component.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.NetworkError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.NotFoundError = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(status, code, message, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
        this.name = 'ApiError';
    }
}
exports.ApiError = ApiError;
class NotFoundError extends ApiError {
    constructor(message = 'Not found') {
        super(404, 'NOT_FOUND', message);
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class ValidationError extends ApiError {
    constructor(message, details) {
        super(400, 'VALIDATION_ERROR', message, details);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends ApiError {
    constructor(message = 'Unauthorized') {
        super(401, 'UNAUTHORIZED', message);
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden') {
        super(403, 'FORBIDDEN', message);
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError extends ApiError {
    constructor(message = 'Conflict') {
        super(409, 'CONFLICT', message);
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
class NetworkError extends ApiError {
    constructor(message = 'Network error — check your connection') {
        super(0, 'NETWORK_ERROR', message);
        this.name = 'NetworkError';
    }
}
exports.NetworkError = NetworkError;
class RateLimitError extends ApiError {
    constructor(message = 'Too many requests — please try again later') {
        super(429, 'RATE_LIMITED', message);
        this.name = 'RateLimitError';
    }
}
exports.RateLimitError = RateLimitError;
