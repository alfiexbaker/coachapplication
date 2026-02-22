import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking } from '@/constants/app-types';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Goal } from '@/constants/types';
import { apiClient } from '@/services/api-client';
import type { SessionFeedback } from '@/services/progress/progress-feedback-service';
import type { PracticeLogEntry } from '@/services/progress/progress-practice-log-service';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressTermlyReportService } from '@/services/progress/progress-termly-report-service';

describe('progressTermlyReportService', () => {
  beforeEach(async () => {
    await Promise.all([
      apiClient.remove(STORAGE_KEYS.BOOKINGS),
      apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK),
      apiClient.remove(STORAGE_KEYS.BADGE_AWARDS),
      apiClient.remove(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS),
      apiClient.remove(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS),
      apiClient.remove(STORAGE_KEYS.SKILL_LEVELS),
      apiClient.remove(STORAGE_KEYS.GOALS),
      apiClient.remove(STORAGE_KEYS.PROGRESS_TERM_REPORTS),
    ]);
  });

  it('generates and persists a termly report from real athlete activity', async () => {
    const athleteId = 'athlete_termly_1';
    const now = new Date('2026-02-21T12:00:00.000Z');

    const bookings: Booking[] = [
      {
        id: 'booking_termly_1',
        coachId: 'coach_termly_1',
        coachName: 'Coach Termly',
        athleteIds: [athleteId],
        athleteId,
        status: 'COMPLETED',
        scheduledAt: '2026-02-10T17:00:00.000Z',
        duration: 60,
        location: 'Pitch A',
        service: '1-on-1',
        serviceType: 'COACHING',
      },
      {
        id: 'booking_termly_2',
        coachId: 'coach_termly_1',
        coachName: 'Coach Termly',
        athleteIds: [athleteId],
        athleteId,
        status: 'COMPLETED',
        scheduledAt: '2026-02-17T17:00:00.000Z',
        duration: 60,
        location: 'Pitch A',
        service: '1-on-1',
        serviceType: 'COACHING',
      },
    ];
    const feedback: SessionFeedback[] = [
      {
        id: 'feedback_termly_1',
        sessionId: 'session_termly_1',
        coachId: 'coach_termly_1',
        coachName: 'Coach Termly',
        athleteId,
        athleteName: 'Kai Brooks',
        createdAt: '2026-02-10T18:00:00.000Z',
        publicSummary: 'Decision-making is improving under pressure.',
        skillsWorkedOn: ['Decision Making', 'Composure'],
        skillRatings: [],
        improvements: '',
        homework: '',
        effortRating: 4,
        overallPerformance: 4,
        visibility: 'parent',
      },
      {
        id: 'feedback_termly_2',
        sessionId: 'session_termly_2',
        coachId: 'coach_termly_1',
        coachName: 'Coach Termly',
        athleteId,
        athleteName: 'Kai Brooks',
        createdAt: '2026-02-17T18:00:00.000Z',
        publicSummary: 'Composure in the final third was excellent.',
        skillsWorkedOn: ['Composure', 'Finishing'],
        skillRatings: [],
        improvements: '',
        homework: '',
        effortRating: 5,
        overallPerformance: 5,
        visibility: 'parent',
      },
    ];
    const practiceLogs: PracticeLogEntry[] = [
      {
        id: 'practice_termly_1',
        athleteId,
        dateKey: '2026-02-15',
        minutes: 25,
        createdAt: '2026-02-15T09:00:00.000Z',
      },
      {
        id: 'practice_termly_2',
        athleteId,
        dateKey: '2026-02-19',
        minutes: 35,
        createdAt: '2026-02-19T09:00:00.000Z',
      },
    ];
    const goals: Goal[] = [
      {
        id: 'goal_termly_complete',
        userId: athleteId,
        athleteId,
        title: 'Build match stamina',
        category: 'CHARACTER',
        status: 'COMPLETED',
        progress: 100,
        milestones: [],
        createdBy: 'COACH',
        createdById: 'coach_termly_1',
        createdAt: '2026-01-05T10:00:00.000Z',
        updatedAt: '2026-02-18T10:00:00.000Z',
      },
      {
        id: 'goal_termly_active',
        userId: athleteId,
        athleteId,
        title: 'Improve first touch',
        category: 'BALL_SKILLS',
        status: 'ACTIVE',
        progress: 60,
        milestones: [],
        createdBy: 'COACH',
        createdById: 'coach_termly_1',
        createdAt: '2026-01-08T10:00:00.000Z',
        updatedAt: '2026-02-20T10:00:00.000Z',
      },
    ];

    await progressSkillsService.updateSkillLevel(athleteId, 'First Touch', 6, 'coach_termly_1');
    await progressSkillsService.updateSkillLevel(athleteId, 'First Touch', 8, 'coach_termly_1');

    await Promise.all([
      apiClient.set(STORAGE_KEYS.BOOKINGS, bookings),
      apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, feedback),
      apiClient.set(STORAGE_KEYS.BADGE_AWARDS, [
        {
          id: 'award_termly_1',
          badgeId: 'badge_best_training',
          badgeLabel: 'Standout Session',
          athleteId,
          coachId: 'coach_termly_1',
          awardedBy: 'coach_termly_1',
          awardedAt: '2026-02-17T19:00:00.000Z',
          reason: 'Great pressing intensity',
          visibility: 'supporters',
        },
      ]),
      apiClient.set(STORAGE_KEYS.PROGRESS_PRACTICE_LOGS, practiceLogs),
      apiClient.set(STORAGE_KEYS.PROGRESS_SELF_ASSESSMENTS, [
        {
          id: 'self_termly_1',
          athleteId,
          coachId: 'coach_termly_1',
          bookingId: 'booking_termly_2',
          sessionId: 'session_termly_2',
          mood: 4,
          energyLevel: 4,
          confidence: 5,
          notes: 'Felt strong in transitions',
          createdAt: '2026-02-17T20:00:00.000Z',
        },
      ]),
      apiClient.set(STORAGE_KEYS.GOALS, goals),
    ]);

    const reportResult = await progressTermlyReportService.generateTermlyReport({
      athleteId,
      athleteName: 'Kai Brooks',
      viewerRole: 'parent',
      now,
    });

    assert.equal(reportResult.success, true);
    if (!reportResult.success) {
      return;
    }

    assert.equal(reportResult.data.summary.sessionsAttended, 2);
    assert.equal(reportResult.data.summary.badgesEarned, 1);
    assert.equal(reportResult.data.summary.goalsCompleted, 1);
    assert.equal(reportResult.data.summary.practiceMinutes, 60);
    assert.equal(reportResult.data.summary.selfAssessmentsSubmitted, 1);
    assert.ok(reportResult.data.focusAreas.includes('Composure'));
    assert.ok(reportResult.data.skillSnapshot.some((skill) => skill.skill === 'First Touch'));
    assert.ok(reportResult.data.highlights.length > 0);

    const snapshotResult = await progressTermlyReportService.saveReportSnapshot(reportResult.data);
    assert.equal(snapshotResult.success, true);

    const listResult = await progressTermlyReportService.listReportSnapshots(athleteId);
    assert.equal(listResult.success, true);
    if (!listResult.success) {
      return;
    }

    assert.equal(listResult.data.length, 1);
    assert.equal(listResult.data[0].athleteId, athleteId);
    assert.match(progressTermlyReportService.buildShareMessage(reportResult.data), /Termly Progress Report/);
    assert.match(progressTermlyReportService.buildCsv(reportResult.data), /sessions_attended/);
  });
});
