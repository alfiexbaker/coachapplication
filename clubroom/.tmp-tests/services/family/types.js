"use strict";
/**
 * Family Service Types
 *
 * Shared type definitions for family services.
 * Re-exports from @/constants/types for convenience.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSION_DESCRIPTIONS = exports.RELATIONSHIP_OPTIONS = exports.DEFAULT_ROLE_PERMISSIONS = exports.CHILD_COLORS = void 0;
// Re-export constants from services
var family_member_service_1 = require("./family-member-service");
Object.defineProperty(exports, "CHILD_COLORS", { enumerable: true, get: function () { return family_member_service_1.CHILD_COLORS; } });
var family_relationship_service_1 = require("./family-relationship-service");
Object.defineProperty(exports, "DEFAULT_ROLE_PERMISSIONS", { enumerable: true, get: function () { return family_relationship_service_1.DEFAULT_ROLE_PERMISSIONS; } });
Object.defineProperty(exports, "RELATIONSHIP_OPTIONS", { enumerable: true, get: function () { return family_relationship_service_1.RELATIONSHIP_OPTIONS; } });
Object.defineProperty(exports, "PERMISSION_DESCRIPTIONS", { enumerable: true, get: function () { return family_relationship_service_1.PERMISSION_DESCRIPTIONS; } });
