import type { NotificationCategory, NotificationType } from "@/constants/types";
import { NOTIFICATION_TYPE_CATEGORIES } from "@/constants/types";
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  BOOKING_RECEIVED: "New Booking Requests",
  BOOKING_HANDOFF: "Booking Handoffs",
  BOOKING_CONFIRMED: "Booking Confirmations",
  BOOKING_CANCELLED: "Booking Cancellations",
  CLUB_UPDATE: "Club Updates",
  SUPPORT_UPDATE: "Support Updates",
  SESSION_REMINDER: "Session Reminders",
  MESSAGE_RECEIVED: "New Messages",
  SESSION_INVITE: "Session Invites",
  SESSION_INVITE_RESPONSE: "Invite Responses",
  REVIEW_REQUEST: "Review Requests",
  REVIEW_RECEIVED: "New Reviews",
  BADGE_AWARDED: "Badge Awards",
  WAITLIST_AVAILABLE: "Waitlist Openings",
  PAYMENT_RECEIVED: "Payment Received",
  PAYMENT_FAILED: "Payment Issues",
  GOAL_COMPLETED: "Goal Completions",
  VIDEO_SHARED: "Shared Videos",
  MATCH_INVITE: "Match Invites",
  MATCH_RESPONSE: "Match Responses",
  MATCH_LINEUP: "Lineup Announcements",
  MATCH_REMINDER: "Match Reminders",
  MATCH_CANCELLED: "Match Cancellations",
  NEW_FOLLOWER: "New Followers",
  FOLLOW_REQUEST: "Follow Requests",
  FOLLOW_REQUEST_ACCEPTED: "Accepted Follow Requests",
};
export function getTypesForCategory(
  category: NotificationCategory,
): NotificationType[] {
  return (
    Object.entries(NOTIFICATION_TYPE_CATEGORIES) as [
      NotificationType,
      NotificationCategory,
    ][]
  ).flatMap((item) =>
    (([_, cat]) => cat === category)(item) ? [(([type]) => type)(item)] : [],
  );
}
