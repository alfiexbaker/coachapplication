import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
  toApiAthleteId,
  toApiUserId,
} from '@/services/api-auth-context';
import { createLogger } from '@/utils/logger';
import { err, ok, type Result, type ServiceError } from '@/types/result';

const logger = createLogger('BookingAuthorityService');

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';
type ApiBookingStatus =
  | 'PENDING'
  | 'AWAITING_CONFIRMATION'
  | 'CONFIRMED'
  | 'AWAITING_COMPLETION'
  | 'COMPLETED'
  | 'CANCELLED';

interface ApiBookingResponse {
  id: string;
  coachUserId: string;
  bookedByUserId?: string;
  status: ApiBookingStatus;
  scheduledAt: string;
  durationMinutes: number;
  location: string;
  serviceType?: string;
  sessionTemplateId?: string | null;
  objectives: string[];
  notes?: string | null;
  priceMinor?: number | null;
  currency: string;
  participants: {
    athleteId: string;
    guardianUserId?: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }[];
  version: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
}

interface ApiBookingListResponse {
  bookings: ApiBookingResponse[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}

interface CreateApiBookingInput {
  coachId: string;
  athleteIds: string[];
  bookedById: string;
  scheduledAt: string;
  duration: number;
  location: string;
  serviceType: string;
  sessionTemplateId?: string;
  objectives?: string[];
  notes?: string;
  totalPrice?: number;
  idempotencyKey?: string;
}

function toApiScheduledAt(scheduledAt: string): string {
  const parsed = new Date(scheduledAt);
  return Number.isNaN(parsed.getTime()) ? scheduledAt : parsed.toISOString();
}

function hashStableString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function buildBookingIdempotencyKey(input: CreateApiBookingInput): string {
  const scheduledAt = toApiScheduledAt(input.scheduledAt);
  const payload = JSON.stringify({
    coachUserId: toApiUserId(input.coachId),
    athleteIds: input.athleteIds.map((athleteId) => toApiAthleteId(athleteId)).sort(),
    bookedByUserId: toApiUserId(input.bookedById),
    scheduledAt,
    durationMinutes: input.duration,
    location: input.location,
    serviceType: input.serviceType,
    sessionTemplateId: input.sessionTemplateId ?? null,
    objectives: input.objectives ?? [],
    notes: input.notes ?? null,
    totalPrice:
      typeof input.totalPrice === 'number' ? Math.max(0, Math.round(input.totalPrice * 100)) : null,
  });
  return `booking_${hashStableString(payload)}`;
}

function buildBookingLifecycleIdempotencyKey(
  action: 'cancel' | 'reopen',
  bookingId: string,
  input: { reason?: string; note?: string; expectedVersion?: number },
): string {
  const payload = JSON.stringify({
    action,
    bookingId,
    reason: input.reason ?? null,
    note: input.note ?? null,
    expectedVersion: input.expectedVersion ?? null,
  });
  return `booking_${action}_${hashStableString(payload)}`;
}

async function resolveBookingAccessHeaders(): Promise<
  Result<Record<string, string>, ServiceError>
> {
  const currentUserResult = await resolveSignedInApiUser('Sign in to manage bookings.');
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const actingRole = deriveApiActingRole(currentUserResult.data) as ActingRole;
  return ok(buildApiAuthHeaders({ actingRole }));
}

class BookingAuthorityService {
  async listBookings(
    params: { status?: ApiBookingStatus } = {},
  ): Promise<Result<ApiBookingResponse[], ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const search = new URLSearchParams();
    if (params.status) {
      search.set('status', params.status);
    }
    const path = search.size > 0 ? `/v1/bookings?${search.toString()}` : '/v1/bookings';

    const result = await apiFetch<ApiBookingListResponse>(path, {
      method: 'GET',
      headers: headersResult.data,
    });

    if (!result.success) {
      logger.error('Failed to list bookings via API', {
        status: params.status ?? null,
        error: result.error,
      });
      return err(result.error);
    }

    return ok(result.data.bookings);
  }

  async getBooking(bookingId: string): Promise<Result<ApiBookingResponse, ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiBookingResponse>(`/v1/bookings/${bookingId}`, {
      method: 'GET',
      headers: headersResult.data,
    });

    if (!result.success) {
      logger.error('Failed to get booking via API', {
        bookingId,
        error: result.error,
      });
      return err(result.error);
    }

    return result;
  }

  async createBooking(
    input: CreateApiBookingInput,
  ): Promise<Result<ApiBookingResponse, ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiBookingResponse>('/v1/bookings', {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        coachUserId: toApiUserId(input.coachId),
        athleteIds: input.athleteIds.map((athleteId) => toApiAthleteId(athleteId)),
        bookedByUserId: toApiUserId(input.bookedById),
        scheduledAt: toApiScheduledAt(input.scheduledAt),
        durationMinutes: input.duration,
        location: input.location,
        serviceType: input.serviceType,
        ...(input.sessionTemplateId ? { sessionTemplateId: input.sessionTemplateId } : {}),
        objectives: input.objectives ?? [],
        ...(input.notes ? { notes: input.notes } : {}),
        ...(typeof input.totalPrice === 'number'
          ? { priceMinor: Math.max(0, Math.round(input.totalPrice * 100)) }
          : {}),
        currency: 'GBP',
        idempotencyKey: input.idempotencyKey ?? buildBookingIdempotencyKey(input),
      }),
    });

    if (!result.success) {
      logger.error('Failed to create booking via API', {
        coachId: input.coachId,
        bookedById: input.bookedById,
        athleteIds: input.athleteIds,
        error: result.error,
      });
      return err(result.error);
    }

    return result;
  }

  async cancelBooking(
    bookingId: string,
    input: { reason: string; note?: string; expectedVersion?: number; idempotencyKey?: string },
  ): Promise<Result<ApiBookingResponse, ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiBookingResponse>(`/v1/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        ...input,
        idempotencyKey:
          input.idempotencyKey ?? buildBookingLifecycleIdempotencyKey('cancel', bookingId, input),
      }),
    });

    if (!result.success) {
      logger.error('Failed to cancel booking via API', {
        bookingId,
        error: result.error,
      });
      return err(result.error);
    }

    return result;
  }

  async reopenBooking(
    bookingId: string,
    input: { note?: string; expectedVersion?: number; idempotencyKey?: string } = {},
  ): Promise<Result<ApiBookingResponse, ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiBookingResponse>(`/v1/bookings/${bookingId}/reopen`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify({
        ...input,
        idempotencyKey:
          input.idempotencyKey ?? buildBookingLifecycleIdempotencyKey('reopen', bookingId, input),
      }),
    });

    if (!result.success) {
      logger.error('Failed to reopen booking via API', {
        bookingId,
        error: result.error,
      });
      return err(result.error);
    }

    return result;
  }
}

export const bookingAuthorityService = new BookingAuthorityService();
