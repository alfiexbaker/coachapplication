import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Goal } from '@/constants/types';
import { badgeService } from '@/services/badge-service';
import { apiClient } from '@/services/api-client';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressPracticeLogService } from '@/services/progress/progress-practice-log-service';
import { progressSelfAssessmentService } from '@/services/progress/progress-self-assessment-service';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressGoalsService } from '@/services/progress/progress-goals-service';
import { err, ok, storageError, type Result, type ServiceError } from '@/types/result';
import { accountIdsMatch } from '@/utils/account-id';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ProgressTermlyReportService');
const TERM_WEEKS = 12;
const TERM_DAYS = TERM_WEEKS * 7;
const TERM_REPORTS_STORAGE_KEY = STORAGE_KEYS.PROGRESS_TERM_REPORTS;

export interface TermlyReportRange {
  startDate: string;
  endDate: string;
  label: string;
}

export interface TermlySkillSnapshot {
  skill: string;
  level: number;
  trend: 'improving' | 'consistent' | 'steady' | 'declining';
  delta: number;
}

export interface TermlyGoalSnapshot {
  id: string;
  title: string;
  status: Goal['status'];
  progress: number;
  updatedAt: string;
  targetDate?: string;
}

export interface TermlyCoachHighlight {
  coachId: string;
  coachName: string;
  quote: string;
  createdAt: string;
}

export interface TermlyAttendanceWeek {
  weekStart: string;
  sessions: number;
}

export interface TermlyProgressReport {
  id: string;
  athleteId: string;
  athleteName: string;
  generatedAt: string;
  range: TermlyReportRange;
  summary: {
    sessionsAttended: number;
    attendanceRate: number;
    averageEffort: number;
    averagePerformance: number;
    skillsImproved: number;
    goalsCompleted: number;
    badgesEarned: number;
    practiceMinutes: number;
    selfAssessmentsSubmitted: number;
  };
  focusAreas: string[];
  highlights: string[];
  attendanceByWeek: TermlyAttendanceWeek[];
  coachHighlights: TermlyCoachHighlight[];
  skillSnapshot: TermlySkillSnapshot[];
  goalSnapshot: TermlyGoalSnapshot[];
  generatedFrom: 'termly_v1';
}

export interface TermlyReportSnapshot {
  id: string;
  athleteId: string;
  generatedAt: string;
  report: TermlyProgressReport;
}

interface GenerateTermlyReportInput {
  athleteId: string;
  athleteName: string;
  viewerRole?: 'coach' | 'parent' | 'athlete';
  now?: Date;
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

function formatRangeLabel(start: Date, end: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isCompletedBookingForAthlete(booking: Booking, athleteId: string): boolean {
  if (booking.status !== 'COMPLETED') {
    return false;
  }
  if (booking.athleteIds?.some((id) => accountIdsMatch(id, athleteId))) {
    return true;
  }
  return accountIdsMatch(booking.athleteId || '', athleteId);
}

function getWeekStartIso(isoDate: string): string | null {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const monday = new Date(parsed);
  const weekday = monday.getDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  monday.setDate(monday.getDate() - delta);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
}

function toOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildHighlights(
  report: Omit<TermlyProgressReport, 'highlights'>,
): string[] {
  const next: string[] = [];
  if (report.summary.sessionsAttended > 0) {
    next.push(`${report.summary.sessionsAttended} completed sessions this term.`);
  }
  const topImprovement = [...report.skillSnapshot].sort((a, b) => b.delta - a.delta)[0];
  if (topImprovement && topImprovement.delta > 0) {
    next.push(`${topImprovement.skill} improved by ${toOneDecimal(topImprovement.delta)} points.`);
  }
  if (report.summary.badgesEarned > 0) {
    next.push(`${report.summary.badgesEarned} badges earned over the last ${TERM_WEEKS} weeks.`);
  }
  if (report.summary.practiceMinutes > 0) {
    next.push(`${report.summary.practiceMinutes} minutes of self-practice logged.`);
  }
  if (next.length === 0) {
    next.push('Progress baseline created for this term.');
  }
  return next.slice(0, 4);
}

async function generateTermlyReport(
  input: GenerateTermlyReportInput,
): Promise<Result<TermlyProgressReport, ServiceError>> {
  if (!input.athleteId.trim() || !input.athleteName.trim()) {
    return err(storageError('Missing athlete context for termly report'));
  }

  const now = input.now ?? new Date();
  const rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - (TERM_DAYS - 1));
  rangeStart.setHours(0, 0, 0, 0);
  const rangeStartTs = rangeStart.getTime();
  const viewerRole = input.viewerRole ?? 'parent';

  try {
    const [
      bookings,
      feedback,
      awards,
      practiceLogs,
      selfAssessments,
      skillLevels,
      goals,
    ] = await Promise.all([
      apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      progressFeedbackService.getFeedbackForAthlete(input.athleteId, viewerRole),
      badgeService.listAwardsForAthlete(input.athleteId),
      progressPracticeLogService.listAthleteLogs(input.athleteId),
      progressSelfAssessmentService.listAssessmentsForAthlete(input.athleteId),
      progressSkillsService.getAthleteSkillLevels(input.athleteId),
      progressGoalsService.getGoalsForAthlete(input.athleteId),
    ]);

    const sessionsInRange = bookings.filter((booking) => {
      if (!isCompletedBookingForAthlete(booking, input.athleteId)) {
        return false;
      }
      const timestamp = toTimestamp(booking.scheduledAt || booking.createdAt);
      return timestamp !== null && timestamp >= rangeStartTs;
    });

    const feedbackInRange = feedback.filter((entry) => {
      const timestamp = toTimestamp(entry.createdAt);
      return timestamp !== null && timestamp >= rangeStartTs;
    });
    const awardsInRange = awards.filter((award) => {
      const timestamp = toTimestamp(award.awardedAt);
      return timestamp !== null && timestamp >= rangeStartTs;
    });
    const selfAssessmentsInRange = selfAssessments.filter((entry) => {
      const timestamp = toTimestamp(entry.createdAt);
      return timestamp !== null && timestamp >= rangeStartTs;
    });

    const rangeStartKey = toDateKey(rangeStart);
    const practiceInRange = practiceLogs.filter((entry) => entry.dateKey >= rangeStartKey);
    const practiceMinutes = practiceInRange.reduce((sum, entry) => sum + entry.minutes, 0);

    const skills = Object.values(skillLevels?.skills ?? {});
    const skillSnapshot = skills
      .map<TermlySkillSnapshot>((skill) => ({
        skill: skill.skill,
        level: skill.level,
        trend: skill.trend,
        delta: skill.level - (skill.previousLevel ?? skill.level),
      }))
      .sort((left, right) => right.delta - left.delta || right.level - left.level)
      .slice(0, 8);

    const focusAreas = Array.from(
      new Set(
        feedbackInRange
          .flatMap((entry) => entry.skillsWorkedOn)
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0),
      ),
    ).slice(0, 5);

    const coachHighlights = feedbackInRange
      .filter((entry) => entry.publicSummary.trim().length > 0)
      .sort((left, right) => (toTimestamp(right.createdAt) ?? 0) - (toTimestamp(left.createdAt) ?? 0))
      .slice(0, 3)
      .map<TermlyCoachHighlight>((entry) => ({
        coachId: entry.coachId,
        coachName: entry.coachName,
        quote: entry.publicSummary.trim(),
        createdAt: entry.createdAt,
      }));

    const allGoals = [...goals.active, ...goals.completed];
    const goalSnapshot = allGoals
      .sort((left, right) => (toTimestamp(right.updatedAt) ?? 0) - (toTimestamp(left.updatedAt) ?? 0))
      .slice(0, 8)
      .map<TermlyGoalSnapshot>((goal) => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
        progress: goal.progress,
        updatedAt: goal.updatedAt,
        targetDate: goal.targetDate,
      }));

    const goalsCompleted = allGoals.filter((goal) => {
      if (goal.status !== 'COMPLETED') {
        return false;
      }
      const timestamp = toTimestamp(goal.updatedAt);
      return timestamp !== null && timestamp >= rangeStartTs;
    }).length;

    const weeklySessionsMap = new Map<string, number>();
    sessionsInRange.forEach((booking) => {
      const weekStart = getWeekStartIso(booking.scheduledAt || booking.createdAt || '');
      if (!weekStart) {
        return;
      }
      weeklySessionsMap.set(weekStart, (weeklySessionsMap.get(weekStart) ?? 0) + 1);
    });
    const attendanceByWeek = Array.from(weeklySessionsMap.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map<TermlyAttendanceWeek>(([weekStart, sessions]) => ({
        weekStart,
        sessions,
      }));

    const averageEffort =
      feedbackInRange.length > 0
        ? toOneDecimal(
            feedbackInRange.reduce((sum, entry) => sum + entry.effortRating, 0) /
              feedbackInRange.length,
          )
        : 0;
    const averagePerformance =
      feedbackInRange.length > 0
        ? toOneDecimal(
            feedbackInRange.reduce((sum, entry) => sum + entry.overallPerformance, 0) /
              feedbackInRange.length,
          )
        : 0;

    const baseReport = {
      id: `termly_report_${input.athleteId}_${now.getTime()}`,
      athleteId: input.athleteId,
      athleteName: input.athleteName,
      generatedAt: now.toISOString(),
      range: {
        startDate: rangeStart.toISOString(),
        endDate: now.toISOString(),
        label: formatRangeLabel(rangeStart, now),
      },
      summary: {
        sessionsAttended: sessionsInRange.length,
        attendanceRate: sessionsInRange.length > 0 ? 100 : 0,
        averageEffort,
        averagePerformance,
        skillsImproved: skillSnapshot.filter((skill) => skill.delta > 0).length,
        goalsCompleted,
        badgesEarned: awardsInRange.length,
        practiceMinutes,
        selfAssessmentsSubmitted: selfAssessmentsInRange.length,
      },
      focusAreas,
      attendanceByWeek,
      coachHighlights,
      skillSnapshot,
      goalSnapshot,
      generatedFrom: 'termly_v1' as const,
    };

    const report: TermlyProgressReport = {
      ...baseReport,
      highlights: buildHighlights(baseReport),
    };

    return ok(report);
  } catch (error) {
    logger.error('Failed to generate termly report', {
      athleteId: input.athleteId,
      error,
    });
    return err(storageError('Failed to generate termly report'));
  }
}

async function saveReportSnapshot(
  report: TermlyProgressReport,
): Promise<Result<TermlyReportSnapshot, ServiceError>> {
  try {
    const snapshot: TermlyReportSnapshot = {
      id: `termly_snapshot_${report.athleteId}_${Date.now()}`,
      athleteId: report.athleteId,
      generatedAt: report.generatedAt,
      report,
    };
    const existing = await apiClient.get<TermlyReportSnapshot[]>(TERM_REPORTS_STORAGE_KEY, []);
    const next = [snapshot, ...existing].slice(0, 50);
    await apiClient.set(TERM_REPORTS_STORAGE_KEY, next);
    return ok(snapshot);
  } catch (error) {
    logger.error('Failed to save termly report snapshot', {
      athleteId: report.athleteId,
      error,
    });
    return err(storageError('Failed to save termly report snapshot'));
  }
}

async function listReportSnapshots(
  athleteId: string,
): Promise<Result<TermlyReportSnapshot[], ServiceError>> {
  if (!athleteId.trim()) {
    return ok([]);
  }

  try {
    const snapshots = await apiClient.get<TermlyReportSnapshot[]>(TERM_REPORTS_STORAGE_KEY, []);
    return ok(
      snapshots
        .filter((snapshot) => accountIdsMatch(snapshot.athleteId, athleteId))
        .sort((left, right) => (toTimestamp(right.generatedAt) ?? 0) - (toTimestamp(left.generatedAt) ?? 0)),
    );
  } catch (error) {
    logger.error('Failed to list termly report snapshots', { athleteId, error });
    return err(storageError('Failed to load termly report snapshots'));
  }
}

function buildShareMessage(report: TermlyProgressReport): string {
  const lines: string[] = [];
  lines.push(`${report.athleteName} - Termly Progress Report`);
  lines.push(report.range.label);
  lines.push('');
  lines.push(`Sessions attended: ${report.summary.sessionsAttended}`);
  lines.push(`Average effort: ${report.summary.averageEffort}/5`);
  lines.push(`Average performance: ${report.summary.averagePerformance}/5`);
  lines.push(`Skills improved: ${report.summary.skillsImproved}`);
  lines.push(`Goals completed: ${report.summary.goalsCompleted}`);
  lines.push(`Badges earned: ${report.summary.badgesEarned}`);
  lines.push(`Practice logged: ${report.summary.practiceMinutes} mins`);
  if (report.focusAreas.length > 0) {
    lines.push('');
    lines.push(`Focus areas: ${report.focusAreas.join(', ')}`);
  }
  if (report.highlights.length > 0) {
    lines.push('');
    lines.push('Highlights:');
    report.highlights.forEach((highlight) => {
      lines.push(`- ${highlight}`);
    });
  }
  return lines.join('\n');
}

function buildCsv(report: TermlyProgressReport): string {
  const rows: string[][] = [
    ['metric', 'value'],
    ['athlete_name', report.athleteName],
    ['range', report.range.label],
    ['sessions_attended', String(report.summary.sessionsAttended)],
    ['attendance_rate', String(report.summary.attendanceRate)],
    ['average_effort', String(report.summary.averageEffort)],
    ['average_performance', String(report.summary.averagePerformance)],
    ['skills_improved', String(report.summary.skillsImproved)],
    ['goals_completed', String(report.summary.goalsCompleted)],
    ['badges_earned', String(report.summary.badgesEarned)],
    ['practice_minutes', String(report.summary.practiceMinutes)],
    ['self_assessments_submitted', String(report.summary.selfAssessmentsSubmitted)],
  ];

  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
}

export const progressTermlyReportService = {
  generateTermlyReport,
  saveReportSnapshot,
  listReportSnapshots,
  buildShareMessage,
  buildCsv,
};
