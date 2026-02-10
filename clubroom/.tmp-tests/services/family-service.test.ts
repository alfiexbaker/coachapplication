import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  familyService,
  familyServices,
  familyMemberService,
  familyRelationshipService,
  familyPermissionService,
  CHILD_COLORS,
  DEFAULT_ROLE_PERMISSIONS,
  RELATIONSHIP_OPTIONS,
  PERMISSION_DESCRIPTIONS,
} from '@/services/family-service';

describe('FamilyService (Facade)', () => {
  describe('exports', () => {
    it('should export familyService', () => {
      assert.ok(familyService);
    });

    it('should export familyServices', () => {
      assert.ok(familyServices);
    });

    it('should export familyMemberService', () => {
      assert.ok(familyMemberService);
    });

    it('should export familyRelationshipService', () => {
      assert.ok(familyRelationshipService);
    });

    it('should export familyPermissionService', () => {
      assert.ok(familyPermissionService);
    });
  });

  describe('constants', () => {
    it('should export CHILD_COLORS array', () => {
      assert.ok(Array.isArray(CHILD_COLORS));
      assert.ok(CHILD_COLORS.length >= 8);
      assert.ok(CHILD_COLORS.every(c => typeof c === 'string'));
    });

    it('should export DEFAULT_ROLE_PERMISSIONS', () => {
      assert.ok(DEFAULT_ROLE_PERMISSIONS);
      assert.ok(DEFAULT_ROLE_PERMISSIONS.PRIMARY);
      assert.ok(DEFAULT_ROLE_PERMISSIONS.GUARDIAN);
      assert.ok(DEFAULT_ROLE_PERMISSIONS.VIEWER);
      assert.ok(DEFAULT_ROLE_PERMISSIONS.PRIMARY.includes('ADMIN'));
      assert.ok(!DEFAULT_ROLE_PERMISSIONS.GUARDIAN.includes('ADMIN'));
    });

    it('should export RELATIONSHIP_OPTIONS', () => {
      assert.ok(Array.isArray(RELATIONSHIP_OPTIONS));
      assert.ok(RELATIONSHIP_OPTIONS.length >= 5);
      assert.ok(RELATIONSHIP_OPTIONS.includes('Co-parent'));
      assert.ok(RELATIONSHIP_OPTIONS.includes('Grandparent'));
    });

    it('should export PERMISSION_DESCRIPTIONS', () => {
      assert.ok(PERMISSION_DESCRIPTIONS);
      assert.ok(PERMISSION_DESCRIPTIONS.VIEW_SCHEDULE);
      assert.ok(PERMISSION_DESCRIPTIONS.VIEW_SCHEDULE.label);
      assert.ok(PERMISSION_DESCRIPTIONS.VIEW_SCHEDULE.description);
      assert.ok(PERMISSION_DESCRIPTIONS.BOOK_SESSIONS);
      assert.ok(PERMISSION_DESCRIPTIONS.MANAGE_PAYMENTS);
      assert.ok(PERMISSION_DESCRIPTIONS.ADMIN);
    });
  });

  describe('service integration', () => {
    it('should have consistent familyService and familyServices exports', () => {
      // Verify that both point to same functionality
      assert.ok(familyService.getFamilyAccount);
      assert.ok(familyServices.member);
      assert.ok(familyServices.relationship);
      assert.ok(familyServices.permission);
    });
  });
});
