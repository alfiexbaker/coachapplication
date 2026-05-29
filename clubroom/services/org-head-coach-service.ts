import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  Booking,
  Club,
  ClubMembership,
  ClubRole,
  ClubSquad,
  SessionOffering,
} from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { clubService, type ClubMember } from '@/services/club-service';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import {
  progressPracticeTaskService,
  type PracticeTaskRisk,
} from '@/services/progress/progress-practice-task-service';
import { socialFeedService } from '@/services/social-feed-service';
import { squadService } from '@/services/squad-service';
import {
  err,
  ok,
  storageError,
  type Result,
  type ServiceError,
  unauthorized,
  validationError,
} from '@/types/result';
import { accountIdsMatch } from '@/utils/account-id';
import { createLogger } from '@/utils/logger';
import { isClubOversightRole, isClubStaffRole } from '@/contracts/club-governance';
const logger = createLogger('OrgHeadCoachService');
const TASK_TYPES = new Set<HeadCoachTaskType>(['required_follow_up', 'session_note_expectation']);
export type HeadCoachScopeType = 'club' | 'assigned_squads';
export type HeadCoachTaskType = 'required_follow_up' | 'session_note_expectation';
export type HeadCoachTaskStatus = 'open' | 'done';
export type HeadCoachStandardCategory = 'session_notes' | 'follow_up' | 'program';
export interface HeadCoachScope {
  type: HeadCoachScopeType;
  squadIds: string[];
  label: string;
}
export interface HeadCoachCompletionItem {
  bookingId: string;
  offeringId?: string;
  coachId: string;
  coachName: string;
  athleteName: string;
  service: string;
  scheduledAt: string;
  dueAt: string;
  overdue: boolean;
  squadId?: string;
  squadName?: string;
}
export interface HeadCoachWatchlistItem {
  athleteId: string;
  athleteName: string;
  coachId: string;
  coachName: string;
  risk: PracticeTaskRisk;
  pendingCount: number;
  overdueCount: number;
  dueSoonCount: number;
  recommendedAction: string;
  nextDueAt: string | null;
  latestCoachActionAt: string | null;
  attentionScore: number;
  taskIds: string[];
  squadId?: string;
  squadName?: string;
}
export interface HeadCoachTask {
  id: string;
  clubId: string;
  coachId: string;
  coachName: string;
  type: HeadCoachTaskType;
  status: HeadCoachTaskStatus;
  title: string;
  details?: string;
  dueAt: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  offeringId?: string;
  squadId?: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  completedAt?: string;
  completedByUserId?: string;
}
export interface HeadCoachStandard {
  id: string;
  clubId: string;
  category: HeadCoachStandardCategory;
  title: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
}
export interface HeadCoachCoachHealth {
  coachId: string;
  coachName: string;
  role: ClubRole;
  squadNames: string[];
  completionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  openTaskCount: number;
  sessionNoteExpectationCount: number;
  requiredFollowUpCount: number;
  latestCoachActionAt: string | null;
}
export interface HeadCoachOversightSummary {
  coachCount: number;
  squadCount: number;
  awaitingCompletionCount: number;
  overdueCompletionCount: number;
  watchAthleteCount: number;
  overdueFollowUpCount: number;
  openTaskCount: number;
  activeStandardCount: number;
}
export interface HeadCoachOversightData {
  club: Club;
  viewerMembership: ClubMembership;
  scope: HeadCoachScope;
  squads: ClubSquad[];
  coachHealth: HeadCoachCoachHealth[];
  completionQueue: HeadCoachCompletionItem[];
  watchlist: HeadCoachWatchlistItem[];
  tasks: HeadCoachTask[];
  standards: HeadCoachStandard[];
  summary: HeadCoachOversightSummary;
}
interface ViewerContext {
  club: Club;
  viewerMembership: ClubMembership;
  viewerMember: ClubMember | null;
  scope: HeadCoachScope;
  clubMembers: ClubMember[];
  squads: ClubSquad[];
  squadsById: Map<string, ClubSquad>;
}
function parseTime(value?: string | null): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}
function intersects(left: string[] | undefined, right: string[]): boolean {
  if (!left || left.length === 0 || right.length === 0) return false;
  return left.some((entry) => right.includes(entry));
}
function collectBookingAthleteIds(booking: Booking): string[] {
  const ids = booking.athleteIds?.filter(Boolean) ?? [];
  if (ids.length > 0) return ids;
  return booking.athleteId ? [booking.athleteId] : [];
}
function resolveBookingAthleteName(booking: Booking): string {
  const athleteNames = booking.athleteNames?.filter((name) => name?.trim());
  if (athleteNames && athleteNames.length > 0) return athleteNames[0];
  return booking.athleteId || booking.athleteIds?.[0] || 'Athlete';
}
function resolveCompletionDueAt(booking: Booking): string {
  const start = new Date(booking.scheduledAt);
  if (Number.isNaN(start.getTime())) {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }
  start.setMinutes(start.getMinutes() + (booking.duration ?? 60) + 24 * 60);
  return start.toISOString();
}
function isAwaitingCompletion(booking: Booking): boolean {
  if (booking.status === 'AWAITING_COMPLETION') return true;
  if (booking.status !== 'CONFIRMED') return false;
  const end = new Date(booking.scheduledAt);
  end.setMinutes(end.getMinutes() + (booking.duration ?? 60));
  return Date.now() > end.getTime();
}
function resolveCoachId(entry: {
  assigneeCoachId?: string | null;
  ownerCoachId?: string | null;
  coachId?: string | null;
}): string | null {
  return entry.assigneeCoachId || entry.ownerCoachId || entry.coachId || null;
}
function buildDefaultStandards(clubId: string, actorUserId: string): HeadCoachStandard[] {
  const nowIso = new Date().toISOString();
  return [
    {
      id: `head_coach_standard_notes_${clubId}`,
      clubId,
      category: 'session_notes',
      title: 'Session notes submitted within 24 hours',
      description: 'Club-owned sessions should move out of completion queue within one day.',
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdByUserId: actorUserId,
    },
    {
      id: `head_coach_standard_follow_up_${clubId}`,
      clubId,
      category: 'follow_up',
      title: 'Watchlist athletes get a same-day follow-up plan',
      description: 'Overdue follow-up pressure should trigger coach action before the next block.',
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdByUserId: actorUserId,
    },
    {
      id: `head_coach_standard_program_${clubId}`,
      clubId,
      category: 'program',
      title: 'Every delivery block has a clear focus and next action',
      description:
        'Head coach standards should make squad delivery expectations visible and reviewable.',
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      createdByUserId: actorUserId,
    },
  ];
}
function sortCompletionQueue(
  left: HeadCoachCompletionItem,
  right: HeadCoachCompletionItem,
): number {
  if (left.overdue !== right.overdue) {
    return left.overdue ? -1 : 1;
  }
  const leftDue = parseTime(left.dueAt);
  const rightDue = parseTime(right.dueAt);
  if (!Number.isNaN(leftDue) && !Number.isNaN(rightDue) && leftDue !== rightDue) {
    return leftDue - rightDue;
  }
  return parseTime(left.scheduledAt) - parseTime(right.scheduledAt);
}
function sortWatchlist(left: HeadCoachWatchlistItem, right: HeadCoachWatchlistItem): number {
  const riskRank: Record<PracticeTaskRisk, number> = {
    high: 0,
    watch: 1,
    stable: 2,
  };
  if (riskRank[left.risk] !== riskRank[right.risk]) {
    return riskRank[left.risk] - riskRank[right.risk];
  }
  if (left.overdueCount !== right.overdueCount) {
    return right.overdueCount - left.overdueCount;
  }
  if (left.attentionScore !== right.attentionScore) {
    return right.attentionScore - left.attentionScore;
  }
  return left.athleteName.localeCompare(right.athleteName);
}
function sortTasks(left: HeadCoachTask, right: HeadCoachTask): number {
  if (left.status !== right.status) {
    return left.status === 'open' ? -1 : 1;
  }
  const leftDue = parseTime(left.dueAt);
  const rightDue = parseTime(right.dueAt);
  if (!Number.isNaN(leftDue) && !Number.isNaN(rightDue) && leftDue !== rightDue) {
    return leftDue - rightDue;
  }
  return parseTime(right.updatedAt) - parseTime(left.updatedAt);
}
function sortCoachHealth(left: HeadCoachCoachHealth, right: HeadCoachCoachHealth): number {
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
}
function normalizeTaskType(value: HeadCoachTaskType): HeadCoachTaskType {
  if (!TASK_TYPES.has(value)) {
    return 'required_follow_up';
  }
  return value;
}
class OrgHeadCoachService {
  private async getViewerContext(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<ViewerContext, ServiceError>> {
    try {
      const [club, memberships, viewerMember, clubMembers, squads] = await Promise.all([
        socialFeedService.getClub(clubId),
        socialFeedService.getClubMemberships(clubId),
        clubService.getMember(clubId, viewerUserId),
        clubService.getMembers(clubId),
        squadService.getSquads(clubId),
      ]);
      if (!club) {
        return err(validationError('Club not found'));
      }
      const viewerMembership = memberships.find(
        (membership) =>
          accountIdsMatch(membership.userId, viewerUserId) && membership.status === 'active',
      );
      if (!viewerMembership || !isClubOversightRole(viewerMembership.role)) {
        return err(unauthorized('Only owners, admins, and head coaches can access oversight'));
      }
      const viewerSquadIds = (viewerMember?.squadIds ?? []).filter((id) => id !== 'squad_staff');
      const scope: HeadCoachScope =
        viewerMembership.role === 'HEAD_COACH' && viewerSquadIds.length > 0
          ? {
              type: 'assigned_squads',
              squadIds: viewerSquadIds,
              label: `${viewerSquadIds.length} assigned squad${viewerSquadIds.length === 1 ? '' : 's'}`,
            }
          : {
              type: 'club',
              squadIds: [],
              label: 'Whole club delivery',
            };
      const squadsById = new Map(squads.map((squad) => [squad.id, squad]));
      return ok({
        club,
        viewerMembership,
        viewerMember,
        scope,
        clubMembers,
        squads,
        squadsById,
      });
    } catch (error) {
      logger.error('Failed to build head coach viewer context', {
        clubId,
        viewerUserId,
        error,
      });
      return err(storageError('Failed to load head coach context'));
    }
  }
  private async ensureStandards(clubId: string, actorUserId: string): Promise<HeadCoachStandard[]> {
    const standards = await apiClient.get<HeadCoachStandard[]>(
      STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS,
      [],
    );
    const clubStandards = standards.filter((standard) => standard.clubId === clubId);
    if (clubStandards.length > 0) {
      return standards;
    }
    const nextStandards = [...standards, ...buildDefaultStandards(clubId, actorUserId)];
    await apiClient.set(STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS, nextStandards);
    return nextStandards;
  }
  private async getScopeAthletes(
    clubId: string,
    scope: HeadCoachScope,
    squads: ClubSquad[],
    bookings: Booking[],
  ): Promise<{
    athleteIds: Set<string>;
    primarySquadIdByAthleteId: Map<string, string>;
  }> {
    const scopeSquadIds =
      scope.type === 'assigned_squads'
        ? scope.squadIds
        : squads.flatMap((squad) => (squad.id !== 'squad_staff' ? [squad.id] : []));
    const athleteIds = new Set<string>();
    const primarySquadIdByAthleteId = new Map<string, string>();
    if (scopeSquadIds.length > 0) {
      const squadMembers = await squadService.getMembersForSquads(scopeSquadIds);
      for (const member of squadMembers) {
        athleteIds.add(member.athleteId);
        if (!primarySquadIdByAthleteId.has(member.athleteId)) {
          primarySquadIdByAthleteId.set(member.athleteId, member.squadId);
        }
      }
    }
    if (scope.type === 'club') {
      for (const booking of bookings) {
        if (booking.actingAs !== 'club' || booking.clubId !== clubId) continue;
        for (const athleteId of collectBookingAthleteIds(booking)) {
          athleteIds.add(athleteId);
        }
      }
    }
    return {
      athleteIds,
      primarySquadIdByAthleteId,
    };
  }
  async getOversightData(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<HeadCoachOversightData, ServiceError>> {
    try {
      const contextResult = await this.getViewerContext(clubId, viewerUserId);
      if (!contextResult.success) return contextResult;
      const context = contextResult.data;
      const [bookings, offerings, storedTasks, storedStandards, scopeAthletes] = await Promise.all([
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        apiClient.get<HeadCoachTask[]>(STORAGE_KEYS.ORG_HEAD_COACH_TASKS, []),
        this.ensureStandards(clubId, viewerUserId),
        this.getScopeAthletes(
          clubId,
          context.scope,
          context.squads,
          await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        ),
      ]);
      const scopedBookings = bookings.filter(
        (booking) => booking.actingAs === 'club' && booking.clubId === clubId,
      );
      const offeringsById = new Map(offerings.map((offering) => [offering.id, offering]));
      const offeringsBySourceEntityId = new Map<string, SessionOffering>();
      offerings.forEach((offering) => {
        if (offering.sourceEntityId) {
          offeringsBySourceEntityId.set(offering.sourceEntityId, offering);
        }
      });
      const resolveOfferingForBooking = (booking: Booking): SessionOffering | undefined => {
        const entityId = booking.sessionSourceEntityId;
        if (!entityId) return undefined;
        return offeringsById.get(entityId) || offeringsBySourceEntityId.get(entityId);
      };
      const isInScope = (params: { offering?: SessionOffering; athleteIds: string[] }): boolean => {
        if (context.scope.type === 'club') return true;
        if (params.offering?.squadId && context.scope.squadIds.includes(params.offering.squadId)) {
          return true;
        }
        return params.athleteIds.some((athleteId) => scopeAthletes.athleteIds.has(athleteId));
      };
      const completionQueue = scopedBookings
        .filter((booking) => isAwaitingCompletion(booking))
        .reduce<HeadCoachCompletionItem[]>((items, booking) => {
          const offering = resolveOfferingForBooking(booking);
          const athleteIds = collectBookingAthleteIds(booking);
          if (
            !isInScope({
              offering,
              athleteIds,
            })
          ) {
            return items;
          }
          const coachId = resolveCoachId(booking) || 'unknown_coach';
          const dueAt = resolveCompletionDueAt(booking);
          const squadId =
            offering?.squadId || scopeAthletes.primarySquadIdByAthleteId.get(athleteIds[0] || '');
          const squad = squadId ? context.squadsById.get(squadId) : undefined;
          items.push({
            bookingId: booking.id,
            offeringId: offering?.id,
            coachId,
            coachName: booking.coachName || coachId,
            athleteName: resolveBookingAthleteName(booking),
            service: booking.service || offering?.title || 'Club session',
            scheduledAt: booking.scheduledAt,
            dueAt,
            overdue: Date.now() > parseTime(dueAt),
            squadId,
            squadName: squad?.name,
          });
          return items;
        }, [])
        .sort(sortCompletionQueue);
      const activeStaff = context.clubMembers.filter(
        (member) => member.status === 'active' && isClubStaffRole(member.role),
      );
      const baseCoachIds = new Set(
        activeStaff.flatMap((member) =>
          (
            context.scope.type === 'club'
              ? true
              : intersects(member.squadIds, context.scope.squadIds) ||
                accountIdsMatch(member.userId, viewerUserId)
          )
            ? [member.userId]
            : [],
        ),
      );
      completionQueue.forEach((item) => baseCoachIds.add(item.coachId));
      const watchlistRows = await Promise.all(
        Array.from(baseCoachIds).map(async (coachId) => ({
          coachId,
          rows: await progressPracticeTaskService.listCoachFollowUpQueue(coachId),
        })),
      );
      const watchlist: HeadCoachWatchlistItem[] = watchlistRows
        .flatMap(({ coachId, rows }) =>
          rows.flatMap((row) => {
            if (
              !(context.scope.type === 'club' ? true : scopeAthletes.athleteIds.has(row.athleteId))
            )
              return [];
            const squadId = scopeAthletes.primarySquadIdByAthleteId.get(row.athleteId);
            const squad = squadId ? context.squadsById.get(squadId) : undefined;
            const coachMember = activeStaff.find((member) =>
              accountIdsMatch(member.userId, coachId),
            );
            return [
              {
                athleteId: row.athleteId,
                athleteName: row.athleteName,
                coachId,
                coachName: coachMember?.userName || row.coachId,
                risk: row.risk,
                pendingCount: row.pendingCount,
                overdueCount: row.overdueCount,
                dueSoonCount: row.dueSoonCount,
                recommendedAction: row.recommendedAction,
                nextDueAt: row.nextDueAt,
                latestCoachActionAt: row.latestCoachActionAt,
                attentionScore: row.attentionScore,
                taskIds: row.taskIds,
                squadId,
                squadName: squad?.name,
              } satisfies HeadCoachWatchlistItem,
            ];
          }),
        )
        .sort(sortWatchlist);
      watchlist.forEach((item) => baseCoachIds.add(item.coachId));
      const tasks = storedTasks
        .filter(
          (task) =>
            task.clubId === clubId &&
            (() => {
              if (context.scope.type === 'club') return true;
              if (task.squadId && context.scope.squadIds.includes(task.squadId)) return true;
              if (task.athleteId && scopeAthletes.athleteIds.has(task.athleteId)) return true;
              return false;
            })(),
        )
        .sort(sortTasks);
      const standards = storedStandards
        .filter((standard) => standard.clubId === clubId)
        .sort((left, right) => left.title.localeCompare(right.title));
      const coachHealth = Array.from(baseCoachIds)
        .map((coachId) => {
          const coachMember = activeStaff.find((member) => accountIdsMatch(member.userId, coachId));
          const coachCompletion = completionQueue.filter((item) =>
            accountIdsMatch(item.coachId, coachId),
          );
          const coachWatchlist = watchlist.filter((item) => accountIdsMatch(item.coachId, coachId));
          const coachTasks = tasks.filter((task) => accountIdsMatch(task.coachId, coachId));
          const latestCoachActionAt = coachWatchlist.reduce<string | null>((latest, item) => {
            const value = item.latestCoachActionAt;
            if (typeof value !== 'string') {
              return latest;
            }
            return latest === null || parseTime(value) > parseTime(latest) ? value : latest;
          }, null);
          return {
            coachId,
            coachName: coachMember?.userName || coachCompletion[0]?.coachName || coachId,
            role: coachMember?.role || 'COACH',
            squadNames:
              coachMember?.squadIds?.flatMap((squadId) =>
                context.scope.type === 'club'
                  ? [context.squadsById.get(squadId)?.name || squadId]
                  : context.scope.squadIds.includes(squadId)
                    ? [context.squadsById.get(squadId)?.name || squadId]
                    : [],
              ) ?? [],
            completionCount: coachCompletion.length,
            overdueCompletionCount: coachCompletion.filter((item) => item.overdue).length,
            watchAthleteCount: coachWatchlist.length,
            overdueFollowUpCount: coachWatchlist.reduce((sum, item) => sum + item.overdueCount, 0),
            openTaskCount: coachTasks.filter((task) => task.status === 'open').length,
            sessionNoteExpectationCount: coachTasks.filter(
              (task) => task.status === 'open' && task.type === 'session_note_expectation',
            ).length,
            requiredFollowUpCount: coachTasks.filter(
              (task) => task.status === 'open' && task.type === 'required_follow_up',
            ).length,
            latestCoachActionAt,
          } satisfies HeadCoachCoachHealth;
        })
        .sort(sortCoachHealth);
      const scopedSquads =
        context.scope.type === 'assigned_squads'
          ? context.squads.filter((squad) => context.scope.squadIds.includes(squad.id))
          : context.squads.filter((squad) => squad.id !== 'squad_staff');
      return ok({
        club: context.club,
        viewerMembership: context.viewerMembership,
        scope: context.scope,
        squads: scopedSquads,
        coachHealth,
        completionQueue,
        watchlist,
        tasks,
        standards,
        summary: {
          coachCount: coachHealth.length,
          squadCount: scopedSquads.length,
          awaitingCompletionCount: completionQueue.length,
          overdueCompletionCount: completionQueue.filter((item) => item.overdue).length,
          watchAthleteCount: watchlist.length,
          overdueFollowUpCount: watchlist.reduce((sum, item) => sum + item.overdueCount, 0),
          openTaskCount: tasks.filter((task) => task.status === 'open').length,
          activeStandardCount: standards.filter((standard) => standard.active).length,
        },
      });
    } catch (error) {
      logger.error('Failed to load head coach oversight data', {
        clubId,
        viewerUserId,
        error,
      });
      return err(storageError('Failed to load head coach oversight'));
    }
  }
  async createTask(params: {
    clubId: string;
    actorUserId: string;
    coachId: string;
    type: HeadCoachTaskType;
    dueAt?: string;
    athleteId?: string;
    athleteName?: string;
    bookingId?: string;
    title?: string;
    details?: string;
  }): Promise<Result<HeadCoachTask, ServiceError>> {
    try {
      const contextResult = await this.getViewerContext(params.clubId, params.actorUserId);
      if (!contextResult.success) return contextResult;
      const context = contextResult.data;
      const coach = context.clubMembers.find(
        (member) =>
          accountIdsMatch(member.userId, params.coachId) &&
          member.status === 'active' &&
          isClubStaffRole(member.role),
      );
      if (!coach) {
        return err(validationError('Selected coach is not active staff in this club'));
      }
      const normalizedType = normalizeTaskType(params.type);
      const bookings = await apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []);
      const offeringRecords = await apiClient.get<SessionOffering[]>(
        STORAGE_KEYS.SESSION_OFFERINGS,
        [],
      );
      const offeringsById = new Map(offeringRecords.map((offering) => [offering.id, offering]));
      const offeringBySourceEntityId = new Map<string, SessionOffering>();
      offeringRecords.forEach((offering) => {
        if (offering.sourceEntityId)
          offeringBySourceEntityId.set(offering.sourceEntityId, offering);
      });
      const scopeAthletes = await this.getScopeAthletes(
        params.clubId,
        context.scope,
        context.squads,
        bookings,
      );
      let relatedBooking: Booking | undefined;
      let offering: SessionOffering | undefined;
      let athleteName = params.athleteName;
      let title = params.title?.trim();
      let squadId: string | undefined;
      if (params.bookingId) {
        relatedBooking = bookings.find(
          (booking) =>
            booking.id === params.bookingId &&
            booking.actingAs === 'club' &&
            booking.clubId === params.clubId,
        );
        if (!relatedBooking) {
          return err(validationError('Booking not found in this club'));
        }
        offering = relatedBooking.sessionSourceEntityId
          ? offeringsById.get(relatedBooking.sessionSourceEntityId) ||
            offeringBySourceEntityId.get(relatedBooking.sessionSourceEntityId)
          : undefined;
        squadId = offering?.squadId;
        if (
          context.scope.type === 'assigned_squads' &&
          !(
            (squadId && context.scope.squadIds.includes(squadId)) ||
            collectBookingAthleteIds(relatedBooking).some((athleteId) =>
              scopeAthletes.athleteIds.has(athleteId),
            )
          )
        ) {
          return err(unauthorized('This booking is outside your assigned head coach scope'));
        }
        athleteName = athleteName || resolveBookingAthleteName(relatedBooking);
      }
      if (params.athleteId) {
        if (
          context.scope.type === 'assigned_squads' &&
          !scopeAthletes.athleteIds.has(params.athleteId)
        ) {
          return err(unauthorized('This athlete is outside your assigned head coach scope'));
        }
        if (!athleteName) {
          athleteName = params.athleteId;
        }
        if (!squadId) {
          squadId = scopeAthletes.primarySquadIdByAthleteId.get(params.athleteId);
        }
      }
      if (normalizedType === 'session_note_expectation' && !relatedBooking) {
        return err(validationError('Session-note expectations must target a club booking'));
      }
      if (normalizedType === 'required_follow_up' && !params.athleteId && !relatedBooking) {
        return err(validationError('Required follow-up must target an athlete or booking'));
      }
      const dueAt = (() => {
        if (params.dueAt && !Number.isNaN(parseTime(params.dueAt))) {
          return new Date(parseTime(params.dueAt)).toISOString();
        }
        if (normalizedType === 'session_note_expectation' && relatedBooking) {
          return resolveCompletionDueAt(relatedBooking);
        }
        return new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      })();
      if (!title) {
        title =
          normalizedType === 'session_note_expectation'
            ? `Submit session notes for ${athleteName || 'club session'}`
            : `Follow up with ${athleteName || 'athlete'} today`;
      }
      const tasks = await apiClient.get<HeadCoachTask[]>(STORAGE_KEYS.ORG_HEAD_COACH_TASKS, []);
      const existingIndex = tasks.findIndex(
        (task) =>
          task.clubId === params.clubId &&
          task.status === 'open' &&
          task.type === normalizedType &&
          accountIdsMatch(task.coachId, params.coachId) &&
          task.bookingId === params.bookingId &&
          task.athleteId === params.athleteId,
      );
      const nowIso = new Date().toISOString();
      const nextTask: HeadCoachTask =
        existingIndex >= 0
          ? {
              ...tasks[existingIndex],
              coachName: coach.userName,
              title,
              details: params.details?.trim() || tasks[existingIndex].details,
              dueAt,
              athleteId: params.athleteId || tasks[existingIndex].athleteId,
              athleteName: athleteName || tasks[existingIndex].athleteName,
              bookingId: params.bookingId || tasks[existingIndex].bookingId,
              offeringId: offering?.id || tasks[existingIndex].offeringId,
              squadId: squadId || tasks[existingIndex].squadId,
              updatedAt: nowIso,
            }
          : {
              id: `head_coach_task_${Date.now()}`,
              clubId: params.clubId,
              coachId: params.coachId,
              coachName: coach.userName,
              type: normalizedType,
              status: 'open',
              title,
              details: params.details?.trim() || undefined,
              dueAt,
              athleteId: params.athleteId,
              athleteName,
              bookingId: params.bookingId,
              offeringId: offering?.id,
              squadId,
              createdAt: nowIso,
              updatedAt: nowIso,
              createdByUserId: params.actorUserId,
            };
      const nextTasks = [...tasks];
      if (existingIndex >= 0) {
        nextTasks[existingIndex] = nextTask;
      } else {
        nextTasks.unshift(nextTask);
      }
      await apiClient.set(STORAGE_KEYS.ORG_HEAD_COACH_TASKS, nextTasks);
      emitTyped(ServiceEvents.ORG_HEAD_COACH_TASK_UPDATED, {
        clubId: params.clubId,
        taskId: nextTask.id,
        coachId: params.coachId,
        actorUserId: params.actorUserId,
        action: 'created',
        type: normalizedType,
      });
      return ok(nextTask);
    } catch (error) {
      logger.error('Failed to create head coach task', {
        params,
        error,
      });
      return err(storageError('Failed to create head coach task'));
    }
  }
  async setTaskStatus(params: {
    clubId: string;
    actorUserId: string;
    taskId: string;
    status: HeadCoachTaskStatus;
  }): Promise<Result<HeadCoachTask, ServiceError>> {
    try {
      const contextResult = await this.getViewerContext(params.clubId, params.actorUserId);
      if (!contextResult.success) return contextResult;
      const tasks = await apiClient.get<HeadCoachTask[]>(STORAGE_KEYS.ORG_HEAD_COACH_TASKS, []);
      const taskIndex = tasks.findIndex(
        (task) => task.id === params.taskId && task.clubId === params.clubId,
      );
      if (taskIndex < 0) {
        return err(validationError('Head coach task not found'));
      }
      const current = tasks[taskIndex];
      const nowIso = new Date().toISOString();
      const nextTask: HeadCoachTask = {
        ...current,
        status: params.status,
        updatedAt: nowIso,
        completedAt: params.status === 'done' ? nowIso : undefined,
        completedByUserId: params.status === 'done' ? params.actorUserId : undefined,
      };
      const nextTasks = [...tasks];
      nextTasks[taskIndex] = nextTask;
      await apiClient.set(STORAGE_KEYS.ORG_HEAD_COACH_TASKS, nextTasks);
      emitTyped(ServiceEvents.ORG_HEAD_COACH_TASK_UPDATED, {
        clubId: params.clubId,
        taskId: nextTask.id,
        coachId: nextTask.coachId,
        actorUserId: params.actorUserId,
        action: params.status === 'done' ? 'completed' : 'reopened',
        type: nextTask.type,
      });
      return ok(nextTask);
    } catch (error) {
      logger.error('Failed to update head coach task status', {
        params,
        error,
      });
      return err(storageError('Failed to update head coach task'));
    }
  }
  async createStandard(params: {
    clubId: string;
    actorUserId: string;
    title: string;
    description?: string;
    category?: HeadCoachStandardCategory;
  }): Promise<Result<HeadCoachStandard, ServiceError>> {
    const normalizedTitle = params.title.trim();
    if (!normalizedTitle) {
      return err(validationError('Standard title is required'));
    }
    try {
      const contextResult = await this.getViewerContext(params.clubId, params.actorUserId);
      if (!contextResult.success) return contextResult;
      const standards = await this.ensureStandards(params.clubId, params.actorUserId);
      const nowIso = new Date().toISOString();
      const nextStandard: HeadCoachStandard = {
        id: `head_coach_standard_${Date.now()}`,
        clubId: params.clubId,
        category: params.category || 'program',
        title: normalizedTitle,
        description: params.description?.trim() || undefined,
        active: true,
        createdAt: nowIso,
        updatedAt: nowIso,
        createdByUserId: params.actorUserId,
      };
      const nextStandards = [...standards, nextStandard];
      await apiClient.set(STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS, nextStandards);
      emitTyped(ServiceEvents.ORG_HEAD_COACH_STANDARD_UPDATED, {
        clubId: params.clubId,
        standardId: nextStandard.id,
        actorUserId: params.actorUserId,
        action: 'created',
        active: true,
      });
      return ok(nextStandard);
    } catch (error) {
      logger.error('Failed to create head coach standard', {
        params,
        error,
      });
      return err(storageError('Failed to create head coach standard'));
    }
  }
  async toggleStandard(params: {
    clubId: string;
    actorUserId: string;
    standardId: string;
  }): Promise<Result<HeadCoachStandard, ServiceError>> {
    try {
      const contextResult = await this.getViewerContext(params.clubId, params.actorUserId);
      if (!contextResult.success) return contextResult;
      const standards = await this.ensureStandards(params.clubId, params.actorUserId);
      const standardIndex = standards.findIndex(
        (standard) => standard.id === params.standardId && standard.clubId === params.clubId,
      );
      if (standardIndex < 0) {
        return err(validationError('Head coach standard not found'));
      }
      const nextStandard: HeadCoachStandard = {
        ...standards[standardIndex],
        active: !standards[standardIndex].active,
        updatedAt: new Date().toISOString(),
      };
      const nextStandards = [...standards];
      nextStandards[standardIndex] = nextStandard;
      await apiClient.set(STORAGE_KEYS.ORG_HEAD_COACH_STANDARDS, nextStandards);
      emitTyped(ServiceEvents.ORG_HEAD_COACH_STANDARD_UPDATED, {
        clubId: params.clubId,
        standardId: nextStandard.id,
        actorUserId: params.actorUserId,
        action: 'toggled',
        active: nextStandard.active,
      });
      return ok(nextStandard);
    } catch (error) {
      logger.error('Failed to toggle head coach standard', {
        params,
        error,
      });
      return err(storageError('Failed to update head coach standard'));
    }
  }
}
export const orgHeadCoachService = new OrgHeadCoachService();
