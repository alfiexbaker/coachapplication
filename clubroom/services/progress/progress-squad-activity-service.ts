import { api } from "@/constants/config";
import { apiFetch } from "@/services/api-client";
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from "@/services/api-auth-context";
import { err, ok, type Result, type ServiceError } from "@/types/result";
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

type ApiSquadActivityResponse = SquadActivityFeed;

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

  if (api.useMock) {
    return ok(buildEmptyFeed(input.athleteId));
  }

  const currentUserResult = await resolveSignedInApiUser("Sign in to view squad activity.");
  if (!currentUserResult.success) {
    return err(currentUserResult.error);
  }

  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUserResult.data);
  const search = new URLSearchParams();
  if (input.lookbackDays != null) {
    search.set("lookbackDays", String(input.lookbackDays));
  }
  if (input.limit != null) {
    search.set("limit", String(input.limit));
  }
  const query = search.toString();

  const result = await apiFetch<ApiSquadActivityResponse>(
    `/v1/athletes/${apiAthleteId}/squad-activity${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: buildApiAuthHeaders({
        actingRole,
        coachAthleteIds: actingRole === "coach" ? [apiAthleteId] : undefined,
        guardianAthleteIds: actingRole === "parent" ? [apiAthleteId] : undefined,
        coachVerified: actingRole === "coach" && currentUserResult.data.isVerified,
      }),
    },
  );

  if (!result.success) {
    logger.warn("Squad activity feed API read failed", {
      athleteId,
      error: result.error.message,
    });
    return err(result.error);
  }

  return ok(result.data);
}

export const progressSquadActivityService = {
  getFeedForAthlete,
};
