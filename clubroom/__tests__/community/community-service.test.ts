/**
 * Community Service Tests
 *
 * Unit tests for the community service functionality including
 * parent groups, group messaging, and carpool coordination.
 */

import assert from 'node:assert';
import test, { describe } from 'node:test';

import {
  communityService as communityServiceResult,
  CreateGroupParams,
  CreateCarpoolOfferParams,
  RequestCarpoolSeatParams,
} from '../../services/community-service';
import type { GroupType } from '../../constants/types';

const legacyCommunityService = {
  ...communityServiceResult,
  async getParentGroups(parentId: string) {
    const result = await communityServiceResult.getParentGroups(parentId);
    return result.success ? result.data : [];
  },
  async getPublicGroups() {
    const result = await communityServiceResult.getPublicGroups();
    return result.success ? result.data : [];
  },
  async getGroup(groupId: string) {
    const result = await communityServiceResult.getGroup(groupId);
    return result.success ? result.data : undefined;
  },
  async createGroup(params: CreateGroupParams) {
    const result = await communityServiceResult.createGroup(params);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
  async getGroupMessages(groupId: string) {
    const result = await communityServiceResult.getGroupMessages(groupId);
    return result.success ? result.data : [];
  },
  async sendGroupMessage(
    groupId: string,
    senderId: string,
    senderName: string,
    body: string,
  ) {
    const result = await communityServiceResult.sendGroupMessage(
      groupId,
      senderId,
      senderName,
      body,
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
  async markMessagesRead(groupId: string, parentId: string) {
    const result = await communityServiceResult.markMessagesRead(groupId, parentId);
    if (!result.success) {
      throw new Error(result.error.message);
    }
  },
  async getCarpoolOffers(sessionId: string) {
    const result = await communityServiceResult.getCarpoolOffers(sessionId);
    return result.success ? result.data : [];
  },
  async getAvailableCarpoolOffers(excludeParentId: string) {
    const result = await communityServiceResult.getAvailableCarpoolOffers(excludeParentId);
    return result.success ? result.data : [];
  },
  async getCarpoolOffer(offerId: string) {
    const result = await communityServiceResult.getCarpoolOffer(offerId);
    return result.success ? result.data : undefined;
  },
  async createCarpoolOffer(params: CreateCarpoolOfferParams) {
    const result = await communityServiceResult.createCarpoolOffer(params);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data;
  },
};

describe('Community Service', () => {
  describe('Group Management', () => {
    describe('getParentGroups', () => {
      test('should return groups for a specific parent', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');

        assert.ok(Array.isArray(groups));
        assert.ok(groups.length > 0);

        groups.forEach((group) => {
          const isMember = group.members.some((m) => m.parentId === 'parent1');
          assert.strictEqual(isMember, true, 'Parent should be a member of each returned group');
        });
      });

      test('should return empty array for parent with no groups', async () => {
        const groups = await legacyCommunityService.getParentGroups('non_existent_parent');

        assert.ok(Array.isArray(groups));
        assert.strictEqual(groups.length, 0);
      });
    });

    describe('getPublicGroups', () => {
      test('should return only public groups', async () => {
        const groups = await legacyCommunityService.getPublicGroups();

        assert.ok(Array.isArray(groups));
        groups.forEach((group) => {
          assert.strictEqual(group.isPublic, true, 'All returned groups should be public');
        });
      });
    });

    describe('getGroup', () => {
      test('should return group by ID', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const firstGroup = groups[0];

        const group = await legacyCommunityService.getGroup(firstGroup.id);

        assert.ok(group);
        assert.strictEqual(group.id, firstGroup.id);
        assert.strictEqual(group.name, firstGroup.name);
      });

      test('should return undefined for non-existent group', async () => {
        const group = await legacyCommunityService.getGroup('non_existent');

        assert.strictEqual(group, undefined);
      });
    });

    describe('createGroup', () => {
      test('should create a new group with required fields', async () => {
        const params: CreateGroupParams = {
          name: 'Test Group',
          type: 'GENERAL',
          memberIds: [],
          memberNames: [],
          creatorId: 'test_parent',
          creatorName: 'Test Parent',
        };

        const group = await legacyCommunityService.createGroup(params);

        assert.ok(group.id.startsWith('group_'));
        assert.strictEqual(group.name, 'Test Group');
        assert.strictEqual(group.type, 'GENERAL');
        assert.strictEqual(group.createdById, 'test_parent');
        assert.strictEqual(group.createdByName, 'Test Parent');
        assert.strictEqual(group.isPublic, false);
        assert.ok(group.createdAt);
        assert.ok(group.updatedAt);

        // Creator should be added as owner
        assert.strictEqual(group.members.length, 1);
        assert.strictEqual(group.members[0].parentId, 'test_parent');
        assert.strictEqual(group.members[0].role, 'OWNER');
      });

      test('should create a group with all optional fields', async () => {
        const params: CreateGroupParams = {
          name: 'Full Group',
          description: 'A detailed description',
          type: 'CLUB',
          memberIds: ['member1', 'member2'],
          memberNames: ['Member One', 'Member Two'],
          creatorId: 'test_parent',
          creatorName: 'Test Parent',
          isPublic: true,
          clubId: 'club_1',
          maxMembers: 50,
        };

        const group = await legacyCommunityService.createGroup(params);

        assert.strictEqual(group.name, 'Full Group');
        assert.strictEqual(group.description, 'A detailed description');
        assert.strictEqual(group.type, 'CLUB');
        assert.strictEqual(group.isPublic, true);
        assert.strictEqual(group.clubId, 'club_1');
        assert.strictEqual(group.maxMembers, 50);

        // Creator + 2 members = 3 total
        assert.strictEqual(group.members.length, 3);
      });

      test('should support all group types', async () => {
        const types: GroupType[] = ['CLUB', 'SESSION', 'CARPOOL', 'GENERAL'];

        for (const type of types) {
          const params: CreateGroupParams = {
            name: `${type} Group`,
            type,
            memberIds: [],
            memberNames: [],
            creatorId: 'test_parent',
            creatorName: 'Test Parent',
          };

          const group = await legacyCommunityService.createGroup(params);
          assert.strictEqual(group.type, type);
        }
      });
    });

    describe('joinGroup', () => {
      test('should allow joining a public group', async () => {
        // Create a public group first
        const createParams: CreateGroupParams = {
          name: 'Joinable Group',
          type: 'GENERAL',
          memberIds: [],
          memberNames: [],
          creatorId: 'creator_parent',
          creatorName: 'Creator Parent',
          isPublic: true,
        };

        const createdGroup = await legacyCommunityService.createGroup(createParams);

        const result = await legacyCommunityService.joinGroup(
          createdGroup.id,
          'new_parent',
          'New Parent'
        );

        assert.strictEqual(result.success, true);
        if (!result.success) return;
        const updatedGroup = result.data;

        assert.strictEqual(updatedGroup.members.length, 2);
        const newMember = updatedGroup.members.find((m) => m.parentId === 'new_parent');
        assert.ok(newMember);
        assert.strictEqual(newMember.role, 'MEMBER');
        assert.ok(newMember.joinedAt);
      });

      test('should return error when joining private group', async () => {
        // Create a private group
        const createParams: CreateGroupParams = {
          name: 'Private Group',
          type: 'GENERAL',
          memberIds: [],
          memberNames: [],
          creatorId: 'creator_parent',
          creatorName: 'Creator Parent',
          isPublic: false,
        };

        const createdGroup = await legacyCommunityService.createGroup(createParams);

        const result = await legacyCommunityService.joinGroup(createdGroup.id, 'new_parent', 'New Parent');

        assert.strictEqual(result.success, false);
        if (result.success) return;
        assert.strictEqual(result.error.message, 'Cannot join private group without invitation');
      });

      test('should return error when already a member', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups.find((g) => g.isPublic);

        if (group) {
          const result = await legacyCommunityService.joinGroup(group.id, 'parent1', 'John Henderson');

          assert.strictEqual(result.success, false);
          if (result.success) return;
          assert.strictEqual(result.error.message, 'Already a member of this group');
        }
      });
    });

    describe('leaveGroup', () => {
      test('should allow member to leave group', async () => {
        // Create a group with multiple members
        const createParams: CreateGroupParams = {
          name: 'Leave Test Group',
          type: 'GENERAL',
          memberIds: ['member_to_leave'],
          memberNames: ['Member To Leave'],
          creatorId: 'admin_parent',
          creatorName: 'Admin Parent',
          isPublic: true,
        };

        const createdGroup = await legacyCommunityService.createGroup(createParams);
        assert.strictEqual(createdGroup.members.length, 2);

        const leaveResult = await legacyCommunityService.leaveGroup(createdGroup.id, 'member_to_leave');
        assert.strictEqual(leaveResult.success, true);

        const updatedGroup = await legacyCommunityService.getGroup(createdGroup.id);
        assert.ok(updatedGroup);
        assert.strictEqual(updatedGroup.members.length, 1);
        assert.ok(!updatedGroup.members.find((m) => m.parentId === 'member_to_leave'));
      });

      test('should return error when only admin tries to leave with other members', async () => {
        // Create a group where creator is only admin
        const createParams: CreateGroupParams = {
          name: 'Admin Leave Test',
          type: 'GENERAL',
          memberIds: ['regular_member'],
          memberNames: ['Regular Member'],
          creatorId: 'only_admin',
          creatorName: 'Only Admin',
          isPublic: true,
        };

        const createdGroup = await legacyCommunityService.createGroup(createParams);

        const result = await legacyCommunityService.leaveGroup(createdGroup.id, 'only_admin');

        assert.strictEqual(result.success, false);
        if (result.success) return;
        assert.strictEqual(result.error.message, 'Cannot leave group as the only admin. Promote another member first.');
      });

      test('should return error for non-member', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups[0];

        const result = await legacyCommunityService.leaveGroup(group.id, 'non_member');

        assert.strictEqual(result.success, false);
        if (result.success) return;
        assert.ok(result.error.message);
      });
    });
  });

  describe('Group Messaging', () => {
    describe('getGroupMessages', () => {
      test('should return messages for a group', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups[0];

        const messages = await legacyCommunityService.getGroupMessages(group.id);

        assert.ok(Array.isArray(messages));
      });

      test('should return messages sorted by time', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups[0];

        const messages = await legacyCommunityService.getGroupMessages(group.id);

        for (let i = 1; i < messages.length; i++) {
          const prevTime = new Date(messages[i - 1].createdAt).getTime();
          const currTime = new Date(messages[i].createdAt).getTime();
          assert.ok(prevTime <= currTime, 'Messages should be sorted chronologically');
        }
      });
    });

    describe('sendGroupMessage', () => {
      test('should send a message to a group', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups[0];

        const message = await legacyCommunityService.sendGroupMessage(
          group.id,
          'parent1',
          'John Henderson',
          'Hello, world!'
        );

        assert.ok(message.id.startsWith('gmsg_'));
        assert.strictEqual(message.groupId, group.id);
        assert.strictEqual(message.senderId, 'parent1');
        assert.strictEqual(message.senderName, 'John Henderson');
        assert.strictEqual(message.body, 'Hello, world!');
        assert.strictEqual(message.status, 'sent');
        assert.ok(message.createdAt);
        assert.ok(message.readBy.includes('parent1'));
      });

      test('should update group last message info', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups[0];
        const messageBody = 'Test message for update';

        await legacyCommunityService.sendGroupMessage(group.id, 'parent1', 'John', messageBody);

        const updatedGroup = await legacyCommunityService.getGroup(group.id);
        assert.ok(updatedGroup);
        assert.ok(updatedGroup.lastMessageAt);
        assert.ok(updatedGroup.lastMessagePreview?.includes('Test message'));
      });
    });

    describe('markMessagesRead', () => {
      test('should mark messages as read for a parent', async () => {
        const groups = await legacyCommunityService.getParentGroups('parent1');
        const group = groups[0];

        // Send a message first
        await legacyCommunityService.sendGroupMessage(
          group.id,
          'parent1',
          'John',
          'Read test message'
        );

        await legacyCommunityService.markMessagesRead(group.id, 'parent2');

        const messages = await legacyCommunityService.getGroupMessages(group.id);
        const latestMessage = messages[messages.length - 1];
        assert.ok(latestMessage.readBy.includes('parent2'));
      });
    });
  });

  describe('Carpool Management', () => {
    describe('getCarpoolOffers', () => {
      test('should return active offers for a session', async () => {
        const offers = await legacyCommunityService.getCarpoolOffers('session_1');

        assert.ok(Array.isArray(offers));
        offers.forEach((offer) => {
          assert.strictEqual(offer.sessionId, 'session_1');
          assert.strictEqual(offer.status, 'ACTIVE');
        });
      });
    });

    describe('getAvailableCarpoolOffers', () => {
      test('should exclude current user offers', async () => {
        const offers = await legacyCommunityService.getAvailableCarpoolOffers('parent1');

        offers.forEach((offer) => {
          assert.notStrictEqual(offer.parentId, 'parent1');
        });
      });

      test('should only return active offers with available seats', async () => {
        const offers = await legacyCommunityService.getAvailableCarpoolOffers('some_parent');

        offers.forEach((offer) => {
          assert.strictEqual(offer.status, 'ACTIVE');
          assert.ok(offer.seatsAvailable > offer.seatsTaken);
        });
      });
    });

    describe('createCarpoolOffer', () => {
      test('should create a new carpool offer', async () => {
        const params: CreateCarpoolOfferParams = {
          parentId: 'test_parent',
          parentName: 'Test Parent',
          sessionId: 'test_session',
          sessionName: 'Test Training',
          sessionDate: '2026-02-15',
          seatsAvailable: 3,
          pickupLocation: 'Test Location',
          pickupTime: '10:00',
          returnOffered: true,
          returnTime: '13:00',
          notes: 'Test notes',
        };

        const offer = await legacyCommunityService.createCarpoolOffer(params);

        assert.ok(offer.id.startsWith('carpool_'));
        assert.strictEqual(offer.parentId, 'test_parent');
        assert.strictEqual(offer.parentName, 'Test Parent');
        assert.strictEqual(offer.sessionName, 'Test Training');
        assert.strictEqual(offer.sessionDate, '2026-02-15');
        assert.strictEqual(offer.seatsAvailable, 3);
        assert.strictEqual(offer.seatsTaken, 0);
        assert.strictEqual(offer.pickupLocation, 'Test Location');
        assert.strictEqual(offer.pickupTime, '10:00');
        assert.strictEqual(offer.returnOffered, true);
        assert.strictEqual(offer.returnTime, '13:00');
        assert.strictEqual(offer.notes, 'Test notes');
        assert.strictEqual(offer.status, 'ACTIVE');
        assert.strictEqual(offer.requests.length, 0);
        assert.strictEqual(offer.acceptedRequests.length, 0);
      });

      test('should create offer without return trip', async () => {
        const params: CreateCarpoolOfferParams = {
          parentId: 'test_parent',
          parentName: 'Test Parent',
          sessionId: 'test_session',
          sessionName: 'One Way Session',
          sessionDate: '2026-02-20',
          seatsAvailable: 2,
          pickupLocation: 'Pickup Spot',
          pickupTime: '09:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(params);

        assert.strictEqual(offer.returnOffered, false);
        assert.strictEqual(offer.returnTime, undefined);
      });
    });

    describe('requestCarpoolSeat', () => {
      test('should create a seat request', async () => {
        // Create a carpool offer first
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'offer_parent',
          parentName: 'Offer Parent',
          sessionId: 'request_test_session',
          sessionName: 'Request Test Session',
          sessionDate: '2026-03-01',
          seatsAvailable: 3,
          pickupLocation: 'Test Pickup',
          pickupTime: '08:30',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        const requestParams: RequestCarpoolSeatParams = {
          offerId: offer.id,
          parentId: 'requester_parent',
          parentName: 'Requester Parent',
          childNames: ['Child One'],
          seatsRequested: 1,
          message: 'Would like to join!',
        };

        const result = await legacyCommunityService.requestCarpoolSeat(requestParams);

        assert.strictEqual(result.success, true);
        if (!result.success) return;
        const request = result.data;

        assert.ok(request.id.startsWith('req_'));
        assert.strictEqual(request.offerId, offer.id);
        assert.strictEqual(request.parentId, 'requester_parent');
        assert.strictEqual(request.parentName, 'Requester Parent');
        assert.strictEqual(request.seatsRequested, 1);
        assert.strictEqual(request.message, 'Would like to join!');
        assert.strictEqual(request.status, 'PENDING');
        assert.ok(request.requestedAt);
      });

      test('should return error if not enough seats', async () => {
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'limited_parent',
          parentName: 'Limited Parent',
          sessionId: 'limited_session',
          sessionName: 'Limited Session',
          sessionDate: '2026-03-05',
          seatsAvailable: 1,
          pickupLocation: 'Limited Spot',
          pickupTime: '09:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        const requestParams: RequestCarpoolSeatParams = {
          offerId: offer.id,
          parentId: 'greedy_parent',
          parentName: 'Greedy Parent',
          childNames: ['Kid 1', 'Kid 2', 'Kid 3'],
          seatsRequested: 3,
        };

        const result = await legacyCommunityService.requestCarpoolSeat(requestParams);

        assert.strictEqual(result.success, false);
        if (result.success) return;
        assert.strictEqual(result.error.message, 'Not enough seats available');
      });
    });

    describe('acceptCarpoolRequest', () => {
      test('should accept a pending request', async () => {
        // Create offer
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'accept_test_parent',
          parentName: 'Accept Test Parent',
          sessionId: 'accept_session',
          sessionName: 'Accept Test',
          sessionDate: '2026-03-10',
          seatsAvailable: 2,
          pickupLocation: 'Accept Spot',
          pickupTime: '10:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        // Create request
        const requestParams: RequestCarpoolSeatParams = {
          offerId: offer.id,
          parentId: 'accept_requester',
          parentName: 'Accept Requester',
          childNames: ['Child'],
          seatsRequested: 1,
        };

        const requestResult = await legacyCommunityService.requestCarpoolSeat(requestParams);
        assert.strictEqual(requestResult.success, true);
        if (!requestResult.success) return;
        const request = requestResult.data;

        // Accept request
        const acceptResult = await legacyCommunityService.acceptCarpoolRequest(offer.id, request.id);
        assert.strictEqual(acceptResult.success, true);

        const updatedOffer = await legacyCommunityService.getCarpoolOffer(offer.id);
        assert.ok(updatedOffer);

        const acceptedRequest = updatedOffer.requests.find((r) => r.id === request.id);
        assert.ok(acceptedRequest);
        assert.strictEqual(acceptedRequest.status, 'ACCEPTED');
        assert.ok(acceptedRequest.respondedAt);

        assert.strictEqual(updatedOffer.seatsTaken, 1);
        assert.strictEqual(updatedOffer.acceptedRequests.length, 1);
      });

      test('should mark offer as full when all seats taken', async () => {
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'full_test_parent',
          parentName: 'Full Test Parent',
          sessionId: 'full_session',
          sessionName: 'Full Test',
          sessionDate: '2026-03-15',
          seatsAvailable: 1,
          pickupLocation: 'Full Spot',
          pickupTime: '11:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        const requestParams: RequestCarpoolSeatParams = {
          offerId: offer.id,
          parentId: 'filler_parent',
          parentName: 'Filler Parent',
          childNames: ['Kid'],
          seatsRequested: 1,
        };

        const requestResult = await legacyCommunityService.requestCarpoolSeat(requestParams);
        assert.strictEqual(requestResult.success, true);
        if (!requestResult.success) return;
        const request = requestResult.data;

        const acceptResult = await legacyCommunityService.acceptCarpoolRequest(offer.id, request.id);
        assert.strictEqual(acceptResult.success, true);

        const updatedOffer = await legacyCommunityService.getCarpoolOffer(offer.id);
        assert.ok(updatedOffer);
        assert.strictEqual(updatedOffer.status, 'FULL');
      });
    });

    describe('declineCarpoolRequest', () => {
      test('should decline a pending request', async () => {
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'decline_test_parent',
          parentName: 'Decline Test Parent',
          sessionId: 'decline_session',
          sessionName: 'Decline Test',
          sessionDate: '2026-03-20',
          seatsAvailable: 2,
          pickupLocation: 'Decline Spot',
          pickupTime: '12:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        const requestParams: RequestCarpoolSeatParams = {
          offerId: offer.id,
          parentId: 'declined_parent',
          parentName: 'Declined Parent',
          childNames: ['Kid'],
          seatsRequested: 1,
        };

        const requestResult = await legacyCommunityService.requestCarpoolSeat(requestParams);
        assert.strictEqual(requestResult.success, true);
        if (!requestResult.success) return;
        const request = requestResult.data;

        const declineResult = await legacyCommunityService.declineCarpoolRequest(offer.id, request.id);
        assert.strictEqual(declineResult.success, true);

        const updatedOffer = await legacyCommunityService.getCarpoolOffer(offer.id);
        assert.ok(updatedOffer);

        const declinedRequest = updatedOffer.requests.find((r) => r.id === request.id);
        assert.ok(declinedRequest);
        assert.strictEqual(declinedRequest.status, 'DECLINED');
        assert.ok(declinedRequest.respondedAt);

        // Seats should not be affected
        assert.strictEqual(updatedOffer.seatsTaken, 0);
      });
    });

    describe('cancelCarpoolOffer', () => {
      test('should cancel an offer', async () => {
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'cancel_test_parent',
          parentName: 'Cancel Test Parent',
          sessionId: 'cancel_session',
          sessionName: 'Cancel Test',
          sessionDate: '2026-03-25',
          seatsAvailable: 2,
          pickupLocation: 'Cancel Spot',
          pickupTime: '13:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        const cancelResult = await legacyCommunityService.cancelCarpoolOffer(offer.id, 'cancel_test_parent');
        assert.strictEqual(cancelResult.success, true);

        const cancelledOffer = await legacyCommunityService.getCarpoolOffer(offer.id);
        assert.ok(cancelledOffer);
        assert.strictEqual(cancelledOffer.status, 'CANCELLED');
      });

      test('should return error if not the creator', async () => {
        const offerParams: CreateCarpoolOfferParams = {
          parentId: 'owner_parent',
          parentName: 'Owner Parent',
          sessionId: 'owned_session',
          sessionName: 'Owned Session',
          sessionDate: '2026-03-30',
          seatsAvailable: 2,
          pickupLocation: 'Owned Spot',
          pickupTime: '14:00',
          returnOffered: false,
        };

        const offer = await legacyCommunityService.createCarpoolOffer(offerParams);

        const result = await legacyCommunityService.cancelCarpoolOffer(offer.id, 'not_owner');

        assert.strictEqual(result.success, false);
        if (result.success) return;
        assert.strictEqual(result.error.message, 'Only the offer creator can cancel it');
      });
    });
  });
});
