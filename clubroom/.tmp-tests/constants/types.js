"use strict";
/**
 * Types Barrel File
 *
 * Re-exports all types from domain-specific files for backward compatibility.
 * Every type that was previously importable from '@/constants/types' remains
 * importable from here.
 *
 * Domain files:
 * - user-types.ts: Core user, coach, athlete, discovery, comparison, auth types
 * - financial-types.ts: Wallet, payment, invoice, promo, referral types
 * - club-types.ts: Club, squad, academy, roster types
 * - session-types.ts: Session management, invites, availability, booking types
 * - social-types.ts: Follow, messaging, parent community types
 * - event-types.ts: Club events, RSVP, attendance, match types
 * - skill-types.ts: Skill trees, badges, goals, drills types
 * - video-types.ts: Video management and annotation types
 * - analytics-types.ts: Analytics dashboard, notification preference types
 * - family-types.ts: Family dashboard, guardian, safety, injury types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_CATEGORIES = exports.NOTIFICATION_TYPE_CATEGORIES = void 0;
// ============================================================================
// ANALYTICS & NOTIFICATION TYPES
// ============================================================================
var analytics_types_1 = require("./analytics-types");
Object.defineProperty(exports, "NOTIFICATION_TYPE_CATEGORIES", { enumerable: true, get: function () { return analytics_types_1.NOTIFICATION_TYPE_CATEGORIES; } });
Object.defineProperty(exports, "NOTIFICATION_CATEGORIES", { enumerable: true, get: function () { return analytics_types_1.NOTIFICATION_CATEGORIES; } });
