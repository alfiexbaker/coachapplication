/**
 * Progress Report Service
 *
 * Handles comprehensive athlete progress data aggregation.
 * Combines skill levels, feedback, goals, and badges into
 * a unified progress view.
 *
 * API Integration Notes:
 * - Aggregates data from multiple sub-services
 * - Supports role-based visibility filtering
 */

import { badgeService } from '../badge-service';
import { apiClient, apiFetch } from '../api-client';
import {
  bookingAuthorityService,
  bookingService,
  mapApiBookingToBooking,
} from '@/services/booking';
import { createLogger } from '@/utils/logger';
import type { Goal } from '@/constants/types';
import type { Booking, Session } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { progressSkillsService, type SkillLevel } from './progress-skills-service';
import { progressFeedbackService, type SessionFeedback } from './progress-feedback-service';
import { progressGoalsService } from './progress-goals-service';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
} from '@/services/api-auth-context';

const logger = createLogger('ProgressReportService');

function isCompletedBookingForAthlete(booking: Booking, athleteId: string): boolean {
  if (booking.status !== 'COMPLETED') {
    return false;
  }

  if (booking.athleteIds?.includes(athleteId)) {
    return true;
  }

  return booking.athleteId === athleteId;
}

async function listAuthoritativeProgressBookings(): Promise<Booking[]> {
  const result = await bookingAuthorityService.listBookings();
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data.map((booking) => mapApiBookingToBooking(booking));
}

type ApiProgressRow = Record<string, unknown>;

interface ApiAthleteProgressPayload {
  athleteId: string;
  sessionNotes?: ApiProgressRow[];
  sessionFeedback?: ApiProgressRow[];
  skillAssessments?: ApiProgressRow[];
  skillDefinitions?: ApiProgressRow[];
}

function asRecord(value: unknown): ApiProgressRow {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as ApiProgressRow)
    : {};
}

function asRows(value: unknown): ApiProgressRow[] {
  return Array.isArray(value)
    ? value.filter(
        (row): row is ApiProgressRow =>
          Boolean(row) && typeof row === 'object' && !Array.isArray(row),
      )
    : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function normalizeFeedbackVisibility(value: unknown): SessionFeedback['visibility'] {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'parent' || raw === 'athlete' || raw === 'coach_only') {
    return raw;
  }
  if (raw === 'public') {
    return 'parent';
  }
  return raw ? 'coach_only' : 'athlete';
}

function tenPointScore(value: unknown): number {
  const score = asNumber(value);
  if (score == null || score <= 0) {
    return 1;
  }
  const normalized = score > 10 ? score / 10 : score;
  return Math.max(1, Math.min(10, Math.round(normalized)));
}

function trendFromScores(
  previousLevel: number | undefined,
  level: number,
): SkillLevel['trend'] {
  if (previousLevel == null) {
    return 'consistent';
  }
  if (level > previousLevel) {
    return 'improving';
  }
  if (level < previousLevel) {
    return 'declining';
  }
  return 'consistent';
}

async function loadAuthoritativeAthleteProgress(
  athleteId: string,
): Promise<ApiAthleteProgressPayload> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to view athlete progress.');
  if (!currentUserResult.success) {
    throw new Error(currentUserResult.error.message);
  }

  const currentUser = currentUserResult.data;
  const apiAthleteId = toApiAthleteId(athleteId);
  const actingRole = deriveApiActingRole(currentUser);
  const result = await apiFetch<ApiAthleteProgressPayload>(
    `/v1/athletes/${encodeURIComponent(apiAthleteId)}/progress`,
    {
      method: 'GET',
      headers: buildApiAuthHeaders({
        actingRole,
        coachAthleteIds: actingRole === 'coach' ? [apiAthleteId] : undefined,
        guardianAthleteIds: actingRole === 'parent' ? [apiAthleteId] : undefined,
        coachVerified: actingRole === 'coach' && currentUser.isVerified,
      }),
    },
  );
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

function mapApiProgressFeedback(
  payload: ApiAthleteProgressPayload,
  viewerRole: 'coach' | 'parent' | 'athlete',
): SessionFeedback[] {
  return asRows(payload.sessionFeedback)
    .map((row): SessionFeedback => {
      const metadata = asRecord(row.metadataJson);
      const rating = asNumber(row.rating);
      return {
        id: asString(row.id) ?? '',
        sessionId: asString(row.sessionId) ?? asString(row.bookingId) ?? '',
        bookingId: asString(row.bookingId),
        sessionTemplateId: asString(metadata.sessionTemplateId),
        sessionTemplateName: asString(metadata.sessionTemplateName),
        sessionTitle: asString(metadata.sessionTitle),
        coachId: asString(row.authorUserId) ?? '',
        coachName: asString(metadata.coachName) ?? 'Coach',
        athleteId: asString(row.athleteId) ?? payload.athleteId,
        athleteName: asString(metadata.athleteName) ?? 'Athlete',
        createdAt: asString(row.createdAt) ?? new Date().toISOString(),
        updatedAt: asString(row.updatedAt),
        privateNotes: viewerRole === 'coach' ? asString(row.privateCommentEncrypted) : undefined,
        publicSummary: asString(row.publicComment) ?? '',
        skillsWorkedOn: asStringArray(metadata.skillsWorkedOn),
        skillRatings: Array.isArray(metadata.skillRatings)
          ? (metadata.skillRatings as SessionFeedback['skillRatings'])
          : [],
        improvements: asString(metadata.improvements) ?? '',
        homework: asString(metadata.homework) ?? '',
        effortRating: asNumber(metadata.effortRating) ?? rating ?? 3,
        overallPerformance: asNumber(metadata.overallPerformance) ?? rating ?? 3,
        videoClipUrls: asStringArray(metadata.videoClipUrls),
        photoUrls: asStringArray(metadata.photoUrls),
        badgeAwarded: asString(metadata.badgeAwarded),
        fourCorners: asRecord(metadata.fourCorners) as unknown as SessionFeedback['fourCorners'],
        positionPlayed: asString(metadata.positionPlayed) as SessionFeedback['positionPlayed'],
        positionsPlayed: asStringArray(
          metadata.positionsPlayed,
        ) as SessionFeedback['positionsPlayed'],
        subSkillRatings: Array.isArray(metadata.subSkillRatings)
          ? (metadata.subSkillRatings as SessionFeedback['subSkillRatings'])
          : [],
        visibility: normalizeFeedbackVisibility(row.visibility),
      };
    })
    .filter((feedback) => viewerRole === 'coach' || feedback.visibility !== 'coach_only');
}

function buildApiProgressSkills(payload: ApiAthleteProgressPayload): SkillLevel[] {
  const definitionsById = new Map(
    asRows(payload.skillDefinitions)
      .map((definition) => [asString(definition.id), definition] as const)
      .filter((entry): entry is [string, ApiProgressRow] => Boolean(entry[0])),
  );
  const grouped = new Map<string, ApiProgressRow[]>();

  for (const assessment of asRows(payload.skillAssessments)) {
    const skillDefinitionId = asString(assessment.skillDefinitionId);
    if (!skillDefinitionId) {
      continue;
    }
    const existing = grouped.get(skillDefinitionId) ?? [];
    existing.push(assessment);
    grouped.set(skillDefinitionId, existing);
  }

  return [...grouped.entries()].map(([skillDefinitionId, assessments]) => {
    const sorted = [...assessments].sort((a, b) => {
      const aTime = toTimestamp(asString(a.assessedAt) ?? asString(a.createdAt)) ?? 0;
      const bTime = toTimestamp(asString(b.assessedAt) ?? asString(b.createdAt)) ?? 0;
      return aTime - bTime;
    });
    const latest = sorted[sorted.length - 1] ?? {};
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
    const level = tenPointScore(latest.score);
    const previousLevel = previous ? tenPointScore(previous.score) : undefined;
    const definition = definitionsById.get(skillDefinitionId);
    const lastUpdated =
      asString(latest.assessedAt) ?? asString(latest.createdAt) ?? new Date().toISOString();

    return {
      skill: asString(definition?.name) ?? asString(definition?.code) ?? skillDefinitionId,
      level,
      previousLevel,
      lastUpdated,
      updatedBy: asString(latest.assessorUserId) ?? '',
      trend: trendFromScores(previousLevel, level),
      history: sorted.map((entry) => ({
        date: asString(entry.assessedAt) ?? asString(entry.createdAt) ?? lastUpdated,
        level: tenPointScore(entry.score),
        coachId: asString(entry.assessorUserId) ?? '',
      })),
    };
  });
}

function signalKeyFromSession(session: Session): string {
  return session.bookingId ? `booking:${session.bookingId}` : `session:${session.id}`;
}

function signalKeyFromFeedback(feedback: SessionFeedback): string {
  return feedback.bookingId ? `booking:${feedback.bookingId}` : `session:${feedback.sessionId}`;
}

function signalKeyFromBooking(booking: Booking): string {
  return `booking:${booking.id}`;
}

function toTimestamp(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildActivitySignals(
  sessions: Session[],
  feedback: SessionFeedback[],
  bookings: Booking[],
): Map<string, number> {
  const signals = new Map<string, number>();

  const upsertSignal = (key: string, timestamp: number | null) => {
    const normalizedTimestamp = timestamp ?? 0;
    const existing = signals.get(key);
    if (existing === undefined || normalizedTimestamp > existing) {
      signals.set(key, normalizedTimestamp);
    }
  };

  sessions.forEach((session) => {
    upsertSignal(signalKeyFromSession(session), toTimestamp(session.completedAt));
  });

  feedback.forEach((entry) => {
    upsertSignal(signalKeyFromFeedback(entry), toTimestamp(entry.createdAt));
  });

  bookings.forEach((booking) => {
    upsertSignal(
      signalKeyFromBooking(booking),
      toTimestamp(booking.scheduledAt ?? booking.createdAt),
    );
  });

  return signals;
}

function buildApiProgressActivitySignals(
  payload: ApiAthleteProgressPayload,
  feedback: SessionFeedback[],
  bookings: Booking[],
): Map<string, number> {
  const signals = buildActivitySignals([], feedback, bookings);

  asRows(payload.sessionNotes).forEach((note, index) => {
    const key =
      asString(note.bookingId) ??
      asString(note.groupSessionId) ??
      asString(note.id) ??
      `note:${index}`;
    const timestamp =
      toTimestamp(asString(note.updatedAt)) ?? toTimestamp(asString(note.createdAt)) ?? 0;
    const existing = signals.get(key);
    if (existing === undefined || timestamp > existing) {
      signals.set(key, timestamp);
    }
  });

  return signals;
}

async function withProgressFallback<T>(
  athleteId: string,
  resource: string,
  loader: Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await loader;
  } catch (error) {
    logger.warn('Progress subresource unavailable', {
      athleteId,
      resource,
      error: error instanceof Error ? error.message : String(error),
    });
    if (!apiClient.isMockMode) {
      throw error;
    }
    return fallback;
  }
}

// ============================================================================
// TYPES
// ============================================================================

export interface AthleteProgress {
  athleteId: string;
  athleteName: string;
  // Overview metrics
  totalSessions: number;
  sessionsThisMonth: number;
  averagePerformance: number;
  averageEffort: number;
  attendanceRate: number;
  // Skill levels
  skills: SkillLevel[];
  // Trend analysis
  overallTrend: 'improving' | 'steady' | 'declining';
  improvementRate: number; // percentage
  // Goals
  activeGoals: Goal[];
  completedGoals: Goal[];
  // Recent feedback
  recentFeedback: SessionFeedback[];
  // Badge summary
  totalBadges: number;
  recentBadges: {
    id: string;
    label: string;
    awardedAt: string;
    category?: string;
  }[];
  // Progression
  currentLevel: { level: number; name: string };
  totalPoints: number;
  progressToNextLevel: number;
}

// ============================================================================
// COMPREHENSIVE PROGRESS DATA
// ============================================================================

async function getAthleteProgress(
  athleteId: string,
  viewerRole: 'coach' | 'parent' | 'athlete' = 'parent',
): Promise<AthleteProgress> {
  const emptyBadgeProgress = {
    currentLevel: { level: 1, name: 'Starting Out', pointsRequired: 0 },
    nextLevel: null,
    progressPercent: 0,
    pointsToNext: 0,
    totalPoints: 0,
  };

  // In API mode, the primary progress rows come from
  // /v1/athletes/:athleteId/progress instead of local coach-session mirrors.
  const apiProgress = apiClient.isMockMode
    ? null
    : await loadAuthoritativeAthleteProgress(athleteId);

  const [skillLevels, feedback, goals, badgeProgress, badges, allSessions, allBookings] =
    await Promise.all([
      withProgressFallback(
        athleteId,
        'skills',
        apiClient.isMockMode
          ? progressSkillsService.getAthleteSkillLevels(athleteId)
          : Promise.resolve(null),
        null,
      ),
      withProgressFallback<SessionFeedback[]>(
        athleteId,
        'feedback',
        apiClient.isMockMode
          ? progressFeedbackService.getFeedbackForAthlete(athleteId, viewerRole)
          : Promise.resolve([]),
        [],
      ),
      withProgressFallback(athleteId, 'goals', progressGoalsService.getGoalsForAthlete(athleteId), {
        active: [],
        completed: [],
      }),
      withProgressFallback(
        athleteId,
        'badge-progress',
        badgeService.getProgressToNextLevel(athleteId),
        emptyBadgeProgress,
      ),
      withProgressFallback(athleteId, 'badges', badgeService.listAwardsForAthlete(athleteId), []),
      apiClient.isMockMode
        ? withProgressFallback(
            athleteId,
            'sessions',
            apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
            [],
          )
        : Promise.resolve([]),
      apiClient.isMockMode
        ? withProgressFallback(athleteId, 'bookings', bookingService.list(), [])
        : withProgressFallback(athleteId, 'bookings', listAuthoritativeProgressBookings(), []),
    ]);

  // Convert skills to array
  const skills = apiProgress
    ? buildApiProgressSkills(apiProgress)
    : skillLevels
      ? Object.values(skillLevels.skills)
      : [];
  const reportFeedback = apiProgress ? mapApiProgressFeedback(apiProgress, viewerRole) : feedback;
  const sessionsForAthlete = allSessions.filter((session) => session.athleteId === athleteId);
  const completedBookings = allBookings.filter((booking) =>
    isCompletedBookingForAthlete(booking, athleteId),
  );

  // Deduplicate feedback by session+athlete and keep newest record.
  const feedbackBySession = new Map<string, SessionFeedback>();
  Array.from(reportFeedback)
    .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((entry) => {
      const key = `${entry.athleteId}:${entry.sessionId}`;
      if (!feedbackBySession.has(key)) {
        feedbackBySession.set(key, entry);
      }
    });
  const uniqueFeedback = Array.from(feedbackBySession.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const activitySignals = apiProgress
    ? buildApiProgressActivitySignals(apiProgress, uniqueFeedback, completedBookings)
    : buildActivitySignals(sessionsForAthlete, uniqueFeedback, completedBookings);

  // Calculate metrics from sessions + feedback + completed bookings.
  const totalSessions = activitySignals.size;
  const now = new Date();
  const monthAgoTimestamp = now.getTime() - 30 * 24 * 60 * 60 * 1000;
  const sessionsThisMonth = Array.from(activitySignals.values()).filter(
    (timestamp) => timestamp >= monthAgoTimestamp,
  ).length;

  const avgPerformance =
    uniqueFeedback.length > 0
      ? uniqueFeedback.reduce((sum, f) => sum + f.overallPerformance, 0) / uniqueFeedback.length
      : sessionsForAthlete.length > 0
        ? sessionsForAthlete.reduce((sum, session) => sum + session.performanceRating, 0) /
          sessionsForAthlete.length
        : 0;

  const avgEffort =
    uniqueFeedback.length > 0
      ? uniqueFeedback.reduce((sum, f) => sum + f.effortRating, 0) / uniqueFeedback.length
      : 0;

  const attendanceRecords = sessionsForAthlete.filter((session) => Boolean(session.attendance));
  const attendedCount = attendanceRecords.filter(
    (session) => session.attendance === 'ATTENDED',
  ).length;
  const attendanceRate =
    attendanceRecords.length > 0
      ? Math.round((attendedCount / attendanceRecords.length) * 100)
      : totalSessions > 0
        ? 100
        : 0;

  // Calculate overall trend
  const improvingSkills = skills.filter((s) => s.trend === 'improving').length;
  const decliningSkills = skills.filter((s) => s.trend === 'declining').length;
  let overallTrend: 'improving' | 'steady' | 'declining' = 'steady';
  if (improvingSkills > decliningSkills + 1) overallTrend = 'improving';
  else if (decliningSkills > improvingSkills + 1) overallTrend = 'declining';

  // Calculate improvement rate
  const improvementRate =
    skills.length > 0 ? Math.round((improvingSkills / skills.length) * 100) : 0;

  // Filter badges for visibility
  const visibleBadges =
    viewerRole === 'coach' ? badges : badges.filter((b) => b.visibility !== 'coach_only');

  return {
    athleteId,
    athleteName: '', // Will be filled by caller
    totalSessions,
    sessionsThisMonth,
    averagePerformance: Math.round(avgPerformance * 10) / 10,
    averageEffort: Math.round(avgEffort * 10) / 10,
    attendanceRate,
    skills,
    overallTrend,
    improvementRate,
    activeGoals: goals.active,
    completedGoals: goals.completed,
    recentFeedback: uniqueFeedback.slice(0, 5),
    totalBadges: visibleBadges.length,
    recentBadges: visibleBadges.slice(0, 5).map((b) => ({
      id: b.id,
      label: b.badgeLabel,
      awardedAt: b.awardedAt,
      category: b.badgeCategory,
    })),
    currentLevel: badgeProgress.currentLevel,
    totalPoints: badgeProgress.totalPoints,
    progressToNextLevel: badgeProgress.progressPercent,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const progressReportService = {
  getAthleteProgress,
};
