/**
 * Event Service (Facade) Tests
 *
 * Verifies re-exports from the event service module.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { eventService } from '../../services/event-service';

describe('eventService (facade)', () => {
  test('exports eventService object', () => {
    assert.equal(typeof eventService, 'object');
    assert.ok(eventService !== null);
  });

  test('has createEvent method from crud service', () => {
    assert.equal(typeof eventService.createEvent, 'function');
  });

  test('has formatEventType method from display service', () => {
    assert.equal(typeof eventService.formatEventType, 'function');
  });

  test('has rsvp method from rsvp service', () => {
    assert.equal(typeof eventService.rsvp, 'function');
  });

  test('has checkIn method from attendance service', () => {
    assert.equal(typeof eventService.checkIn, 'function');
  });
});
