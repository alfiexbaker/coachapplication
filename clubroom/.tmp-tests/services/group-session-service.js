"use strict";
/**
 * Group Session Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/group-session/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/group-session/session-crud-service.ts (CRUD operations, publish, cancel, discovery)
 * - services/group-session/session-registration-service.ts (registration, waitlist, roster, attendance)
 * - services/group-session/session-scheduling-service.ts (club/squad/child training queries, recurring)
 * - services/group-session/session-display-service.ts (formatting and display utilities)
 * - services/group-session/index.ts (unified facade)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupSessionService = void 0;
var index_1 = require("./group-session/index");
Object.defineProperty(exports, "groupSessionService", { enumerable: true, get: function () { return index_1.groupSessionService; } });
