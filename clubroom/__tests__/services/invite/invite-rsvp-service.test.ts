import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { inviteRsvpService } from '@/services/invite/invite-rsvp-service';
import { api } from '@/constants/config';
import { onTyped, ServiceEvents } from '@/services/event-bus';

function setApiMockMode(value: boolean): void {
  Object.defineProperty(api, 'useMock', {
    value,
    configurable: true,
  });
}

describe('InviteRsvpService', () => {
  beforeEach(async () => {
    setApiMockMode(true);
    inviteRsvpService.__seedMockResponses([]);
  });

  describe('respondToInvite', () => {
    it('should return ok() and create RSVP response', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const result = await inviteRsvpService.respondToInvite(
        inviteId,
        userId,
        'Test User',
        'going'
      );

      assert.ok(result.success);
      assert.equal(result.data.inviteId, inviteId);
      assert.equal(result.data.userId, userId);
      assert.equal(result.data.status, 'going');
    });

    it('should update existing response when user responds again', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      await inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');
      const result = await inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'cant_go');

      assert.ok(result.success);
      assert.equal(result.data.status, 'cant_go');

      const responses = await inviteRsvpService.getResponses(inviteId);
      assert.ok(responses.success);
      assert.equal(responses.data.length, 1);
      assert.equal(responses.data[0].status, 'cant_go');
    });

    it('should include optional childId and childName', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const childId = 'test-child-' + Math.random().toString(36).slice(2);

      const result = await inviteRsvpService.respondToInvite(
        inviteId,
        userId,
        'Test User',
        'maybe',
        childId,
        'Test Child'
      );

      assert.ok(result.success);
      assert.equal(result.data.childId, childId);
      assert.equal(result.data.childName, 'Test Child');
    });

    it('should emit INVITE_RSVP_RESPONDED event', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const events: any[] = [];

      const unsub = onTyped(ServiceEvents.INVITE_RSVP_RESPONDED, (payload) => {
        events.push(payload);
      });

      await inviteRsvpService.respondToInvite(inviteId, userId, 'Test User', 'going');

      assert.equal(events.length, 1);
      assert.equal(events[0].inviteId, inviteId);
      assert.equal(events[0].userId, userId);
      assert.equal(events[0].status, 'going');

      unsub();
    });

    it('should fail closed without writing local RSVP state in API mode', async () => {
      setApiMockMode(false);

      const result = await inviteRsvpService.respondToInvite(
        'invite_api_mode',
        'parent_api_mode',
        'API Parent',
        'going',
      );

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.error.code, 'CONFLICT');
        assert.match(result.error.message, /backend authority/i);
      }

      setApiMockMode(true);
      const responses = await inviteRsvpService.getResponses('invite_api_mode');
      assert.ok(responses.success);
      assert.equal(responses.data.length, 0);
    });
  });

  describe('getResponses', () => {
    it('should return ok() with empty array for invite with no responses', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);

      const result = await inviteRsvpService.getResponses(inviteId);

      assert.ok(result.success);
      assert.equal(result.data.length, 0);
    });

    it('should return all responses for an invite', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);

      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-1-' + Math.random().toString(36).slice(2),
        'User 1',
        'going'
      );
      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-2-' + Math.random().toString(36).slice(2),
        'User 2',
        'maybe'
      );

      const result = await inviteRsvpService.getResponses(inviteId);

      assert.ok(result.success);
      assert.equal(result.data.length, 2);
    });
  });

  describe('getCounts', () => {
    it('should return ok() with zero counts for invite with no responses', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);

      const result = await inviteRsvpService.getCounts(inviteId);

      assert.ok(result.success);
      assert.equal(result.data.going, 0);
      assert.equal(result.data.maybe, 0);
      assert.equal(result.data.cantGo, 0);
    });

    it('should return correct counts for each status', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);

      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-1-' + Math.random().toString(36).slice(2),
        'User 1',
        'going'
      );
      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-2-' + Math.random().toString(36).slice(2),
        'User 2',
        'going'
      );
      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-3-' + Math.random().toString(36).slice(2),
        'User 3',
        'maybe'
      );
      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-4-' + Math.random().toString(36).slice(2),
        'User 4',
        'cant_go'
      );

      const result = await inviteRsvpService.getCounts(inviteId);

      assert.ok(result.success);
      assert.equal(result.data.going, 2);
      assert.equal(result.data.maybe, 1);
      assert.equal(result.data.cantGo, 1);
    });
  });

  describe('getRespondents', () => {
    it('should return ok() with filtered respondents by status', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);

      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-1-' + Math.random().toString(36).slice(2),
        'User 1',
        'going'
      );
      await inviteRsvpService.respondToInvite(
        inviteId,
        'test-user-2-' + Math.random().toString(36).slice(2),
        'User 2',
        'maybe'
      );

      const result = await inviteRsvpService.getRespondents(inviteId, 'going');

      assert.ok(result.success);
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].status, 'going');
    });

    it('should return empty array when no respondents match status', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);

      const result = await inviteRsvpService.getRespondents(inviteId, 'cant_go');

      assert.ok(result.success);
      assert.equal(result.data.length, 0);
    });
  });

  describe('updateResponse', () => {
    it('should return err() for non-existent response', async () => {
      const result = await inviteRsvpService.updateResponse(
        'non-existent-response',
        'going'
      );

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    it('should update existing response status', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);

      const createResult = await inviteRsvpService.respondToInvite(
        inviteId,
        userId,
        'Test User',
        'going'
      );
      assert.ok(createResult.success);
      if (!createResult.success) {
        return;
      }

      const updateResult = await inviteRsvpService.updateResponse(
        createResult.data.id,
        'cant_go'
      );

      assert.ok(updateResult.success);
      assert.equal(updateResult.data.status, 'cant_go');
    });

    it('should emit INVITE_RSVP_RESPONDED event on update', async () => {
      const inviteId = 'test-invite-' + Math.random().toString(36).slice(2);
      const userId = 'test-user-' + Math.random().toString(36).slice(2);
      const events: any[] = [];

      const createResult = await inviteRsvpService.respondToInvite(
        inviteId,
        userId,
        'Test User',
        'going'
      );
      assert.ok(createResult.success);
      if (!createResult.success) {
        return;
      }

      const unsub = onTyped(ServiceEvents.INVITE_RSVP_RESPONDED, (payload) => {
        events.push(payload);
      });

      await inviteRsvpService.updateResponse(createResult.data.id, 'maybe');

      assert.equal(events.length, 1);
      assert.equal(events[0].status, 'maybe');

      unsub();
    });
  });
});
