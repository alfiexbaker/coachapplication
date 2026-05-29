import { STORAGE_KEYS } from "@/constants/storage-keys";
import type {
  Booking,
  Club,
  ClubMembership,
  Invoice,
  SessionOffering,
} from "@/constants/types";
import { apiClient } from "@/services/api-client";
import {
  orgHeadCoachService,
  type HeadCoachCoachHealth,
  type HeadCoachCompletionItem,
} from "@/services/org-head-coach-service";
import {
  orgStaffingService,
  type OrgWorkItem,
} from "@/services/org-staffing-service";
import {
  type Result,
  type ServiceError,
  err,
  ok,
  storageError,
} from "@/types/result";
import { getBookingRelationshipContext } from "@/utils/booking-display";
import { getCoachMoneyContext } from "@/utils/coach-business-context";
import { getSessionOfferingOffPlatformCount } from "@/utils/session-offering-capacity";
import { createLogger } from "@/utils/logger";
const logger = createLogger("OrgOwnerDashboardService");
type ProblemReportStatus = "pending" | "reviewed" | "resolved";
interface ProblemReportRecord {
  id: string;
  bookingId: string;
  category: string;
  description: string;
  status: ProblemReportStatus;
  createdAt: string;
}
export interface OwnerDashboardSummary {
  activeStaffCount: number;
  activeOrgSessions: number;
  liveBookingCount: number;
  unassignedCount: number;
  awaitingCompletionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  supportIssueCount: number;
}
export interface OwnerDashboardFinanceSummary {
  openTotal: number;
  orgCreditOpen: number;
  coachCollectedOpen: number;
  collectedTotal: number;
  writtenOffTotal: number;
  overdueCount: number;
  owedCount: number;
  note: string;
}
export interface OwnerDashboardSupportIssue {
  id: string;
  bookingId: string;
  status: ProblemReportStatus;
  category: string;
  description: string;
  createdAt: string;
  scheduledAt?: string;
  sessionTitle: string;
  athleteLabel: string;
  supportLabel: string;
  deliveredByLabel: string;
}
export interface OrgOwnerDashboardData {
  club: Club;
  viewerMembership: ClubMembership;
  summary: OwnerDashboardSummary;
  finance: OwnerDashboardFinanceSummary;
  unassignedWork: OrgWorkItem[];
  coachHealth: HeadCoachCoachHealth[];
  completionQueue: HeadCoachCompletionItem[];
  supportIssues: OwnerDashboardSupportIssue[];
}
interface FinanceAccumulator {
  openTotal: number;
  orgCreditOpen: number;
  coachCollectedOpen: number;
  collectedTotal: number;
  writtenOffTotal: number;
  overdueCount: number;
  owedCount: number;
}
function parseTime(value?: string | null): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}
function isFutureOrToday(iso: string): boolean {
  const time = parseTime(iso);
  if (Number.isNaN(time)) return false;
  return time >= Date.now();
}
function isReconcilableBooking(booking: Booking): boolean {
  return (
    booking.status === "COMPLETED" ||
    (booking.status === "CANCELLED" && (booking.cancellationFee ?? 0) > 0)
  );
}
function createSyntheticInvoice(params: {
  bookingId: string;
  coachId: string;
  athleteId?: string;
  sessionDate: string;
  sessionType: string;
  sessionLocation?: string;
  sessionDuration?: number;
  amount: number;
  createdAt: string;
}): Invoice {
  return {
    id: `inv_owner_dash_${params.bookingId}`,
    invoiceNumber: `INV-OWNER-${params.bookingId}`,
    userId: params.athleteId ?? params.coachId,
    bookingId: params.bookingId,
    coachId: params.coachId,
    athleteId: params.athleteId,
    sessionDate: params.sessionDate,
    sessionType: params.sessionType,
    sessionLocation: params.sessionLocation,
    sessionDuration: params.sessionDuration,
    amount: params.amount,
    tax: 0,
    taxRate: 0,
    total: params.amount,
    currency: "GBP",
    status: "SENT",
    createdAt: params.createdAt,
  };
}
function applyInvoiceToSummary(
  summary: FinanceAccumulator,
  bookingLike: Pick<Booking, "actingAs" | "clubId" | "commercialMode">,
  invoice: Invoice,
  scheduledAt: string,
): void {
  const moneyContext = getCoachMoneyContext(bookingLike);
  if (invoice.status === "PAID") {
    summary.collectedTotal += invoice.total;
    return;
  }
  if (invoice.status === "WRITTEN_OFF" || invoice.status === "VOID") {
    summary.writtenOffTotal += invoice.total;
    return;
  }
  summary.openTotal += invoice.total;
  summary.owedCount += 1;
  if (moneyContext === "org_credit") {
    summary.orgCreditOpen += invoice.total;
  } else {
    summary.coachCollectedOpen += invoice.total;
  }
  const dueDate = invoice.dueDate
    ? parseTime(invoice.dueDate)
    : parseTime(scheduledAt) + 14 * 24 * 60 * 60 * 1000;
  if (!Number.isNaN(dueDate) && Date.now() > dueDate) {
    summary.overdueCount += 1;
  }
}
function formatIssueCategory(category: string): string {
  return category
    .split("-")
    .flatMap((item) =>
      Boolean(item) ? [item.charAt(0).toUpperCase() + item.slice(1)] : [],
    )
    .join(" ");
}
function getAthleteLabel(booking: Booking): string {
  const names = booking.athleteNames?.filter((name) => name?.trim()) ?? [];
  if (names.length === 0) {
    return booking.athleteId || booking.athleteIds?.[0] || "Athlete";
  }
  if (names.length === 1) {
    return names[0];
  }
  return `${names[0]} + ${names.length - 1} more`;
}
class OrgOwnerDashboardService {
  async getDashboardData(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<OrgOwnerDashboardData, ServiceError>> {
    try {
      const [
        staffingResult,
        oversightResult,
        bookings,
        offerings,
        invoices,
        problemReports,
      ] = await Promise.all([
        orgStaffingService.getConsoleData(clubId, viewerUserId),
        orgHeadCoachService.getOversightData(clubId, viewerUserId),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        apiClient.get<Invoice[]>(STORAGE_KEYS.INVOICES, []),
        apiClient.get<ProblemReportRecord[]>(STORAGE_KEYS.PROBLEM_REPORTS, []),
      ]);
      if (!staffingResult.success) {
        return staffingResult;
      }
      if (!oversightResult.success) {
        return oversightResult;
      }
      const staffing = staffingResult.data;
      const oversight = oversightResult.data;
      const clubBookings = bookings.filter(
        (booking) => booking.actingAs === "club" && booking.clubId === clubId,
      );
      const clubOfferings = offerings.filter(
        (offering) =>
          offering.actingAs === "club" && offering.clubId === clubId,
      );
      const invoiceByBookingId = new Map(
        invoices.map((invoice) => [invoice.bookingId, invoice]),
      );
      const finance: FinanceAccumulator = {
        openTotal: 0,
        orgCreditOpen: 0,
        coachCollectedOpen: 0,
        collectedTotal: 0,
        writtenOffTotal: 0,
        overdueCount: 0,
        owedCount: 0,
      };
      clubBookings.forEach((item) => {
        if (!isReconcilableBooking(item)) return;
        const amount =
          item.status === "CANCELLED"
            ? (item.cancellationFee ?? 0)
            : (item.price ?? 0);
        if (amount <= 0) {
          return;
        }
        const invoice =
          invoiceByBookingId.get(item.id) ||
          createSyntheticInvoice({
            bookingId: item.id,
            coachId: item.coachId,
            athleteId: item.athleteId ?? item.athleteIds?.[0],
            sessionDate: item.scheduledAt,
            sessionType: item.service || item.serviceType || "Club session",
            sessionLocation: item.location,
            sessionDuration: item.duration ?? 60,
            amount,
            createdAt: item.createdAt ?? item.scheduledAt,
          });
        applyInvoiceToSummary(finance, item, invoice, item.scheduledAt);
      });
      clubOfferings.forEach((offering) => {
        const offPlatformCount = getSessionOfferingOffPlatformCount(offering);
        if (offering.sessionType !== "group" || offPlatformCount <= 0) {
          return;
        }
        const scheduledAt = parseTime(offering.scheduledAt);
        if (Number.isNaN(scheduledAt)) {
          return;
        }
        if (offering.status !== "completed" && scheduledAt > Date.now()) {
          return;
        }
        const amount = (offering.price ?? 0) * offPlatformCount;
        if (amount <= 0) {
          return;
        }
        const syntheticBookingId = `booking_off_platform_${offering.id}`;
        const invoice =
          invoiceByBookingId.get(syntheticBookingId) ||
          createSyntheticInvoice({
            bookingId: syntheticBookingId,
            coachId: offering.coachId,
            sessionDate: offering.scheduledAt,
            sessionType: `${offering.title} (Off-platform)`,
            sessionLocation: offering.location,
            sessionDuration: offering.duration ?? 60,
            amount,
            createdAt: offering.createdAt ?? offering.scheduledAt,
          });
        applyInvoiceToSummary(
          finance,
          {
            actingAs: offering.actingAs,
            clubId: offering.clubId,
            commercialMode: offering.commercialMode,
          },
          invoice,
          offering.scheduledAt,
        );
      });
      const bookingById = new Map(
        clubBookings.map((booking) => [booking.id, booking]),
      );
      const supportIssues = problemReports
        .filter((report) => report.status !== "resolved")
        .reduce<OwnerDashboardSupportIssue[]>((items, report) => {
          const booking = bookingById.get(report.bookingId);
          if (!booking) {
            return items;
          }
          const relationshipContext = getBookingRelationshipContext({
            actingAs: booking.actingAs,
            organizationLabel: staffing.club.name,
            coachLabel: booking.coachName || booking.coachId || "Coach",
            deliveredByLabel:
              booking.coachName ||
              booking.assigneeCoachId ||
              booking.coachId ||
              "Coach",
            commercialMode: booking.commercialMode,
          });
          items.push({
            id: report.id,
            bookingId: report.bookingId,
            status: report.status,
            category: formatIssueCategory(report.category),
            description: report.description,
            createdAt: report.createdAt,
            scheduledAt: booking.scheduledAt,
            sessionTitle: booking.service || "Club session",
            athleteLabel: getAthleteLabel(booking),
            supportLabel: relationshipContext.supportLabel,
            deliveredByLabel: relationshipContext.deliveredByLabel,
          });
          return items;
        }, [])
        .sort(
          (left, right) =>
            parseTime(right.createdAt) - parseTime(left.createdAt),
        );
      const coachHealth = Array.from(oversight.coachHealth).toSorted(
        (left, right) => {
          if (left.overdueCompletionCount !== right.overdueCompletionCount) {
            return right.overdueCompletionCount - left.overdueCompletionCount;
          }
          if (left.overdueFollowUpCount !== right.overdueFollowUpCount) {
            return right.overdueFollowUpCount - left.overdueFollowUpCount;
          }
          if (left.openTaskCount !== right.openTaskCount) {
            return right.openTaskCount - left.openTaskCount;
          }
          return left.coachName.localeCompare(right.coachName);
        },
      );
      const liveBookingCount = clubBookings.filter(
        (booking) =>
          booking.status !== "CANCELLED" &&
          booking.status !== "COMPLETED" &&
          isFutureOrToday(booking.scheduledAt),
      ).length;
      return ok({
        club: staffing.club,
        viewerMembership: staffing.viewerMembership,
        summary: {
          activeStaffCount: staffing.staff.filter(
            (member) => member.status === "active",
          ).length,
          activeOrgSessions: staffing.summary.activeOrgSessions,
          liveBookingCount,
          unassignedCount: staffing.summary.unassignedCount,
          awaitingCompletionCount: oversight.summary.awaitingCompletionCount,
          overdueCompletionCount: oversight.summary.overdueCompletionCount,
          watchAthleteCount: oversight.summary.watchAthleteCount,
          overdueFollowUpCount: oversight.summary.overdueFollowUpCount,
          supportIssueCount: supportIssues.length,
        },
        finance: {
          ...finance,
          note:
            finance.orgCreditOpen > 0
              ? "Org-owned money is tracked as reconciler credit until real payout rails exist."
              : "Club-routed work stays split from coach-collected money until payments move through the app.",
        },
        unassignedWork: staffing.unassignedWork,
        coachHealth,
        completionQueue: oversight.completionQueue,
        supportIssues,
      });
    } catch (error) {
      logger.error("Failed to build owner dashboard", {
        clubId,
        viewerUserId,
        error,
      });
      return err(storageError("Failed to load owner dashboard"));
    }
  }
}
export const orgOwnerDashboardService = new OrgOwnerDashboardService();
