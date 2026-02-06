import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { inviteService as sessionInviteService } from '@/services/invite';
import { academyService } from '@/services/academy-service';
import { rosterService } from '@/services/roster-service';
import { groupSessionService } from '@/services/group-session';
import type { TimeSlot, Academy, SessionInvite, SessionInviteType, RosterEntry, GroupSession } from '@/constants/types';

const logger = createLogger('CreateSessionInviteScreen');

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Trial'];
const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

type Step = 'athlete' | 'club' | 'mode' | 'type' | 'slots' | 'details' | 'confirm' | 'existing';

interface AthleteOption {
  id: string;
  name: string;
  parentId: string;
  parentName: string;
}

export default function CreateSessionInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('athlete');
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteOption[]>([]);
  const [selectedClub, setSelectedClub] = useState<Academy | null>(null);
  const [myAcademies, setMyAcademies] = useState<Academy[]>([]);
  const [sessionType, setSessionType] = useState('');
  const [focus, setFocus] = useState('');
  const [sessionInviteType, setSessionInviteType] = useState<SessionInviteType>('OPEN');
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentInvites, setSentInvites] = useState<SessionInvite[]>([]);
  const [inviteMode, setInviteMode] = useState<'new' | 'existing'>('new');
  const [existingSessions, setExistingSessions] = useState<GroupSession[]>([]);
  const [selectedExistingSession, setSelectedExistingSession] = useState<GroupSession | null>(null);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  const loadAthletes = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const roster = await rosterService.getRoster(currentUser.id);
      const athleteOptions = roster.map((entry: RosterEntry) => ({
        id: entry.athleteId,
        name: entry.athleteName,
        parentId: entry.parentId,
        parentName: entry.parentName,
      }));
      setAthletes(athleteOptions);
    } catch (error) {
      logger.error('Failed to load athletes', error);
    }
  }, [currentUser?.id]);

  const loadAcademies = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const academies = await academyService.getUserAcademies(currentUser.id);
      setMyAcademies(academies);
      // Auto-select if only one academy
      if (academies.length === 1) {
        setSelectedClub(academies[0]);
      }
    } catch (error) {
      logger.error('Failed to load academies', error);
    }
  }, [currentUser?.id]);

  const loadSentInvites = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const invites = await sessionInviteService.getCoachInvites(currentUser.id);
      setSentInvites(invites.slice(0, 5)); // Show latest 5
    } catch (error) {
      logger.error('Failed to load sent invites', error);
    }
  }, [currentUser?.id]);

  const loadExistingSessions = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const sessions = await groupSessionService.getCoachSessions(currentUser.id);
      const now = new Date();
      const upcoming = sessions.filter(
        (s) =>
          s.status === 'PUBLISHED' &&
          s.schedule.some((sched) => new Date(sched.date) >= now)
      );
      setExistingSessions(upcoming);
    } catch (error) {
      logger.error('Failed to load existing sessions', error);
    }
  }, [currentUser?.id]);

  // Load coach's academies, athletes, sent invites, and existing sessions
  useEffect(() => {
    if (currentUser?.id) {
      loadAcademies();
      loadAthletes();
      loadSentInvites();
      loadExistingSessions();
    }
  }, [currentUser?.id, loadAcademies, loadAthletes, loadSentInvites, loadExistingSessions]);

  const toggleAthlete = (athlete: AthleteOption) => {
    const isSelected = selectedAthletes.some((a) => a.id === athlete.id);
    if (isSelected) {
      setSelectedAthletes(selectedAthletes.filter((a) => a.id !== athlete.id));
    } else {
      setSelectedAthletes([...selectedAthletes, athlete]);
    }
  };

  const addTimeSlot = () => {
    if (!slotDate || !slotStartTime || !slotEndTime) {
      Alert.alert('Missing fields', 'Please fill in date, start time, and end time');
      return;
    }
    const newSlot: TimeSlot = {
      date: slotDate,
      startTime: slotStartTime,
      endTime: slotEndTime,
      location: slotLocation || undefined,
    };
    setProposedSlots([...proposedSlots, newSlot]);
    setSlotDate('');
    setSlotStartTime('');
    setSlotEndTime('');
    setSlotLocation('');
  };

  const removeTimeSlot = (index: number) => {
    setProposedSlots(proposedSlots.filter((_, i) => i !== index));
  };

  const canProceed = () => {
    switch (step) {
      case 'athlete':
        return selectedAthletes.length > 0;
      case 'club':
        return true; // Club is optional
      case 'mode':
        return true; // Always can proceed - mode is pre-selected
      case 'type':
        return sessionType && focus;
      case 'slots':
        return proposedSlots.length > 0;
      case 'details':
        return true;
      case 'existing':
        return selectedExistingSession !== null;
      default:
        return true;
    }
  };

  const nextStep = () => {
    // Handle mode branching
    if (step === 'mode') {
      if (inviteMode === 'existing') {
        setStep('existing');
      } else {
        setStep('type');
      }
      return;
    }
    // Existing session selected -> skip to confirm
    if (step === 'existing') {
      setStep('confirm');
      return;
    }

    const steps: Step[] = ['athlete', 'club', 'mode', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      // Skip club step if no academies
      if (step === 'athlete' && myAcademies.length === 0) {
        setStep('mode');
      } else {
        setStep(steps[currentIndex + 1]);
      }
    }
  };

  const prevStep = () => {
    // Handle reverse from existing -> mode
    if (step === 'existing') {
      setStep('mode');
      return;
    }
    // Handle reverse from confirm when we came from existing
    if (step === 'confirm' && inviteMode === 'existing' && selectedExistingSession) {
      setStep('existing');
      return;
    }

    const steps: Step[] = ['athlete', 'club', 'mode', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      // Skip club step if no academies
      if (step === 'mode' && myAcademies.length === 0) {
        setStep('athlete');
      } else {
        setStep(steps[currentIndex - 1]);
      }
    } else {
      router.back();
    }
  };

  const submitInvite = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const parentId = selectedAthletes[0].parentId;
      const parentName = selectedAthletes[0].parentName;

      if (inviteMode === 'existing' && selectedExistingSession) {
        // Build invite from existing session details
        const session = selectedExistingSession;
        const slots: TimeSlot[] = session.schedule.map((sched) => ({
          date: sched.date,
          startTime: sched.startTime,
          endTime: sched.endTime,
          location: session.location,
        }));

        await sessionInviteService.createInvite(
          selectedAthletes.map((a) => a.id),
          {
            coachId: currentUser.id,
            coachName: currentUser.name || 'Coach',
            clubName: selectedClub?.name || session.clubName,
            inviteType: sessionInviteType,
            athleteNames: selectedAthletes.map((a) => a.name),
            parentId,
            parentName,
            proposedSlots: slots,
            sessionType: session.sessionType,
            focus: session.focus?.[0] || 'General',
            notes: notes || `You're invited to join "${session.title}"`,
            priceUsd: session.pricePerParticipant,
            expiresInDays: 7,
            existingSessionId: session.id,
          }
        );
      } else {
        await sessionInviteService.createInvite(
          selectedAthletes.map((a) => a.id),
          {
            coachId: currentUser.id,
            coachName: currentUser.name || 'Coach',
            clubName: selectedClub?.name,
            inviteType: sessionInviteType,
            athleteNames: selectedAthletes.map((a) => a.name),
            parentId,
            parentName,
            proposedSlots,
            sessionType,
            focus,
            notes: notes || undefined,
            priceUsd: price ? parseFloat(price) : undefined,
            expiresInDays: 7,
          }
        );
      }

      Alert.alert('Invite Sent', 'Your session invite has been sent to the parent.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      logger.error('Failed to create invite', error);
      Alert.alert('Error', 'Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    // Use simplified step display
    const displaySteps: Step[] = inviteMode === 'existing'
      ? ['athlete', 'mode', 'existing', 'confirm']
      : ['athlete', 'mode', 'type', 'slots', 'details', 'confirm'];
    // Map club step to athlete for indicator purposes
    const currentStep = step === 'club' ? 'athlete' : step;
    const currentIndex = displaySteps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {displaySteps.map((s, index) => (
          <View key={s} style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                {
                  backgroundColor: index <= currentIndex ? palette.tint : palette.border,
                },
              ]}
            >
              {index < currentIndex && <Ionicons name="checkmark" size={12} color={palette.onPrimary} />}
            </View>
            {index < displaySteps.length - 1 && (
              <View
                style={[
                  styles.stepLine,
                  { backgroundColor: index < currentIndex ? palette.tint : palette.border },
                ]}
              />
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderClubStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Select Club/Academy
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Send this invite on behalf of your club or academy (optional)
      </ThemedText>

      {/* No club option */}
      <Clickable
        onPress={() => setSelectedClub(null)}
        style={[
          styles.clubItem,
          {
            backgroundColor: selectedClub === null ? withAlpha(palette.tint, 0.06) : palette.surface,
            borderColor: selectedClub === null ? palette.tint : palette.border,
          },
        ]}
      >
        <View style={[styles.clubIcon, { backgroundColor: palette.border }]}>
          <Ionicons name="person" size={20} color={palette.muted} />
        </View>
        <View style={styles.clubInfo}>
          <ThemedText type="defaultSemiBold">Personal Invite</ThemedText>
          <ThemedText style={[styles.clubSubtitle, { color: palette.muted }]}>
            Send as yourself, not as a club
          </ThemedText>
        </View>
        {selectedClub === null && (
          <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
        )}
      </Clickable>

      {/* Club options */}
      {myAcademies.map((academy) => (
        <Clickable
          key={academy.id}
          onPress={() => setSelectedClub(academy)}
          style={[
            styles.clubItem,
            {
              backgroundColor: selectedClub?.id === academy.id ? withAlpha(palette.tint, 0.06) : palette.surface,
              borderColor: selectedClub?.id === academy.id ? palette.tint : palette.border,
            },
          ]}
        >
          <View style={[styles.clubIcon, { backgroundColor: academy.primaryColor || palette.tint }]}>
            <ThemedText style={styles.clubIconText}>
              {academy.name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.clubInfo}>
            <ThemedText type="defaultSemiBold">{academy.name}</ThemedText>
            <ThemedText style={[styles.clubSubtitle, { color: palette.muted }]}>
              {academy.city}
            </ThemedText>
          </View>
          {selectedClub?.id === academy.id && (
            <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
          )}
        </Clickable>
      ))}
    </Animated.View>
  );

  const renderModeStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        How would you like to invite?
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Create a brand new session or invite to one you've already published
      </ThemedText>

      <Clickable
        onPress={() => {
          setInviteMode('new');
          setSelectedExistingSession(null);
        }}
        style={[
          styles.clubItem,
          {
            backgroundColor: inviteMode === 'new' ? withAlpha(palette.tint, 0.06) : palette.surface,
            borderColor: inviteMode === 'new' ? palette.tint : palette.border,
          },
        ]}
      >
        <View style={[styles.clubIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="add-circle-outline" size={22} color={palette.tint} />
        </View>
        <View style={styles.clubInfo}>
          <ThemedText type="defaultSemiBold">Create New Session</ThemedText>
          <ThemedText style={[styles.clubSubtitle, { color: palette.muted }]}>
            Set up session type, time slots, and details from scratch
          </ThemedText>
        </View>
        {inviteMode === 'new' && (
          <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
        )}
      </Clickable>

      <Clickable
        onPress={() => setInviteMode('existing')}
        disabled={existingSessions.length === 0}
        style={[
          styles.clubItem,
          {
            backgroundColor: inviteMode === 'existing' ? withAlpha(palette.tint, 0.06) : palette.surface,
            borderColor: inviteMode === 'existing' ? palette.tint : palette.border,
            opacity: existingSessions.length === 0 ? 0.5 : 1,
          },
        ]}
      >
        <View style={[styles.clubIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="calendar-outline" size={22} color={palette.success} />
        </View>
        <View style={styles.clubInfo}>
          <ThemedText type="defaultSemiBold">Invite to Existing Session</ThemedText>
          <ThemedText style={[styles.clubSubtitle, { color: palette.muted }]}>
            {existingSessions.length > 0
              ? `${existingSessions.length} upcoming session${existingSessions.length !== 1 ? 's' : ''} available`
              : 'No upcoming published sessions'}
          </ThemedText>
        </View>
        {inviteMode === 'existing' && (
          <Ionicons name="checkmark-circle" size={22} color={palette.tint} />
        )}
      </Clickable>
    </Animated.View>
  );

  const renderExistingSessionStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Select a Session
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Choose an upcoming published session to invite athletes to
      </ThemedText>

      <View style={styles.athleteList}>
        {existingSessions.map((session) => {
          const isSelected = selectedExistingSession?.id === session.id;
          const nextSchedule = session.schedule[0];
          const spotsRemaining = session.maxParticipants - session.currentParticipants;

          return (
            <Clickable
              key={session.id}
              onPress={() => setSelectedExistingSession(session)}
              style={[
                styles.athleteItem,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.athleteAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="football-outline" size={20} color={palette.tint} />
              </View>
              <View style={styles.athleteInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>{session.title}</ThemedText>
                {nextSchedule && (
                  <ThemedText style={[styles.parentName, { color: palette.muted }]}>
                    {new Date(nextSchedule.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    {nextSchedule.startTime}-{nextSchedule.endTime}
                  </ThemedText>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xxs }}>
                  <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                    {session.location}
                  </ThemedText>
                  <ThemedText
                    style={{
                      ...Typography.caption,
                      color: spotsRemaining <= 2 ? palette.error : palette.success,
                    }}
                  >
                    {spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
                  </ThemedText>
                </View>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? palette.tint : 'transparent',
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
              </View>
            </Clickable>
          );
        })}
      </View>
    </Animated.View>
  );

  const renderSentInvitesBanner = () => {
    if (sentInvites.length === 0) return null;

    const statusColors: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: '#FEF3C7', text: '#92400E' },
      ACCEPTED: { bg: '#D1FAE5', text: '#065F46' },
      DECLINED: { bg: '#FEE2E2', text: '#991B1B' },
      EXPIRED: { bg: '#F3F4F6', text: '#6B7280' },
      COUNTERED: { bg: '#DBEAFE', text: '#1E40AF' },
    };

    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.sentInvitesSection}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Recent Sent Invites
          </ThemedText>
          <Clickable onPress={() => router.push(Routes.SESSION_INVITES)}>
            <ThemedText style={{ color: palette.tint, ...Typography.small }}>View All</ThemedText>
          </Clickable>
        </View>
        {sentInvites.map((invite) => {
          const statusConfig = statusColors[invite.status] || statusColors.PENDING;
          return (
            <Clickable
              key={invite.id}
              onPress={() => router.push(Routes.sessionInvite(invite.id))}
              style={[styles.sentInviteItem, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.sentInviteInfo}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {invite.athleteNames.join(', ')}
                </ThemedText>
                <ThemedText style={[styles.sentInviteMeta, { color: palette.muted }]}>
                  {invite.sessionType} - {invite.focus}
                </ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
                  {invite.status}
                </ThemedText>
              </View>
            </Clickable>
          );
        })}
      </Animated.View>
    );
  };

  const renderAthleteStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Select Athletes
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Choose which athletes you want to invite to this session
      </ThemedText>

      <View style={styles.athleteList}>
        {athletes.map((athlete) => {
          const isSelected = selectedAthletes.some((a) => a.id === athlete.id);
          return (
            <Clickable
              key={athlete.id}
              onPress={() => toggleAthlete(athlete)}
              style={[
                styles.athleteItem,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.athleteAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                  {athlete.name.charAt(0)}
                </ThemedText>
              </View>
              <View style={styles.athleteInfo}>
                <ThemedText type="defaultSemiBold">{athlete.name}</ThemedText>
                <ThemedText style={[styles.parentName, { color: palette.muted }]}>
                  Parent: {athlete.parentName}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.checkbox,
                  {
                    backgroundColor: isSelected ? palette.tint : 'transparent',
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
              </View>
            </Clickable>
          );
        })}
      </View>
    </Animated.View>
  );

  const INVITE_TYPE_OPTIONS: {
    key: SessionInviteType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: 'OPEN', label: 'Open', icon: 'globe-outline' },
    { key: 'CLOSED', label: 'Closed', icon: 'lock-closed-outline' },
    { key: 'SQUAD_ONLY', label: 'Squad Only', icon: 'people-outline' },
  ];

  const renderTypeStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Session Details
      </ThemedText>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Session Type</ThemedText>
        <View style={styles.optionsRow}>
          {SESSION_TYPES.map((type) => (
            <Clickable
              key={type}
              onPress={() => setSessionType(type)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: sessionType === type ? palette.tint : palette.surface,
                  borderColor: sessionType === type ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={{ color: sessionType === type ? palette.onPrimary : palette.text, ...Typography.small }}
              >
                {type}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Focus Area</ThemedText>
        <View style={styles.optionsRow}>
          {FOCUSES.map((f) => (
            <Clickable
              key={f}
              onPress={() => setFocus(f)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: focus === f ? palette.tint : palette.surface,
                  borderColor: focus === f ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText style={{ color: focus === f ? palette.onPrimary : palette.text, ...Typography.small }}>
                {f}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Invite Type</ThemedText>
        <View style={styles.optionsRow}>
          {INVITE_TYPE_OPTIONS.map((opt) => (
            <Clickable
              key={opt.key}
              onPress={() => setSessionInviteType(opt.key)}
              style={[
                styles.optionChip,
                {
                  backgroundColor: sessionInviteType === opt.key ? palette.tint : palette.surface,
                  borderColor: sessionInviteType === opt.key ? palette.tint : palette.border,
                  flexDirection: 'row',
                  gap: Spacing.xxs,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={14}
                color={sessionInviteType === opt.key ? palette.onPrimary : palette.text}
              />
              <ThemedText
                style={{
                  color: sessionInviteType === opt.key ? palette.onPrimary : palette.text,
                  ...Typography.small,
                }}
              >
                {opt.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderSlotsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Propose Time Slots
      </ThemedText>
      <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
        Add one or more time options for the parent to choose from
      </ThemedText>

      <SurfaceCard style={styles.addSlotCard}>
        <View style={styles.slotFormRow}>
          <DateTimeField
            mode="date"
            label="Date"
            value={slotDate}
            onChange={setSlotDate}
          />
        </View>
        <View style={styles.slotFormRow}>
          <DateTimeField
            mode="time"
            label="Start"
            value={slotStartTime}
            onChange={setSlotStartTime}
            style={{ flex: 1 }}
          />
          <DateTimeField
            mode="time"
            label="End"
            value={slotEndTime}
            onChange={setSlotEndTime}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.slotFormRow}>
          <View style={[styles.slotInput, { flex: 1 }]}>
            <ThemedText style={styles.inputLabel}>Location (optional)</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="e.g., Hackney Marshes"
              placeholderTextColor={palette.muted}
              value={slotLocation}
              onChangeText={setSlotLocation}
            />
          </View>
        </View>
        <Clickable
          onPress={addTimeSlot}
          style={[styles.addSlotButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={18} color={palette.onPrimary} />
          <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Add Time Slot</ThemedText>
        </Clickable>
      </SurfaceCard>

      {proposedSlots.length > 0 && (
        <View style={styles.slotsList}>
          <ThemedText style={styles.formLabel}>Proposed Slots</ThemedText>
          {proposedSlots.map((slot, index) => (
            <View
              key={index}
              style={[styles.slotItem, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <View style={styles.slotInfo}>
                <ThemedText type="defaultSemiBold">
                  {new Date(slot.date).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </ThemedText>
                <ThemedText style={{ color: palette.muted }}>
                  {slot.startTime} - {slot.endTime}
                  {slot.location && ` at ${slot.location}`}
                </ThemedText>
              </View>
              <Clickable onPress={() => removeTimeSlot(index)}>
                <Ionicons name="close-circle" size={22} color={palette.error} />
              </Clickable>
            </View>
          ))}
        </View>
      )}
    </Animated.View>
  );

  const renderDetailsStep = () => (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <ThemedText type="subtitle" style={styles.stepTitle}>
        Additional Details
      </ThemedText>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Notes for Parent</ThemedText>
        <TextInput
          style={[styles.textArea, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., Looking forward to working on finishing skills..."
          placeholderTextColor={palette.muted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.formSection}>
        <ThemedText style={styles.formLabel}>Price (optional)</ThemedText>
        <TextInput
          style={[styles.input, { color: palette.text, borderColor: palette.border }]}
          placeholder="e.g., 50"
          placeholderTextColor={palette.muted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />
      </View>
    </Animated.View>
  );

  const renderConfirmStep = () => {
    const isExisting = inviteMode === 'existing' && selectedExistingSession;
    const athleteDisplay = selectedAthletes.length === 1
      ? selectedAthletes[0].name
      : `${selectedAthletes.length} athletes`;
    const clubDisplay = selectedClub ? ` to ${selectedClub.name}` : '';
    const sessionLabel = isExisting ? selectedExistingSession.title : sessionType;
    const invitePreview = `Coach ${currentUser?.name?.split(' ')[0] || 'You'} has invited ${athleteDisplay}${clubDisplay} - ${sessionLabel}`;

    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Review & Send
        </ThemedText>

        {/* Invite Preview Banner */}
        <View style={[styles.invitePreviewBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="mail-outline" size={18} color={palette.tint} />
          <ThemedText style={[styles.invitePreviewText, { color: palette.text }]}>
            {invitePreview}
          </ThemedText>
        </View>

        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="people-outline" size={18} color={palette.muted} />
            <ThemedText>{selectedAthletes.map((a) => a.name).join(', ')}</ThemedText>
          </View>
          {(selectedClub || (isExisting && selectedExistingSession.clubName)) && (
            <View style={styles.summaryRow}>
              <Ionicons name="business-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint }}>
                Invite to {selectedClub?.name || selectedExistingSession?.clubName}
              </ThemedText>
            </View>
          )}

          {isExisting ? (
            <>
              <View style={styles.summaryRow}>
                <Ionicons name="football-outline" size={18} color={palette.muted} />
                <ThemedText>{selectedExistingSession.title}</ThemedText>
              </View>
              {selectedExistingSession.schedule[0] && (
                <View style={styles.summaryRow}>
                  <Ionicons name="calendar-outline" size={18} color={palette.muted} />
                  <ThemedText>
                    {new Date(selectedExistingSession.schedule[0].date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}{' '}
                    {selectedExistingSession.schedule[0].startTime}-{selectedExistingSession.schedule[0].endTime}
                  </ThemedText>
                </View>
              )}
              <View style={styles.summaryRow}>
                <Ionicons name="location-outline" size={18} color={palette.muted} />
                <ThemedText>{selectedExistingSession.location}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="pricetag-outline" size={18} color={palette.muted} />
                <ThemedText>
                  {selectedExistingSession.pricePerParticipant === 0
                    ? 'Free'
                    : `${selectedExistingSession.currency === 'GBP' ? '\u00A3' : '$'}${selectedExistingSession.pricePerParticipant}`}
                </ThemedText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <Ionicons name="football-outline" size={18} color={palette.muted} />
                <ThemedText>
                  {sessionType} - {focus}
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons
                  name={
                    sessionInviteType === 'OPEN'
                      ? 'globe-outline'
                      : sessionInviteType === 'CLOSED'
                      ? 'lock-closed-outline'
                      : 'people-outline'
                  }
                  size={18}
                  color={palette.muted}
                />
                <ThemedText>
                  {sessionInviteType === 'OPEN'
                    ? 'Open session'
                    : sessionInviteType === 'CLOSED'
                    ? 'Invite only (Closed)'
                    : 'Squad members only'}
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="calendar-outline" size={18} color={palette.muted} />
                <ThemedText>{proposedSlots.length} time slot(s) proposed</ThemedText>
              </View>
              {price && (
                <View style={styles.summaryRow}>
                  <Ionicons name="pricetag-outline" size={18} color={palette.muted} />
                  <ThemedText>${price}</ThemedText>
                </View>
              )}
            </>
          )}
          {notes && (
            <View style={styles.summaryRow}>
              <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
              <ThemedText numberOfLines={2}>{notes}</ThemedText>
            </View>
          )}
        </SurfaceCard>

        <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
          The parent will receive a notification and have 7 days to respond. You can cancel the
          invite anytime before they respond.
        </ThemedText>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={prevStep} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title">Create Invite</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Show sent invites on first step */}
        {step === 'athlete' && renderSentInvitesBanner()}

        {step === 'athlete' && renderAthleteStep()}
        {step === 'club' && renderClubStep()}
        {step === 'mode' && renderModeStep()}
        {step === 'type' && renderTypeStep()}
        {step === 'slots' && renderSlotsStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'existing' && renderExistingSessionStep()}
        {step === 'confirm' && renderConfirmStep()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {step === 'confirm' ? (
          <Clickable
            onPress={submitInvite}
            disabled={loading}
            style={[styles.nextButton, { backgroundColor: palette.tint, opacity: loading ? 0.6 : 1 }]}
          >
            <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              {loading ? 'Sending...' : 'Send Invite'}
            </ThemedText>
          </Clickable>
        ) : (
          <Clickable
            onPress={nextStep}
            disabled={!canProceed()}
            style={[
              styles.nextButton,
              { backgroundColor: palette.tint, opacity: canProceed() ? 1 : 0.5 },
            ]}
          >
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>Continue</ThemedText>
            <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
          </Clickable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: Spacing.xxs,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  athleteList: {
    gap: Spacing.sm,
  },
  athleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  athleteAvatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.heading,
  },
  athleteInfo: {
    flex: 1,
  },
  parentName: {
    ...Typography.small,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    gap: Spacing.xs,
  },
  formLabel: {
    ...Typography.bodySmallSemiBold,
    marginBottom: Spacing.xxs,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  optionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  addSlotCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  slotFormRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  slotInput: {
    flex: 1,
    gap: Spacing.xxs,
  },
  inputLabel: {
    ...Typography.caption,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    textAlignVertical: 'top',
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  slotsList: {
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  slotInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  disclaimer: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  // Club step styles
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  clubIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubIconText: {
    ...Typography.heading,
    color: Colors.light.onPrimary,
  },
  clubInfo: {
    flex: 1,
  },
  clubSubtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  // Sent invites section
  sentInvitesSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.bodySmall,
  },
  sentInviteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  sentInviteInfo: {
    flex: 1,
  },
  sentInviteMeta: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  // Invite preview banner
  invitePreviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  invitePreviewText: {
    ...Typography.bodySmallSemiBold,
    flex: 1,
    lineHeight: 20,
  },
});
