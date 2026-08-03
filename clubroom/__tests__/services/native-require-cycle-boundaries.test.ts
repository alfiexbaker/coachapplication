import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('notification runtime does not initialize the community compatibility facade', () => {
  const store = source('services/notification/notification-store.ts');
  const preferences = source('services/notification/notification-preferences.ts');
  const authority = source('services/notification/notification-authority-service.ts');

  assert.equal(store.includes("from '../community-media-authority-service'"), false);
  assert.equal(preferences.includes("from '../community-media-authority-service'"), false);
  assert.equal(authority.includes('community-media-authority-service'), false);
  assert.equal(authority.includes('user-service'), false);
  assert.equal(authority.includes('family-member-service'), false);
  assert.equal(authority.includes("from '@/services/booking'"), false);
});

test('family aggregation does not initialize the booking lifecycle facade', () => {
  const familyMembers = source('services/family/family-member-service.ts');
  const familyPermissions = source('services/family/family-permission-service.ts');

  assert.equal(familyMembers.includes("from '@/services/booking';"), false);
  assert.ok(familyMembers.includes("from '@/services/booking/booking-authority-service';"));
  assert.equal(familyPermissions.includes("from './family-member-service'"), false);
});

test('event CRUD does not initialize the club facade to read mock recipients', () => {
  const eventCrud = source('services/event/event-crud-service.ts');
  const memberStore = source('services/club-member-mock-store.ts');

  assert.equal(eventCrud.includes("from '../club-service'"), false);
  assert.ok(eventCrud.includes("from '../club-member-mock-store'"));
  assert.equal(memberStore.includes('club-service'), false);
});
