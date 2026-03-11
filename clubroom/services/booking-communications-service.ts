import { canManageClubAssignments } from '@/contracts/club-governance';
import type { Booking, SessionOffering } from '@/constants/types';
import { notificationService } from '@/services/notification-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import { getBookingRelationshipContext } from '@/utils/booking-display';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('BookingCommunicationsService');

function formatSessionDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getBookingAudienceLabel(booking: Booking): string {
  const names = booking.athleteNames?.filter(Boolean) ?? [];
  if (names.length === 0) {
    return 'the athlete';
  }
  if (names.length === 1) {
    return names[0];
  }
  return `${names[0]} + ${names.length - 1} more`;
}

class BookingCommunicationsService {
  async notifyAssignmentChange(params: {
    clubId: string;
    offering: SessionOffering;
    updatedBookings: Booking[];
    actorName: string;
    previousAssigneeId?: string;
    previousAssigneeName?: string;
    nextAssigneeId: string;
    nextAssigneeName: string;
  }): Promise<Result<void, ServiceError>> {
    try {
      const club = await socialFeedService.getClub(params.clubId);
      const organizationLabel = club?.name || params.clubId;
      const sessionTitle = params.offering.title || 'Club session';
      const dateLabel = formatSessionDateLabel(params.offering.scheduledAt);

      const notifyTasks: Promise<unknown>[] = [];

      notifyTasks.push(
        notificationService.notifyCoachBookingHandoff({
          coachId: params.nextAssigneeId,
          title: sessionTitle,
          date: dateLabel,
          bookingId: params.updatedBookings[0]?.id,
          organizationLabel,
          actorName: params.actorName,
          previousCoachName: params.previousAssigneeName,
          messageVariant: 'assigned_to_you',
        }),
      );

      if (params.previousAssigneeId && params.previousAssigneeId !== params.nextAssigneeId) {
        notifyTasks.push(
          notificationService.notifyCoachBookingHandoff({
            coachId: params.previousAssigneeId,
            title: sessionTitle,
            date: dateLabel,
            bookingId: params.updatedBookings[0]?.id,
            organizationLabel,
            actorName: params.actorName,
            nextCoachName: params.nextAssigneeName,
            messageVariant: 'moved_away',
          }),
        );
      }

      const parentNotifications = new Set<string>();
      params.updatedBookings.forEach((booking) => {
        if (!booking.bookedById || parentNotifications.has(booking.bookedById)) {
          return;
        }
        parentNotifications.add(booking.bookedById);

        const relationshipContext = getBookingRelationshipContext({
          actingAs: booking.actingAs,
          organizationLabel,
          coachLabel: params.previousAssigneeName || booking.coachName || params.nextAssigneeName,
          deliveredByLabel: params.nextAssigneeName,
          commercialMode: booking.commercialMode,
        });

        notifyTasks.push(
          notificationService.notifyParentBookingHandoff({
            parentId: booking.bookedById,
            bookingId: booking.id,
            athleteLabel: getBookingAudienceLabel(booking),
            previousCoachName: params.previousAssigneeName,
            nextCoachName: params.nextAssigneeName,
            organizationLabel,
            date: formatSessionDateLabel(booking.scheduledAt),
            supportLabel: relationshipContext.supportLabel,
          }),
        );
      });

      await Promise.all(notifyTasks);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to send assignment change notifications', { params, error });
      return err(storageError('Failed to notify assignment change'));
    }
  }

  async notifySupportIssueReported(params: {
    booking: Booking;
    category: string;
    description: string;
  }): Promise<Result<void, ServiceError>> {
    try {
      const booking = params.booking;
      const organizationLabel = booking.clubId
        ? (await socialFeedService.getClub(booking.clubId))?.name || booking.clubId
        : null;
      const relationshipContext = getBookingRelationshipContext({
        actingAs: booking.actingAs,
        organizationLabel,
        coachLabel: booking.coachName || booking.coachId || 'Coach',
        deliveredByLabel: booking.coachName || booking.assigneeCoachId || booking.coachId || 'Coach',
        commercialMode: booking.commercialMode,
      });

      const recipients = new Set<string>();
      if (booking.actingAs === 'club' && booking.clubId && booking.commercialMode === 'ORG_OWNED') {
        const memberships = await socialFeedService.getClubMemberships(booking.clubId);
        memberships
          .filter((membership) => membership.status === 'active' && canManageClubAssignments(membership.role))
          .forEach((membership) => recipients.add(membership.userId));
      }

      if (recipients.size === 0) {
        const supportCoachId = booking.assigneeCoachId || booking.ownerCoachId || booking.coachId;
        if (supportCoachId) {
          recipients.add(supportCoachId);
        }
      }

      await Promise.all(
        Array.from(recipients).map((recipientId) =>
          notificationService.notifySupportIssueReported({
            recipientId,
            bookingId: booking.id,
            category: params.category,
            title: booking.service || 'Session',
            date: formatSessionDateLabel(booking.scheduledAt),
            supportLabel: relationshipContext.supportLabel,
            descriptionPreview: params.description.slice(0, 120),
          }),
        ),
      );

      return ok(undefined);
    } catch (error) {
      logger.error('Failed to notify support issue', { params, error });
      return err(storageError('Failed to route support issue notification'));
    }
  }
}

export const bookingCommunicationsService = new BookingCommunicationsService();
