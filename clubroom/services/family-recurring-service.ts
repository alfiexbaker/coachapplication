import type { Booking, RecurringBooking } from '@/constants/types';
import { bookingService } from '@/services/booking';
import { recurringBookingService } from '@/services/recurring-booking-service';
import { userService } from '@/services/user-service';
import type { Result, ServiceError } from '@/types/result';
import { err, ok, storageError } from '@/types/result';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FamilyRecurringService');

export interface FamilyRecurringPlanSummary {
  recurring: RecurringBooking;
  coachName: string;
  athleteName: string;
  nextBookingId?: string;
  nextScheduledAt?: string;
  activeFutureBookings: number;
  cancelledFutureBookings: number;
  relationshipSummary: string;
}

async function resolveDisplayName(userId: string | undefined, fallback: string): Promise<string> {
  if (!userId) return fallback;
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  const candidate = userResult.data as { name?: string; fullName?: string };
  return candidate.fullName?.trim() || candidate.name?.trim() || fallback;
}

function buildRelationshipSummary(recurring: RecurringBooking): string {
  if (recurring.status === 'PAUSED') {
    return 'Paused plans keep already-booked sessions in place until you resume or cancel the plan.';
  }
  if (recurring.status === 'CANCELLED') {
    return 'Cancelled plans stop future recurring sessions and preserve the audit trail for past delivery.';
  }
  return 'Pause keeps existing sessions in place. Cancel ends the plan and cancels future recurring sessions.';
}

class FamilyRecurringService {
  async listPlansForParent(
    userId: string,
  ): Promise<Result<FamilyRecurringPlanSummary[], ServiceError>> {
    try {
      const [recurringResult, bookings] = await Promise.all([
        recurringBookingService.getUserRecurringBookings(userId),
        bookingService.list(),
      ]);

      if (!recurringResult.success) {
        return recurringResult;
      }

      const now = Date.now();
      const plans = await Promise.all(
        recurringResult.data.map(async (recurring) => {
          const linkedBookings = bookings
            .filter((booking) => booking.recurringBookingId === recurring.id)
            .sort(
              (left, right) =>
                new Date(left.scheduledAt).getTime() - new Date(right.scheduledAt).getTime(),
            );
          const futureLinkedBookings = linkedBookings.filter(
            (booking) => new Date(booking.scheduledAt).getTime() >= now,
          );
          const nextBooking = futureLinkedBookings.find(
            (booking) => booking.status !== 'CANCELLED',
          );
          const activeFutureBookings = futureLinkedBookings.filter(
            (booking) => booking.status !== 'CANCELLED',
          ).length;
          const cancelledFutureBookings = futureLinkedBookings.filter(
            (booking) => booking.status === 'CANCELLED',
          ).length;
          const [coachName, athleteName, userName] = await Promise.all([
            resolveDisplayName(recurring.coachId, recurring.coachId || 'Coach'),
            resolveDisplayName(
              recurring.athleteId || recurring.userId,
              recurring.athleteId || recurring.userId || 'Athlete',
            ),
            resolveDisplayName(recurring.userId, recurring.userId || 'Parent'),
          ]);

          return {
            recurring: {
              ...recurring,
              coachName,
              athleteName,
              userName,
            },
            coachName,
            athleteName,
            nextBookingId: nextBooking?.id,
            nextScheduledAt: nextBooking?.scheduledAt,
            activeFutureBookings,
            cancelledFutureBookings,
            relationshipSummary: buildRelationshipSummary(recurring),
          } satisfies FamilyRecurringPlanSummary;
        }),
      );

      plans.sort((left, right) => {
        const statusPriority: Record<RecurringBooking['status'], number> = {
          ACTIVE: 0,
          PAUSED: 1,
          EXPIRED: 2,
          CANCELLED: 3,
        };
        const statusDelta =
          statusPriority[left.recurring.status] - statusPriority[right.recurring.status];
        if (statusDelta !== 0) return statusDelta;

        const leftTime = left.nextScheduledAt
          ? new Date(left.nextScheduledAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightTime = right.nextScheduledAt
          ? new Date(right.nextScheduledAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        return leftTime - rightTime;
      });

      return ok(plans);
    } catch (error) {
      logger.error('Failed to load family recurring plans', { userId, error });
      return err(storageError('Failed to load recurring plans.'));
    }
  }
}

export const familyRecurringService = new FamilyRecurringService();
