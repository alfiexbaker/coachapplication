import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('event create flow keeps real club and squad context', () => {
  const routes = readSource('navigation/routes.ts');
  const createEventHook = readSource('hooks/use-create-event.ts');
  const createEventScreen = readSource('app/events/create.tsx');
  const eventsIndex = readSource('app/events/index.tsx');
  const scheduleScreen = readSource('components/club/ClubScheduleScreen.tsx');
  const activitiesPanel = readSource('components/club/ClubActivitiesPanel.tsx');
  const clubDetail = readSource('app/club/[id].tsx');

  assert.ok(routes.includes('export interface EventCreateRouteParams'));
  assert.ok(routes.includes('eventCreate: (params?: EventCreateRouteParams)'));

  assert.ok(createEventHook.includes('useLocalSearchParams<EventCreateParams>'));
  assert.ok(createEventHook.includes('clubAuthorityService.listClubs()'));
  assert.ok(createEventHook.includes('squadService.getSquads(clubId)'));
  assert.ok(createEventHook.includes("field: 'targetAudience', value: 'SQUADS'"));
  assert.ok(createEventHook.includes("field: 'selectedSquadIds', value: [routeSquadId]"));
  assert.ok(createEventHook.includes('clubId,'));
  assert.ok(createEventHook.includes('clubName,'));
  assert.equal(createEventHook.includes('DEFAULT_EVENT_CLUB_ID'), false);
  assert.equal(createEventHook.includes('Riverside FC'), false);

  assert.ok(createEventScreen.includes('clubId={clubId}'));
  assert.equal(createEventScreen.includes('DEFAULT_EVENT_CLUB_ID'), false);

  assert.ok(eventsIndex.includes('clubAuthorityService.listClubs()'));
  assert.ok(
    eventsIndex.includes('Routes.eventCreate({ clubId: activeClubId, clubName: activeClubName })'),
  );
  assert.equal(eventsIndex.includes('DEFAULT_EVENT_CLUB_ID'), false);

  assert.ok(scheduleScreen.includes('getEventCreateHref('));
  assert.ok(scheduleScreen.includes('Routes.eventCreate({'));
  assert.ok(scheduleScreen.includes('clubId ?? schedule.squad?.clubId'));
  assert.ok(scheduleScreen.includes("scope === 'squad' && squadId ? { squadId } : {}"));

  assert.ok(activitiesPanel.includes('getClubEventCreateHref'));
  assert.ok(activitiesPanel.includes('Routes.eventCreate({'));

  assert.ok(clubDetail.includes('Routes.eventCreate({ clubId: id, clubName: club?.name })'));
});
