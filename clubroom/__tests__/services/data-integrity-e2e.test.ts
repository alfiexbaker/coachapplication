/**
 * End-to-end data integrity test:
 *   Coach rates skills → storage (1-10) → display helpers produce correct labels/scales
 *
 * Verifies every scale conversion in the system produces consistent results
 * for the same underlying data.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { RATING_LABELS } from '@/constants/position-skills';
import { apiClient } from '@/services/api-client';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressAttendanceService } from '@/services/progress/progress-attendance-service';
import { getSkillLabel, getSkillLevelLabel } from '@/components/progress/skill-level-helpers';
import { getSkillLabel as radarGetSkillLabel, getSkillColor as radarGetSkillColor } from '@/components/analytics/skill-radar-helpers';
import { toFifaScore } from '@/utils/fifa-score';
import type { SessionSkillRating, QuickRateInput } from '@/types/progress-types';
import type { SessionAttendance } from '@/constants/session-types';
import type { Booking } from '@/constants/app-types';

// ─── Canonical label expectations ────────────────────────────────────────────
const EXPECTED_LABELS = ['Developing', 'Good', 'Very Good', 'Excellent', 'Exceptional'] as const;

describe('data integrity: coach → storage → display', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.COACH_SESSIONS);
    await apiClient.remove(`${STORAGE_KEYS.SESSION_ATTENDANCE}_booking_att_1`);
    await apiClient.remove(`${STORAGE_KEYS.SESSION_ATTENDANCE}_group_att_1`);
  });

  // ─── Scale conversion correctness ──────────────────────────────────────────

  it('RATING_LABELS matches canonical label order', () => {
    assert.equal(RATING_LABELS[1], 'Developing');
    assert.equal(RATING_LABELS[2], 'Good');
    assert.equal(RATING_LABELS[3], 'Very Good');
    assert.equal(RATING_LABELS[4], 'Excellent');
    assert.equal(RATING_LABELS[5], 'Exceptional');
  });

  it('getSkillLabel (1-10 → label) matches RATING_LABELS at every level', () => {
    const expectations: [number, string][] = [
      [1, 'Developing'], [2, 'Developing'],
      [3, 'Good'],       [4, 'Good'],
      [5, 'Very Good'],  [6, 'Very Good'],
      [7, 'Excellent'],  [8, 'Excellent'],
      [9, 'Exceptional'],[10, 'Exceptional'],
    ];
    for (const [level, expected] of expectations) {
      const actual = getSkillLabel(level);
      assert.equal(actual, expected, `getSkillLabel(${level}) = "${actual}", expected "${expected}"`);
    }
  });

  it('radarGetSkillLabel (0-100 → label) agrees with getSkillLabel for same underlying data', () => {
    for (let storedLevel = 1; storedLevel <= 10; storedLevel++) {
      const analyticsLevel = storedLevel * 10;
      const fromHelpers = getSkillLabel(storedLevel);
      const fromRadar = radarGetSkillLabel(analyticsLevel);
      assert.equal(
        fromHelpers,
        fromRadar,
        `Stored level ${storedLevel} → helpers="${fromHelpers}", radar(${analyticsLevel})="${fromRadar}"`,
      );
    }
  });

  it('getSkillLevelLabel returns matching label + description', () => {
    const result = getSkillLevelLabel(8);
    assert.equal(result.label, 'Excellent');
    assert.equal(typeof result.description, 'string');
    assert.ok(result.description.length > 0);
  });

  // ─── Coach input ×2 → storage ─────────────────────────────────────────────

  it('updateFromPositionRate multiplies 1-5 ratings by 2 for storage', async () => {
    const coachRatings: SessionSkillRating[] = [
      { skill: 'Passing', rating: 2, label: 'Good', trend: 'consistent' },
      { skill: 'Work Rate', rating: 4, label: 'Excellent', trend: 'consistent' },
      { skill: 'Communication', rating: 5, label: 'Exceptional', trend: 'consistent' },
    ];

    const result = await progressSkillsService.updateFromPositionRate(
      'athlete_di_1', 'session_di_1', 'coach_di_1', 'MID', coachRatings,
    );

    assert.equal(result.success, true);
    if (!result.success) return;

    const levels = await progressSkillsService.getAthleteSkillLevels('athlete_di_1');
    assert.ok(levels);
    assert.equal(levels!.skills.Passing.level, 4, 'Coach rated 2 → stored as 4');
    assert.equal(levels!.skills['Work Rate'].level, 8, 'Coach rated 4 → stored as 8');
    assert.equal(levels!.skills.Communication.level, 10, 'Coach rated 5 → stored as 10');
  });

  it('stored levels produce correct display labels for parent', async () => {
    const coachRatings: SessionSkillRating[] = [
      { skill: 'Passing', rating: 2, label: 'Good', trend: 'consistent' },
    ];
    await progressSkillsService.updateFromPositionRate(
      'athlete_di_2', 'session_di_2', 'coach_di_2', 'MID', coachRatings,
    );

    const levels = await progressSkillsService.getAthleteSkillLevels('athlete_di_2');
    assert.ok(levels);
    const storedLevel = levels!.skills.Passing.level;

    const label = getSkillLabel(storedLevel);
    const dots = Math.ceil(storedLevel / 2);
    const analyticsLevel = storedLevel * 10;
    const radarLabel = radarGetSkillLabel(analyticsLevel);
    const fifaScore = toFifaScore(storedLevel);

    assert.equal(label, 'Good', 'Progress page label');
    assert.equal(dots, 2, 'Pentagon dots');
    assert.equal(radarLabel, 'Good', 'Analytics radar label');
    assert.ok(fifaScore >= 20 && fifaScore <= 99, `FIFA score ${fifaScore} in range`);
  });

  // ─── Feedback path: ratings stay 1-5 in feedback, ×2 in skill levels ──────

  it('createFeedbackFromQuickRate stores 1-5 in feedback AND 1-10 in skill levels', async () => {
    const quickRateInput: QuickRateInput = {
      athleteId: 'athlete_di_3',
      athleteName: 'Test Athlete',
      sessionId: 'session_di_3',
      coachId: 'coach_di_3',
      effort: 4,
      positionPlayed: 'ATT',
      positionSkillRatings: [
        { skill: 'Passing', rating: 3, label: 'Very Good', trend: 'consistent' },
        { skill: 'Ball Carrying', rating: 5, label: 'Exceptional', trend: 'improving' },
      ],
      technical: 4,
      physical: 3,
      psychological: 3,
      social: 3,
    };

    const feedbackResult = await progressFeedbackService.createFeedbackFromQuickRate(
      quickRateInput, 'Coach Dave', 'Test Athlete',
    );
    assert.equal(feedbackResult.success, true);
    if (!feedbackResult.success) return;

    // Feedback stores ratings as 1-5 (coach's raw input)
    const feedback = feedbackResult.data;
    for (const sr of feedback.skillRatings) {
      assert.ok(
        sr.rating >= 1 && sr.rating <= 5,
        `Feedback rating for ${sr.skill} = ${sr.rating}, should be 1-5`,
      );
    }

    // Skill levels stored as 1-10 (×2 applied)
    const levels = await progressSkillsService.getAthleteSkillLevels('athlete_di_3');
    assert.ok(levels);
    assert.equal(levels!.skills.Passing.level, 6, 'Rating 3 × 2 = 6 in skill levels');
    assert.equal(levels!.skills['Ball Carrying'].level, 10, 'Rating 5 × 2 = 10 in skill levels');
  });

  // ─── Cross-scale consistency: same data, every display path ────────────────

  it('all display paths agree for every possible coach rating', () => {
    const coachToStored = [2, 4, 6, 8, 10];

    for (let i = 0; i < coachToStored.length; i++) {
      const coachDots = i + 1;
      const stored = coachToStored[i];
      const analytics = stored * 10;
      const expectedLabel = EXPECTED_LABELS[i];

      const canonical = RATING_LABELS[coachDots as 1 | 2 | 3 | 4 | 5];
      assert.equal(canonical, expectedLabel, `RATING_LABELS[${coachDots}]`);

      const progressLabel = getSkillLabel(stored);
      assert.equal(progressLabel, expectedLabel, `getSkillLabel(${stored})`);

      const radarLabel = radarGetSkillLabel(analytics);
      assert.equal(radarLabel, expectedLabel, `radarGetSkillLabel(${analytics})`);

      const pentagonDots = Math.ceil(stored / 2);
      assert.equal(pentagonDots, coachDots, `Pentagon dots for stored ${stored}`);

      const fifa = toFifaScore(stored);
      assert.ok(fifa >= 20 && fifa <= 99, `FIFA score ${fifa} for stored ${stored}`);
    }
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  it('boundary levels produce correct labels (no off-by-one)', () => {
    assert.equal(getSkillLabel(1), 'Developing');
    assert.equal(getSkillLabel(2), 'Developing');
    assert.equal(getSkillLabel(3), 'Good');
    assert.equal(getSkillLabel(10), 'Exceptional');
  });

  it('radar boundary values produce correct labels (no off-by-one)', () => {
    assert.equal(radarGetSkillLabel(0), 'Developing');
    assert.equal(radarGetSkillLabel(20), 'Developing', '20 = stored level 2 → Developing');
    assert.equal(radarGetSkillLabel(21), 'Good', '21 crosses into Good');
    assert.equal(radarGetSkillLabel(40), 'Good', '40 = stored level 4 → Good');
    assert.equal(radarGetSkillLabel(80), 'Excellent', '80 = stored level 8 → Excellent');
    assert.equal(radarGetSkillLabel(81), 'Exceptional', '81 crosses into Exceptional');
    assert.equal(radarGetSkillLabel(100), 'Exceptional');
  });

  it('FIFA score increases monotonically with stored level', () => {
    let previous = 0;
    for (let level = 1; level <= 10; level++) {
      const fifa = toFifaScore(level);
      assert.ok(fifa > previous, `FIFA(${level})=${fifa} > FIFA(${level - 1})=${previous}`);
      previous = fifa;
    }
  });

  // ─── ALL THREE label systems must agree ────────────────────────────────────

  it('radarGetSkillColor returns defined colors at every boundary', () => {
    for (let level = 0; level <= 100; level += 10) {
      const color = radarGetSkillColor(level);
      assert.ok(color, `radarGetSkillColor(${level}) should be defined`);
      assert.ok(color.startsWith('#'), `radarGetSkillColor(${level})="${color}" should be hex`);
    }
  });

  // ─── Second session update: trend detection ────────────────────────────────

  it('second rating produces correct trend and level', async () => {
    // Session 1: Coach rates Passing = 2 dots → stored level 4
    const first: SessionSkillRating[] = [
      { skill: 'Passing', rating: 2, label: 'Good', trend: 'consistent' },
    ];
    await progressSkillsService.updateFromPositionRate(
      'athlete_di_4', 'session_di_4a', 'coach_di_4', 'MID', first,
    );
    const after1 = await progressSkillsService.getAthleteSkillLevels('athlete_di_4');
    assert.equal(after1!.skills.Passing.level, 4);
    assert.equal(after1!.skills.Passing.trend, 'consistent');

    // Session 2: Coach rates Passing = 4 dots → stored level 8
    const second: SessionSkillRating[] = [
      { skill: 'Passing', rating: 4, label: 'Excellent', trend: 'improving' },
    ];
    await progressSkillsService.updateFromPositionRate(
      'athlete_di_4', 'session_di_4b', 'coach_di_4', 'MID', second,
    );
    const after2 = await progressSkillsService.getAthleteSkillLevels('athlete_di_4');
    assert.equal(after2!.skills.Passing.level, 8, 'Second session stored level');
    assert.equal(after2!.skills.Passing.previousLevel, 4, 'Previous level preserved');
    assert.equal(after2!.skills.Passing.trend, 'improving', 'Trend detected');

    // Verify display label changed correctly
    assert.equal(getSkillLabel(after2!.skills.Passing.level), 'Excellent');
    assert.equal(getSkillLabel(after2!.skills.Passing.previousLevel!), 'Good');
  });

  // ─── Bug 15: Attendance reads actual coach marks ────────────────────────────

  it('upsertCompletedBookingSessions uses actual attendance from SESSION_ATTENDANCE', async () => {
    // Simulate what use-session-completion writes: coach marks athlete as NO_SHOW
    const attendanceData: SessionAttendance = {
      bookingId: 'booking_att_1',
      records: [
        { athleteId: 'athlete_att_1', status: 'NO_SHOW' },
        { athleteId: 'athlete_att_2', status: 'ATTENDED', effortRating: 4 },
      ],
      completedAt: new Date().toISOString(),
      completedBy: 'coach_att_1',
    };
    await apiClient.set(
      `${STORAGE_KEYS.SESSION_ATTENDANCE}_booking_att_1`,
      attendanceData,
    );

    // Now trigger the same path booking-crud-service would trigger
    const booking = {
      id: 'booking_att_1',
      coachId: 'coach_att_1',
      athleteId: 'athlete_att_1',
      athleteIds: ['athlete_att_1', 'athlete_att_2'],
      status: 'COMPLETED' as const,
      scheduledAt: new Date().toISOString(),
      coachName: 'Test Coach',
      objectives: [],
    } as unknown as Booking;

    const result = await progressAttendanceService.upsertCompletedBookingSessions(booking);
    assert.equal(result.success, true);
    if (!result.success) return;

    // Verify the created sessions have correct attendance
    const sessions = await apiClient.get<Array<{ athleteId: string; attendance: string }>>(
      STORAGE_KEYS.COACH_SESSIONS,
      [],
    );

    const absentSession = sessions.find((s) => s.athleteId === 'athlete_att_1');
    const presentSession = sessions.find((s) => s.athleteId === 'athlete_att_2');

    assert.equal(absentSession?.attendance, 'NO_SHOW', 'Absent athlete should have NO_SHOW');
    assert.equal(presentSession?.attendance, 'ATTENDED', 'Present athlete should have ATTENDED');
  });

  it('upsertCompletedBookingSessions reads group session attendance via groupSessionId', async () => {
    // For group sessions, attendance is keyed by groupSessionId, not booking ID
    const attendanceData: SessionAttendance = {
      bookingId: 'group_att_1',
      records: [{ athleteId: 'athlete_grp_1', status: 'NO_SHOW' }],
      completedAt: new Date().toISOString(),
      completedBy: 'coach_grp_1',
    };
    await apiClient.set(
      `${STORAGE_KEYS.SESSION_ATTENDANCE}_group_att_1`,
      attendanceData,
    );

    const booking = {
      id: 'booking_grp_linked',
      groupSessionId: 'group_att_1',
      coachId: 'coach_grp_1',
      athleteId: 'athlete_grp_1',
      athleteIds: ['athlete_grp_1'],
      status: 'COMPLETED' as const,
      scheduledAt: new Date().toISOString(),
      coachName: 'Group Coach',
      objectives: [],
    } as unknown as Booking;

    const result = await progressAttendanceService.upsertCompletedBookingSessions(booking);
    assert.equal(result.success, true);

    const sessions = await apiClient.get<Array<{ athleteId: string; attendance: string }>>(
      STORAGE_KEYS.COACH_SESSIONS,
      [],
    );
    const session = sessions.find((s) => s.athleteId === 'athlete_grp_1');
    assert.equal(session?.attendance, 'NO_SHOW', 'Group attendance should use groupSessionId lookup');
  });

  it('upsertCompletedBookingSessions defaults to ATTENDED when no attendance record exists', async () => {
    // No SESSION_ATTENDANCE written — fallback to ATTENDED (backwards compatible)
    const booking = {
      id: 'booking_att_fallback',
      coachId: 'coach_att_fb',
      athleteId: 'athlete_att_fb',
      athleteIds: ['athlete_att_fb'],
      status: 'COMPLETED' as const,
      scheduledAt: new Date().toISOString(),
      coachName: 'Fallback Coach',
      objectives: [],
    } as unknown as Booking;

    await progressAttendanceService.upsertCompletedBookingSessions(booking);

    const sessions = await apiClient.get<Array<{ athleteId: string; attendance: string }>>(
      STORAGE_KEYS.COACH_SESSIONS,
      [],
    );
    const session = sessions.find((s) => s.athleteId === 'athlete_att_fb');
    assert.equal(session?.attendance, 'ATTENDED', 'Should default to ATTENDED when no record exists');
  });

  // ─── Bug 16: overallPerformance distinct from per-athlete effort ────────────

  it('createFeedbackFromQuickRate uses overallPerformance when provided', async () => {
    const input: QuickRateInput = {
      athleteId: 'athlete_op_1',
      athleteName: 'OP Athlete',
      sessionId: 'session_op_1',
      coachId: 'coach_op_1',
      effort: 3,
      overallPerformance: 5,
    };

    const result = await progressFeedbackService.createFeedbackFromQuickRate(
      input,
      'Coach OP',
      'OP Athlete',
    );
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data.effortRating, 3, 'Per-athlete effort should be 3');
    assert.equal(result.data.overallPerformance, 5, 'Session-wide performance should be 5, not fallback to effort');
  });

  // ─── Bug 23: Trend detects recent decline ──────────────────────────────────

  it('trend shows declining when skill drops from previous session', async () => {
    // Session 1: Passing = 2 dots → stored as level 4
    await progressSkillsService.updateSkillLevel('athlete_trend_1', 'Passing', 4, 'coach_t1');
    // Session 2: Passing = 4 dots → stored as level 8
    const s2 = await progressSkillsService.updateSkillLevel('athlete_trend_1', 'Passing', 8, 'coach_t1');
    assert.equal(s2.trend, 'improving', 'Session 2: 4→8 should be improving');
    // Session 3: Passing = 3 dots → stored as level 6 (dropped from 8)
    const s3 = await progressSkillsService.updateSkillLevel('athlete_trend_1', 'Passing', 6, 'coach_t1');
    assert.equal(s3.trend, 'declining', 'Session 3: 8→6 should be declining, not improving');
    assert.equal(s3.level, 6);
    assert.equal(s3.previousLevel, 8);
  });

  it('trend shows consistent when level stays the same', async () => {
    await progressSkillsService.updateSkillLevel('athlete_trend_2', 'Passing', 6, 'coach_t2');
    await progressSkillsService.updateSkillLevel('athlete_trend_2', 'Passing', 6, 'coach_t2');
    const s3 = await progressSkillsService.updateSkillLevel('athlete_trend_2', 'Passing', 6, 'coach_t2');
    assert.equal(s3.trend, 'consistent', '6→6→6 should be consistent');
  });

  // ─── Bug 25: Input validation on updateSkillLevel ───────────────────────────

  it('updateSkillLevel clamps NaN to valid range', async () => {
    const result = await progressSkillsService.updateSkillLevel('athlete_val_1', 'Passing', NaN, 'coach_v1');
    assert.equal(result.level, 5, 'NaN should default to midpoint 5');
  });

  it('updateSkillLevel clamps negative level to 1', async () => {
    const result = await progressSkillsService.updateSkillLevel('athlete_val_2', 'Passing', -3, 'coach_v2');
    assert.equal(result.level, 1, 'Negative level should clamp to 1');
  });

  it('updateSkillLevel clamps level > 10 to 10', async () => {
    const result = await progressSkillsService.updateSkillLevel('athlete_val_3', 'Passing', 100, 'coach_v3');
    assert.equal(result.level, 10, 'Level 100 should clamp to 10');
  });

  it('updateSkillLevel clamps zero to 1', async () => {
    const result = await progressSkillsService.updateSkillLevel('athlete_val_4', 'Passing', 0, 'coach_v4');
    assert.equal(result.level, 1, 'Level 0 should clamp to 1');
  });

  // ─── FIFA score boundaries ─────────────────────────────────────────────────

  it('FIFA score: level 1 → 20, level 10 → 99', () => {
    assert.equal(toFifaScore(1), 20, 'Min stored level → FIFA 20');
    assert.equal(toFifaScore(10), 99, 'Max stored level → FIFA 99');
    assert.equal(toFifaScore(0), 20, 'Level 0 → clamped to FIFA 20');
    assert.equal(toFifaScore(-1), 20, 'Negative → clamped to FIFA 20');
    assert.equal(toFifaScore(11), 99, 'Level 11 → clamped to FIFA 99');
  });

  // ─── Bug 27: fourCorners preserved during upsert ────────────────────────────

  it('addSessionFeedback preserves fourCorners when not supplied by caller', async () => {
    // First write: quick-rate with fourCorners
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session_fc_1',
      coachId: 'coach_fc_1',
      coachName: 'FC Coach',
      athleteId: 'athlete_fc_1',
      athleteName: 'FC Athlete',
      publicSummary: 'Initial feedback',
      skillsWorkedOn: [],
      skillRatings: [],
      improvements: '',
      homework: '',
      effortRating: 3,
      overallPerformance: 4,
      visibility: 'parent',
      fourCorners: { technical: 4, physical: 3, psychological: 3, social: 5 },
      positionPlayed: 'MID',
    });

    // Second write: dev screen edit without fourCorners or positionPlayed
    await progressFeedbackService.addSessionFeedback({
      sessionId: 'session_fc_1',
      coachId: 'coach_fc_1',
      coachName: 'FC Coach',
      athleteId: 'athlete_fc_1',
      athleteName: 'FC Athlete',
      publicSummary: 'Updated feedback',
      skillsWorkedOn: ['Passing'],
      skillRatings: [],
      improvements: 'Better passing',
      homework: 'Practice corners',
      effortRating: 4,
      overallPerformance: 4,
      visibility: 'parent',
      // fourCorners and positionPlayed intentionally omitted
    });

    // Verify fourCorners and positionPlayed survived the upsert
    const allFeedback = await apiClient.get<Array<{ sessionId: string; athleteId: string; fourCorners?: unknown; positionPlayed?: string; publicSummary: string }>>(
      STORAGE_KEYS.SESSION_FEEDBACK,
      [],
    );
    const fb = allFeedback.find((f) => f.sessionId === 'session_fc_1' && f.athleteId === 'athlete_fc_1');
    assert.ok(fb, 'Feedback should exist');
    assert.equal(fb!.publicSummary, 'Updated feedback', 'Summary should be updated');
    assert.deepEqual(fb!.fourCorners, { technical: 4, physical: 3, psychological: 3, social: 5 }, 'fourCorners should be preserved');
    assert.equal(fb!.positionPlayed, 'MID', 'positionPlayed should be preserved');
  });

  // ─── Bug 22: Quick-rate visibility passthrough ──────────────────────────────

  it('createFeedbackFromQuickRate uses visibility from input', async () => {
    const input: QuickRateInput = {
      athleteId: 'athlete_vis_1',
      athleteName: 'Vis Athlete',
      sessionId: 'session_vis_1',
      coachId: 'coach_vis_1',
      effort: 4,
      visibility: 'parent',
    };

    const result = await progressFeedbackService.createFeedbackFromQuickRate(
      input,
      'Vis Coach',
      'Vis Athlete',
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.visibility, 'parent', 'Visibility should be parent when coach enables sharing');
  });

  it('createFeedbackFromQuickRate defaults to athlete when no visibility provided', async () => {
    const input: QuickRateInput = {
      athleteId: 'athlete_vis_2',
      athleteName: 'Vis2 Athlete',
      sessionId: 'session_vis_2',
      coachId: 'coach_vis_2',
      effort: 4,
      // visibility intentionally omitted
    };

    const result = await progressFeedbackService.createFeedbackFromQuickRate(
      input,
      'Vis2 Coach',
      'Vis2 Athlete',
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.visibility, 'athlete', 'Visibility should default to athlete');
  });
});
