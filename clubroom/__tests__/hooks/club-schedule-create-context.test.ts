import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('club schedule training create keeps club and squad context', () => {
  const scheduleScreen = readSource('components/club/ClubScheduleScreen.tsx');
  const activitiesPanel = readSource('components/club/ClubActivitiesPanel.tsx');
  const createSessionHook = readSource('hooks/use-create-session.ts');

  assert.ok(scheduleScreen.includes('Routes.sessionsCreateIntent({'));
  assert.ok(scheduleScreen.includes("source: 'club_manage'"));
  assert.ok(scheduleScreen.includes("actingAs: 'club'"));
  assert.ok(scheduleScreen.includes("inviteType: scope === 'squad' ? 'SQUAD_ONLY' : 'CLOSED'"));
  assert.ok(scheduleScreen.includes('scope === \'squad\' && squadId ? { squadId } : {}'));
  assert.ok(scheduleScreen.includes('clubId ?? schedule.squad?.clubId'));

  assert.ok(activitiesPanel.includes('getClubTrainingCreateHref'));
  assert.ok(activitiesPanel.includes('Routes.sessionsCreateIntent({'));
  assert.ok(activitiesPanel.includes('clubId,'));

  assert.ok(createSessionHook.includes('squadId?: string'));
  assert.ok(createSessionHook.includes('const ownerSquadId ='));
  assert.ok(createSessionHook.includes('squadId: ownerSquadId'));
  assert.ok(createSessionHook.includes('ownerSquadId && isRecurring'));
});
