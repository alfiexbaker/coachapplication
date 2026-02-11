"use strict";
/**
 * Result Pattern for standardized error handling across all services.
 * Inspired by Rust's Result type - forces explicit error handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.combineResults = exports.all = exports.andThen = exports.mapErr = exports.map = exports.unwrapOr = exports.unwrap = exports.isErr = exports.isOk = exports.conflictError = exports.unauthorized = exports.storageError = exports.networkError = exports.validationError = exports.notFound = exports.serviceError = exports.err = exports.ok = void 0;
// Helper functions for creating Results
const ok = (data) => ({
    success: true,
    data,
});
exports.ok = ok;
const err = (error) => ({
    success: false,
    error,
});
exports.err = err;
// Helper functions for creating ServiceErrors
const serviceError = (code, message, details) => ({
    code,
    message,
    details,
});
exports.serviceError = serviceError;
const notFound = (entity, id) => (0, exports.serviceError)('NOT_FOUND', id ? `${entity} with id '${id}' not found` : `${entity} not found`);
exports.notFound = notFound;
const validationError = (message, details) => (0, exports.serviceError)('VALIDATION', message, details);
exports.validationError = validationError;
const networkError = (message = 'Network request failed') => (0, exports.serviceError)('NETWORK', message);
exports.networkError = networkError;
const storageError = (message = 'Storage operation failed') => (0, exports.serviceError)('STORAGE', message);
exports.storageError = storageError;
const unauthorized = (message = 'Unauthorized') => (0, exports.serviceError)('UNAUTHORIZED', message);
exports.unauthorized = unauthorized;
const conflictError = (message) => (0, exports.serviceError)('CONFLICT', message);
exports.conflictError = conflictError;
// Type guards
const isOk = (result) => result.success === true;
exports.isOk = isOk;
const isErr = (result) => result.success === false;
exports.isErr = isErr;
// Utility to unwrap or throw
const unwrap = (result) => {
    if (result.success)
        return result.data;
    throw new Error(typeof result.error === 'object' && result.error !== null && 'message' in result.error
        ? String(result.error.message)
        : 'Result unwrap failed');
};
exports.unwrap = unwrap;
// Utility to unwrap with default
const unwrapOr = (result, defaultValue) => result.success ? result.data : defaultValue;
exports.unwrapOr = unwrapOr;
// Map success value
const map = (result, fn) => result.success ? (0, exports.ok)(fn(result.data)) : result;
exports.map = map;
// Map error value
const mapErr = (result, fn) => result.success ? result : (0, exports.err)(fn(result.error));
exports.mapErr = mapErr;
// Chain async operations
const andThen = async (result, fn) => (result.success ? fn(result.data) : result);
exports.andThen = andThen;
// Combine multiple results
const all = (results) => {
    const data = [];
    for (const result of results) {
        if (!result.success)
            return result;
        data.push(result.data);
    }
    return (0, exports.ok)(data);
};
exports.all = all;
/**
 * Combine heterogenous Result values into a single Result tuple.
 * Returns the first error encountered, preserving order.
 */
const combineResults = (results) => {
    const data = [];
    for (const result of results) {
        if (!result.success) {
            return (0, exports.err)(result.error);
        }
        data.push(result.data);
    }
    return (0, exports.ok)(data);
};
exports.combineResults = combineResults;
