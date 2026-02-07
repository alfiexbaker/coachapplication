"use strict";
/**
 * Community Service Tests
 *
 * Unit tests for the community service functionality including
 * parent groups, group messaging, and carpool coordination.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const community_service_1 = require("../../services/community-service");
(0, node_test_1.describe)('Community Service', () => {
    (0, node_test_1.describe)('Group Management', () => {
        (0, node_test_1.describe)('getParentGroups', () => {
            (0, node_test_1.default)('should return groups for a specific parent', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                node_assert_1.default.ok(Array.isArray(groups));
                node_assert_1.default.ok(groups.length > 0);
                groups.forEach((group) => {
                    const isMember = group.members.some((m) => m.parentId === 'parent1');
                    node_assert_1.default.strictEqual(isMember, true, 'Parent should be a member of each returned group');
                });
            });
            (0, node_test_1.default)('should return empty array for parent with no groups', async () => {
                const groups = await community_service_1.communityService.getParentGroups('non_existent_parent');
                node_assert_1.default.ok(Array.isArray(groups));
                node_assert_1.default.strictEqual(groups.length, 0);
            });
        });
        (0, node_test_1.describe)('getPublicGroups', () => {
            (0, node_test_1.default)('should return only public groups', async () => {
                const groups = await community_service_1.communityService.getPublicGroups();
                node_assert_1.default.ok(Array.isArray(groups));
                groups.forEach((group) => {
                    node_assert_1.default.strictEqual(group.isPublic, true, 'All returned groups should be public');
                });
            });
        });
        (0, node_test_1.describe)('getGroup', () => {
            (0, node_test_1.default)('should return group by ID', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const firstGroup = groups[0];
                const group = await community_service_1.communityService.getGroup(firstGroup.id);
                node_assert_1.default.ok(group);
                node_assert_1.default.strictEqual(group.id, firstGroup.id);
                node_assert_1.default.strictEqual(group.name, firstGroup.name);
            });
            (0, node_test_1.default)('should return undefined for non-existent group', async () => {
                const group = await community_service_1.communityService.getGroup('non_existent');
                node_assert_1.default.strictEqual(group, undefined);
            });
        });
        (0, node_test_1.describe)('createGroup', () => {
            (0, node_test_1.default)('should create a new group with required fields', async () => {
                const params = {
                    name: 'Test Group',
                    type: 'GENERAL',
                    memberIds: [],
                    memberNames: [],
                    creatorId: 'test_parent',
                    creatorName: 'Test Parent',
                };
                const group = await community_service_1.communityService.createGroup(params);
                node_assert_1.default.ok(group.id.startsWith('group_'));
                node_assert_1.default.strictEqual(group.name, 'Test Group');
                node_assert_1.default.strictEqual(group.type, 'GENERAL');
                node_assert_1.default.strictEqual(group.createdById, 'test_parent');
                node_assert_1.default.strictEqual(group.createdByName, 'Test Parent');
                node_assert_1.default.strictEqual(group.isPublic, false);
                node_assert_1.default.ok(group.createdAt);
                node_assert_1.default.ok(group.updatedAt);
                // Creator should be added as owner
                node_assert_1.default.strictEqual(group.members.length, 1);
                node_assert_1.default.strictEqual(group.members[0].parentId, 'test_parent');
                node_assert_1.default.strictEqual(group.members[0].role, 'OWNER');
            });
            (0, node_test_1.default)('should create a group with all optional fields', async () => {
                const params = {
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
                const group = await community_service_1.communityService.createGroup(params);
                node_assert_1.default.strictEqual(group.name, 'Full Group');
                node_assert_1.default.strictEqual(group.description, 'A detailed description');
                node_assert_1.default.strictEqual(group.type, 'CLUB');
                node_assert_1.default.strictEqual(group.isPublic, true);
                node_assert_1.default.strictEqual(group.clubId, 'club_1');
                node_assert_1.default.strictEqual(group.maxMembers, 50);
                // Creator + 2 members = 3 total
                node_assert_1.default.strictEqual(group.members.length, 3);
            });
            (0, node_test_1.default)('should support all group types', async () => {
                const types = ['CLUB', 'SESSION', 'CARPOOL', 'GENERAL'];
                for (const type of types) {
                    const params = {
                        name: `${type} Group`,
                        type,
                        memberIds: [],
                        memberNames: [],
                        creatorId: 'test_parent',
                        creatorName: 'Test Parent',
                    };
                    const group = await community_service_1.communityService.createGroup(params);
                    node_assert_1.default.strictEqual(group.type, type);
                }
            });
        });
        (0, node_test_1.describe)('joinGroup', () => {
            (0, node_test_1.default)('should allow joining a public group', async () => {
                // Create a public group first
                const createParams = {
                    name: 'Joinable Group',
                    type: 'GENERAL',
                    memberIds: [],
                    memberNames: [],
                    creatorId: 'creator_parent',
                    creatorName: 'Creator Parent',
                    isPublic: true,
                };
                const createdGroup = await community_service_1.communityService.createGroup(createParams);
                const result = await community_service_1.communityService.joinGroup(createdGroup.id, 'new_parent', 'New Parent');
                node_assert_1.default.strictEqual(result.success, true);
                if (!result.success)
                    return;
                const updatedGroup = result.data;
                node_assert_1.default.strictEqual(updatedGroup.members.length, 2);
                const newMember = updatedGroup.members.find((m) => m.parentId === 'new_parent');
                node_assert_1.default.ok(newMember);
                node_assert_1.default.strictEqual(newMember.role, 'MEMBER');
                node_assert_1.default.ok(newMember.joinedAt);
            });
            (0, node_test_1.default)('should return error when joining private group', async () => {
                // Create a private group
                const createParams = {
                    name: 'Private Group',
                    type: 'GENERAL',
                    memberIds: [],
                    memberNames: [],
                    creatorId: 'creator_parent',
                    creatorName: 'Creator Parent',
                    isPublic: false,
                };
                const createdGroup = await community_service_1.communityService.createGroup(createParams);
                const result = await community_service_1.communityService.joinGroup(createdGroup.id, 'new_parent', 'New Parent');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.strictEqual(result.error.message, 'Cannot join private group without invitation');
            });
            (0, node_test_1.default)('should return error when already a member', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups.find((g) => g.isPublic);
                if (group) {
                    const result = await community_service_1.communityService.joinGroup(group.id, 'parent1', 'John Henderson');
                    node_assert_1.default.strictEqual(result.success, false);
                    if (result.success)
                        return;
                    node_assert_1.default.strictEqual(result.error.message, 'Already a member of this group');
                }
            });
        });
        (0, node_test_1.describe)('leaveGroup', () => {
            (0, node_test_1.default)('should allow member to leave group', async () => {
                // Create a group with multiple members
                const createParams = {
                    name: 'Leave Test Group',
                    type: 'GENERAL',
                    memberIds: ['member_to_leave'],
                    memberNames: ['Member To Leave'],
                    creatorId: 'admin_parent',
                    creatorName: 'Admin Parent',
                    isPublic: true,
                };
                const createdGroup = await community_service_1.communityService.createGroup(createParams);
                node_assert_1.default.strictEqual(createdGroup.members.length, 2);
                const leaveResult = await community_service_1.communityService.leaveGroup(createdGroup.id, 'member_to_leave');
                node_assert_1.default.strictEqual(leaveResult.success, true);
                const updatedGroup = await community_service_1.communityService.getGroup(createdGroup.id);
                node_assert_1.default.ok(updatedGroup);
                node_assert_1.default.strictEqual(updatedGroup.members.length, 1);
                node_assert_1.default.ok(!updatedGroup.members.find((m) => m.parentId === 'member_to_leave'));
            });
            (0, node_test_1.default)('should return error when only admin tries to leave with other members', async () => {
                // Create a group where creator is only admin
                const createParams = {
                    name: 'Admin Leave Test',
                    type: 'GENERAL',
                    memberIds: ['regular_member'],
                    memberNames: ['Regular Member'],
                    creatorId: 'only_admin',
                    creatorName: 'Only Admin',
                    isPublic: true,
                };
                const createdGroup = await community_service_1.communityService.createGroup(createParams);
                const result = await community_service_1.communityService.leaveGroup(createdGroup.id, 'only_admin');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.strictEqual(result.error.message, 'Cannot leave group as the only admin. Promote another member first.');
            });
            (0, node_test_1.default)('should return error for non-member', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups[0];
                const result = await community_service_1.communityService.leaveGroup(group.id, 'non_member');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.ok(result.error.message);
            });
        });
    });
    (0, node_test_1.describe)('Group Messaging', () => {
        (0, node_test_1.describe)('getGroupMessages', () => {
            (0, node_test_1.default)('should return messages for a group', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups[0];
                const messages = await community_service_1.communityService.getGroupMessages(group.id);
                node_assert_1.default.ok(Array.isArray(messages));
            });
            (0, node_test_1.default)('should return messages sorted by time', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups[0];
                const messages = await community_service_1.communityService.getGroupMessages(group.id);
                for (let i = 1; i < messages.length; i++) {
                    const prevTime = new Date(messages[i - 1].createdAt).getTime();
                    const currTime = new Date(messages[i].createdAt).getTime();
                    node_assert_1.default.ok(prevTime <= currTime, 'Messages should be sorted chronologically');
                }
            });
        });
        (0, node_test_1.describe)('sendGroupMessage', () => {
            (0, node_test_1.default)('should send a message to a group', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups[0];
                const message = await community_service_1.communityService.sendGroupMessage(group.id, 'parent1', 'John Henderson', 'Hello, world!');
                node_assert_1.default.ok(message.id.startsWith('gmsg_'));
                node_assert_1.default.strictEqual(message.groupId, group.id);
                node_assert_1.default.strictEqual(message.senderId, 'parent1');
                node_assert_1.default.strictEqual(message.senderName, 'John Henderson');
                node_assert_1.default.strictEqual(message.body, 'Hello, world!');
                node_assert_1.default.strictEqual(message.status, 'sent');
                node_assert_1.default.ok(message.createdAt);
                node_assert_1.default.ok(message.readBy.includes('parent1'));
            });
            (0, node_test_1.default)('should update group last message info', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups[0];
                const messageBody = 'Test message for update';
                await community_service_1.communityService.sendGroupMessage(group.id, 'parent1', 'John', messageBody);
                const updatedGroup = await community_service_1.communityService.getGroup(group.id);
                node_assert_1.default.ok(updatedGroup);
                node_assert_1.default.ok(updatedGroup.lastMessageAt);
                node_assert_1.default.ok(updatedGroup.lastMessagePreview?.includes('Test message'));
            });
        });
        (0, node_test_1.describe)('markMessagesRead', () => {
            (0, node_test_1.default)('should mark messages as read for a parent', async () => {
                const groups = await community_service_1.communityService.getParentGroups('parent1');
                const group = groups[0];
                // Send a message first
                await community_service_1.communityService.sendGroupMessage(group.id, 'parent1', 'John', 'Read test message');
                await community_service_1.communityService.markMessagesRead(group.id, 'parent2');
                const messages = await community_service_1.communityService.getGroupMessages(group.id);
                const latestMessage = messages[messages.length - 1];
                node_assert_1.default.ok(latestMessage.readBy.includes('parent2'));
            });
        });
    });
    (0, node_test_1.describe)('Carpool Management', () => {
        (0, node_test_1.describe)('getCarpoolOffers', () => {
            (0, node_test_1.default)('should return active offers for a session', async () => {
                const offers = await community_service_1.communityService.getCarpoolOffers('session_1');
                node_assert_1.default.ok(Array.isArray(offers));
                offers.forEach((offer) => {
                    node_assert_1.default.strictEqual(offer.sessionId, 'session_1');
                    node_assert_1.default.strictEqual(offer.status, 'ACTIVE');
                });
            });
        });
        (0, node_test_1.describe)('getAvailableCarpoolOffers', () => {
            (0, node_test_1.default)('should exclude current user offers', async () => {
                const offers = await community_service_1.communityService.getAvailableCarpoolOffers('parent1');
                offers.forEach((offer) => {
                    node_assert_1.default.notStrictEqual(offer.parentId, 'parent1');
                });
            });
            (0, node_test_1.default)('should only return active offers with available seats', async () => {
                const offers = await community_service_1.communityService.getAvailableCarpoolOffers('some_parent');
                offers.forEach((offer) => {
                    node_assert_1.default.strictEqual(offer.status, 'ACTIVE');
                    node_assert_1.default.ok(offer.seatsAvailable > offer.seatsTaken);
                });
            });
        });
        (0, node_test_1.describe)('createCarpoolOffer', () => {
            (0, node_test_1.default)('should create a new carpool offer', async () => {
                const params = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(params);
                node_assert_1.default.ok(offer.id.startsWith('carpool_'));
                node_assert_1.default.strictEqual(offer.parentId, 'test_parent');
                node_assert_1.default.strictEqual(offer.parentName, 'Test Parent');
                node_assert_1.default.strictEqual(offer.sessionName, 'Test Training');
                node_assert_1.default.strictEqual(offer.sessionDate, '2026-02-15');
                node_assert_1.default.strictEqual(offer.seatsAvailable, 3);
                node_assert_1.default.strictEqual(offer.seatsTaken, 0);
                node_assert_1.default.strictEqual(offer.pickupLocation, 'Test Location');
                node_assert_1.default.strictEqual(offer.pickupTime, '10:00');
                node_assert_1.default.strictEqual(offer.returnOffered, true);
                node_assert_1.default.strictEqual(offer.returnTime, '13:00');
                node_assert_1.default.strictEqual(offer.notes, 'Test notes');
                node_assert_1.default.strictEqual(offer.status, 'ACTIVE');
                node_assert_1.default.strictEqual(offer.requests.length, 0);
                node_assert_1.default.strictEqual(offer.acceptedRequests.length, 0);
            });
            (0, node_test_1.default)('should create offer without return trip', async () => {
                const params = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(params);
                node_assert_1.default.strictEqual(offer.returnOffered, false);
                node_assert_1.default.strictEqual(offer.returnTime, undefined);
            });
        });
        (0, node_test_1.describe)('requestCarpoolSeat', () => {
            (0, node_test_1.default)('should create a seat request', async () => {
                // Create a carpool offer first
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                const requestParams = {
                    offerId: offer.id,
                    parentId: 'requester_parent',
                    parentName: 'Requester Parent',
                    childNames: ['Child One'],
                    seatsRequested: 1,
                    message: 'Would like to join!',
                };
                const result = await community_service_1.communityService.requestCarpoolSeat(requestParams);
                node_assert_1.default.strictEqual(result.success, true);
                if (!result.success)
                    return;
                const request = result.data;
                node_assert_1.default.ok(request.id.startsWith('req_'));
                node_assert_1.default.strictEqual(request.offerId, offer.id);
                node_assert_1.default.strictEqual(request.parentId, 'requester_parent');
                node_assert_1.default.strictEqual(request.parentName, 'Requester Parent');
                node_assert_1.default.strictEqual(request.seatsRequested, 1);
                node_assert_1.default.strictEqual(request.message, 'Would like to join!');
                node_assert_1.default.strictEqual(request.status, 'PENDING');
                node_assert_1.default.ok(request.requestedAt);
            });
            (0, node_test_1.default)('should return error if not enough seats', async () => {
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                const requestParams = {
                    offerId: offer.id,
                    parentId: 'greedy_parent',
                    parentName: 'Greedy Parent',
                    childNames: ['Kid 1', 'Kid 2', 'Kid 3'],
                    seatsRequested: 3,
                };
                const result = await community_service_1.communityService.requestCarpoolSeat(requestParams);
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.strictEqual(result.error.message, 'Not enough seats available');
            });
        });
        (0, node_test_1.describe)('acceptCarpoolRequest', () => {
            (0, node_test_1.default)('should accept a pending request', async () => {
                // Create offer
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                // Create request
                const requestParams = {
                    offerId: offer.id,
                    parentId: 'accept_requester',
                    parentName: 'Accept Requester',
                    childNames: ['Child'],
                    seatsRequested: 1,
                };
                const requestResult = await community_service_1.communityService.requestCarpoolSeat(requestParams);
                node_assert_1.default.strictEqual(requestResult.success, true);
                if (!requestResult.success)
                    return;
                const request = requestResult.data;
                // Accept request
                const acceptResult = await community_service_1.communityService.acceptCarpoolRequest(offer.id, request.id);
                node_assert_1.default.strictEqual(acceptResult.success, true);
                const updatedOffer = await community_service_1.communityService.getCarpoolOffer(offer.id);
                node_assert_1.default.ok(updatedOffer);
                const acceptedRequest = updatedOffer.requests.find((r) => r.id === request.id);
                node_assert_1.default.ok(acceptedRequest);
                node_assert_1.default.strictEqual(acceptedRequest.status, 'ACCEPTED');
                node_assert_1.default.ok(acceptedRequest.respondedAt);
                node_assert_1.default.strictEqual(updatedOffer.seatsTaken, 1);
                node_assert_1.default.strictEqual(updatedOffer.acceptedRequests.length, 1);
            });
            (0, node_test_1.default)('should mark offer as full when all seats taken', async () => {
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                const requestParams = {
                    offerId: offer.id,
                    parentId: 'filler_parent',
                    parentName: 'Filler Parent',
                    childNames: ['Kid'],
                    seatsRequested: 1,
                };
                const requestResult = await community_service_1.communityService.requestCarpoolSeat(requestParams);
                node_assert_1.default.strictEqual(requestResult.success, true);
                if (!requestResult.success)
                    return;
                const request = requestResult.data;
                const acceptResult = await community_service_1.communityService.acceptCarpoolRequest(offer.id, request.id);
                node_assert_1.default.strictEqual(acceptResult.success, true);
                const updatedOffer = await community_service_1.communityService.getCarpoolOffer(offer.id);
                node_assert_1.default.ok(updatedOffer);
                node_assert_1.default.strictEqual(updatedOffer.status, 'FULL');
            });
        });
        (0, node_test_1.describe)('declineCarpoolRequest', () => {
            (0, node_test_1.default)('should decline a pending request', async () => {
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                const requestParams = {
                    offerId: offer.id,
                    parentId: 'declined_parent',
                    parentName: 'Declined Parent',
                    childNames: ['Kid'],
                    seatsRequested: 1,
                };
                const requestResult = await community_service_1.communityService.requestCarpoolSeat(requestParams);
                node_assert_1.default.strictEqual(requestResult.success, true);
                if (!requestResult.success)
                    return;
                const request = requestResult.data;
                const declineResult = await community_service_1.communityService.declineCarpoolRequest(offer.id, request.id);
                node_assert_1.default.strictEqual(declineResult.success, true);
                const updatedOffer = await community_service_1.communityService.getCarpoolOffer(offer.id);
                node_assert_1.default.ok(updatedOffer);
                const declinedRequest = updatedOffer.requests.find((r) => r.id === request.id);
                node_assert_1.default.ok(declinedRequest);
                node_assert_1.default.strictEqual(declinedRequest.status, 'DECLINED');
                node_assert_1.default.ok(declinedRequest.respondedAt);
                // Seats should not be affected
                node_assert_1.default.strictEqual(updatedOffer.seatsTaken, 0);
            });
        });
        (0, node_test_1.describe)('cancelCarpoolOffer', () => {
            (0, node_test_1.default)('should cancel an offer', async () => {
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                const cancelResult = await community_service_1.communityService.cancelCarpoolOffer(offer.id, 'cancel_test_parent');
                node_assert_1.default.strictEqual(cancelResult.success, true);
                const cancelledOffer = await community_service_1.communityService.getCarpoolOffer(offer.id);
                node_assert_1.default.ok(cancelledOffer);
                node_assert_1.default.strictEqual(cancelledOffer.status, 'CANCELLED');
            });
            (0, node_test_1.default)('should return error if not the creator', async () => {
                const offerParams = {
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
                const offer = await community_service_1.communityService.createCarpoolOffer(offerParams);
                const result = await community_service_1.communityService.cancelCarpoolOffer(offer.id, 'not_owner');
                node_assert_1.default.strictEqual(result.success, false);
                if (result.success)
                    return;
                node_assert_1.default.strictEqual(result.error.message, 'Only the offer creator can cancel it');
            });
        });
    });
});
