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
  const createEventAudienceStep = readSource('components/event/create-event-audience-step.tsx');
  const inlineSquadSelector = readSource('components/squad/inline-squad-selector.tsx');
  const eventsIndex = readSource('app/events/index.tsx');
  const scheduleScreen = readSource('components/club/ClubScheduleScreen.tsx');
  const activitiesPanel = readSource('components/club/ClubActivitiesPanel.tsx');
  const clubDetail = readSource('app/club/[id].tsx');

  assert.ok(routes.includes('export interface EventCreateRouteParams'));
  assert.ok(routes.includes('eventCreate: (params?: EventCreateRouteParams)'));

  assert.ok(createEventHook.includes('useLocalSearchParams<EventCreateParams>'));
  assert.ok(createEventHook.includes('clubAuthorityService.listClubs()'));
  assert.ok(createEventHook.includes('squadService.getSquads(clubId)'));
  assert.ok(createEventHook.includes('SQUAD_CONTEXT_ERROR_MESSAGE'));
  assert.ok(
    createEventHook.includes(
      'const [squadContextError, setSquadContextError] = useState<string | null>(null);',
    ),
  );
  assert.ok(createEventHook.includes('setSquadContextError(SQUAD_CONTEXT_ERROR_MESSAGE);'));
  assert.ok(createEventHook.includes('const selectedSquadsHaveAuthority = (): boolean => {'));
  assert.ok(createEventHook.includes('const liveSquadIds = new Set(squads.map((squad) => squad.id));'));
  assert.ok(
    createEventHook.includes(
      'return form.selectedSquadIds.every((squadId) => liveSquadIds.has(squadId));',
    ),
  );
  assert.ok(createEventHook.includes('!squadContextLoading &&'));
  assert.ok(createEventHook.includes('!squadContextError &&'));
  assert.ok(createEventHook.includes('selectedSquadsHaveAuthority()'));
  const squadGuardIndex = createEventHook.indexOf(
    "if (form.targetAudience === 'SQUADS') {\n      if (squadContextLoading || squadContextError)",
  );
  const eventCreateIndex = createEventHook.indexOf('const event = await eventService.createEvent(input);');
  assert.ok(squadGuardIndex >= 0);
  assert.ok(eventCreateIndex > squadGuardIndex);
  assert.ok(createEventHook.includes("field: 'targetAudience', value: 'SQUADS'"));
  assert.ok(createEventHook.includes("field: 'selectedSquadIds', value: [routeSquadId]"));
  assert.ok(createEventHook.includes('clubId,'));
  assert.ok(createEventHook.includes('clubName,'));
  assert.ok(createEventHook.includes('squadContextLoading,'));
  assert.ok(createEventHook.includes('squadContextError,'));
  assert.ok(createEventHook.includes('retrySquadContext: () => setSquadContextVersion'));
  assert.equal(createEventHook.includes('DEFAULT_EVENT_CLUB_ID'), false);
  assert.equal(createEventHook.includes('Riverside FC'), false);

  assert.ok(createEventScreen.includes('clubId={clubId}'));
  assert.ok(createEventScreen.includes('squadContextLoading,'));
  assert.ok(createEventScreen.includes('squadContextError,'));
  assert.ok(createEventScreen.includes('retrySquadContext,'));
  assert.ok(createEventScreen.includes('squadLoading={squadContextLoading}'));
  assert.ok(createEventScreen.includes('squadError={squadContextError}'));
  assert.ok(createEventScreen.includes('onRetrySquads={retrySquadContext}'));
  assert.equal(createEventScreen.includes('DEFAULT_EVENT_CLUB_ID'), false);

  assert.ok(createEventAudienceStep.includes('squadLoading = false'));
  assert.ok(createEventAudienceStep.includes('squadError = null'));
  assert.ok(createEventAudienceStep.includes('squads={squads}'));
  assert.ok(createEventAudienceStep.includes('loading={squadLoading}'));
  assert.ok(createEventAudienceStep.includes('error={squadError}'));
  assert.ok(createEventAudienceStep.includes('onRetry={onRetrySquads}'));
  assert.ok(
    createEventAudienceStep.includes(
      'const hasLiveSquadSelection = !squadLoading && !squadError && selectedSquadIds.length > 0;',
    ),
  );

  assert.ok(inlineSquadSelector.includes('const isControlled = controlledSquads !== undefined;'));
  assert.ok(inlineSquadSelector.includes('if (isControlled)'));
  assert.ok(inlineSquadSelector.includes('if (onRetry)'));
  assert.ok(inlineSquadSelector.includes('{visibleError}. Tap to retry.'));

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
