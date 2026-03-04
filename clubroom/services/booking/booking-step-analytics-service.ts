import { STORAGE_KEYS } from '@/constants/storage-keys';
import { normalizeUserRole } from '@/constants/user-types';
import { apiClient } from '@/services/api-client';
import type { BookingDraft } from '@/services/booking-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingStepAnalyticsService');

const MAX_BOOKING_STEP_EVENTS = 2000;

export type BookingFlowStep = 'type' | 'schedule' | 'details' | 'review' | 'confirm';
export type BookingFlowStatus = 'success' | 'validation_fail' | 'conflict_fail' | 'abandoned';
export type BookingFlowRole = 'parent' | 'athlete' | 'coach' | 'admin';

type BookingDraftAnalyticsContext = Pick<
  BookingDraft,
  | 'entrySource'
  | 'sessionSource'
  | 'actingAs'
  | 'childId'
  | 'coachId'
  | 'ownerCoachId'
  | 'assigneeCoachId'
  | 'clubId'
>;

export interface BookingStepAnalyticsEvent {
  id: string;
  createdAt: string;
  source: string;
  role: BookingFlowRole;
  actingAs: 'self' | 'club';
  step: BookingFlowStep;
  status: BookingFlowStatus;
  failure_code: string | null;
  coachId?: string;
  ownerCoachId?: string;
  assigneeCoachId?: string;
  clubId?: string;
}

export interface TrackBookingStepParams {
  step: BookingFlowStep;
  status: BookingFlowStatus;
  failure_code?: string;
  source?: string;
  role?: string;
  currentUserId?: string;
  hasChildren?: boolean;
  actingAs?: 'self' | 'club';
  draft?: Partial<BookingDraftAnalyticsContext>;
}

function normalizeSource(
  source?: string,
  sessionSource?: BookingDraft['sessionSource'],
): string {
  const normalized = source?.trim().toLowerCase();
  if (normalized) {
    if (normalized.includes('map')) return 'map';
    if (normalized.includes('discover_sessions')) return 'discover_sessions';
    if (normalized.includes('discover')) return 'discover_feed';
    if (normalized.includes('invite')) return 'invite_detail';
    if (normalized.includes('session_detail_modal')) return 'session_detail_modal';
    if (normalized.includes('recurring')) return 'recurring';
    return normalized;
  }

  if (sessionSource === 'event') return 'invite_detail';
  if (sessionSource === 'group') return 'discover_sessions';
  return 'direct';
}

function normalizeRole(params: {
  role?: string;
  currentUserId?: string;
  hasChildren?: boolean;
  draftChildId?: string;
}): BookingFlowRole {
  const { role, currentUserId, hasChildren, draftChildId } = params;
  if (!role) return 'parent';
  const normalized = normalizeUserRole(role);
  if (normalized === 'COACH') return 'coach';
  if (normalized === 'ADMIN') return 'admin';

  const bookingForSelf = Boolean(currentUserId && draftChildId && currentUserId === draftChildId);
  if (bookingForSelf && hasChildren !== true) {
    return 'athlete';
  }

  if (hasChildren === false) {
    return 'athlete';
  }

  return 'parent';
}

function buildEvent(params: TrackBookingStepParams): BookingStepAnalyticsEvent {
  const draft = params.draft;
  return {
    id: apiClient.generateId('booking_step_evt'),
    createdAt: new Date().toISOString(),
    source: normalizeSource(params.source || draft?.entrySource, draft?.sessionSource),
    role: normalizeRole({
      role: params.role,
      currentUserId: params.currentUserId,
      hasChildren: params.hasChildren,
      draftChildId: draft?.childId,
    }),
    actingAs: params.actingAs || draft?.actingAs || 'self',
    step: params.step,
    status: params.status,
    failure_code: params.failure_code || null,
    ...(draft?.coachId ? { coachId: draft.coachId } : {}),
    ...(draft?.ownerCoachId ? { ownerCoachId: draft.ownerCoachId } : {}),
    ...(draft?.assigneeCoachId ? { assigneeCoachId: draft.assigneeCoachId } : {}),
    ...(draft?.clubId ? { clubId: draft.clubId } : {}),
  };
}

export const bookingStepAnalyticsService = {
  async track(params: TrackBookingStepParams): Promise<void> {
    try {
      const event = buildEvent(params);
      const events = await apiClient.get<BookingStepAnalyticsEvent[]>(
        STORAGE_KEYS.BOOKING_STEP_ANALYTICS_EVENTS,
        [],
      );
      events.push(event);
      if (events.length > MAX_BOOKING_STEP_EVENTS) {
        events.splice(0, events.length - MAX_BOOKING_STEP_EVENTS);
      }
      await apiClient.set(STORAGE_KEYS.BOOKING_STEP_ANALYTICS_EVENTS, events);
    } catch (error) {
      logger.warn('Failed to persist booking step analytics event', { params, error });
    }
  },
};
