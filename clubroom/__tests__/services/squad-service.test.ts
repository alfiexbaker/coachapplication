import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { squadService } from '@/services/squad-service';

describe('squadService', () => {
  beforeEach(async () => {
    squadService.__resetMockSquads();
    await apiClient.remove(STORAGE_KEYS.SQUAD_MEMBERS);
  });

  it('gets squads for a club and creates a custom squad (happy path)', async () => {
    const initial = await squadService.getSquads('club_lions');
    assert.ok(initial.length > 0);

    const created = await squadService.createSquad({
      clubId: 'club_lions',
      name: 'U13 Dev Squad',
      level: 'U13 · Development',
      description: 'Development pathway squad',
      meetingLocation: 'Pitch 4',
    });
    assert.ok(created.id.startsWith('squad_'));

    const fetched = await squadService.getSquad(created.id);
    assert.ok(fetched);
    assert.equal(fetched?.name, 'U13 Dev Squad');
  });

  it('returns null for missing squad id (empty path)', async () => {
    const squad = await squadService.getSquad('squad_missing');
    assert.equal(squad, null);
  });

  it('returns squad summary and helper labels', async () => {
    const summary = await squadService.getSquadSummary('squad_u15');
    assert.ok(summary.squad);
    assert.ok(summary.memberCount >= 0);
    assert.ok(summary.parentCount >= 0);

    if (!summary.squad) return;
    const label = squadService.formatSquadLabel(summary.squad);
    assert.ok(label.includes(summary.squad.name));
    assert.equal(squadService.getAgeGroupLabel(summary.squad), 'U15');
  });
});
