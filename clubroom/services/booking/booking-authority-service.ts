import { authService } from '@/services/auth-service';
import { apiFetch } from '@/services/api-client';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

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
  participants: Array<{
    athleteId: string;
    guardianUserId?: string;
    status: 'confirmed' | 'pending' | 'cancelled';
  }>;
  version: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string | null;
}

function toApiUserId(userId: string): string {
  return userId.startsWith('usr_') ? userId : `usr_${userId.replace(/^ath_/, '')}`;
}

function deriveActingRole(
  user: Awaited<ReturnType<typeof authService.getCurrentUser>>,
): ActingRole {
  if (user?.roles?.includes('club_admin')) {
    return 'club_admin';
  }
  if (user?.accountType === 'COACH') {
    return 'coach';
  }
  if (user?.accountType === 'PARENT') {
    return 'parent';
  }
  return 'athlete';
}

async function resolveBookingAccessHeaders(): Promise<Result<Record<string, string>, ServiceError>> {
  const currentUser = await authService.getCurrentUser();
  if (!currentUser?.id) {
    return err(serviceError('UNAUTHORIZED', 'Sign in to manage bookings.'));
  }

  const actingRole = deriveActingRole(currentUser);
  const roles = new Set(currentUser.roles ?? []);
  roles.add(actingRole);

  return ok({
    'x-auth-user-id': toApiUserId(currentUser.id),
    'x-auth-roles': Array.from(roles).join(','),
    'x-acting-role': actingRole,
  });
}

class BookingAuthorityService {
  async cancelBooking(
    bookingId: string,
    input: { reason: string; note?: string },
  ): Promise<Result<ApiBookingResponse, ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiBookingResponse>(`/v1/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify(input),
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
    input: { note?: string } = {},
  ): Promise<Result<ApiBookingResponse, ServiceError>> {
    const headersResult = await resolveBookingAccessHeaders();
    if (!headersResult.success) {
      return headersResult;
    }

    const result = await apiFetch<ApiBookingResponse>(`/v1/bookings/${bookingId}/reopen`, {
      method: 'POST',
      headers: headersResult.data,
      body: JSON.stringify(input),
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
