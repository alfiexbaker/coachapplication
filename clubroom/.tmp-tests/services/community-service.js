"use strict";
/**
 * Community Service - Thin Re-export Facade
 *
 * This file maintains backward compatibility for existing imports.
 * All functionality has been split into focused modules under services/community/:
 * - community-group-service.ts (group CRUD, membership, invitations)
 * - community-messaging-service.ts (group messaging, read receipts)
 * - community-carpool-service.ts (carpool offers, seat requests)
 *
 * New code should import directly from '@/services/community' instead.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityCarpoolService = exports.communityMessagingService = exports.communityGroupService = exports.communityService = void 0;
var community_1 = require("./community");
Object.defineProperty(exports, "communityService", { enumerable: true, get: function () { return community_1.communityService; } });
Object.defineProperty(exports, "communityGroupService", { enumerable: true, get: function () { return community_1.communityGroupService; } });
Object.defineProperty(exports, "communityMessagingService", { enumerable: true, get: function () { return community_1.communityMessagingService; } });
Object.defineProperty(exports, "communityCarpoolService", { enumerable: true, get: function () { return community_1.communityCarpoolService; } });
