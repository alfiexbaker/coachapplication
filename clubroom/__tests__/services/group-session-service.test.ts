/**
 * Group Session Service (Facade) Tests
 *
 * Verifies re-exports from the group session service module.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { groupSessionService } from '../../services/group-session-service';

describe('groupSessionService (facade)', () => {
  test('exports groupSessionService object', () => {
    assert.equal(typeof groupSessionService, 'object');
    assert.ok(groupSessionService !== null);
  });

  test('has createSession method from crud service', () => {
    assert.equal(typeof groupSessionService.createSession, 'function');
  });

  test('has register method from registration service', () => {
    assert.equal(typeof groupSessionService.register, 'function');
  });

  test('has formatPrice method from display service', () => {
    assert.equal(typeof groupSessionService.formatPrice, 'function');
  });

  test('has getClubTrainingSessions method from scheduling service', () => {
    assert.equal(typeof groupSessionService.getClubTrainingSessions, 'function');
  });
});
