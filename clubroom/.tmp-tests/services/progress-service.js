"use strict";
/**
 * Progress Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/progress/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/progress/progress-skills-service.ts (skill level management, trend tracking)
 * - services/progress/progress-feedback-service.ts (session feedback, session notes)
 * - services/progress/progress-goals-service.ts (goals CRUD, milestones, analytics, helpers)
 * - services/progress/progress-report-service.ts (comprehensive athlete progress)
 * - services/progress/index.ts (unified facade)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressService = void 0;
var index_1 = require("./progress/index");
Object.defineProperty(exports, "progressService", { enumerable: true, get: function () { return index_1.progressService; } });
