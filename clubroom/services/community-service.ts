import {
  ParentGroup,
  GroupType,
  GroupMember,
  GroupMessage,
  CarpoolOffer,
  CarpoolRequest,
  CarpoolOfferStatus,
  CarpoolRequestStatus,
  ChatAttachment,
} from '@/constants/types';
import { storageService } from './storage-service';

const GROUPS_STORAGE_KEY = 'clubroom.parent_groups';
const MESSAGES_STORAGE_KEY = 'clubroom.group_messages';
const CARPOOLS_STORAGE_KEY = 'clubroom.carpool_offers';

// Mock data for initial state
const mockGroups: ParentGroup[] = [
  {
    id: 'group_1',
    name: 'U12 Parents',
    description: 'Group for parents of U12 squad members',
    type: 'CLUB',
    members: [
      { parentId: 'parent1', parentName: 'John Henderson', role: 'ADMIN', joinedAt: '2024-01-15' },
      { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'MEMBER', joinedAt: '2024-01-16' },
    ],
    createdById: 'parent1',
    createdByName: 'John Henderson',
    createdAt: '2024-01-15',
    updatedAt: '2024-01-20',
    lastMessageAt: '2024-01-20T14:30:00Z',
    lastMessagePreview: 'See you all at training!',
    unreadCount: 2,
    clubId: 'club_1',
    isPublic: false,
  },
  {
    id: 'group_2',
    name: 'Saturday Sessions Carpool',
    description: 'Coordinate rides to Saturday training sessions',
    type: 'CARPOOL',
    members: [
      { parentId: 'parent1', parentName: 'John Henderson', role: 'ADMIN', joinedAt: '2024-01-10' },
      { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'MEMBER', joinedAt: '2024-01-10' },
    ],
    createdById: 'parent1',
    createdByName: 'John Henderson',
    createdAt: '2024-01-10',
    updatedAt: '2024-01-18',
    lastMessageAt: '2024-01-18T09:00:00Z',
    lastMessagePreview: 'I can take 3 kids this Saturday',
    unreadCount: 0,
    isPublic: true,
  },
  {
    id: 'group_3',
    name: 'Football Parents Chat',
    description: 'General chat for all football parents',
    type: 'GENERAL',
    members: [
      { parentId: 'parent1', parentName: 'John Henderson', role: 'MEMBER', joinedAt: '2024-01-05' },
      { parentId: 'parent2', parentName: 'Lisa Wilson', role: 'ADMIN', joinedAt: '2024-01-05' },
    ],
    createdById: 'parent2',
    createdByName: 'Lisa Wilson',
    createdAt: '2024-01-05',
    updatedAt: '2024-01-19',
    lastMessageAt: '2024-01-19T16:45:00Z',
    lastMessagePreview: 'Anyone know a good supplier for boots?',
    unreadCount: 5,
    isPublic: true,
  },
];

const mockMessages: Record<string, GroupMessage[]> = {
  group_1: [
    {
      id: 'msg_1',
      groupId: 'group_1',
      senderId: 'parent1',
      senderName: 'John Henderson',
      body: 'Hi everyone! Looking forward to the new season.',
      createdAt: '2024-01-19T10:00:00Z',
      status: 'seen',
      readBy: ['parent1', 'parent2'],
    },
    {
      id: 'msg_2',
      groupId: 'group_1',
      senderId: 'parent2',
      senderName: 'Lisa Wilson',
      body: 'Same here! Has anyone got the training schedule?',
      createdAt: '2024-01-19T10:05:00Z',
      status: 'seen',
      readBy: ['parent1', 'parent2'],
    },
    {
      id: 'msg_3',
      groupId: 'group_1',
      senderId: 'parent1',
      senderName: 'John Henderson',
      body: 'See you all at training!',
      createdAt: '2024-01-20T14:30:00Z',
      status: 'delivered',
      readBy: ['parent1'],
    },
  ],
};

const mockCarpoolOffers: CarpoolOffer[] = [
  {
    id: 'carpool_1',
    parentId: 'parent1',
    parentName: 'John Henderson',
    sessionId: 'session_1',
    sessionName: 'Saturday Training',
    sessionDate: '2024-01-27',
    seatsAvailable: 3,
    seatsTaken: 1,
    pickupLocation: 'High Street Car Park',
    pickupTime: '09:00',
    returnOffered: true,
    returnTime: '12:00',
    notes: 'Will pick up from the main entrance',
    status: 'ACTIVE',
    requests: [
      {
        id: 'req_1',
        offerId: 'carpool_1',
        parentId: 'parent2',
        parentName: 'Lisa Wilson',
        childNames: ['James Wilson'],
        seatsRequested: 1,
        status: 'ACCEPTED',
        requestedAt: '2024-01-20T10:00:00Z',
        respondedAt: '2024-01-20T11:00:00Z',
      },
    ],
    acceptedRequests: [
      {
        id: 'req_1',
        offerId: 'carpool_1',
        parentId: 'parent2',
        parentName: 'Lisa Wilson',
        childNames: ['James Wilson'],
        seatsRequested: 1,
        status: 'ACCEPTED',
        requestedAt: '2024-01-20T10:00:00Z',
        respondedAt: '2024-01-20T11:00:00Z',
      },
    ],
    createdAt: '2024-01-19T09:00:00Z',
    updatedAt: '2024-01-20T11:00:00Z',
  },
  {
    id: 'carpool_2',
    parentId: 'parent2',
    parentName: 'Lisa Wilson',
    sessionId: 'session_2',
    sessionName: 'Sunday Match',
    sessionDate: '2024-01-28',
    seatsAvailable: 2,
    seatsTaken: 0,
    pickupLocation: 'Community Centre',
    pickupTime: '13:30',
    returnOffered: false,
    notes: 'Return to be arranged separately',
    status: 'ACTIVE',
    requests: [],
    acceptedRequests: [],
    createdAt: '2024-01-20T08:00:00Z',
    updatedAt: '2024-01-20T08:00:00Z',
  },
];

export interface CreateGroupParams {
  name: string;
  description?: string;
  type: GroupType;
  memberIds: string[];
  memberNames: string[];
  creatorId: string;
  creatorName: string;
  isPublic?: boolean;
  clubId?: string;
  sessionId?: string;
  maxMembers?: number;
}

export interface CreateCarpoolOfferParams {
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  seatsAvailable: number;
  pickupLocation: string;
  pickupTime: string;
  returnOffered: boolean;
  returnTime?: string;
  notes?: string;
}

export interface RequestCarpoolSeatParams {
  offerId: string;
  parentId: string;
  parentName: string;
  parentAvatar?: string;
  childNames: string[];
  seatsRequested: number;
  message?: string;
}

class CommunityService {
  private inMemoryGroups: ParentGroup[] = [...mockGroups];
  private inMemoryMessages: Record<string, GroupMessage[]> = { ...mockMessages };
  private inMemoryCarpools: CarpoolOffer[] = [...mockCarpoolOffers];

  // ============================================================================
  // GROUP MANAGEMENT
  // ============================================================================

  /**
   * Get all groups that a parent is a member of
   */
  async getParentGroups(parentId: string): Promise<ParentGroup[]> {
    const persisted = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = persisted.length > 0 ? persisted : this.inMemoryGroups;

    return allGroups.filter((group) =>
      group.members.some((member) => member.parentId === parentId)
    );
  }

  /**
   * Get all available public groups
   */
  async getPublicGroups(): Promise<ParentGroup[]> {
    const persisted = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = persisted.length > 0 ? persisted : this.inMemoryGroups;

    return allGroups.filter((group) => group.isPublic);
  }

  /**
   * Get a single group by ID
   */
  async getGroup(groupId: string): Promise<ParentGroup | undefined> {
    const persisted = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = persisted.length > 0 ? persisted : this.inMemoryGroups;

    return allGroups.find((group) => group.id === groupId);
  }

  /**
   * Create a new parent group
   */
  async createGroup(params: CreateGroupParams): Promise<ParentGroup> {
    const timestamp = new Date().toISOString();

    const members: GroupMember[] = [
      {
        parentId: params.creatorId,
        parentName: params.creatorName,
        role: 'ADMIN',
        joinedAt: timestamp,
      },
      ...params.memberIds.map((id, index) => ({
        parentId: id,
        parentName: params.memberNames[index] || 'Unknown',
        role: 'MEMBER' as const,
        joinedAt: timestamp,
      })),
    ];

    const newGroup: ParentGroup = {
      id: `group_${Date.now()}`,
      name: params.name,
      description: params.description,
      type: params.type,
      members,
      createdById: params.creatorId,
      createdByName: params.creatorName,
      createdAt: timestamp,
      updatedAt: timestamp,
      isPublic: params.isPublic ?? false,
      clubId: params.clubId,
      sessionId: params.sessionId,
      maxMembers: params.maxMembers,
    };

    this.inMemoryGroups.push(newGroup);
    await this.persistGroups();

    return newGroup;
  }

  /**
   * Join an existing group
   */
  async joinGroup(groupId: string, parentId: string, parentName: string): Promise<ParentGroup> {
    const persisted = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = persisted.length > 0 ? persisted : this.inMemoryGroups;

    const groupIndex = allGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      throw new Error('Group not found');
    }

    const group = allGroups[groupIndex];

    // Check if already a member
    if (group.members.some((m) => m.parentId === parentId)) {
      throw new Error('Already a member of this group');
    }

    // Check max members limit
    if (group.maxMembers && group.members.length >= group.maxMembers) {
      throw new Error('Group is full');
    }

    // Check if group is public
    if (!group.isPublic) {
      throw new Error('Cannot join private group without invitation');
    }

    const newMember: GroupMember = {
      parentId,
      parentName,
      role: 'MEMBER',
      joinedAt: new Date().toISOString(),
    };

    group.members.push(newMember);
    group.updatedAt = new Date().toISOString();

    this.inMemoryGroups = allGroups;
    await this.persistGroups();

    return group;
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, parentId: string): Promise<void> {
    const persisted = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = persisted.length > 0 ? persisted : this.inMemoryGroups;

    const groupIndex = allGroups.findIndex((g) => g.id === groupId);
    if (groupIndex === -1) {
      throw new Error('Group not found');
    }

    const group = allGroups[groupIndex];
    const memberIndex = group.members.findIndex((m) => m.parentId === parentId);

    if (memberIndex === -1) {
      throw new Error('Not a member of this group');
    }

    // Check if this is the only admin
    const isAdmin = group.members[memberIndex].role === 'ADMIN';
    const adminCount = group.members.filter((m) => m.role === 'ADMIN').length;

    if (isAdmin && adminCount === 1 && group.members.length > 1) {
      throw new Error('Cannot leave group as the only admin. Promote another member first.');
    }

    group.members.splice(memberIndex, 1);
    group.updatedAt = new Date().toISOString();

    // If group is empty, remove it
    if (group.members.length === 0) {
      allGroups.splice(groupIndex, 1);
    }

    this.inMemoryGroups = allGroups;
    await this.persistGroups();
  }

  /**
   * Invite a parent to join a group
   */
  async inviteToGroup(
    groupId: string,
    inviterId: string,
    inviteeId: string,
    inviteeName: string
  ): Promise<void> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if inviter is an admin
    const inviter = group.members.find((m) => m.parentId === inviterId);
    if (!inviter || inviter.role !== 'ADMIN') {
      throw new Error('Only group admins can invite members');
    }

    // Check if already a member
    if (group.members.some((m) => m.parentId === inviteeId)) {
      throw new Error('User is already a member');
    }

    // For now, directly add the member (in production, this would send an invite)
    const newMember: GroupMember = {
      parentId: inviteeId,
      parentName: inviteeName,
      role: 'MEMBER',
      joinedAt: new Date().toISOString(),
    };

    group.members.push(newMember);
    group.updatedAt = new Date().toISOString();

    await this.persistGroups();
  }

  /**
   * Promote a member to admin
   */
  async promoteMember(groupId: string, requesterId: string, memberId: string): Promise<void> {
    const group = await this.getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    const requester = group.members.find((m) => m.parentId === requesterId);
    if (!requester || requester.role !== 'ADMIN') {
      throw new Error('Only group admins can promote members');
    }

    const member = group.members.find((m) => m.parentId === memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    member.role = 'ADMIN';
    group.updatedAt = new Date().toISOString();

    await this.persistGroups();
  }

  // ============================================================================
  // GROUP MESSAGING
  // ============================================================================

  /**
   * Get messages for a group
   */
  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    const persisted = await storageService.getItem<Record<string, GroupMessage[]>>(
      MESSAGES_STORAGE_KEY,
      {}
    );
    const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

    return messages.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  /**
   * Send a message to a group
   */
  async sendGroupMessage(
    groupId: string,
    senderId: string,
    senderName: string,
    body: string,
    senderAvatar?: string,
    attachments?: ChatAttachment[]
  ): Promise<GroupMessage> {
    const timestamp = new Date().toISOString();

    const newMessage: GroupMessage = {
      id: `gmsg_${Date.now()}`,
      groupId,
      senderId,
      senderName,
      senderAvatar,
      body,
      createdAt: timestamp,
      status: 'sent',
      readBy: [senderId],
      attachments,
    };

    const persisted = await storageService.getItem<Record<string, GroupMessage[]>>(
      MESSAGES_STORAGE_KEY,
      {}
    );
    const currentMessages = persisted[groupId] || this.inMemoryMessages[groupId] || [];
    persisted[groupId] = [...currentMessages, newMessage];

    this.inMemoryMessages[groupId] = persisted[groupId];
    await storageService.setItem(MESSAGES_STORAGE_KEY, persisted);

    // Update group's last message info
    const groups = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = groups.length > 0 ? groups : this.inMemoryGroups;
    const group = allGroups.find((g) => g.id === groupId);

    if (group) {
      group.lastMessageAt = timestamp;
      group.lastMessagePreview = body.substring(0, 50) + (body.length > 50 ? '...' : '');
      group.updatedAt = timestamp;
      await this.persistGroups();
    }

    // Simulate delivery after a delay
    setTimeout(() => this.updateMessageStatus(groupId, newMessage.id, 'delivered'), 500);

    return newMessage;
  }

  /**
   * Mark messages as read
   */
  async markMessagesRead(groupId: string, parentId: string): Promise<void> {
    const persisted = await storageService.getItem<Record<string, GroupMessage[]>>(
      MESSAGES_STORAGE_KEY,
      {}
    );
    const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

    const updated = messages.map((msg) => {
      if (!msg.readBy.includes(parentId)) {
        return { ...msg, readBy: [...msg.readBy, parentId] };
      }
      return msg;
    });

    persisted[groupId] = updated;
    this.inMemoryMessages[groupId] = updated;
    await storageService.setItem(MESSAGES_STORAGE_KEY, persisted);

    // Clear unread count for this group
    const groups = await storageService.getItem<ParentGroup[]>(GROUPS_STORAGE_KEY, []);
    const allGroups = groups.length > 0 ? groups : this.inMemoryGroups;
    const group = allGroups.find((g) => g.id === groupId);

    if (group) {
      group.unreadCount = 0;
      await this.persistGroups();
    }
  }

  private async updateMessageStatus(
    groupId: string,
    messageId: string,
    status: GroupMessage['status']
  ): Promise<void> {
    const persisted = await storageService.getItem<Record<string, GroupMessage[]>>(
      MESSAGES_STORAGE_KEY,
      {}
    );
    const messages = persisted[groupId] || this.inMemoryMessages[groupId] || [];

    const updated = messages.map((msg) =>
      msg.id === messageId ? { ...msg, status } : msg
    );

    persisted[groupId] = updated;
    this.inMemoryMessages[groupId] = updated;
    await storageService.setItem(MESSAGES_STORAGE_KEY, persisted);
  }

  // ============================================================================
  // CARPOOL MANAGEMENT
  // ============================================================================

  /**
   * Get all carpool offers for a session
   */
  async getCarpoolOffers(sessionId: string): Promise<CarpoolOffer[]> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    return allOffers.filter(
      (offer) => offer.sessionId === sessionId && offer.status === 'ACTIVE'
    );
  }

  /**
   * Get all carpool offers created by a parent
   */
  async getParentCarpoolOffers(parentId: string): Promise<CarpoolOffer[]> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    return allOffers.filter((offer) => offer.parentId === parentId);
  }

  /**
   * Get all available carpool offers (excluding user's own offers)
   */
  async getAvailableCarpoolOffers(excludeParentId: string): Promise<CarpoolOffer[]> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    return allOffers.filter(
      (offer) =>
        offer.parentId !== excludeParentId &&
        offer.status === 'ACTIVE' &&
        offer.seatsAvailable > offer.seatsTaken
    );
  }

  /**
   * Get a single carpool offer by ID
   */
  async getCarpoolOffer(offerId: string): Promise<CarpoolOffer | undefined> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    return allOffers.find((offer) => offer.id === offerId);
  }

  /**
   * Create a new carpool offer
   */
  async createCarpoolOffer(params: CreateCarpoolOfferParams): Promise<CarpoolOffer> {
    const timestamp = new Date().toISOString();

    const newOffer: CarpoolOffer = {
      id: `carpool_${Date.now()}`,
      parentId: params.parentId,
      parentName: params.parentName,
      parentAvatar: params.parentAvatar,
      sessionId: params.sessionId,
      sessionName: params.sessionName,
      sessionDate: params.sessionDate,
      seatsAvailable: params.seatsAvailable,
      seatsTaken: 0,
      pickupLocation: params.pickupLocation,
      pickupTime: params.pickupTime,
      returnOffered: params.returnOffered,
      returnTime: params.returnTime,
      notes: params.notes,
      status: 'ACTIVE',
      requests: [],
      acceptedRequests: [],
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.inMemoryCarpools.push(newOffer);
    await this.persistCarpools();

    return newOffer;
  }

  /**
   * Request a seat on a carpool offer
   */
  async requestCarpoolSeat(params: RequestCarpoolSeatParams): Promise<CarpoolRequest> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offerIndex = allOffers.findIndex((o) => o.id === params.offerId);
    if (offerIndex === -1) {
      throw new Error('Carpool offer not found');
    }

    const offer = allOffers[offerIndex];

    // Check available seats
    if (offer.seatsAvailable - offer.seatsTaken < params.seatsRequested) {
      throw new Error('Not enough seats available');
    }

    // Check if already requested
    if (offer.requests.some((r) => r.parentId === params.parentId && r.status === 'PENDING')) {
      throw new Error('You already have a pending request for this carpool');
    }

    const newRequest: CarpoolRequest = {
      id: `req_${Date.now()}`,
      offerId: params.offerId,
      parentId: params.parentId,
      parentName: params.parentName,
      parentAvatar: params.parentAvatar,
      childNames: params.childNames,
      seatsRequested: params.seatsRequested,
      message: params.message,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
    };

    offer.requests.push(newRequest);
    offer.updatedAt = new Date().toISOString();

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();

    return newRequest;
  }

  /**
   * Accept a carpool seat request
   */
  async acceptCarpoolRequest(offerId: string, requestId: string): Promise<void> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      throw new Error('Carpool offer not found');
    }

    const request = offer.requests.find((r) => r.id === requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request has already been processed');
    }

    // Check available seats
    if (offer.seatsAvailable - offer.seatsTaken < request.seatsRequested) {
      throw new Error('Not enough seats available');
    }

    request.status = 'ACCEPTED';
    request.respondedAt = new Date().toISOString();

    offer.seatsTaken += request.seatsRequested;
    offer.acceptedRequests.push(request);
    offer.updatedAt = new Date().toISOString();

    // Update status if full
    if (offer.seatsTaken >= offer.seatsAvailable) {
      offer.status = 'FULL';
    }

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();
  }

  /**
   * Decline a carpool seat request
   */
  async declineCarpoolRequest(offerId: string, requestId: string): Promise<void> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      throw new Error('Carpool offer not found');
    }

    const request = offer.requests.find((r) => r.id === requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request has already been processed');
    }

    request.status = 'DECLINED';
    request.respondedAt = new Date().toISOString();
    offer.updatedAt = new Date().toISOString();

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();
  }

  /**
   * Cancel a carpool offer
   */
  async cancelCarpoolOffer(offerId: string, parentId: string): Promise<void> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      throw new Error('Carpool offer not found');
    }

    if (offer.parentId !== parentId) {
      throw new Error('Only the offer creator can cancel it');
    }

    offer.status = 'CANCELLED';
    offer.updatedAt = new Date().toISOString();

    // Cancel all pending requests
    offer.requests.forEach((request) => {
      if (request.status === 'PENDING') {
        request.status = 'CANCELLED';
        request.respondedAt = new Date().toISOString();
      }
    });

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();
  }

  /**
   * Cancel a carpool seat request
   */
  async cancelCarpoolRequest(offerId: string, requestId: string, parentId: string): Promise<void> {
    const persisted = await storageService.getItem<CarpoolOffer[]>(CARPOOLS_STORAGE_KEY, []);
    const allOffers = persisted.length > 0 ? persisted : this.inMemoryCarpools;

    const offer = allOffers.find((o) => o.id === offerId);
    if (!offer) {
      throw new Error('Carpool offer not found');
    }

    const request = offer.requests.find((r) => r.id === requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    if (request.parentId !== parentId) {
      throw new Error('Only the requester can cancel their request');
    }

    // If request was accepted, free up seats
    if (request.status === 'ACCEPTED') {
      offer.seatsTaken -= request.seatsRequested;
      offer.acceptedRequests = offer.acceptedRequests.filter((r) => r.id !== requestId);

      // Update status if no longer full
      if (offer.status === 'FULL') {
        offer.status = 'ACTIVE';
      }
    }

    request.status = 'CANCELLED';
    request.respondedAt = new Date().toISOString();
    offer.updatedAt = new Date().toISOString();

    this.inMemoryCarpools = allOffers;
    await this.persistCarpools();
  }

  // ============================================================================
  // PERSISTENCE HELPERS
  // ============================================================================

  private async persistGroups(): Promise<void> {
    await storageService.setItem(GROUPS_STORAGE_KEY, this.inMemoryGroups);
  }

  private async persistCarpools(): Promise<void> {
    await storageService.setItem(CARPOOLS_STORAGE_KEY, this.inMemoryCarpools);
  }
}

export const communityService = new CommunityService();
