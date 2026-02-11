"use strict";
/**
 * Account ID helpers used to keep mock and real-data identifiers compatible.
 * Normalization strips separators so IDs like "coach1" and "coach-1" match.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeAccountId = normalizeAccountId;
exports.accountIdsMatch = accountIdsMatch;
exports.accountIdInAliases = accountIdInAliases;
function normalizeAccountId(id) {
    return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}
function accountIdsMatch(left, right) {
    return normalizeAccountId(left) === normalizeAccountId(right);
}
function accountIdInAliases(candidate, aliases) {
    const normalizedCandidate = normalizeAccountId(candidate);
    return aliases.some((alias) => normalizeAccountId(alias) === normalizedCandidate);
}
