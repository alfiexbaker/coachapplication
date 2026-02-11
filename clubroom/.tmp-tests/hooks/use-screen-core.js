"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isScreenDataEmpty = isScreenDataEmpty;
exports.deriveScreenStatus = deriveScreenStatus;
exports.shouldRunFocusRefetch = shouldRunFocusRefetch;
exports.runFocusRefetch = runFocusRefetch;
exports.normalizeUnknownError = normalizeUnknownError;
/** Default empty check shared by useScreen and tests. */
function isScreenDataEmpty(data) {
    if (data === null || data === undefined)
        return true;
    if (Array.isArray(data) && data.length === 0)
        return true;
    return false;
}
function deriveScreenStatus(data, isEmpty) {
    const empty = isEmpty ? isEmpty(data) : isScreenDataEmpty(data);
    return empty ? 'empty' : 'success';
}
function shouldRunFocusRefetch(refetchOnFocus, hasLoadedOnce) {
    return refetchOnFocus && hasLoadedOnce;
}
function runFocusRefetch(options) {
    if (!shouldRunFocusRefetch(options.refetchOnFocus, options.hasLoadedOnce))
        return;
    void options.fetchData('silent');
}
function normalizeUnknownError(error) {
    if (typeof error === 'object' && error !== null) {
        if ('code' in error && 'message' in error) {
            return error;
        }
        if ('message' in error && typeof error.message === 'string') {
            return {
                code: 'UNKNOWN',
                message: error.message,
                details: error,
            };
        }
    }
    return {
        code: 'UNKNOWN',
        message: 'Unexpected error while loading screen data',
        details: error,
    };
}
