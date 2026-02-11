"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDeepLink = resolveDeepLink;
exports.navigateToDeepLink = navigateToDeepLink;
const LEGACY_REWRITES = [
    { pattern: /^\/booking\//, replace: '/bookings/' },
];
function normalizeUrl(raw) {
    const trimmed = raw.trim();
    if (!trimmed)
        return '';
    if (/^(javascript|data):/i.test(trimmed))
        return '';
    if (/^https?:\/\//i.test(trimmed)) {
        try {
            const parsed = new URL(trimmed);
            return `${parsed.pathname}${parsed.search}`;
        }
        catch {
            return '';
        }
    }
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
        const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
        return `/${withoutScheme.replace(/^\/+/, '')}`;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith('/')) {
        const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:/i, '');
        return `/${withoutScheme.replace(/^\/+/, '')}`;
    }
    return trimmed;
}
function applyLegacyRewrites(path) {
    let next = path;
    for (const rule of LEGACY_REWRITES) {
        if (rule.pattern.test(next)) {
            next = next.replace(rule.pattern, rule.replace);
        }
    }
    return next;
}
function resolveDeepLink(raw) {
    if (typeof raw !== 'string')
        return null;
    let normalized = normalizeUrl(raw);
    if (!normalized)
        return null;
    if (!normalized.startsWith('/')) {
        normalized = `/${normalized}`;
    }
    normalized = applyLegacyRewrites(normalized);
    const lower = normalized.toLowerCase();
    if (lower.startsWith('/javascript:') || lower.startsWith('/data:')) {
        return null;
    }
    let decodedPath = normalized;
    try {
        decodedPath = decodeURIComponent(normalized);
    }
    catch {
        return null;
    }
    if (decodedPath.includes('..')) {
        return null;
    }
    return normalized;
}
function navigateToDeepLink(router, raw) {
    const href = resolveDeepLink(raw);
    if (!href)
        return false;
    router.push(href);
    return true;
}
