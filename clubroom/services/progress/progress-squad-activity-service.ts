import { ok, type Result, type ServiceError } from "@/types/result";
import { createLogger } from "@/utils/logger";

const logger = createLogger("ProgressSquadActivityService");

export type SquadActivityType =
  | "session_completed"
  | "badge_earned"
  | "feedback_received"
  | "practice_logged";

export interface SquadActivityItem {
  id: string;
  type: SquadActivityType;
  athleteId: string;
  athleteName: string;
  athleteInitials: string;
  isSelf: boolean;
  happenedAt: string;
  title: string;
  detail: string;
}

export interface SquadActivitySummary {
  activeToday: number;
  sessionsThisWeek: number;
  badgesThisWeek: number;
  totalItems: number;
  peerCount: number;
}

export interface SquadActivityFeed {
  athleteId: string;
  squadIds: string[];
  items: SquadActivityItem[];
  summary: SquadActivitySummary;
}

export interface GetSquadActivityFeedInput {
  athleteId: string;
  now?: Date;
  lookbackDays?: number;
  limit?: number;
}

function buildEmptyFeed(athleteId: string): SquadActivityFeed {
  return {
    athleteId,
    squadIds: [],
    items: [],
    summary: {
      activeToday: 0,
      sessionsThisWeek: 0,
      badgesThisWeek: 0,
      totalItems: 0,
      peerCount: 0,
    },
  };
}

async function getFeedForAthlete(
  input: GetSquadActivityFeedInput,
): Promise<Result<SquadActivityFeed, ServiceError>> {
  const athleteId = input.athleteId.trim();
  if (!athleteId) {
    return ok(buildEmptyFeed(input.athleteId));
  }

  logger.warn("Squad activity feed API unavailable; returning empty feed", {
    athleteId,
    requiredRoute: "GET /v1/athletes/:athleteId/squad-activity",
  });
  return ok(buildEmptyFeed(input.athleteId));
}

export const progressSquadActivityService = {
  getFeedForAthlete,
};
