"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityMessagingService = exports.communityGroupService = exports.communityService = void 0;
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('CommunityService');
/**
 * Community Service - Thin Re-export Facade
 *
 * This file maintains backward compatibility for existing imports.
 * All functionality has been split into focused modules under services/community/:
 * - community-group-service.ts (group CRUD, membership, invitations)
 * - community-messaging-service.ts (group messaging, read receipts)
 *
 * New code should import directly from '@/services/community' instead.
 */
var community_1 = require("./community");
Object.defineProperty(exports, "communityService", { enumerable: true, get: function () { return community_1.communityService; } });
Object.defineProperty(exports, "communityGroupService", { enumerable: true, get: function () { return community_1.communityGroupService; } });
Object.defineProperty(exports, "communityMessagingService", { enumerable: true, get: function () { return community_1.communityMessagingService; } });
