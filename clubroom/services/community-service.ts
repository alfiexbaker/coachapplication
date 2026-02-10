import { createLogger } from '@/utils/logger';
const logger = createLogger('CommunityService');

/**
 * Community Service - Thin Re-export Facade
 *
 * This file maintains backward compatibility for existing imports.
 * All functionality has been split into focused modules under services/community/:
 * - community-group-service.ts (group CRUD, membership, invitations)
 * - community-messaging-service.ts (group messaging, read receipts)
 * - community-carpool-service.ts (carpool offers, seat requests)
 *
 * New code should import directly from '@/services/community' instead.
 */

export {
  communityService,
  communityGroupService,
  communityMessagingService,
  communityCarpoolService,
} from './community';

export type {
  CreateGroupParams,
  GroupInvite,
  ChangeMemberRoleParams,
  CreateCarpoolOfferParams,
  RequestCarpoolSeatParams,
} from './community';
