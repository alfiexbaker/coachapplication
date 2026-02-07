"use strict";
/**
 * User Types
 *
 * Core user, coach, athlete profile types.
 * Also includes UserRole (single source of truth), social links,
 * school/invite, and coach discovery/search types.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUserRole = normalizeUserRole;
/** Normalize legacy role values (e.g. 'Coach') to uppercase canonical form */
function normalizeUserRole(role) {
    return role === 'Coach' ? 'COACH' : role;
}
