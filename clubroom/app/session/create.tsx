/**
 * Create Session Screen
 *
 * Full-screen modal for coaches to create sessions with:
 * - Session type (1:1 or group)
 * - Recurrence options with end date
 * - Direct athlete invites
 * - Proper GBP pricing
 */

import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getUserById } from '@/constants/mock-data';
import type { FootballObjective, SessionOffering } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CreateSession');

type SessionType = '1on1' | 'group';
type RecurrenceType = 'none' | 'weekly' | 'biweekly';

const SKILL_OPTIONS: { value: FootballObjective | ''; label: string }[] = [
  { value: '', label: 'Any Focus' },
  { value: 'Dribbling', label: 'Dribbling' },
  { value: 'Passing', label: 'Passing' },
  { value: 'Defending', label: 'Defending' },
  { value: 'Finishing', label: 'Finishing' },
  { value: 'Goalkeeping', label: 'Goalkeeping' },
  { value: 'Conditioning', label: 'Conditioning' },
];

export default function CreateSessionScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // Form state
  const [step, setStep] = useState<'type' | 'details' | 'schedule' | 'invite'>('type');
  const [sessionType, setSessionType] = useState<SessionType>('1on1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('6');
  const [skill, setSkill] = useState<FootballObjective | ''>('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');

  // Schedule state
  const [sessionDate, setSessionDate] = useState(new Date());
  const [sessionTime, setSessionTime] = useState(new Date());
  const [duration, setDuration] = useState('60');
  const [recurrence, setRecurrence] = useState<RecurrenceType>('none');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Invite state
  const [inviteMode, setInviteMode] = useState<'open' | 'invite'>('open');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [pastAthletes, setPastAthletes] = useState<Array<{ id: string; name: string }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load past athletes for invite
  useEffect(() => {
    const loadPastAthletes = async () => {
      // In real app, fetch from bookings service
      // For now, mock data
      setPastAthletes([
        { id: 'user1', name: 'Alex Thompson' },
        { id: 'user2', name: 'Jamie Wilson' },
        { id: 'user3', name: 'Sam Roberts' },
      ]);
    };
    loadPastAthletes();
  }, [currentUser]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleNext = () => {
    if (step === 'type') {
      setStep('details');
    } else if (step === 'details') {
      if (!title.trim()) {
        Alert.alert('Required', 'Please enter a session title');
        return;
      }
      if (!location.trim()) {
        Alert.alert('Required', 'Please enter a location');
        return;
      }
      setStep('schedule');
    } else if (step === 'schedule') {
      setStep('invite');
    }
  };

  const handleBack = () => {
    if (step === 'details') setStep('type');
    else if (step === 'schedule') setStep('details');
    else if (step === 'invite') setStep('schedule');
    else router.back();
  };

  const handleCreate = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);
    logger.action('CreateSession', { sessionType, recurrence, inviteMode });

    try {
      // Combine date and time
      const scheduledAt = new Date(sessionDate);
      scheduledAt.setHours(sessionTime.getHours(), sessionTime.getMinutes(), 0, 0);

      const sessionId = `session_${Date.now()}`;
      const newSession: SessionOffering = {
        id: sessionId,
        coachId: currentUser.id,
        coachName: currentUser.fullName || currentUser.username || 'Coach',
        title: title.trim(),
        description: description.trim(),
        sessionType,
        scheduledAt: scheduledAt.toISOString(),
        isRecurring: recurrence !== 'none',
        recurrenceType: recurrence,
        dayOfWeek: recurrence !== 'none' ? scheduledAt.getDay() : undefined,
        timeOfDay: recurrence !== 'none' ? formatTime(sessionTime) : undefined,
        endDate: endDate?.toISOString(),
        maxParticipants: sessionType === 'group' ? parseInt(maxParticipants) || 6 : 1,
        location: location.trim(),
        priceUsd: price ? parseFloat(price) : 0,
        footballSkill: skill || undefined,
        ageMin: ageMin ? parseInt(ageMin) : undefined,
        ageMax: ageMax ? parseInt(ageMax) : undefined,
        status: 'active',
        registrations: [],
      };

      // Store session
      const existing = await AsyncStorage.getItem('session_offerings');
      const sessions = existing ? JSON.parse(existing) : [];
      sessions.push(newSession);
      await AsyncStorage.setItem('session_offerings', JSON.stringify(sessions));

      // If invite mode, send invites to selected athletes
      if (inviteMode === 'invite' && selectedAthletes.length > 0) {
        // Would call sessionInviteService.createBulk() here
        logger.action('SendInvites', { athleteIds: selectedAthletes });
      }

      logger.success('SessionCreated', { sessionId });

      Alert.alert(
        'Session Created',
        recurrence !== 'none'
          ? `Your recurring ${sessionType === 'group' ? 'group' : '1:1'} session has been created.`
          : `Your ${sessionType === 'group' ? 'group' : '1:1'} session has been scheduled.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('CreateSessionFailed', error);
      Alert.alert('Error', 'Failed to create session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['type', 'details', 'schedule', 'invite'].map((s, i) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            {
              backgroundColor:
                step === s ? palette.tint :
                ['type', 'details', 'schedule', 'invite'].indexOf(step) > i
                  ? palette.success
                  : palette.border,
            },
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <PageHeader
          title={
            step === 'type' ? 'Session Type' :
            step === 'details' ? 'Session Details' :
            step === 'schedule' ? 'Schedule' :
            'Invite Athletes'
          }
          showBack
          onBackPress={handleBack}
        />

        {renderStepIndicator()}

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1: Session Type */}
          {step === 'type' && (
            <View style={styles.stepContent}>
              <ThemedText style={[styles.stepTitle, { color: palette.muted }]}>
                What type of session?
              </ThemedText>

              <Pressable
                style={[
                  styles.typeCard,
                  {
                    borderColor: sessionType === '1on1' ? palette.tint : palette.border,
                    backgroundColor: sessionType === '1on1' ? `${palette.tint}08` : palette.surface,
                  },
                ]}
                onPress={() => setSessionType('1on1')}
              >
                <View style={[styles.typeIcon, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="person" size={24} color={palette.tint} />
                </View>
                <View style={styles.typeInfo}>
                  <ThemedText type="defaultSemiBold">1:1 Session</ThemedText>
                  <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>
                    Private coaching with one athlete
                  </ThemedText>
                </View>
                {sessionType === '1on1' && (
                  <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.typeCard,
                  {
                    borderColor: sessionType === 'group' ? palette.tint : palette.border,
                    backgroundColor: sessionType === 'group' ? `${palette.tint}08` : palette.surface,
                  },
                ]}
                onPress={() => setSessionType('group')}
              >
                <View style={[styles.typeIcon, { backgroundColor: `${palette.accent}15` }]}>
                  <Ionicons name="people" size={24} color={palette.accent} />
                </View>
                <View style={styles.typeInfo}>
                  <ThemedText type="defaultSemiBold">Group Session</ThemedText>
                  <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>
                    Train multiple athletes together
                  </ThemedText>
                </View>
                {sessionType === 'group' && (
                  <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                )}
              </Pressable>
            </View>
          )}

          {/* STEP 2: Details */}
          {step === 'details' && (
            <View style={styles.stepContent}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Session Title *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                  placeholder="e.g., Finishing Masterclass"
                  placeholderTextColor={palette.muted}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Description
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                  placeholder="What will athletes learn?"
                  placeholderTextColor={palette.muted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Location *
                </ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                  placeholder="e.g., Hackney Marshes, Pitch 3"
                  placeholderTextColor={palette.muted}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                    Price (£)
                  </ThemedText>
                  <View style={[styles.priceInput, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                    <ThemedText style={styles.currencyPrefix}>£</ThemedText>
                    <TextInput
                      style={[styles.priceField, { color: palette.text }]}
                      placeholder="0"
                      placeholderTextColor={palette.muted}
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {sessionType === 'group' && (
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                      Max Athletes
                    </ThemedText>
                    <TextInput
                      style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                      placeholder="6"
                      placeholderTextColor={palette.muted}
                      value={maxParticipants}
                      onChangeText={setMaxParticipants}
                      keyboardType="number-pad"
                    />
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Skill Focus
                </ThemedText>
                <View style={styles.skillChips}>
                  {SKILL_OPTIONS.map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.skillChip,
                        {
                          backgroundColor: skill === opt.value ? palette.tint : palette.surface,
                          borderColor: skill === opt.value ? palette.tint : palette.border,
                        },
                      ]}
                      onPress={() => setSkill(opt.value)}
                    >
                      <ThemedText
                        style={[
                          styles.skillChipText,
                          { color: skill === opt.value ? '#fff' : palette.text },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* STEP 3: Schedule */}
          {step === 'schedule' && (
            <View style={styles.stepContent}>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Date
                </ThemedText>
                <Pressable
                  style={[styles.dateButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                  <ThemedText>{formatDate(sessionDate)}</ThemedText>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={sessionDate}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(_, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setSessionDate(date);
                    }}
                  />
                )}
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                    Time
                  </ThemedText>
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={palette.muted} />
                    <ThemedText>{formatTime(sessionTime)}</ThemedText>
                  </Pressable>
                  {showTimePicker && (
                    <DateTimePicker
                      value={sessionTime}
                      mode="time"
                      onChange={(_, date) => {
                        setShowTimePicker(Platform.OS === 'ios');
                        if (date) setSessionTime(date);
                      }}
                    />
                  )}
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                    Duration
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
                    placeholder="60"
                    placeholderTextColor={palette.muted}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Repeat
                </ThemedText>
                <View style={styles.recurrenceOptions}>
                  {[
                    { value: 'none', label: 'One-time' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'biweekly', label: 'Bi-weekly' },
                  ].map(opt => (
                    <Pressable
                      key={opt.value}
                      style={[
                        styles.recurrenceOption,
                        {
                          backgroundColor: recurrence === opt.value ? palette.tint : palette.surface,
                          borderColor: recurrence === opt.value ? palette.tint : palette.border,
                        },
                      ]}
                      onPress={() => setRecurrence(opt.value as RecurrenceType)}
                    >
                      <ThemedText
                        style={[
                          styles.recurrenceText,
                          { color: recurrence === opt.value ? '#fff' : palette.text },
                        ]}
                      >
                        {opt.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {recurrence !== 'none' && (
                <View style={styles.inputGroup}>
                  <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                    End Date (optional)
                  </ThemedText>
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Ionicons name="calendar-outline" size={20} color={palette.muted} />
                    <ThemedText>
                      {endDate ? formatDate(endDate) : 'No end date (ongoing)'}
                    </ThemedText>
                  </Pressable>
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate || new Date(sessionDate.getTime() + 90 * 24 * 60 * 60 * 1000)}
                      mode="date"
                      minimumDate={sessionDate}
                      onChange={(_, date) => {
                        setShowEndDatePicker(Platform.OS === 'ios');
                        if (date) setEndDate(date);
                      }}
                    />
                  )}
                  {endDate && (
                    <Pressable onPress={() => setEndDate(null)}>
                      <ThemedText style={[styles.clearEndDate, { color: palette.error }]}>
                        Clear end date
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* STEP 4: Invite */}
          {step === 'invite' && (
            <View style={styles.stepContent}>
              <ThemedText style={[styles.stepTitle, { color: palette.muted }]}>
                Who can join?
              </ThemedText>

              <Pressable
                style={[
                  styles.typeCard,
                  {
                    borderColor: inviteMode === 'open' ? palette.tint : palette.border,
                    backgroundColor: inviteMode === 'open' ? `${palette.tint}08` : palette.surface,
                  },
                ]}
                onPress={() => setInviteMode('open')}
              >
                <View style={[styles.typeIcon, { backgroundColor: `${palette.success}15` }]}>
                  <Ionicons name="globe-outline" size={24} color={palette.success} />
                </View>
                <View style={styles.typeInfo}>
                  <ThemedText type="defaultSemiBold">Open Session</ThemedText>
                  <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>
                    Anyone can discover and book
                  </ThemedText>
                </View>
                {inviteMode === 'open' && (
                  <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                )}
              </Pressable>

              <Pressable
                style={[
                  styles.typeCard,
                  {
                    borderColor: inviteMode === 'invite' ? palette.tint : palette.border,
                    backgroundColor: inviteMode === 'invite' ? `${palette.tint}08` : palette.surface,
                  },
                ]}
                onPress={() => setInviteMode('invite')}
              >
                <View style={[styles.typeIcon, { backgroundColor: `${palette.warning}15` }]}>
                  <Ionicons name="mail-outline" size={24} color={palette.warning} />
                </View>
                <View style={styles.typeInfo}>
                  <ThemedText type="defaultSemiBold">Invite Only</ThemedText>
                  <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>
                    Send invites to specific athletes
                  </ThemedText>
                </View>
                {inviteMode === 'invite' && (
                  <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
                )}
              </Pressable>

              {inviteMode === 'invite' && (
                <SurfaceCard style={styles.athleteList}>
                  <ThemedText type="defaultSemiBold" style={styles.athleteListTitle}>
                    Select Athletes
                  </ThemedText>
                  {pastAthletes.map(athlete => (
                    <Pressable
                      key={athlete.id}
                      style={[
                        styles.athleteRow,
                        {
                          backgroundColor: selectedAthletes.includes(athlete.id)
                            ? `${palette.tint}08`
                            : 'transparent',
                        },
                      ]}
                      onPress={() => toggleAthleteSelection(athlete.id)}
                    >
                      <View style={[styles.athleteAvatar, { backgroundColor: `${palette.tint}20` }]}>
                        <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                          {athlete.name.charAt(0)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.athleteName}>{athlete.name}</ThemedText>
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: selectedAthletes.includes(athlete.id)
                              ? palette.tint
                              : palette.border,
                            backgroundColor: selectedAthletes.includes(athlete.id)
                              ? palette.tint
                              : 'transparent',
                          },
                        ]}
                      >
                        {selectedAthletes.includes(athlete.id) && (
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        )}
                      </View>
                    </Pressable>
                  ))}
                </SurfaceCard>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer Buttons */}
        <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
          {step !== 'invite' ? (
            <Pressable
              style={[styles.nextButton, { backgroundColor: palette.tint }]}
              onPress={handleNext}
            >
              <ThemedText style={styles.nextButtonText}>Continue</ThemedText>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.nextButton,
                { backgroundColor: isSubmitting ? palette.border : palette.tint },
              ]}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ThemedText style={styles.nextButtonText}>Creating...</ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <ThemedText style={styles.nextButtonText}>Create Session</ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.md,
    paddingBottom: 120,
  },
  stepContent: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: 15,
    marginBottom: Spacing.xs,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
    gap: 2,
  },
  typeDesc: {
    fontSize: 13,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: Spacing.xs,
  },
  priceField: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  skillChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  recurrenceOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  recurrenceText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearEndDate: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  athleteList: {
    gap: Spacing.sm,
  },
  athleteListTitle: {
    marginBottom: Spacing.xs,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  athleteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteName: {
    flex: 1,
    fontSize: 15,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
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
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
