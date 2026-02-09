/**
 * Social Types
 *
 * Following system, parent community, group chats, carpool coordination,
 * and messaging types.
 */

import type { FootballObjective } from './user-types';

// ============================================================================
// FOLLOWING SYSTEM
// ============================================================================

export interface Follow {
  id: string;
  followerId: string;
  followerName: string; // TODO(T3.4): Remove when connecting to real API — resolve from followerId instead
  followerType: 'USER' | 'COACH';
  followerAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from followerId instead
  followingId: string;
  followingName: string; // TODO(T3.4): Remove when connecting to real API — resolve from followingId instead
  followingType: 'USER' | 'COACH';
  followingAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from followingId instead
  createdAt: string;
  // Notification preferences for this follow
  notifyOnPost: boolean;
  notifyOnSession: boolean;
}

// For private profiles that require approval
export interface FollowRequest {
  id: string;
  requesterId: string;
  requesterName: string; // TODO(T3.4): Remove when connecting to real API — resolve from requesterId instead
  requesterAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from requesterId instead
  targetId: string;
  targetName: string; // TODO(T3.4): Remove when connecting to real API — resolve from targetId instead
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message?: string; // Optional message with request
  createdAt: string;
  respondedAt?: string;
}

// ============================================================================
// SOCIAL POSTS
// ============================================================================

export interface Post {
  id: string;
  authorId: string;
  authorName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from authorId instead
  authorAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from authorId instead
  content: string;
  images?: string[];
  likes: string[]; // User IDs who liked
  commentCount?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from authorId instead
  authorAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from authorId instead
  content: string;
  likes: string[]; // User IDs who liked
  createdAt: string;
}

// ============================================================================
// MESSAGING
// ============================================================================

export interface Conversation {
  id: string;
  participants: string[]; // User IDs
  relatedAthleteId?: string; // If parent chatting about kid
  relatedBookingId?: string;
  lastMessageAt: string;
  lastMessage?: string;
  unreadCount?: number;
  coachName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from participants instead
  athleteName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from relatedAthleteId instead
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from senderId instead
  content: string;
  sentAt: string;
  read: boolean;
}

export type ChatSender = 'parent' | 'coach';

export interface ChatAttachment {
  id: string;
  type: 'photo' | 'video' | 'pdf';
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
}

export interface MessageReadReceipt {
  recipientId: string;
  readAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  sender: ChatSender;
  senderName?: string; // TODO(T3.4): Remove when connecting to real API — resolve from a senderId field instead
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen' | 'pending';
  attachments?: ChatAttachment[];
  readReceipts?: MessageReadReceipt[];
}

export interface ChatThreadSummary {
  id: string;
  kind?: 'direct' | 'group';
  groupType?: 'club' | 'squad' | 'class' | 'announcement';
  bookingId: string;
  coachName: string; // TODO(T3.4): Remove when connecting to real API — resolve from bookingId -> coachId instead
  childName: string; // TODO(T3.4): Remove when connecting to real API — resolve from bookingId -> athleteId instead
  serviceName: string;
  location: string;
  scheduledFor: string;
  unreadCount: number;
  unreadMentions?: number;
  memberCount?: number;
  title?: string;
  subtitle?: string;
  scopeLabel?: string;
  postingAsOptions?: string[];
  safetyCopy: string;
  pinnedObjectives?: FootballObjective[];
  lastMessageSnippet?: string;
  lastMessageSender?: string;
}

// Attachment type for messaging
export interface Attachment {
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  duration?: number;
}

// ============================================================================
// PARENT COMMUNITY
// ============================================================================

export type GroupType = 'CLUB' | 'SESSION' | 'CARPOOL' | 'GENERAL' | 'SQUAD';

export type GroupMemberRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';

export interface GroupMember {
  parentId: string;
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  role: GroupMemberRole;
  joinedAt: string;
}

export interface ParentGroup {
  id: string;
  name: string;
  description?: string;
  type: GroupType;
  members: GroupMember[];
  createdById: string;
  createdByName: string; // TODO(T3.4): Remove when connecting to real API — resolve from createdById instead
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  /** Associated club ID for CLUB type groups */
  clubId?: string;
  /** Associated session ID for SESSION type groups */
  sessionId?: string;
  /** Associated squad ID for SQUAD type groups */
  squadId?: string;
  /** Group avatar/icon URL */
  avatarUrl?: string;
  /** Whether group is publicly joinable or invite-only */
  isPublic: boolean;
  /** Maximum number of members (optional) */
  maxMembers?: number;
}

export type CarpoolRequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface CarpoolRequest {
  id: string;
  offerId: string;
  parentId: string;
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  childNames: string[]; // TODO(T3.4): Remove when connecting to real API — resolve from child IDs instead
  seatsRequested: number;
  message?: string;
  status: CarpoolRequestStatus;
  requestedAt: string;
  respondedAt?: string;
}

export type CarpoolOfferStatus = 'ACTIVE' | 'FULL' | 'COMPLETED' | 'CANCELLED';

export interface CarpoolOffer {
  id: string;
  parentId: string;
  parentName: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  parentAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from parentId instead
  sessionId: string;
  sessionName: string; // TODO(T3.4): Remove when connecting to real API — resolve from sessionId instead
  sessionDate: string;
  seatsAvailable: number;
  seatsTaken: number;
  pickupLocation: string;
  pickupTime: string;
  returnOffered: boolean;
  returnTime?: string;
  notes?: string;
  status: CarpoolOfferStatus;
  requests: CarpoolRequest[];
  acceptedRequests: CarpoolRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string; // TODO(T3.4): Remove when connecting to real API — resolve from senderId instead
  senderAvatar?: string; // TODO(T3.4): Remove when connecting to real API — resolve from senderId instead
  body: string;
  createdAt: string;
  status: 'sent' | 'delivered' | 'seen';
  /** IDs of members who have read this message */
  readBy: string[];
  /** Optional attachment */
  attachments?: ChatAttachment[];
}
