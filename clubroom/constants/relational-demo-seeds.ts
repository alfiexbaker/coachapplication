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
  '2026-02-21-relational-v6-premium-demo-names';
export const CLUB_LIONS_ID = 'club_lions';

type RelationalDemoSeedsLegacyModule = {
  buildRelationalDemoSeedPayload: () => RelationalDemoSeedPayload;
};

let legacyModule: RelationalDemoSeedsLegacyModule | null = null;

function loadLegacyModule(): RelationalDemoSeedsLegacyModule {
  if (legacyModule) {
    return legacyModule;
  }

  legacyModule = require('./relational-demo-seeds.legacy') as RelationalDemoSeedsLegacyModule;
  return legacyModule;
}

export function buildRelationalDemoSeedPayload(): RelationalDemoSeedPayload {
  return loadLegacyModule().buildRelationalDemoSeedPayload();
}
