"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const family_service_1 = require("@/services/family-service");
(0, node_test_1.describe)('FamilyService (Facade)', () => {
    (0, node_test_1.describe)('exports', () => {
        (0, node_test_1.it)('should export familyService', () => {
            strict_1.default.ok(family_service_1.familyService);
        });
        (0, node_test_1.it)('should export familyServices', () => {
            strict_1.default.ok(family_service_1.familyServices);
        });
        (0, node_test_1.it)('should export familyMemberService', () => {
            strict_1.default.ok(family_service_1.familyMemberService);
        });
        (0, node_test_1.it)('should export familyRelationshipService', () => {
            strict_1.default.ok(family_service_1.familyRelationshipService);
        });
        (0, node_test_1.it)('should export familyPermissionService', () => {
            strict_1.default.ok(family_service_1.familyPermissionService);
        });
    });
    (0, node_test_1.describe)('constants', () => {
        (0, node_test_1.it)('should export CHILD_COLORS array', () => {
            strict_1.default.ok(Array.isArray(family_service_1.CHILD_COLORS));
            strict_1.default.ok(family_service_1.CHILD_COLORS.length >= 8);
            strict_1.default.ok(family_service_1.CHILD_COLORS.every(c => typeof c === 'string'));
        });
        (0, node_test_1.it)('should export DEFAULT_ROLE_PERMISSIONS', () => {
            strict_1.default.ok(family_service_1.DEFAULT_ROLE_PERMISSIONS);
            strict_1.default.ok(family_service_1.DEFAULT_ROLE_PERMISSIONS.PRIMARY);
            strict_1.default.ok(family_service_1.DEFAULT_ROLE_PERMISSIONS.GUARDIAN);
            strict_1.default.ok(family_service_1.DEFAULT_ROLE_PERMISSIONS.VIEWER);
            strict_1.default.ok(family_service_1.DEFAULT_ROLE_PERMISSIONS.PRIMARY.includes('ADMIN'));
            strict_1.default.ok(!family_service_1.DEFAULT_ROLE_PERMISSIONS.GUARDIAN.includes('ADMIN'));
        });
        (0, node_test_1.it)('should export RELATIONSHIP_OPTIONS', () => {
            strict_1.default.ok(Array.isArray(family_service_1.RELATIONSHIP_OPTIONS));
            strict_1.default.ok(family_service_1.RELATIONSHIP_OPTIONS.length >= 5);
            strict_1.default.ok(family_service_1.RELATIONSHIP_OPTIONS.includes('Co-parent'));
            strict_1.default.ok(family_service_1.RELATIONSHIP_OPTIONS.includes('Grandparent'));
        });
        (0, node_test_1.it)('should export PERMISSION_DESCRIPTIONS', () => {
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS);
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS.VIEW_SCHEDULE);
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS.VIEW_SCHEDULE.label);
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS.VIEW_SCHEDULE.description);
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS.BOOK_SESSIONS);
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS.MANAGE_PAYMENTS);
            strict_1.default.ok(family_service_1.PERMISSION_DESCRIPTIONS.ADMIN);
        });
    });
    (0, node_test_1.describe)('service integration', () => {
        (0, node_test_1.it)('should have consistent familyService and familyServices exports', () => {
            // Verify that both point to same functionality
            strict_1.default.ok(family_service_1.familyService.getFamilyAccount);
            strict_1.default.ok(family_service_1.familyServices.member);
            strict_1.default.ok(family_service_1.familyServices.relationship);
            strict_1.default.ok(family_service_1.familyServices.permission);
        });
    });
});
