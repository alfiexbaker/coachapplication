import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row, Column } from '@/components/primitives';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useCreateSession } from '@/hooks/use-create-session';
import { CreateStepIndicator } from '@/components/session/create-step-indicator';
import { CreateDetailsStep } from '@/components/session/create-details-step';
import { CreateScheduleStep } from '@/components/session/create-schedule-step';
import { CreateReviewStep } from '@/components/session/create-review-step';
import { CreateInviteStep } from '@/components/session/create-invite-step';
import { CreateFooterBar } from '@/components/session/create-footer-bar';
import { Routes } from '@/navigation/routes';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { rosterService } from '@/services/roster-service';
import { inviteService } from '@/services/invite';
import { groupSessionService } from '@/services/group-session-service';
import { academyService } from '@/services/academy-service';
import { userService } from '@/services/user-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { getRosterAthleteName, getRosterParentName } from '@/utils/roster-display';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import type { Academy, AcademyMembership, GroupSession, SessionOffering, TimeSlot } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

type FlowMode = 'choose' | 'new' | 'existing';
type ExistingSessionSource = 'offering' | 'group';
type ExistingSessionScope = 'assigned' | 'club';

type ExistingSessionOption = {
  id: string;
  source: ExistingSessionSource;
  title: string;
  startsAt: string;
  location: string;
  inviteType?: 'OPEN' | 'CLOSED' | 'SQUAD_ONLY';
  focus?: string;
  price?: number;
  currentParticipants?: number;
  maxParticipants?: number;
  slot: TimeSlot;
};

type InviteAthlete = {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
};

type InviteAssigneeOption = {
  id: string;
  label: string;
  role: AcademyMembership['role'];
};

type AcademyOption = Academy & { membership: AcademyMembership };

const STAFF_ROLE_ORDER: Record<AcademyMembership['role'], number> = {
  OWNER: 0,
  ADMIN: 1,
  HEAD_COACH: 2,
  COACH: 3,
  ASSISTANT: 4,
  MEMBER: 5,
};

interface ExistingInviteFlowProps {
  forcedIntent: boolean;
  initialAthleteIds: string[];
  initialOfferingId?: string;
  initialDate?: string;
  initialActingAs?: 'self' | 'club';
  initialClubId?: string;
  initialAssigneeCoachId?: string;
}

function canCreateAsClub(membership: AcademyMembership): boolean {
  return membership.permissions.includes('CREATE_SESSIONS');
}

function canPostAsClub(membership: AcademyMembership): boolean {
  return membership.permissions.includes('POST_AS_ACADEMY');
}

function toIsoStart(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const outH = Math.floor(total / 60) % 24;
  const outM = total % 60;
  return `${String(outH).padStart(2, '0')}:${String(outM).padStart(2, '0')}`;
}

function mapOfferingToExisting(offering: SessionOffering): ExistingSessionOption {
  const start = new Date(offering.scheduledAt);
  const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
  const date = safeStart.toISOString().slice(0, 10);
  const startTime = `${String(safeStart.getHours()).padStart(2, '0')}:${String(
    safeStart.getMinutes(),
  ).padStart(2, '0')}`;
  const duration = offering.duration ?? 60;
  const endTime = addMinutesToTime(startTime, duration);
  const confirmedCount = getSessionOfferingHeadcount(offering);

  return {
    id: offering.id,
    source: 'offering',
    title: offering.title,
    startsAt: offering.scheduledAt,
    location: offering.location,
    inviteType: offering.inviteType,
    focus: offering.footballSkill,
    price: offering.price,
    currentParticipants: confirmedCount,
    maxParticipants: offering.maxParticipants,
    slot: {
      date,
      startTime,
      endTime,
      location: offering.location,
    },
  };
}

function mapGroupSessionToExisting(session: GroupSession): ExistingSessionOption | null {
  const now = new Date();
  const next = [...(session.schedule ?? [])]
    .map((item) => ({
      ...item,
      startsAt: toIsoStart(item.date, item.startTime),
    }))
    .filter((item) => new Date(item.startsAt) >= now)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

  if (!next) return null;

  return {
    id: session.id,
    source: 'group',
    title: session.title,
    startsAt: next.startsAt,
    location: session.location,
    inviteType: session.inviteType,
    focus: session.focus?.[0],
    price: session.pricePerParticipant,
    currentParticipants: session.currentParticipants,
    maxParticipants: session.maxParticipants,
    slot: {
      date: next.date,
      startTime: next.startTime,
      endTime: next.endTime,
      location: session.location,
    },
  };
}

function ExistingInviteFlow({
  forcedIntent,
  initialAthleteIds,
  initialOfferingId,
  initialDate,
  initialActingAs,
  initialClubId,
  initialAssigneeCoachId,
}: ExistingInviteFlowProps) {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [athletes, setAthletes] = useState<InviteAthlete[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(initialAthleteIds);
  const [sessions, setSessions] = useState<ExistingSessionOption[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(initialOfferingId ?? null);
  const [notes, setNotes] = useState('');
  const [academies, setAcademies] = useState<AcademyOption[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<InviteAssigneeOption[]>([]);
  const [postingAs, setPostingAs] = useState<'self' | 'club'>(
    initialActingAs === 'club' ? 'club' : 'self',
  );
  const [selectedClubId, setSelectedClubId] = useState<string | null>(initialClubId ?? null);
  const [assigneeCoachId, setAssigneeCoachId] = useState<string | null>(
    initialAssigneeCoachId ?? currentUser?.id ?? null,
  );
  const [sessionScope, setSessionScope] = useState<ExistingSessionScope>('assigned');

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const selectedClub = useMemo(
    () => academies.find((academy) => academy.id === selectedClubId) ?? null,
    [academies, selectedClubId],
  );

  const ownerCoachId =
    postingAs === 'club'
      ? assigneeCoachId ?? currentUser?.id ?? null
      : currentUser?.id ?? null;
  const canPostAsSelectedClub = selectedClub ? canPostAsClub(selectedClub.membership) : false;
  const selectedAssignee = useMemo(
    () => assigneeOptions.find((option) => option.id === assigneeCoachId) ?? null,
    [assigneeCoachId, assigneeOptions],
  );

  const canSend =
    selectedAthleteIds.length > 0 &&
    selectedSession !== null &&
    !submitting &&
    (postingAs === 'self' ||
      (Boolean(selectedClubId) && Boolean(assigneeCoachId) && canPostAsSelectedClub)) &&
    Boolean(ownerCoachId);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!currentUser?.id) return;
      const useClubScope = postingAs === 'club' && sessionScope === 'club' && Boolean(selectedClubId);
      const sessionOwnerCoachId = ownerCoachId ?? currentUser.id;

      setLoading(true);
      try {
        const [roster, offerings, scopedGroupSessions, academyResult] = await Promise.all([
          rosterService.getRoster(currentUser.id),
          apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
          useClubScope && selectedClubId
            ? groupSessionService.getClubTrainingSessions(selectedClubId)
            : groupSessionService.getCoachSessions(sessionOwnerCoachId),
          academyService.getUserAcademies(currentUser.id),
        ]);

        if (!active) return;

        const athleteRows: InviteAthlete[] = roster.map((entry) => ({
          id: entry.athleteId,
          name: getRosterAthleteName(entry),
          parentId: entry.parentId,
          parentName: getRosterParentName(entry),
        }));
        setAthletes(athleteRows);

        const now = new Date();
        const filteredOfferings = offerings
          .filter((offering) => {
            if (offering.status === 'cancelled') return false;
            if (!offering.isRecurring && new Date(offering.scheduledAt) < now) return false;
            if (getSessionOfferingHeadcount(offering) >= offering.maxParticipants) return false;
            if (useClubScope && selectedClubId) {
              return offering.actingAs === 'club' && offering.clubId === selectedClubId;
            }
            return offering.coachId === sessionOwnerCoachId;
          })
          .map(mapOfferingToExisting);

        const filteredGroupSessions = scopedGroupSessions
          .filter(
            (session) =>
              session.status === 'PUBLISHED' &&
              (session.currentParticipants ?? 0) < (session.maxParticipants ?? 0),
          )
          .map(mapGroupSessionToExisting)
          .filter((session): session is ExistingSessionOption => session !== null);

        const merged = [...filteredOfferings, ...filteredGroupSessions].sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );

        const dateFiltered = initialDate
          ? merged.filter((session) => session.slot.date === initialDate)
          : merged;
        const finalSessions = dateFiltered.length > 0 ? dateFiltered : merged;
        setSessions(finalSessions);

        setSelectedSessionId((previous) =>
          previous && finalSessions.some((session) => session.id === previous)
            ? previous
            : finalSessions[0]?.id ?? null,
        );

        if (academyResult.success) {
          const eligibleAcademies = academyResult.data.filter((academy) =>
            canCreateAsClub(academy.membership),
          );
          setAcademies(eligibleAcademies);
          setSelectedClubId((previous) => {
            if (previous && eligibleAcademies.some((academy) => academy.id === previous)) {
              return previous;
            }
            if (
              initialClubId &&
              eligibleAcademies.some((academy) => academy.id === initialClubId)
            ) {
              return initialClubId;
            }
            return eligibleAcademies[0]?.id ?? null;
          });
        } else {
          setAcademies([]);
        }
      } catch {
        uiFeedback.showToast('Failed to load session invite data. Pull to retry.', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [currentUser?.id, initialClubId, initialDate, ownerCoachId, postingAs, selectedClubId, sessionScope]);

  useEffect(() => {
    if (postingAs !== 'club') {
      setAssigneeCoachId(currentUser?.id ?? null);
      return;
    }
    if (!assigneeCoachId) {
      setAssigneeCoachId(currentUser?.id ?? null);
    }
  }, [assigneeCoachId, currentUser?.id, postingAs]);

  useEffect(() => {
    if (postingAs !== 'club' && sessionScope !== 'assigned') {
      setSessionScope('assigned');
    }
  }, [postingAs, sessionScope]);

  useEffect(() => {
    let active = true;

    const loadAssignees = async () => {
      if (!selectedClubId) {
        setAssigneeOptions([]);
        setAssigneeCoachId(currentUser?.id ?? null);
        return;
      }

      const staffResult = await academyService.getStaff(selectedClubId);
      if (!active) return;
      if (!staffResult.success) {
        setAssigneeOptions([]);
        return;
      }

      const staff = staffResult.data.filter((member) => member.status === 'ACTIVE');
      const ids = staff.map((member) => member.userId);
      const usersResult = await userService.getUsersByIds(ids);
      const nameById = new Map<string, string>();
      if (usersResult.success) {
        usersResult.data.forEach((user) => {
          const label = user.name?.trim() || user.id;
          nameById.set(user.id, label);
        });
      }

      const options = staff
        .map((member) => ({
          id: member.userId,
          role: member.role,
          label: nameById.get(member.userId) ?? member.userId,
        }))
        .sort((a, b) => STAFF_ROLE_ORDER[a.role] - STAFF_ROLE_ORDER[b.role]);

      setAssigneeOptions(options);
      setAssigneeCoachId((previous) => {
        if (previous && options.some((option) => option.id === previous)) {
          return previous;
        }
        if (
          initialAssigneeCoachId &&
          options.some((option) => option.id === initialAssigneeCoachId)
        ) {
          return initialAssigneeCoachId;
        }
        if (currentUser?.id && options.some((option) => option.id === currentUser.id)) {
          return currentUser.id;
        }
        return options[0]?.id ?? null;
      });
    };

    void loadAssignees();
    return () => {
      active = false;
    };
  }, [currentUser?.id, initialAssigneeCoachId, selectedClubId]);

  const toggleAthlete = useCallback((athleteId: string) => {
    setSelectedAthleteIds((previous) =>
      previous.includes(athleteId)
        ? previous.filter((id) => id !== athleteId)
        : [...previous, athleteId],
    );
  }, []);

  const handleBack = useCallback(() => {
    if (forcedIntent) {
      router.back();
      return;
    }
    router.replace(Routes.SESSIONS_CREATE);
  }, [forcedIntent]);

  const handleSubmit = useCallback(async () => {
    if (!currentUser || !selectedSession) return;
    if (postingAs === 'club' && !selectedClub) {
      uiFeedback.showToast('Choose which club you are posting on behalf of.');
      return;
    }
    if (postingAs === 'club' && !canPostAsSelectedClub) {
      uiFeedback.showToast('You do not have permission to post invites as this club.', 'error');
      return;
    }
    if (postingAs === 'club' && !assigneeCoachId) {
      uiFeedback.showToast('Choose a coach owner before sending invites.');
      return;
    }
    if (!ownerCoachId) {
      uiFeedback.showToast('Choose a coach owner before sending invites.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedAthletes = athletes.filter((athlete) => selectedAthleteIds.includes(athlete.id));
      const groupedByParent = selectedAthletes.reduce<Record<string, InviteAthlete[]>>((acc, athlete) => {
        if (!acc[athlete.parentId]) {
          acc[athlete.parentId] = [];
        }
        acc[athlete.parentId].push(athlete);
        return acc;
      }, {});

      let sentCount = 0;
      let failedCount = 0;
      let ownerCoachName = currentUser.name || currentUser.fullName || 'Coach';
      if (ownerCoachId !== currentUser.id) {
        const ownerResult = await userService.getUserById(ownerCoachId);
        if (ownerResult.success) {
          ownerCoachName = ownerResult.data.name?.trim() || ownerCoachName;
        }
      }

      for (const athletesForParent of Object.values(groupedByParent)) {
        const parentId = athletesForParent[0]?.parentId;
        if (!parentId) {
          failedCount += athletesForParent.length;
          continue;
        }

        const result = await inviteService.createInvite(
          athletesForParent.map((athlete) => athlete.id),
          {
            coachId: ownerCoachId,
            coachName: ownerCoachName,
            parentId,
            parentName: athletesForParent[0]?.parentName || 'Parent',
            athleteNames: athletesForParent.map((athlete) => athlete.name),
            clubName: postingAs === 'club' ? selectedClub?.name : undefined,
            inviteType: selectedSession.inviteType ?? 'CLOSED',
            proposedSlots: [selectedSession.slot],
            sessionType: selectedSession.title,
            focus: selectedSession.focus ?? 'General',
            notes: [
              notes.trim() || `You're invited to join "${selectedSession.title}"`,
              postingAs === 'club' && selectedClub
                ? `Created by ${currentUser.name || currentUser.fullName || 'Club staff'} on behalf of ${selectedClub.name}. Session owner: ${ownerCoachName}.`
                : null,
            ]
              .filter(Boolean)
              .join('\n\n'),
            price: selectedSession.price,
            expiresInDays: 7,
            existingSessionId: selectedSession.id,
          },
        );

        if (result.success) {
          sentCount += athletesForParent.length;
        } else {
          failedCount += athletesForParent.length;
        }
      }

      if (selectedSession.source === 'offering' && sentCount > 0) {
        const allOfferings = await apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []);
        const updated = allOfferings.map((offering) => {
          if (offering.id !== selectedSession.id) return offering;
          const ids = new Set(offering.invitedAthleteIds ?? []);
          const names = new Set(offering.invitedAthleteNames ?? []);
          athletes
            .filter((athlete) => selectedAthleteIds.includes(athlete.id))
            .forEach((athlete) => {
              ids.add(athlete.id);
              names.add(athlete.name);
            });
          return {
            ...offering,
            invitedAthleteIds: Array.from(ids),
            invitedAthleteNames: Array.from(names),
          };
        });
        await apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, updated);
      }

      showToast(
        failedCount > 0
          ? `${sentCount} invite(s) sent, ${failedCount} failed.`
          : `${sentCount} invite(s) sent successfully.`,
        failedCount > 0 ? 'warning' : 'success',
      );
      if (selectedSession.source === 'group') {
        router.replace(Routes.groupSession(selectedSession.id));
      } else {
        router.replace(Routes.BOOKINGS);
      }
    } catch {
      uiFeedback.showToast('Failed to send invites. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [
    athletes,
    canPostAsSelectedClub,
    currentUser,
    notes,
    assigneeCoachId,
    ownerCoachId,
    postingAs,
    selectedAthleteIds,
    selectedClub,
    selectedSession,
    showToast,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Add to Session"
        showBack
        onBackPress={handleBack}
        centerTitle
      />

      {loading ? (
        <View style={styles.loadingState}>
          <ThemedText style={{ color: colors.muted }}>Loading sessions...</ThemedText>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold">Who to invite</ThemedText>
              {athletes.length === 0 ? (
                <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                  No roster athletes found.
                </ThemedText>
              ) : (
                athletes.map((athlete) => {
                  const selected = selectedAthleteIds.includes(athlete.id);
                  return (
                    <Clickable
                      key={athlete.id}
                      onPress={() => toggleAthlete(athlete.id)}
                      style={[
                        styles.listRow,
                        {
                          borderColor: selected ? colors.tint : colors.border,
                          backgroundColor: selected ? withAlpha(colors.tint, 0.06) : colors.surface,
                        },
                      ]}
                    >
                      <Row align="center" gap="sm">
                        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
                          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
                            {athlete.name.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                        <View style={styles.rowText}>
                          <ThemedText style={styles.rowTitle}>{athlete.name}</ThemedText>
                          <ThemedText style={[styles.rowSub, { color: colors.muted }]}>
                            {athlete.parentName}
                          </ThemedText>
                        </View>
                        {selected && <Ionicons name="checkmark-circle" size={18} color={colors.tint} />}
                      </Row>
                    </Clickable>
                  );
                })
              )}
            </SurfaceCard>

            {academies.length > 0 && (
              <SurfaceCard style={styles.sectionCard}>
                <ThemedText type="defaultSemiBold">Invite as</ThemedText>
                <Row gap="sm" style={{ marginTop: Spacing.sm }}>
                  <Clickable
                    onPress={() => setPostingAs('self')}
                    style={[
                      styles.modeChip,
                      {
                        borderColor: postingAs === 'self' ? colors.tint : colors.border,
                        backgroundColor:
                          postingAs === 'self' ? withAlpha(colors.tint, 0.07) : colors.surface,
                      },
                    ]}
                  >
                    <ThemedText style={{ color: postingAs === 'self' ? colors.tint : colors.text }}>
                      As me
                    </ThemedText>
                  </Clickable>
                  <Clickable
                    onPress={() => setPostingAs('club')}
                    style={[
                      styles.modeChip,
                      {
                        borderColor: postingAs === 'club' ? colors.tint : colors.border,
                        backgroundColor:
                          postingAs === 'club' ? withAlpha(colors.tint, 0.07) : colors.surface,
                      },
                    ]}
                  >
                    <ThemedText style={{ color: postingAs === 'club' ? colors.tint : colors.text }}>
                      On behalf of club
                    </ThemedText>
                  </Clickable>
                </Row>
                {postingAs === 'club' && (
                  <Column gap="xs" style={{ marginTop: Spacing.sm }}>
                    {academies.map((academy) => {
                      const selected = selectedClubId === academy.id;
                      return (
                        <Clickable
                          key={academy.id}
                          onPress={() => setSelectedClubId(academy.id)}
                          style={[
                            styles.inlineOption,
                            {
                              borderColor: selected ? colors.success : colors.border,
                              backgroundColor: selected
                                ? withAlpha(colors.success, 0.08)
                                : colors.surface,
                            },
                          ]}
                        >
                          <ThemedText style={{ color: selected ? colors.success : colors.text }}>
                            {academy.name}
                          </ThemedText>
                        </Clickable>
                      );
                    })}
                    <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                      Assign coach
                    </ThemedText>
                    <Row wrap gap="xs">
                      {assigneeOptions.map((assignee) => {
                        const selected = assigneeCoachId === assignee.id;
                        return (
                          <Clickable
                            key={assignee.id}
                            onPress={() => setAssigneeCoachId(assignee.id)}
                            style={[
                              styles.assigneeChip,
                              {
                                borderColor: selected ? colors.tint : colors.border,
                                backgroundColor: selected
                                  ? withAlpha(colors.tint, 0.07)
                                  : colors.surface,
                              },
                            ]}
                          >
                            <ThemedText
                              style={{
                                color: selected ? colors.tint : colors.text,
                                ...Typography.smallSemiBold,
                              }}
                            >
                              {assignee.label}
                            </ThemedText>
                            <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                              {assignee.role.replace('_', ' ')}
                            </ThemedText>
                          </Clickable>
                        );
                      })}
                    </Row>
                    <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                      Session picker scope
                    </ThemedText>
                    <Row gap="xs">
                      <Clickable
                        onPress={() => setSessionScope('assigned')}
                        style={[
                          styles.modeChip,
                          {
                            borderColor: sessionScope === 'assigned' ? colors.tint : colors.border,
                            backgroundColor:
                              sessionScope === 'assigned'
                                ? withAlpha(colors.tint, 0.07)
                                : colors.surface,
                          },
                        ]}
                      >
                        <ThemedText
                          style={{
                            color: sessionScope === 'assigned' ? colors.tint : colors.text,
                          }}
                        >
                          Assigned coach
                        </ThemedText>
                      </Clickable>
                      <Clickable
                        onPress={() => setSessionScope('club')}
                        disabled={!selectedClubId}
                        style={[
                          styles.modeChip,
                          {
                            borderColor: sessionScope === 'club' ? colors.tint : colors.border,
                            backgroundColor:
                              sessionScope === 'club'
                                ? withAlpha(colors.tint, 0.07)
                                : colors.surface,
                            opacity: selectedClubId ? 1 : 0.55,
                          },
                        ]}
                      >
                        <ThemedText
                          style={{ color: sessionScope === 'club' ? colors.tint : colors.text }}
                        >
                          Club-wide
                        </ThemedText>
                      </Clickable>
                    </Row>
                  </Column>
                )}
              </SurfaceCard>
            )}

            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold">Ownership summary</ThemedText>
              <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                {postingAs === 'club' && selectedClub
                  ? `Invites are sent on behalf of ${selectedClub.name}.`
                  : 'Invites are sent from your coach profile.'}
              </ThemedText>
              {postingAs === 'club' && (
                <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                  Session owner: {selectedAssignee?.label || 'Select a coach'}
                </ThemedText>
              )}
              {postingAs === 'club' && (
                <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                  Session picker: {sessionScope === 'club' ? 'Club-wide sessions' : 'Assigned coach sessions'}
                </ThemedText>
              )}
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold">Choose session</ThemedText>
              {sessions.length === 0 ? (
                <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                  No upcoming published sessions available.
                </ThemedText>
              ) : (
                sessions.map((session) => {
                  const selected = session.id === selectedSessionId;
                  return (
                    <Clickable
                      key={`${session.source}-${session.id}`}
                      onPress={() => setSelectedSessionId(session.id)}
                      style={[
                        styles.listRow,
                        {
                          borderColor: selected ? colors.success : colors.border,
                          backgroundColor: selected
                            ? withAlpha(colors.success, 0.06)
                            : colors.surface,
                        },
                      ]}
                    >
                      <Row align="center" gap="sm">
                        <View style={[styles.sessionIcon, { backgroundColor: withAlpha(colors.success, 0.1) }]}>
                          <Ionicons name="calendar-outline" size={16} color={colors.success} />
                        </View>
                        <View style={styles.rowText}>
                          <ThemedText style={styles.rowTitle}>{session.title}</ThemedText>
                          <ThemedText style={[styles.rowSub, { color: colors.muted }]}>
                            {new Date(session.startsAt).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}{' '}
                            · {session.slot.startTime} · {session.location}
                          </ThemedText>
                        </View>
                        {selected && (
                          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        )}
                      </Row>
                    </Clickable>
                  );
                })
              )}
            </SurfaceCard>

            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold">Optional note</ThemedText>
              <TextInput
                style={[
                  styles.notesInput,
                  { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
                ]}
                placeholder="Add a short context note..."
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
                multiline

            maxLength={500}
          />
            </SurfaceCard>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Clickable
              onPress={handleSubmit}
              disabled={!canSend}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: canSend ? colors.tint : colors.border,
                  opacity: canSend ? 1 : 0.6,
                },
              ]}
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                {submitting ? 'Sending...' : 'Send invites'}
              </ThemedText>
            </Clickable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

export default function CreateSessionScreen() {
  const { colors } = useTheme();
  const state = useCreateSession();
  const stepScrollRef = useRef<ScrollView | null>(null);
  const params = useLocalSearchParams<{
    intent?: 'new' | 'existing' | 'invite';
    source?: string;
    athleteIds?: string;
    athleteNames?: string;
    offeringId?: string;
    date?: string;
    actingAs?: 'self' | 'club';
    clubId?: string;
    assigneeCoachId?: string;
  }>();

  const normalizedIntent = useMemo(() => {
    const intent = params.intent;
    const forcedIntent = intent === 'new' || intent === 'existing' || intent === 'invite';
    const mode: FlowMode =
      intent === 'existing' || intent === 'invite'
        ? 'existing'
        : intent === 'new'
          ? 'new'
          : 'choose';
    const athleteIds =
      params.athleteIds
        ?.split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0) ?? [];
    return {
      forcedIntent,
      mode,
      athleteIds,
      offeringId: params.offeringId,
      date: params.date,
      actingAs: params.actingAs,
      clubId: params.clubId,
      assigneeCoachId: params.assigneeCoachId,
    };
  }, [
    params.actingAs,
    params.assigneeCoachId,
    params.athleteIds,
    params.clubId,
    params.date,
    params.intent,
    params.offeringId,
  ]);

  const [mode, setMode] = useState<FlowMode>(normalizedIntent.mode);

  useEffect(() => {
    setMode(normalizedIntent.mode);
  }, [normalizedIntent.mode]);

  useEffect(() => {
    stepScrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [state.step]);

  const handleCancel = useCallback(() => router.back(), []);
  const startTemplate = useCallback(
    (template: '1on1' | 'small_group' | 'camp') => {
      state.setSessionType(template);
      state.setRecurrence('once');
      setMode('new');
    },
    [state],
  );
  const selectedClubName = useMemo(
    () => state.clubOptions.find((club) => club.id === state.selectedClubId)?.name,
    [state.clubOptions, state.selectedClubId],
  );
  const selectedAssigneeName = useMemo(
    () => state.assigneeOptions.find((assignee) => assignee.id === state.selectedAssigneeId)?.label,
    [state.assigneeOptions, state.selectedAssigneeId],
  );

  if (mode === 'existing') {
    return (
      <ExistingInviteFlow
        forcedIntent={normalizedIntent.forcedIntent}
        initialAthleteIds={normalizedIntent.athleteIds}
        initialOfferingId={normalizedIntent.offeringId}
        initialDate={normalizedIntent.date}
        initialActingAs={normalizedIntent.actingAs}
        initialClubId={normalizedIntent.clubId}
        initialAssigneeCoachId={normalizedIntent.assigneeCoachId}
      />
    );
  }

  if (mode === 'choose') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader title="Create / Invite Session" showBack centerTitle />

        <View style={styles.chooseContent}>
          <Clickable
            onPress={() => setMode('new')}
            style={[styles.choiceCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Row gap="sm" align="center">
              <View style={[styles.choiceIcon, { backgroundColor: withAlpha(colors.tint, 0.1) }]}>
                <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
              </View>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>Book New Session</ThemedText>
                <ThemedText style={[styles.rowSub, { color: colors.muted }]}>
                  Create a new session and invite athletes in one flow.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Clickable>

          <SurfaceCard style={styles.quickStartCard}>
            <ThemedText type="defaultSemiBold">Quick Start</ThemedText>
            <Row wrap gap="sm" style={styles.quickStartRow}>
              <Clickable
                onPress={() => startTemplate('1on1')}
                style={[
                  styles.templateChip,
                  {
                    borderColor: withAlpha(colors.info, 0.4),
                    backgroundColor: withAlpha(colors.info, 0.08),
                  },
                ]}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="person-outline" size={14} color={colors.info} />
                  <ThemedText style={{ color: colors.info, ...Typography.smallSemiBold }}>
                    1-on-1
                  </ThemedText>
                </Row>
              </Clickable>

              <Clickable
                onPress={() => startTemplate('small_group')}
                style={[
                  styles.templateChip,
                  {
                    borderColor: withAlpha(colors.success, 0.4),
                    backgroundColor: withAlpha(colors.success, 0.08),
                  },
                ]}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="people-outline" size={14} color={colors.success} />
                  <ThemedText style={{ color: colors.success, ...Typography.smallSemiBold }}>
                    Group
                  </ThemedText>
                </Row>
              </Clickable>

              <Clickable
                onPress={() => startTemplate('camp')}
                style={[
                  styles.templateChip,
                  {
                    borderColor: withAlpha(colors.warning, 0.4),
                    backgroundColor: withAlpha(colors.warning, 0.08),
                  },
                ]}
              >
                <Row align="center" gap="xs">
                  <Ionicons name="sunny-outline" size={14} color={colors.warning} />
                  <ThemedText style={{ color: colors.warning, ...Typography.smallSemiBold }}>
                    Camp
                  </ThemedText>
                </Row>
              </Clickable>
            </Row>
            <ThemedText style={[styles.quickStartHint, { color: colors.muted }]}>
              Pick a template and we prefill the flow.
            </ThemedText>
          </SurfaceCard>

          <Clickable
            onPress={() => setMode('existing')}
            style={[styles.choiceCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Row gap="sm" align="center">
              <View style={[styles.choiceIcon, { backgroundColor: withAlpha(colors.success, 0.1) }]}>
                <Ionicons name="paper-plane-outline" size={20} color={colors.success} />
              </View>
              <View style={styles.rowText}>
                <ThemedText style={styles.rowTitle}>Add to Existing Session</ThemedText>
                <ThemedText style={[styles.rowSub, { color: colors.muted }]}>
                  Pick an upcoming session and send targeted invites.
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  const handleBackFromNew = () => {
    if (!normalizedIntent.forcedIntent && state.step === 'details') {
      setMode('choose');
      return;
    }
    state.goBack();
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <PageHeader
          title="Book New Session"
          showBack
          onBackPress={handleBackFromNew}
          centerTitle
          right={
            <Clickable
              onPress={handleCancel}
              accessibilityLabel="Cancel session creation"
              style={styles.cancelButton}
            >
              <ThemedText style={[styles.cancelText, { color: colors.muted }]}>Cancel</ThemedText>
            </Clickable>
          }
        />

        <CreateStepIndicator
          currentStep={state.step}
          currentStepIndex={state.currentStepIndex}
          colors={colors}
        />

        <ScrollView
          ref={stepScrollRef}
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {state.validationMessage ? (
            <StatusBanner
              variant="error"
              message={state.validationMessage}
              onDismiss={state.clearValidationMessage}
            />
          ) : null}
          {state.step === 'details' && (
            <CreateDetailsStep
              colors={colors}
              sessionType={state.sessionType}
              title={state.title}
              description={state.description}
              focusAreas={state.focusAreas}
              maxParticipants={state.maxParticipants}
              defaultMaxParticipants={state.getDefaultMaxParticipants()}
              onSessionTypeChange={state.setSessionType}
              onTitleChange={state.setTitle}
              onDescriptionChange={state.setDescription}
              onToggleFocusArea={state.toggleFocusArea}
              onMaxParticipantsChange={state.setMaxParticipants}
              postingAs={state.postingAs}
              clubOptions={state.clubOptions.map((club) => ({ id: club.id, name: club.name }))}
              selectedClubId={state.selectedClubId}
              assigneeOptions={state.assigneeOptions.map((assignee) => ({
                id: assignee.id,
                label: assignee.label,
                role: assignee.role,
              }))}
              selectedAssigneeId={state.selectedAssigneeId}
              onPostingAsChange={state.setPostingAs}
              onSelectedClubIdChange={state.setSelectedClubId}
              onSelectedAssigneeIdChange={state.setSelectedAssigneeId}
            />
          )}
          {state.step === 'schedule' && (
            <CreateScheduleStep
              colors={colors}
              sessionType={state.sessionType}
              recurrence={state.recurrence}
              allowedRecurrenceOptions={state.allowedRecurrenceOptions}
              selectedDate={state.selectedDate}
              campLength={state.campLength}
              campEndDate={state.campEndDate}
              selectedTime={state.selectedTime}
              selectedEndTime={state.selectedEndTime}
              campDatesPreview={state.campDatesPreview}
              useCampDailyTimes={state.useCampDailyTimes}
              campDailyTimes={state.campDailyTimes}
              location={state.location}
              venueName={state.venueName}
              locationCoordinates={state.locationCoordinates}
              price={state.price}
              savedLocations={state.savedLocations}
              onCampLengthChange={state.setCampLength}
              onCampEndDateChange={state.setCampEndDate}
              onUseCampDailyTimesChange={state.setUseCampDailyTimes}
              onCampDailyTimeChange={state.setCampDailyTime}
              onRecurrenceChange={state.setRecurrence}
              onDateChange={state.setSelectedDate}
              onTimeChange={state.setSelectedTime}
              onEndTimeChange={state.setSelectedEndTime}
              onLocationChange={state.setLocation}
              onVenueNameChange={state.setVenueName}
              onSelectSavedLocation={state.selectSavedLocation}
              onSaveLocationPreset={state.saveLocationPreset}
              onLocationCoordinatesChange={state.setLocationCoordinates}
              onPriceChange={state.setPrice}
            />
          )}
          {state.step === 'review' && (
            <CreateReviewStep
              colors={colors}
              sessionType={state.sessionType}
              title={state.title}
              description={state.description}
              selectedDate={state.selectedDate}
              campLength={state.campLength}
              campEndDate={state.campEndDate}
              selectedTime={state.selectedTime}
              selectedEndTime={state.selectedEndTime}
              campDatesPreview={state.campDatesPreview}
              useCampDailyTimes={state.useCampDailyTimes}
              campDailyTimes={state.campDailyTimes}
              recurrence={state.recurrence}
              location={state.location}
              venueName={state.venueName}
              locationCoordinates={state.locationCoordinates}
              price={state.price}
              focusAreas={state.focusAreas}
              maxParticipants={state.maxParticipants}
              inviteType={state.inviteType}
              defaultMaxParticipants={state.getDefaultMaxParticipants()}
              postingAs={state.postingAs}
              selectedClubName={selectedClubName}
              selectedAssigneeName={selectedAssigneeName}
            />
          )}
          {state.step === 'invite' && (
            <CreateInviteStep
              colors={colors}
              inviteType={state.inviteType}
              allowedInviteTypes={state.allowedInviteTypes}
              selectedAthletes={state.selectedAthletes}
              pastAthletes={state.pastAthletes}
              onInviteTypeChange={state.setInviteType}
              onToggleAthlete={state.toggleAthleteSelection}
            />
          )}
        </ScrollView>

        <CreateFooterBar
          colors={colors}
          step={state.step}
          loading={state.loading}
          canProceed={state.canProceed()}
          onNext={state.goNext}
          onCreate={state.handleCreate}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  cancelText: {
    ...Typography.smallSemiBold,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  chooseContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  choiceCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  quickStartCard: {
    gap: Spacing.sm,
  },
  quickStartRow: {
    marginTop: Spacing.xxs,
  },
  templateChip: {
    borderWidth: 1,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.md,
    minHeight: 38,
    justifyContent: 'center',
  },
  quickStartHint: {
    ...Typography.caption,
  },
  choiceIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: Spacing.micro,
  },
  rowTitle: {
    ...Typography.bodySemiBold,
  },
  rowSub: {
    ...Typography.caption,
    lineHeight: 16,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  helperText: {
    ...Typography.caption,
  },
  listRow: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.smallSemiBold,
  },
  sessionIcon: {
    width: 30,
    height: 30,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineOption: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  assigneeChip: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minWidth: 132,
  },
  notesInput: {
    minHeight: 90,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    textAlignVertical: 'top',
    ...Typography.body,
  },
  footer: {
    borderTopWidth: 1,
    padding: Spacing.lg,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Typography.bodySemiBold,
  },
});
