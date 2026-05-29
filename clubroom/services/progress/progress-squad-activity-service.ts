import type { Booking } from "@/constants/app-types";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import type { BadgeAward, SquadMember } from "@/constants/types";
import { apiClient } from "@/services/api-client";
import { userService } from "@/services/user-service";
import type { SessionFeedback } from "@/services/progress/progress-feedback-service";
import type { PracticeLogEntry } from "@/services/progress/progress-practice-log-service";
import {
  err,
  ok,
  storageError,
  type Result,
  type ServiceError,
} from "@/types/result";
import { accountIdsMatch, normalizeAccountId } from "@/utils/account-id";
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
function toTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}
function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function toInitials(name: string): string {
  const normalized = name.trim();
  if (!normalized) {
    return "?";
  }
  return normalized
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function firstName(name: string): string {
  const value = name.trim();
  if (!value) {
    return "Athlete";
  }
  return value.split(" ")[0] || value;
}
function bookingAthleteRows(booking: Booking): Array<{
  athleteId: string;
  athleteName?: string;
}> {
  if (booking.athleteIds && booking.athleteIds.length > 0) {
    return booking.athleteIds.map((athleteId, index) => ({
      athleteId,
      athleteName: booking.athleteNames?.[index],
    }));
  }
  if (booking.athleteId) {
    return [
      {
        athleteId: booking.athleteId,
        athleteName: booking.athleteNames?.[0],
      },
    ];
  }
  return [];
}
function isActiveMember(member: SquadMember): boolean {
  return member.status === "ACTIVE";
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
  if (!input.athleteId.trim()) {
    return ok(buildEmptyFeed(input.athleteId));
  }
  const now = input.now ?? new Date();
  const lookbackDays = Math.max(1, Math.round(input.lookbackDays ?? 21));
  const limit = Math.max(1, Math.round(input.limit ?? 10));
  const lookbackCutoff = now.getTime() - lookbackDays * 24 * 60 * 60 * 1000;
  const weekCutoff = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const todayKey = toDateKey(now);
  try {
    const [members, bookings, feedback, badgeAwards, practiceLogs] =
      await Promise.all([
        apiClient.get<SquadMember[]>(STORAGE_KEYS.SQUAD_MEMBERS, []),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []),
        apiClient.get<BadgeAward[]>(STORAGE_KEYS.BADGE_AWARDS, []),
        apiClient.get<PracticeLogEntry[]>(
          STORAGE_KEYS.PROGRESS_PRACTICE_LOGS,
          [],
        ),
      ]);
    const athleteSquadIds = Array.from(
      new Set(
        members.flatMap((member) =>
          isActiveMember(member) &&
          accountIdsMatch(member.athleteId, input.athleteId)
            ? [member.squadId]
            : [],
        ),
      ),
    );
    if (athleteSquadIds.length === 0) {
      return ok(buildEmptyFeed(input.athleteId));
    }
    const squadAthleteIds = Array.from(
      new Set(
        members.flatMap((member) =>
          isActiveMember(member) && athleteSquadIds.includes(member.squadId)
            ? [member.athleteId]
            : [],
        ),
      ),
    );
    const usersResult = await userService.getUsersByIds(squadAthleteIds);
    const athleteNameById = new Map<string, string>();
    if (usersResult.success) {
      usersResult.data.forEach((user) => {
        athleteNameById.set(
          normalizeAccountId(user.id),
          user.name.trim() || "Athlete",
        );
      });
    }
    const resolveAthleteName = (
      athleteId: string,
      fallback?: string,
    ): string => {
      const normalized = normalizeAccountId(athleteId);
      const fromUsers = athleteNameById.get(normalized);
      if (fromUsers) {
        return fromUsers;
      }
      const normalizedFallback = fallback?.trim();
      return normalizedFallback?.length ? normalizedFallback : "Athlete";
    };
    const athleteIdSet = new Set(
      squadAthleteIds.map((athleteId) => normalizeAccountId(athleteId)),
    );
    const items: SquadActivityItem[] = [];
    const addItem = (
      id: string,
      type: SquadActivityType,
      athleteId: string,
      athleteName: string,
      happenedAt: string,
      title: string,
      detail: string,
    ) => {
      const timestamp = toTimestamp(happenedAt);
      if (timestamp === null || timestamp < lookbackCutoff) {
        return;
      }
      items.push({
        id,
        type,
        athleteId,
        athleteName,
        athleteInitials: toInitials(athleteName),
        isSelf: accountIdsMatch(athleteId, input.athleteId),
        happenedAt: new Date(timestamp).toISOString(),
        title,
        detail,
      });
    };
    for (const booking of bookings) {
      if (booking.status !== "COMPLETED") {
        continue;
      }
      const bookingTime = booking.scheduledAt || booking.createdAt;
      const rows = bookingAthleteRows(booking);
      for (const row of rows) {
        if (!athleteIdSet.has(normalizeAccountId(row.athleteId))) {
          continue;
        }
        const athleteName = resolveAthleteName(row.athleteId, row.athleteName);
        const self = accountIdsMatch(row.athleteId, input.athleteId);
        addItem(
          `booking:${booking.id}:${normalizeAccountId(row.athleteId)}`,
          "session_completed",
          row.athleteId,
          athleteName,
          bookingTime || new Date().toISOString(),
          self
            ? "You completed a session"
            : `${firstName(athleteName)} completed a session`,
          booking.service?.trim() || "Training session completed",
        );
      }
    }
    for (const award of badgeAwards) {
      if (!athleteIdSet.has(normalizeAccountId(award.athleteId))) {
        continue;
      }
      const athleteName = resolveAthleteName(award.athleteId);
      const self = accountIdsMatch(award.athleteId, input.athleteId);
      addItem(
        `badge:${award.id}`,
        "badge_earned",
        award.athleteId,
        athleteName,
        award.awardedAt,
        self
          ? `You earned ${award.badgeLabel}`
          : `${firstName(athleteName)} earned ${award.badgeLabel}`,
        award.reason?.trim() || "Badge earned",
      );
    }
    for (const entry of feedback) {
      if (!athleteIdSet.has(normalizeAccountId(entry.athleteId))) {
        continue;
      }
      if (entry.visibility === "coach_only") {
        continue;
      }
      const athleteName = resolveAthleteName(
        entry.athleteId,
        entry.athleteName,
      );
      const self = accountIdsMatch(entry.athleteId, input.athleteId);
      addItem(
        `feedback:${entry.id}`,
        "feedback_received",
        entry.athleteId,
        athleteName,
        entry.createdAt,
        self
          ? "New coach feedback added"
          : `${firstName(athleteName)} got coach feedback`,
        entry.publicSummary?.trim() || "Coach feedback shared",
      );
    }
    for (const log of practiceLogs) {
      if (!athleteIdSet.has(normalizeAccountId(log.athleteId))) {
        continue;
      }
      const happenedAt =
        log.updatedAt ||
        log.createdAt ||
        (log.dateKey ? `${log.dateKey}T12:00:00.000Z` : undefined) ||
        new Date().toISOString();
      const athleteName = resolveAthleteName(log.athleteId);
      const self = accountIdsMatch(log.athleteId, input.athleteId);
      addItem(
        `practice:${log.id}`,
        "practice_logged",
        log.athleteId,
        athleteName,
        happenedAt,
        self
          ? `You logged ${log.minutes}m practice`
          : `${firstName(athleteName)} logged ${log.minutes}m practice`,
        log.note?.trim() || "Self-practice logged",
      );
    }
    const uniqueById = new Map<string, SquadActivityItem>();
    for (const item of items) {
      const existing = uniqueById.get(item.id);
      if (!existing) {
        uniqueById.set(item.id, item);
        continue;
      }
      if (
        toTimestamp(item.happenedAt) ??
        0 > (toTimestamp(existing.happenedAt) ?? 0)
      ) {
        uniqueById.set(item.id, item);
      }
    }
    const sorted = Array.from(uniqueById.values())
      .sort(
        (left, right) =>
          (toTimestamp(right.happenedAt) ?? 0) -
          (toTimestamp(left.happenedAt) ?? 0),
      )
      .slice(0, limit);
    const activeTodayIds = new Set(
      sorted.flatMap((item) =>
        item.happenedAt.slice(0, 10) === todayKey
          ? [normalizeAccountId(item.athleteId)]
          : [],
      ),
    );
    const sessionsThisWeek = sorted.filter(
      (item) =>
        item.type === "session_completed" &&
        (toTimestamp(item.happenedAt) ?? 0) >= weekCutoff,
    ).length;
    const badgesThisWeek = sorted.filter(
      (item) =>
        item.type === "badge_earned" &&
        (toTimestamp(item.happenedAt) ?? 0) >= weekCutoff,
    ).length;
    return ok({
      athleteId: input.athleteId,
      squadIds: athleteSquadIds,
      items: sorted,
      summary: {
        activeToday: activeTodayIds.size,
        sessionsThisWeek,
        badgesThisWeek,
        totalItems: sorted.length,
        peerCount: Math.max(0, squadAthleteIds.length - 1),
      },
    });
  } catch (error) {
    logger.error("Failed to build squad activity feed", {
      athleteId: input.athleteId,
      error,
    });
    return err(storageError("Failed to load squad activity feed"));
  }
}
export const progressSquadActivityService = {
  getFeedForAthlete,
};
