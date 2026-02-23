/**
 * Progress Feedback Service
 *
 * Handles session feedback and session notes: create, read, filter
 * with role-based visibility control.
 *
 * API Integration Notes:
 * - Feedback and notes are persisted via apiClient (AsyncStorage in dev, API in prod)
 */

import { apiClient } from '../api-client';
import { createLogger } from '@/utils/logger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { progressSkillsService } from './progress-skills-service';
import { computeFourCorners } from '@/constants/position-skills';
import { err, ok, type Result, type ServiceError } from '@/types/result';
import type {
  FourCornerKey,
  FourCornerRatings,
  PositionRole,
  QuickRateInput,
  SubSkillRating,
} from '@/types/progress-types';

const logger = createLogger('ProgressFeedbackService');

// ============================================================================
// TYPES
// ============================================================================

export interface SessionFeedback {
  id: string;
  sessionId: string;
  bookingId?: string;
  sessionTemplateId?: string;
  sessionTemplateName?: string;
  sessionTitle?: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  createdAt: string;
  updatedAt?: string;
  // Coach-visible fields
  privateNotes?: string;
  // Parent/Athlete-visible fields
  publicSummary: string;
  skillsWorkedOn: string[];
  skillRatings: { skill: string; rating: number; previousRating?: number }[];
  improvements: string;
  homework: string;
  effortRating: number; // 1-5
  overallPerformance: number; // 1-5
  videoClipUrls?: string[];
  photoUrls?: string[];
  badgeAwarded?: string;
  fourCorners?: FourCornerRatings;
  positionPlayed?: PositionRole;
  /** Multi-position selection (new). Takes priority over positionPlayed when present. */
  positionsPlayed?: PositionRole[];
  /** Sub-skill ratings (new). When present, parent ratings are derived from these. */
  subSkillRatings?: SubSkillRating[];
  // Visibility
  visibility: 'coach_only' | 'parent' | 'athlete';
}

export type SessionNoteFields = {
  summary: string;
  focus: string[];
  improvements: string;
  homework: string;
  effort: number;
  attendance: string;
  videoUrls?: string[];
  imageUrls?: string[];
};

export type SessionNoteRecord = SessionNoteFields & {
  updatedAt: string;
};

// ============================================================================
// SESSION FEEDBACK MANAGEMENT
// ============================================================================

function generateQuickRateSummary(
  corners: FourCornerRatings,
  previousCorners: FourCornerRatings | null,
  attendeeCount: number,
): string {
  const improved: string[] = [];
  const cornerLabels: Record<FourCornerKey, string> = {
    technical: 'technical skills',
    physical: 'physical performance',
    psychological: 'mental game',
    social: 'game awareness',
  };

  if (previousCorners) {
    for (const key of Object.keys(corners) as FourCornerKey[]) {
      if (corners[key] > previousCorners[key]) {
        improved.push(cornerLabels[key]);
      }
    }
  }

  if (improved.length > 0) {
    const list =
      improved.length === 1
        ? improved[0]
        : `${improved.slice(0, -1).join(', ')} and ${improved[improved.length - 1]}`;
    return `Good progress in ${list} today.`;
  }

  return `Session completed with ${attendeeCount} ${attendeeCount === 1 ? 'athlete' : 'athletes'}.`;
}

async function getAllSessionFeedback(): Promise<SessionFeedback[]> {
  return apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []);
}

async function addSessionFeedback(
  feedback: Omit<SessionFeedback, 'id' | 'createdAt'>,
  options?: { skipSkillUpdate?: boolean },
): Promise<SessionFeedback> {
  const allFeedback = await getAllSessionFeedback();

  // Upsert by athlete+session to avoid stacking duplicate feedback entries when coaches re-save.
  const existingIndex = allFeedback.findIndex(
    (entry) => entry.athleteId === feedback.athleteId && entry.sessionId === feedback.sessionId,
  );
  const now = new Date().toISOString();
  const previousFeedback = existingIndex >= 0 ? allFeedback[existingIndex] : null;
  const nextFeedback: SessionFeedback = previousFeedback
    ? {
        ...previousFeedback,
        ...feedback,
        // Preserve position data when caller doesn't supply it (e.g. dev screen edits)
        fourCorners: feedback.fourCorners ?? previousFeedback.fourCorners,
        positionPlayed: feedback.positionPlayed ?? previousFeedback.positionPlayed,
        positionsPlayed: feedback.positionsPlayed ?? previousFeedback.positionsPlayed,
        subSkillRatings: feedback.subSkillRatings ?? previousFeedback.subSkillRatings,
        id: previousFeedback.id,
        createdAt: previousFeedback.createdAt,
        updatedAt: now,
      }
    : {
        ...feedback,
        id: `feedback_${Date.now()}`,
        createdAt: now,
      };

  // Update skill levels based on ratings (skip when caller already wrote skills)
  const shouldUpdateSkills =
    !options?.skipSkillUpdate &&
    feedback.skillRatings.length > 0 &&
    JSON.stringify(previousFeedback?.skillRatings ?? []) !== JSON.stringify(feedback.skillRatings);

  if (shouldUpdateSkills) {
    await progressSkillsService.updateMultipleSkillLevels(
      feedback.athleteId,
      feedback.skillRatings.map((r) => ({
        skill: r.skill,
        level: Math.max(1, Math.min(10, r.rating * 2)),
      })),
      feedback.coachId,
    );
  }

  if (existingIndex >= 0) {
    allFeedback.splice(existingIndex, 1);
  }
  allFeedback.unshift(nextFeedback);
  await apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, allFeedback);

  logger.info(existingIndex >= 0 ? 'session_feedback_updated' : 'session_feedback_added', {
    feedbackId: nextFeedback.id,
    sessionId: feedback.sessionId,
    athleteId: feedback.athleteId,
    coachId: feedback.coachId,
    skillCount: feedback.skillRatings?.length ?? 0,
    updated: existingIndex >= 0,
  });

  return nextFeedback;
}

async function getSessionFeedback(sessionId: string): Promise<SessionFeedback | null> {
  const allFeedback = await getAllSessionFeedback();
  return allFeedback.find((f) => f.sessionId === sessionId) ?? null;
}

async function getFeedbackForAthlete(
  athleteId: string,
  viewerRole: 'coach' | 'parent' | 'athlete',
  limit?: number,
): Promise<SessionFeedback[]> {
  const allFeedback = await getAllSessionFeedback();
  let filtered = allFeedback.filter((f) => f.athleteId === athleteId);

  // Filter based on visibility
  if (viewerRole === 'parent') {
    filtered = filtered.filter((f) => f.visibility !== 'coach_only');
    // Remove private notes for parents
    filtered = filtered.map((f) => ({ ...f, privateNotes: undefined }));
  } else if (viewerRole === 'athlete') {
    // Athlete should see "Athlete Only" and "Parents & Athlete" entries.
    filtered = filtered.filter((f) => f.visibility !== 'coach_only');
    // Remove private notes for athletes
    filtered = filtered.map((f) => ({ ...f, privateNotes: undefined }));
  }

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

async function getLatestForAthlete(
  athleteId: string,
  sessionId?: string,
): Promise<SessionFeedback | null> {
  const allFeedback = await getFeedbackForAthlete(athleteId, 'coach');
  const filtered = sessionId
    ? allFeedback.filter((feedback) => feedback.sessionId === sessionId)
    : allFeedback;

  const sorted = filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return sorted[0] ?? null;
}

async function getPreviousCorners(
  athleteId: string,
  coachId: string,
): Promise<FourCornerRatings | null> {
  const allFeedback = await getFeedbackForAthlete(athleteId, 'coach');
  const withCorners = allFeedback
    .filter((feedback) => feedback.coachId === coachId && feedback.fourCorners)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return withCorners[0]?.fourCorners ?? null;
}

async function createFeedbackFromQuickRate(
  input: QuickRateInput,
  coachName: string,
  athleteName: string,
  options?: { skillsAlreadyWritten?: boolean },
): Promise<Result<SessionFeedback, ServiceError>> {
  try {
    const positionSkillRatings = (input.positionSkillRatings ?? [])
      .filter((entry) => Boolean(entry?.skill))
      .map((entry) => ({
        ...entry,
        rating: Math.max(1, Math.min(5, Math.round(entry.rating))) as 1 | 2 | 3 | 4 | 5,
      }));

    const fourCorners: FourCornerRatings =
      input.positionPlayed && positionSkillRatings.length > 0
        ? computeFourCorners(positionSkillRatings)
        : {
            technical: Math.max(1, Math.min(5, Math.round(input.technical ?? 3))),
            physical: Math.max(1, Math.min(5, Math.round(input.physical ?? 3))),
            psychological: Math.max(1, Math.min(5, Math.round(input.psychological ?? 3))),
            social: Math.max(1, Math.min(5, Math.round(input.social ?? 3))),
          };
    const previousCorners = await getPreviousCorners(input.athleteId, input.coachId);
    const latestForSession = await getLatestForAthlete(input.athleteId, input.sessionId);
    const existingForSession =
      latestForSession?.coachId === input.coachId ? latestForSession : null;

    const cornerSkillsWorkedOn = (Object.keys(fourCorners) as FourCornerKey[]).filter((key) =>
      previousCorners ? fourCorners[key] !== previousCorners[key] : true,
    );
    const focusSkills = Array.from(
      new Set(
        (input.focusSkills ?? [])
          .map((skill) => skill.trim())
          .filter((skill) => skill.length > 0),
      ),
    );
    const generatedSummary = generateQuickRateSummary(fourCorners, previousCorners, 1);
    const summaryToSave = existingForSession?.publicSummary?.trim()
      ? existingForSession.publicSummary
      : generatedSummary;
    const nextSkillRatings =
      positionSkillRatings.length > 0
        ? positionSkillRatings.map((entry) => ({
            skill: entry.skill,
            rating: entry.rating,
            previousRating: entry.previousRating,
          }))
        : (existingForSession?.skillRatings ?? []);

    const feedback = await addSessionFeedback({
      sessionId: input.sessionId,
      bookingId: existingForSession?.bookingId,
      coachId: existingForSession?.coachId ?? input.coachId,
      coachName: existingForSession?.coachName ?? coachName,
      athleteId: input.athleteId,
      athleteName: existingForSession?.athleteName ?? athleteName,
      publicSummary: summaryToSave,
      skillsWorkedOn:
        existingForSession?.skillsWorkedOn && existingForSession.skillsWorkedOn.length > 0
          ? existingForSession.skillsWorkedOn
          : focusSkills.length > 0
            ? focusSkills
            : positionSkillRatings.length > 0
              ? positionSkillRatings.map((entry) => entry.skill)
            : cornerSkillsWorkedOn,
      skillRatings: nextSkillRatings,
      improvements: existingForSession?.improvements ?? '',
      homework: existingForSession?.homework ?? '',
      effortRating: Number.isFinite(input.effort) ? Math.max(1, Math.min(5, Math.round(input.effort))) : 3,
      overallPerformance: existingForSession?.overallPerformance
        ?? (input.overallPerformance != null && Number.isFinite(input.overallPerformance) ? Math.max(1, Math.min(5, Math.round(input.overallPerformance as number))) : undefined)
        ?? (Number.isFinite(input.effort) ? Math.max(1, Math.min(5, Math.round(input.effort))) : 3),
      videoClipUrls: input.mediaIds?.length
        ? input.mediaIds
        : (existingForSession?.videoClipUrls ?? []),
      photoUrls: existingForSession?.photoUrls,
      badgeAwarded: input.badgeId ?? existingForSession?.badgeAwarded,
      privateNotes: existingForSession?.privateNotes,
      visibility: existingForSession?.visibility ?? input.visibility ?? 'athlete',
      fourCorners,
      positionPlayed: input.positionPlayed ?? existingForSession?.positionPlayed,
      positionsPlayed: input.positionsPlayed ?? existingForSession?.positionsPlayed,
      subSkillRatings: input.subSkillRatings ?? existingForSession?.subSkillRatings,
      sessionTemplateId: existingForSession?.sessionTemplateId ?? input.sessionTemplateId,
      sessionTemplateName: existingForSession?.sessionTemplateName ?? input.sessionTemplateName,
      sessionTitle: existingForSession?.sessionTitle ?? input.sessionTitle,
    }, { skipSkillUpdate: options?.skillsAlreadyWritten });

    // Position recording handled by caller (use-session-completion.ts step 3b)
    // to avoid duplicate POSITION_HISTORY entries.

    logger.info('quick_rate_feedback_saved', {
      feedbackId: feedback.id,
      sessionId: input.sessionId,
      athleteId: input.athleteId,
      coachId: input.coachId,
    });

    return ok(feedback);
  } catch (error) {
    logger.error('Failed to create feedback from quick rate', error);
    return err({
      code: 'STORAGE',
      message: 'Failed to save quick rate feedback',
      details: error,
    });
  }
}

// ============================================================================
// SESSION NOTES MANAGEMENT
// ============================================================================

async function getAllSessionNotes(): Promise<Record<string, SessionNoteRecord>> {
  return apiClient.get<Record<string, SessionNoteRecord>>(STORAGE_KEYS.SESSION_NOTES, {});
}

async function getSessionNote(bookingId: string): Promise<SessionNoteRecord | null> {
  const notes = await getAllSessionNotes();
  return notes[bookingId] ?? null;
}

async function saveSessionNote(
  bookingId: string,
  payload: SessionNoteFields,
): Promise<SessionNoteRecord> {
  const existing = await getAllSessionNotes();
  const record: SessionNoteRecord = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };

  await apiClient.set(STORAGE_KEYS.SESSION_NOTES, { ...existing, [bookingId]: record });

  logger.info('session_note_saved', {
    bookingId,
    focusAreas: payload.focus.length,
    videoCount: payload.videoUrls?.length ?? 0,
    imageCount: payload.imageUrls?.length ?? 0,
  });

  return record;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const progressFeedbackService = {
  addSessionFeedback,
  getSessionFeedback,
  getFeedbackForAthlete,
  getLatestForAthlete,
  getPreviousCorners,
  createFeedbackFromQuickRate,
  getSessionNote,
  saveSessionNote,
};
