import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { sessionInviteService } from '@/services/session-invite-service';
import { academyService } from '@/services/academy-service';
import type { TimeSlot, Academy, SessionInvite } from '@/constants/types';
import { withRoleGuard } from '@/components/auth/with-role-guard';

const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Trial'];
const FOCUSES = ['Dribbling', 'Passing', 'Finishing', 'Defending', 'Goalkeeping', 'Conditioning'];

type Step = 'athlete' | 'club' | 'type' | 'slots' | 'details' | 'confirm';

const MOCK_ATHLETES = [
  { id: 'athlete_1', name: 'Tom Baker', parentId: 'parent_1', parentName: 'Sarah Baker' },
  { id: 'athlete_2', name: 'Lucy Baker', parentId: 'parent_1', parentName: 'Sarah Baker' },
  { id: 'athlete_3', name: 'James Wilson', parentId: 'parent_2', parentName: 'Mike Wilson' },
];

function CreateSessionInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<Step>('athlete');
  const [selectedAthletes, setSelectedAthletes] = useState<typeof MOCK_ATHLETES>([]);
  const [selectedClub, setSelectedClub] = useState<Academy | null>(null);
  const [myAcademies, setMyAcademies] = useState<Academy[]>([]);
  const [sessionType, setSessionType] = useState('');
  const [focus, setFocus] = useState('');
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentInvites, setSentInvites] = useState<SessionInvite[]>([]);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // Load coach's academies and sent invites
  useEffect(() => {
    if (currentUser?.id) {
      loadAcademies();
      loadSentInvites();
    }
  }, [currentUser?.id]);

  const loadAcademies = async () => {
    if (!currentUser?.id) return;
    try {
      const academies = await academyService.getUserAcademies(currentUser.id);
      setMyAcademies(academies);
      // Auto-select if only one academy
      if (academies.length === 1) {
        setSelectedClub(academies[0]);
      }
    } catch (error) {
      console.error('Failed to load academies:', error);
    }
  };

  const loadSentInvites = async () => {
    if (!currentUser?.id) return;
    try {
      const invites = await sessionInviteService.getCoachInvites(currentUser.id);
      setSentInvites(invites.slice(0, 5)); // Show latest 5
    } catch (error) {
      console.error('Failed to load sent invites:', error);
    }
  };

  const toggleAthlete = (athlete: typeof MOCK_ATHLETES[0]) => {
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
      case 'type':
        return sessionType && focus;
      case 'slots':
        return proposedSlots.length > 0;
      case 'details':
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['athlete', 'club', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      // Skip club step if no academies
      if (step === 'athlete' && myAcademies.length === 0) {
        setStep('type');
      } else {
        setStep(steps[currentIndex + 1]);
      }
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['athlete', 'club', 'type', 'slots', 'details', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      // Skip club step if no academies
      if (step === 'type' && myAcademies.length === 0) {
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
      // Group by parent
      const parentId = selectedAthletes[0].parentId;
      const parentName = selectedAthletes[0].parentName;

      await sessionInviteService.createInvite({
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        clubName: selectedClub?.name, // Include club name
        athleteIds: selectedAthletes.map((a) => a.id),
        athleteNames: selectedAthletes.map((a) => a.name),
        parentId,
        parentName,
        proposedSlots,
        sessionType,
        focus,
        notes: notes || undefined,
        priceUsd: price ? parseFloat(price) : undefined,
        expiresInDays: 7,
      });

      Alert.alert('Invite Sent', 'Your session invite has been sent to the parent.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to create invite:', error);
      Alert.alert('Error', 'Failed to send invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    // Use simplified step display that doesn't include club step in indicator
    const displaySteps: Step[] = ['athlete', 'type', 'slots', 'details', 'confirm'];
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
              {index < currentIndex && <Ionicons name="checkmark" size={12} color="#fff" />}
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
            backgroundColor: selectedClub === null ? `${palette.tint}10` : palette.surface,
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
              backgroundColor: selectedClub?.id === academy.id ? `${palette.tint}10` : palette.surface,
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
          <Clickable onPress={() => router.push('/session-invites')}>
            <ThemedText style={{ color: palette.tint, fontSize: 13 }}>View All</ThemedText>
          </Clickable>
        </View>
        {sentInvites.map((invite) => {
          const statusConfig = statusColors[invite.status] || statusColors.PENDING;
          return (
            <Clickable
              key={invite.id}
              onPress={() => router.push({ pathname: '/session-invites/[id]', params: { id: invite.id } })}
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
        {MOCK_ATHLETES.map((athlete) => {
          const isSelected = selectedAthletes.some((a) => a.id === athlete.id);
          return (
            <Clickable
              key={athlete.id}
              onPress={() => toggleAthlete(athlete)}
              style={[
                styles.athleteItem,
                {
                  backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <View style={[styles.athleteAvatar, { backgroundColor: `${palette.tint}15` }]}>
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
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
            </Clickable>
          );
        })}
      </View>
    </Animated.View>
  );

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
                style={{ color: sessionType === type ? '#fff' : palette.text, fontSize: 13 }}
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
              <ThemedText style={{ color: focus === f ? '#fff' : palette.text, fontSize: 13 }}>
                {f}
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
          <View style={styles.slotInput}>
            <ThemedText style={styles.inputLabel}>Date</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="2026-01-15"
              placeholderTextColor={palette.muted}
              value={slotDate}
              onChangeText={setSlotDate}
            />
          </View>
        </View>
        <View style={styles.slotFormRow}>
          <View style={styles.slotInput}>
            <ThemedText style={styles.inputLabel}>Start</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="16:00"
              placeholderTextColor={palette.muted}
              value={slotStartTime}
              onChangeText={setSlotStartTime}
            />
          </View>
          <View style={styles.slotInput}>
            <ThemedText style={styles.inputLabel}>End</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
              placeholder="17:00"
              placeholderTextColor={palette.muted}
              value={slotEndTime}
              onChangeText={setSlotEndTime}
            />
          </View>
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
          <Ionicons name="add" size={18} color="#fff" />
          <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Add Time Slot</ThemedText>
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
    // Build invitation message preview
    const athleteDisplay = selectedAthletes.length === 1
      ? selectedAthletes[0].name
      : `${selectedAthletes.length} athletes`;
    const clubDisplay = selectedClub ? ` to ${selectedClub.name}` : '';
    const invitePreview = `Coach ${currentUser?.name?.split(' ')[0] || 'You'} has invited ${athleteDisplay}${clubDisplay} - ${sessionType}`;

    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Review & Send
        </ThemedText>

        {/* Invite Preview Banner */}
        <View style={[styles.invitePreviewBanner, { backgroundColor: `${palette.tint}10` }]}>
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
          {selectedClub && (
            <View style={styles.summaryRow}>
              <Ionicons name="business-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint }}>Invite to {selectedClub.name}</ThemedText>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Ionicons name="football-outline" size={18} color={palette.muted} />
            <ThemedText>
              {sessionType} - {focus}
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
        {step === 'type' && renderTypeStep()}
        {step === 'slots' && renderSlotsStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'confirm' && renderConfirmStep()}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        {step === 'confirm' ? (
          <Clickable
            onPress={submitInvite}
            disabled={loading}
            style={[styles.nextButton, { backgroundColor: palette.tint, opacity: loading ? 0.6 : 1 }]}
          >
            <Ionicons name="paper-plane" size={18} color="#fff" />
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>
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
            <ThemedText style={{ color: '#fff', fontWeight: '700' }}>Continue</ThemedText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: 20,
  },
  stepDescription: {
    fontSize: 14,
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  athleteInfo: {
    flex: 1,
  },
  parentName: {
    fontSize: 13,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    gap: Spacing.xs,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
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
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
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
    gap: 2,
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
    fontSize: 13,
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
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  clubInfo: {
    flex: 1,
  },
  clubSubtitle: {
    fontSize: 13,
    marginTop: 2,
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
    fontSize: 14,
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
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
});

export default withRoleGuard(CreateSessionInviteScreen, ['COACH', 'ADMIN']);
