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
import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import type { Goal } from '@/constants/types';
import type { Booking, Session } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { progressSkillsService, type SkillLevel } from './progress-skills-service';
import { progressFeedbackService, type SessionFeedback } from './progress-feedback-service';
import { progressGoalsService } from './progress-goals-service';

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
    upsertSignal(signalKeyFromBooking(booking), toTimestamp(booking.scheduledAt ?? booking.createdAt));
  });

  return signals;
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
  // Fetch all data in parallel
  const [skillLevels, feedback, goals, badgeProgress, badges, allSessions, allBookings] = await Promise.all([
    progressSkillsService.getAthleteSkillLevels(athleteId),
    progressFeedbackService.getFeedbackForAthlete(athleteId, viewerRole),
    progressGoalsService.getGoalsForAthlete(athleteId),
    badgeService.getProgressToNextLevel(athleteId),
    badgeService.listAwardsForAthlete(athleteId),
    apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
    apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
  ]);

  // Convert skills to array
  const skills = skillLevels ? Object.values(skillLevels.skills) : [];
  const sessionsForAthlete = allSessions.filter((session) => session.athleteId === athleteId);
  const completedBookings = allBookings.filter((booking) =>
    isCompletedBookingForAthlete(booking, athleteId),
  );

  // Deduplicate feedback by session+athlete and keep newest record.
  const feedbackBySession = new Map<string, SessionFeedback>();
  [...feedback]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((entry) => {
      const key = `${entry.athleteId}:${entry.sessionId}`;
      if (!feedbackBySession.has(key)) {
        feedbackBySession.set(key, entry);
      }
    });
  const uniqueFeedback = Array.from(feedbackBySession.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const activitySignals = buildActivitySignals(sessionsForAthlete, uniqueFeedback, completedBookings);

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
  const attendedCount = attendanceRecords.filter((session) => session.attendance === 'ATTENDED').length;
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
