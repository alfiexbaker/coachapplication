import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { sessionInviteService } from '@/services/invite/session-invite-service';
import { POC_ACCOUNT_IDS } from '@/constants/poc-accounts';
import type { Result, ServiceError } from '@/types/result';

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

let seq = 0;

function nextId(prefix: string): string {
  seq += 1;
  return `${prefix}_${seq}`;
}

describe('sessionInviteService', () => {
  beforeEach(async () => {
    seq = 0;
    await apiClient.set(STORAGE_KEYS.SESSION_INVITES, []);
    await apiClient.set(STORAGE_KEYS.INVITE_SLOT_HOLDS, []);
    await sessionInviteService.clearCache();
  });

  it('creates invite and retrieves it by id', async () => {
    const parentId = nextId('parent');
    const invite = expectOk(await sessionInviteService.createInvite(nextId('athlete'), {
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      parentId,
      parentName: 'Parent Test',
      athleteNames: 'Athlete Test',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
      price: 50,
      duration: 60,
    }));

    const fetched = await sessionInviteService.getInvite(invite.id);
    assert.ok(fetched);
    assert.equal(fetched?.id, invite.id);
    assert.equal(fetched?.parentId, parentId);
    assert.equal(fetched?.status, 'PENDING');
  });

  it('responds to invite with DECLINED and updates status', async () => {
    const invite = expectOk(await sessionInviteService.createInvite(nextId('athlete'), {
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      parentId: nextId('parent'),
      parentName: 'Parent Test',
      athleteNames: 'Athlete Test',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Finishing',
    }));

    const updated = expectOk(await sessionInviteService.respondToInvite({
      inviteId: invite.id,
      response: 'DECLINED',
    }));
    assert.equal(updated.status, 'DECLINED');
  });

  it('cancels invite and excludes it from open invites', async () => {
    const invite = expectOk(await sessionInviteService.createInvite(nextId('athlete'), {
      coachId: nextId('coach'),
      coachName: 'Coach Test',
      parentId: nextId('parent'),
      parentName: 'Parent Test',
      athleteNames: 'Athlete Test',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Dribbling',
    }));

    await sessionInviteService.cancelInvite(invite.id);

    const fetched = await sessionInviteService.getInvite(invite.id);
    assert.equal(fetched?.status, 'EXPIRED');

    const openInvites = await sessionInviteService.getOpenInvites();
    assert.ok(!openInvites.some((item) => item.id === invite.id));
  });

  it('matches canonical aliases in coach/parent invite lookups', async () => {
    const created = expectOk(await sessionInviteService.createInvite(POC_ACCOUNT_IDS.athleteStorage, {
      coachId: POC_ACCOUNT_IDS.coachStorage,
      coachName: 'Coach Alias',
      parentId: POC_ACCOUNT_IDS.parent,
      parentName: 'Parent Alias',
      athleteNames: 'Athlete Alias',
      proposedSlots: [],
      sessionType: '1:1 Coaching',
      focus: 'Passing',
    }));

    const byCoach = await sessionInviteService.getCoachInvites(POC_ACCOUNT_IDS.coach);
    const byParent = await sessionInviteService.getParentInvites(POC_ACCOUNT_IDS.parent);

    assert.ok(byCoach.length >= 1);
    assert.ok(byParent.length >= 1);
    assert.ok(byCoach.some((invite) => invite.id === created.id));
    assert.ok(byParent.some((invite) => invite.id === created.id));
  });
});
