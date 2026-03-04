import type {
  RateCoachStoredReview,
  PublicCoachReview,
  CoachDirectoryEntry,
  ClubMemberSeed,
  CoachBookingSeed,
  ChildProfileSeed,
  AppReviewRecord,
  RelationalDemoSeedPayload,
} from './relational-demo-seeds.legacy';
import { buildRelationalDemoSeedPayload as buildRelationalDemoSeedPayloadLegacy } from './relational-demo-seeds.legacy';

export type {
  RateCoachStoredReview,
  PublicCoachReview,
  CoachDirectoryEntry,
  ClubMemberSeed,
  CoachBookingSeed,
  ChildProfileSeed,
  AppReviewRecord,
  RelationalDemoSeedPayload,
} from './relational-demo-seeds.legacy';

export const RELATIONAL_DEMO_SEED_VERSION =
  '2026-03-04-relational-v9-marketplace-live';
export const CLUB_LIONS_ID = 'club_lions';

export function buildRelationalDemoSeedPayload(): RelationalDemoSeedPayload {
  return buildRelationalDemoSeedPayloadLegacy();
}
