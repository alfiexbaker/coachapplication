import { useState, useCallback, useEffect, useMemo } from 'react';
import { router } from 'expo-router';

import { useAppAlert } from '@/components/ui/app-alert';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen } from '@/hooks/use-screen';
import { groupSessionService } from '@/services/group-session-service';
import { rsvpService } from '@/services/rsvp-service';
import { cancellationService } from '@/services/cancellation-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { useRequiredParam } from '@/hooks/use-required-param';
import { err, ok, serviceError } from '@/types/result';
import type { GroupSession, GroupRegistration, SessionRsvp, CancellationPolicy } from '@/constants/types';

const logger = createLogger('GroupSessionDetailScreen');

export const SESSION_TYPE_COLORS = {
  CAMP: '#FF6B35',
  CLINIC: '#7B68EE',
  TEAM_TRAINING: '#2E8B57',
  TRAINING: '#2E8B57',
  OPEN_SESSION: '#4169E1',
  TRIAL: '#20B2AA',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChildOption {
  id: string;
  name: string;
  initials: string;
}

/** A registration + its linked RSVP for display purposes */
export interface FamilyRegistration {
  registration: GroupRegistration;
  rsvp: SessionRsvp | null;
  childName: string;
}

export interface RsvpCounts {
  going: number;
  maybe: number;
  notGoing: number;
  pending: number;
  total: number;
}

interface GroupSessionData {
  session: GroupSession | null;
  roster: GroupRegistration[];
  rsvps: SessionRsvp[];
  cancellationPolicy: CancellationPolicy | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Map RsvpButtonGroup's 'cant_go' → rsvpService's 'not_going'
type ButtonGroupStatus = 'going' | 'maybe' | 'cant_go';
type ServiceRsvpStatus = 'going' | 'maybe' | 'not_going';

function toServiceStatus(s: ButtonGroupStatus): ServiceRsvpStatus {
  return s === 'cant_go' ? 'not_going' : s;
}

function toButtonStatus(s: string): ButtonGroupStatus | null {
  if (s === 'going') return 'going';
  if (s === 'maybe') return 'maybe';
  if (s === 'not_going') return 'cant_go';
  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGroupSession() {
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : '';
  const { showAlert } = useAppAlert();
  const { currentUser } = useAuth();
  const {
    children: contextChildren,
    activeChildId,
  } = useChildContext();

  const [registering, setRegistering] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [responding, setResponding] = useState(false);

  // Map ChildInfo[] → ChildOption[] for backward compat with ChildSelector
  const children: ChildOption[] = useMemo(
    () => contextChildren.map((c) => ({ id: c.id, name: c.name, initials: c.initials })),
    [contextChildren],
  );

  // Default selectedChildId to activeChildId when it changes
  useEffect(() => {
    if (activeChildId && children.some((c) => c.id === activeChildId)) {
      setSelectedChildId(activeChildId);
    } else if (children.length === 1) {
      setSelectedChildId(children[0].id);
    }
  }, [activeChildId, children]);

  // -------------------------------------------------------------------------
  // Data loading — session + roster + RSVPs
  // -------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    if (!idParam.valid) {
      return ok<GroupSessionData>({ session: null, roster: [], rsvps: [], cancellationPolicy: null });
    }

    try {
      const [sessionData, rosterData, rsvpData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
        rsvpService.getForSession(id),
      ]);

      // Load cancellation policy for the coach (non-blocking — default to null if fails)
      let cancellationPolicy: CancellationPolicy | null = null;
      if (sessionData?.coachId) {
        const policyResult = await cancellationService.getCancellationPolicy(sessionData.coachId);
        if (policyResult.success) {
          cancellationPolicy = policyResult.data;
        }
      }

      return ok<GroupSessionData>({
        session: sessionData,
        roster: rosterData,
        rsvps: rsvpData,
        cancellationPolicy,
      });
    } catch (loadError) {
      logger.error('Failed to load session:', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load group session. Pull down to refresh.', loadError),
      );
    }
  }, [id, idParam.valid]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<GroupSessionData>({
    load: loadData,
    deps: [id],
    events: [
      ServiceEvents.RSVP_RESPONDED,
      ServiceEvents.WAITLIST_JOINED,
      ServiceEvents.WAITLIST_LEFT,
      ServiceEvents.WAITLIST_PROMOTED,
    ],
    isEmpty: (value) => value.session === null,
    refetchOnFocus: true,
  });

  const session = data?.session ?? null;
  const roster = data?.roster;
  const rsvps = data?.rsvps;
  const cancellationPolicy = data?.cancellationPolicy ?? null;

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------

  const loading = status === 'loading';
  const isCoach = currentUser?.id === session?.coachId;
  const spotsLeft = session ? Math.max(0, session.maxParticipants - session.currentParticipants) : 0;
  const isFull = spotsLeft <= 0;
  const isFree = session?.pricePerParticipant === 0 || session?.isFree === true;
  const isActive = session?.status === 'PUBLISHED' || session?.status === 'FULL';

  // All registrations belonging to current user's family (self + children)
  const familyAthleteIds = useMemo(() => {
    const ids = new Set<string>();
    if (currentUser?.id) {
      ids.add(currentUser.id);
      ids.add(`athlete_${currentUser.id}`);
    }
    for (const child of children) {
      ids.add(child.id);
    }
    return ids;
  }, [currentUser?.id, children]);

  // All active registrations for this family
  const myRegistrations: FamilyRegistration[] = useMemo(() => {
    return (roster ?? [])
      .filter(
        (r) =>
          (r.status === 'REGISTERED' || r.status === 'WAITLISTED') &&
          (familyAthleteIds.has(r.parentId) || familyAthleteIds.has(r.athleteId)),
      )
      .map((r) => {
        const rsvp = (rsvps ?? []).find(
          (rv) =>
            rv.sessionId === r.sessionId &&
            (rv.userId === r.parentId || rv.childId === r.athleteId || rv.userId === r.athleteId),
        ) ?? null;

        // Try to find child name
        const child = children.find((c) => c.id === r.athleteId);
        const childName = child?.name || r.athleteId;

        return { registration: r, rsvp, childName };
      });
  }, [roster, rsvps, familyAthleteIds, children]);

  const isRegistered = myRegistrations.length > 0;
  const hasMultipleKids = children.length > 1;
  const waitlistedRegistrations = useMemo(
    () => myRegistrations.filter((r) => r.registration.status === 'WAITLISTED'),
    [myRegistrations],
  );
  const isWaitlisted = waitlistedRegistrations.length > 0;
  const waitlistedRoster = useMemo(
    () =>
      (roster ?? [])
        .filter((r) => r.status === 'WAITLISTED')
        .sort(
          (a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime(),
        ),
    [roster],
  );
  const waitlistPosition = useMemo(() => {
    const firstWaitlisted = waitlistedRegistrations[0]?.registration.id;
    if (!firstWaitlisted) return null;
    const index = waitlistedRoster.findIndex((r) => r.id === firstWaitlisted);
    return index >= 0 ? index + 1 : null;
  }, [waitlistedRegistrations, waitlistedRoster]);
  const waitlistTotal = waitlistedRoster.length;

  // Which children are already registered?
  const registeredChildIds = useMemo(
    () => new Set(myRegistrations.map((r) => r.registration.athleteId)),
    [myRegistrations],
  );

  // Children available to register (not yet registered)
  const unregisteredChildren = useMemo(
    () => children.filter((c) => !registeredChildIds.has(c.id)),
    [children, registeredChildIds],
  );

  // Deadline derived state
  const deadline = session?.registrationDeadline ?? null;
  const isDeadlinePassed = deadline ? new Date(deadline).getTime() < Date.now() : false;

  // RSVP counts (for coach view)
  const rsvpCounts: RsvpCounts = useMemo(() => {
    const sourceRsvps = rsvps ?? [];
    const counts = { going: 0, maybe: 0, notGoing: 0, pending: 0, total: sourceRsvps.length };
    for (const r of sourceRsvps) {
      if (r.status === 'going') counts.going++;
      else if (r.status === 'maybe') counts.maybe++;
      else if (r.status === 'not_going') counts.notGoing++;
      else counts.pending++;
    }
    return counts;
  }, [rsvps]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const performRegister = useCallback(
    async (athleteId: string) => {
      if (!session || !currentUser) return;

      setRegistering(true);
      try {
        const result = await groupSessionService.register(
          session.id,
          athleteId,
          currentUser.id,
        );
        if (!result.success) {
          showAlert('Error', result.error.message || 'Failed to register. Please try again.');
          return;
        }

        // Auto-create RSVP as "going"
        try {
          const childName = children.find((c) => c.id === athleteId)?.name;
          await rsvpService.createForSession(session.id, [
            { userId: currentUser.id, childId: athleteId, childName },
          ]);
        } catch {
          // Non-fatal — RSVP creation failure shouldn't block registration
          logger.warn('Failed to create auto-RSVP on registration');
        }

        onRefresh();

        if (result.data.status === 'WAITLISTED') {
          showAlert(
            'Waitlisted',
            "You've been added to the waitlist. We'll notify you when a spot opens.",
          );
        } else {
          const name = children.find((c) => c.id === athleteId)?.name;
          showAlert('Registered', name ? `${name} is registered!` : 'Registration successful!');
        }
      } catch (regError) {
        logger.error('Failed to register:', regError);
        showAlert('Error', 'Failed to register. Please try again.');
      } finally {
        setRegistering(false);
      }
    },
    [children, currentUser, onRefresh, session, showAlert],
  );

  /** Register a child (or self) for this session + auto-create RSVP as "going" */
  const handleRegister = useCallback(() => {
    if (!session || !currentUser) return;
    if (isDeadlinePassed) {
      showAlert('Registration Closed', 'The registration deadline for this session has passed.');
      return;
    }

    // If parent has kids, require child selection
    const athleteId = children.length > 0
      ? selectedChildId
      : currentUser.id;

    if (!athleteId) {
      showAlert('Select Child', 'Please select which child to register.');
      return;
    }

    // Check if already registered
    if (registeredChildIds.has(athleteId)) {
      showAlert('Already Registered', 'This child is already registered for this session.');
      return;
    }

    const athleteName = children.find((c) => c.id === athleteId)?.name || 'Athlete';
    const nextDate = session.schedule[0]?.date
      ? new Date(`${session.schedule[0].date}T${session.schedule[0].startTime || '09:00'}`)
      : null;
    const sessionDateLabel = nextDate
      ? nextDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'upcoming date';
    const sessionTimeLabel = session.schedule[0]?.startTime || '';
    const sessionPriceLabel = session.pricePerParticipant > 0 ? `£${session.pricePerParticipant}` : 'Free';

    const isJoiningWaitlist = isFull && session.waitlistEnabled;
    const title = isJoiningWaitlist ? 'Join waitlist?' : 'Review registration';
    const body = isJoiningWaitlist
      ? `${athleteName} will join the waitlist for "${session.title}" (${sessionDateLabel}${sessionTimeLabel ? ` · ${sessionTimeLabel}` : ''}).`
      : `${athleteName} will be registered for "${session.title}" (${sessionDateLabel}${sessionTimeLabel ? ` · ${sessionTimeLabel}` : ''}) at ${sessionPriceLabel}.`;

    showAlert(title, body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: isJoiningWaitlist ? 'Join Waitlist' : 'Continue',
        onPress: () => {
          void performRegister(athleteId);
        },
      },
    ]);
  }, [
    children,
    currentUser,
    isDeadlinePassed,
    isFull,
    performRegister,
    registeredChildIds,
    selectedChildId,
    session,
    showAlert,
  ]);

  /** Cancel a specific registration */
  const handleUnregister = useCallback(
    async (familyReg?: FamilyRegistration) => {
      const target = familyReg ?? myRegistrations[0];
      if (!session || !target) return;

      const label = children.length > 0 ? `${target.childName}'s registration` : 'your registration';

      showAlert(
        'Cancel Registration',
        `Are you sure you want to cancel ${label} for "${session.title}"?`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Cancel Registration',
            style: 'destructive',
            onPress: async () => {
              try {
                const result = await groupSessionService.cancelRegistration(
                  target.registration.id,
                );
                if (!result.success) {
                  showAlert('Error', result.error.message || 'Failed to cancel registration.');
                  return;
                }
                onRefresh();
              } catch (cancelError) {
                logger.error('Failed to cancel registration:', cancelError);
                showAlert('Error', 'Failed to cancel registration. Please try again.');
              }
            },
          },
        ],
      );
    },
    [session, myRegistrations, children, onRefresh, showAlert],
  );

  /** Respond to RSVP for a specific family registration */
  const handleRsvpRespond = useCallback(
    async (familyReg: FamilyRegistration, buttonStatus: ButtonGroupStatus) => {
      // Deadline guard — block responses after deadline
      if (isDeadlinePassed) {
        showAlert('Deadline Passed', 'The RSVP deadline for this session has passed.');
        return;
      }

      if (!familyReg.rsvp) {
        // Create RSVP if it doesn't exist yet
        if (!session || !currentUser) return;
        try {
          const created = await rsvpService.createForSession(session.id, [
            { userId: currentUser.id, childId: familyReg.registration.athleteId },
          ]);
          if (created.length > 0) {
            await rsvpService.respond(created[0].id, toServiceStatus(buttonStatus));
          }
        } catch {
          logger.error('Failed to create + respond to RSVP');
        }
        onRefresh();
        return;
      }

      setResponding(true);
      try {
        const result = await rsvpService.respond(familyReg.rsvp.id, toServiceStatus(buttonStatus));
        if (!result.success) {
          logger.error('Failed to update RSVP response', { rsvpId: familyReg.rsvp.id });
        }
        onRefresh();
      } catch {
        logger.error('Failed to update RSVP response');
      } finally {
        setResponding(false);
      }
    },
    [session, currentUser, onRefresh, isDeadlinePassed, showAlert],
  );

  /** Coach cancels the entire session */
  const handleCancel = useCallback(async () => {
    if (!session) return;

    showAlert('Cancel Session', 'Are you sure you want to cancel this session? All registrations will be cancelled.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await groupSessionService.cancelSession(session.id);
            if (!result.success) {
              showAlert('Error', result.error.message || 'Failed to cancel session.');
              return;
            }
            // Clean up RSVPs
            await rsvpService.deleteForSession(session.id).catch(() => {});
            router.back();
          } catch (cancelErr) {
            logger.error('Failed to cancel:', cancelErr);
            showAlert('Error', 'Failed to cancel session.');
          }
        },
      },
    ]);
  }, [session, showAlert]);

  /** Coach sends RSVP reminders to non-responders */
  const handleSendReminder = useCallback(async () => {
    if (!session) return;
    try {
      await rsvpService.sendReminder(session.id);
      showAlert('Reminders Sent', `Sent to ${rsvpCounts.pending} non-responder${rsvpCounts.pending !== 1 ? 's' : ''}.`);
    } catch {
      showAlert('Error', 'Failed to send reminders.');
    }
  }, [session, rsvpCounts.pending, showAlert]);

  return {
    id,
    session,
    roster,
    rsvps,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    registering,
    responding,
    isCoach,
    isRegistered,
    isWaitlisted,
    isActive,
    isFull,
    isFree,
    spotsLeft,
    // Multi-child
    children,
    hasMultipleKids,
    selectedChildId,
    setSelectedChildId,
    unregisteredChildren,
    // Family registrations (all kids)
    myRegistrations,
    waitlistPosition,
    waitlistTotal,
    // RSVP
    rsvpCounts,
    // Cancellation policy
    cancellationPolicy,
    // Handlers
    handleRegister,
    handleUnregister,
    handleRsvpRespond,
    handleCancel,
    handleSendReminder,
    // Deadline
    deadline,
    isDeadlinePassed,
    // Helpers
    toButtonStatus,
  };
}
