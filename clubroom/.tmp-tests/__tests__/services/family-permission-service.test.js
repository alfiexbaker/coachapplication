"use strict";
/**
 * Family Permission Service Tests
 *
 * Tests for guardian permissions, role-based access checks.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const family_permission_service_1 = require("../../services/family/family-permission-service");
(0, node_test_1.describe)('familyPermissionService', () => {
    (0, node_test_1.describe)('getDefaultPermissions', () => {
        (0, node_test_1.default)('returns permissions for PRIMARY role', () => {
            const perms = family_permission_service_1.familyPermissionService.getDefaultPermissions('PRIMARY');
            strict_1.default.ok(Array.isArray(perms));
            strict_1.default.ok(perms.length > 0);
        });
        (0, node_test_1.default)('returns fewer permissions for VIEWER role', () => {
            const primaryPerms = family_permission_service_1.familyPermissionService.getDefaultPermissions('PRIMARY');
            const viewerPerms = family_permission_service_1.familyPermissionService.getDefaultPermissions('VIEWER');
            strict_1.default.ok(viewerPerms.length <= primaryPerms.length);
        });
    });
    (0, node_test_1.describe)('canBook', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await family_permission_service_1.familyPermissionService.canBook('user_1', 'family_1');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('canViewSchedule', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await family_permission_service_1.familyPermissionService.canViewSchedule('user_1', 'family_1');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('canViewProgress', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await family_permission_service_1.familyPermissionService.canViewProgress('user_1', 'family_1');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('canManagePayments', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await family_permission_service_1.familyPermissionService.canManagePayments('user_1', 'family_1');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('isAdmin', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await family_permission_service_1.familyPermissionService.isAdmin('user_1', 'family_1');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('hasPermission', () => {
        (0, node_test_1.default)('returns boolean', async () => {
            const result = await family_permission_service_1.familyPermissionService.hasPermission('user_1', 'family_1', 'BOOK_SESSIONS');
            strict_1.default.equal(typeof result, 'boolean');
        });
    });
    (0, node_test_1.describe)('getGuardianPermissions (Result pattern)', () => {
        (0, node_test_1.default)('returns Result with permissions array', async () => {
            const result = await family_permission_service_1.familyPermissionService.getGuardianPermissions('user_1', 'family_1');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(Array.isArray(result.data));
            }
        });
    });
});
