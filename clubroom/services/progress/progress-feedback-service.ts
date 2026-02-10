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

const logger = createLogger('ProgressFeedbackService');

// ============================================================================
// TYPES
// ============================================================================

export interface SessionFeedback {
  id: string;
  sessionId: string;
  bookingId?: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  createdAt: string;
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
  badgeAwarded?: string;
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
};

export type SessionNoteRecord = SessionNoteFields & {
  updatedAt: string;
};

// ============================================================================
// SESSION FEEDBACK MANAGEMENT
// ============================================================================

async function getAllSessionFeedback(): Promise<SessionFeedback[]> {
  return apiClient.get<SessionFeedback[]>(STORAGE_KEYS.SESSION_FEEDBACK, []);
}

async function addSessionFeedback(feedback: Omit<SessionFeedback, 'id' | 'createdAt'>): Promise<SessionFeedback> {
  const allFeedback = await getAllSessionFeedback();

  const newFeedback: SessionFeedback = {
    ...feedback,
    id: `feedback_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  // Update skill levels based on ratings
  if (feedback.skillRatings && feedback.skillRatings.length > 0) {
    await progressSkillsService.updateMultipleSkillLevels(
      feedback.athleteId,
      feedback.skillRatings.map(r => ({ skill: r.skill, level: r.rating })),
      feedback.coachId
    );
  }

  allFeedback.unshift(newFeedback);
  await apiClient.set(STORAGE_KEYS.SESSION_FEEDBACK, allFeedback);

  logger.info('session_feedback_added', {
    feedbackId: newFeedback.id,
    sessionId: feedback.sessionId,
    athleteId: feedback.athleteId,
    coachId: feedback.coachId,
    skillCount: feedback.skillRatings?.length ?? 0,
  });

  return newFeedback;
}

async function getSessionFeedback(sessionId: string): Promise<SessionFeedback | null> {
  const allFeedback = await getAllSessionFeedback();
  return allFeedback.find(f => f.sessionId === sessionId) ?? null;
}

async function getFeedbackForAthlete(
  athleteId: string,
  viewerRole: 'coach' | 'parent' | 'athlete',
  limit?: number
): Promise<SessionFeedback[]> {
  const allFeedback = await getAllSessionFeedback();
  let filtered = allFeedback.filter(f => f.athleteId === athleteId);

  // Filter based on visibility
  if (viewerRole === 'parent') {
    filtered = filtered.filter(f => f.visibility !== 'coach_only');
    // Remove private notes for parents
    filtered = filtered.map(f => ({ ...f, privateNotes: undefined }));
  } else if (viewerRole === 'athlete') {
    filtered = filtered.filter(f => f.visibility === 'athlete');
    // Remove private notes for athletes
    filtered = filtered.map(f => ({ ...f, privateNotes: undefined }));
  }

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  return filtered;
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
  payload: SessionNoteFields
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
  getSessionNote,
  saveSessionNote,
};
