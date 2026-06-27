/**
 * Child Service Tests
 *
 * Tests for child profiles: CRUD, disabilities, special needs,
 * age calculation, search by name, coach summary.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { childService } from '../../services/child-service';
import { safetyService } from '../../services/safety-service';

const rid = () => Math.random().toString(36).slice(2, 10);

function makeChildInput(overrides: Record<string, unknown> = {}) {
  return {
    firstName: `First_${rid()}`,
    lastName: `Last_${rid()}`,
    gender: 'MALE' as const,
    relationship: 'SON' as const,
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+44 7700 123456',
    emergencyContactRelation: 'Mother',
    ...overrides,
  };
}

describe('childService', () => {
  beforeEach(async () => {
    childService.__resetMockChildren();
    await safetyService.resetToMockData();
  });

  // ---------------------------------------------------------------------------
  // createChild + getChild
  // ---------------------------------------------------------------------------
  describe('createChild + getChild', () => {
    test('creates a child with correct fields', async () => {
      const parentId = `p_${rid()}`;
      const child = await childService.createChild(parentId, makeChildInput({
        firstName: 'Alice',
        lastName: 'Smith',
      }));

      assert.ok(child.id);
      assert.equal(child.parentId, parentId);
      assert.equal(child.firstName, 'Alice');
      assert.equal(child.gender, 'MALE');
    });

    test('getChild returns created child', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      const found = await childService.getChild(child.id);
      assert.ok(found);
      assert.equal(found!.id, child.id);
    });

    test('getChild returns null for unknown id', async () => {
      const result = await childService.getChild(`unknown_${rid()}`);
      assert.equal(result, null);
    });
  });

  // ---------------------------------------------------------------------------
  // getChildren
  // ---------------------------------------------------------------------------
  describe('getChildren', () => {
    test('returns children for parent', async () => {
      const parentId = `p_${rid()}`;
      await childService.createChild(parentId, makeChildInput());
      await childService.createChild(parentId, makeChildInput());
      await childService.createChild(`other_${rid()}`, makeChildInput());

      const children = await childService.getChildren(parentId);
      assert.equal(children.length, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // updateChild
  // ---------------------------------------------------------------------------
  describe('updateChild', () => {
    test('updates child and returns ok', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      const result = await childService.updateChild(child.id, { firstName: 'Updated' });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.firstName, 'Updated');
      }
    });

    test('returns err for unknown child', async () => {
      const result = await childService.updateChild(`unknown_${rid()}`, { firstName: 'X' });
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteChild
  // ---------------------------------------------------------------------------
  describe('deleteChild', () => {
    test('removes child from storage', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      await childService.deleteChild(child.id);

      const found = await childService.getChild(child.id);
      assert.equal(found, null);
    });
  });

  // ---------------------------------------------------------------------------
  // addDisability / removeDisability
  // ---------------------------------------------------------------------------
  describe('addDisability + removeDisability', () => {
    test('adds a disability to a child', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      const result = await childService.addDisability(child.id, {
        type: 'ADHD',
        description: 'Mild ADHD',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.disabilities.length, 1);
        assert.equal(result.data.disabilities[0].type, 'ADHD');
        assert.equal(result.data.hasSpecialNeeds, true);
      }
    });

    test('removes a disability from a child', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      const added = await childService.addDisability(child.id, { type: 'Dyslexia' });
      if (!added.success) return;

      const disId = added.data.disabilities[0].id;
      const result = await childService.removeDisability(child.id, disId);

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.disabilities.length, 0);
      }
    });

    test('addDisability returns err for unknown child', async () => {
      const result = await childService.addDisability(`unknown_${rid()}`, { type: 'X' });
      assert.strictEqual(result.success, false);
    });
  });

  // ---------------------------------------------------------------------------
  // addSpecialNeed / removeSpecialNeed
  // ---------------------------------------------------------------------------
  describe('addSpecialNeed + removeSpecialNeed', () => {
    test('adds a special need', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      const result = await childService.addSpecialNeed(child.id, {
        category: 'BEHAVIORAL',
        name: 'Needs structure',
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.specialNeeds.length, 1);
        assert.equal(result.data.hasSpecialNeeds, true);
      }
    });

    test('removes a special need', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput());
      const added = await childService.addSpecialNeed(child.id, {
        category: 'SENSORY',
        name: 'Noise sensitivity',
      });
      if (!added.success) return;

      const snId = added.data.specialNeeds[0].id;
      const result = await childService.removeSpecialNeed(child.id, snId);

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.data.specialNeeds.length, 0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getAge
  // ---------------------------------------------------------------------------
  describe('getAge', () => {
    test('returns age for valid date', () => {
      const dob = '2012-01-01';
      const age = childService.getAge(dob);
      assert.ok(age !== null && age >= 13);
    });

    test('returns null for undefined', () => {
      assert.equal(childService.getAge(undefined), null);
    });
  });

  // ---------------------------------------------------------------------------
  // getChildrenWithSpecialNeeds
  // ---------------------------------------------------------------------------
  describe('getChildrenWithSpecialNeeds', () => {
    test('returns only children with special needs', async () => {
      const parentId = `p_${rid()}`;
      const c1 = await childService.createChild(parentId, makeChildInput());
      await childService.createChild(parentId, makeChildInput());

      await childService.addDisability(c1.id, { type: 'ADHD' });

      const result = await childService.getChildrenWithSpecialNeeds(parentId);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, c1.id);
    });
  });

  // ---------------------------------------------------------------------------
  // getCoachSummary
  // ---------------------------------------------------------------------------
  describe('getCoachSummary', () => {
    test('returns summary with name and notes', async () => {
      const child = await childService.createChild(`p_${rid()}`, makeChildInput({
        firstName: 'Test',
        lastName: 'Kid',
        communicationNotes: 'Be gentle',
        allergies: ['Peanuts'],
      }));

      const summary = childService.getCoachSummary(child);
      assert.equal(summary.name, 'Test Kid');
      assert.ok(summary.quickNotes.includes('Be gentle'));
      assert.ok(summary.allergies.includes('Peanuts'));
    });
  });
});
