import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import Animated, { FadeInRight } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { SessionOffering, FootballObjective, SessionInviteType } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { rosterService } from '@/services/roster-service';

const logger = createLogger('CreateSession');

// Session type options
type SessionType = '1on1' | 'small_group' | 'group' | 'camp';

const SESSION_TYPES: { key: SessionType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap; maxParticipants: number }[] = [
  { key: '1on1', label: '1-on-1', description: 'Personal training', icon: 'person', maxParticipants: 1 },
  { key: 'small_group', label: 'Small Group', description: '2-4 athletes', icon: 'people', maxParticipants: 4 },
  { key: 'group', label: 'Group', description: '5+ athletes', icon: 'people-circle', maxParticipants: 15 },
  { key: 'camp', label: 'Camp/Clinic', description: 'Intensive training', icon: 'sunny', maxParticipants: 30 },
];

// Duration options
const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

// Recurring options
type RecurrenceType = 'once' | 'weekly' | 'biweekly' | 'monthly';

const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'once', label: 'One-time', icon: 'calendar-outline' },
  { key: 'weekly', label: 'Weekly', icon: 'repeat' },
  { key: 'biweekly', label: 'Biweekly', icon: 'sync' },
  { key: 'monthly', label: 'Monthly', icon: 'calendar' },
];

// Focus areas
const FOCUS_AREAS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

import { STORAGE_KEYS } from '@/constants/storage-keys';

type WizardStep = 'details' | 'schedule' | 'review' | 'invite';

export default function CreateSessionScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<WizardStep>('details');
  const [loading, setLoading] = useState(false);
  const [savedLocations, setSavedLocations] = useState<string[]>([]);

  // Step 1: Type & Details
  const [sessionType, setSessionType] = useState<SessionType>('1on1');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(60);
  const [focusAreas, setFocusAreas] = useState<FootballObjective[]>([]);
  const [maxParticipants, setMaxParticipants] = useState('');

  // Step 2: Schedule & Pricing
  const [recurrence, setRecurrence] = useState<RecurrenceType>('once');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');

  // Step 4: Invite
  const [inviteType, setInviteType] = useState<SessionInviteType>('OPEN');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [pastAthletes, setPastAthletes] = useState<{ id: string; name: string }[]>([]);

  // Load saved locations
  useEffect(() => {
    loadSavedLocations();
  }, []);

  // Load athletes from roster for invite
  useEffect(() => {
    const loadPastAthletes = async () => {
      if (!currentUser?.id) return;
      try {
        // Fetch from roster service - athletes the coach has worked with
        const roster = await rosterService.getRoster(currentUser.id);
        const athletes = roster.map((entry) => ({
          id: entry.athleteId,
          name: entry.athleteName,
        }));
        setPastAthletes(athletes);
      } catch (error) {
        logger.error('Failed to load athletes', error);
      }
    };
    loadPastAthletes();
  }, [currentUser]);

  const loadSavedLocations = async () => {
    try {
      const locations = await apiClient.get<string[] | null>(STORAGE_KEYS.SAVED_LOCATIONS, null);
      if (locations) {
        setSavedLocations(locations);
      }
    } catch (error) {
      logger.error('Failed to load saved locations', error);
    }
  };

  const saveLocation = async (loc: string) => {
    if (!loc || savedLocations.includes(loc)) return;
    const updated = [loc, ...savedLocations.slice(0, 4)];
    setSavedLocations(updated);
    try {
      await apiClient.set(STORAGE_KEYS.SAVED_LOCATIONS, updated);
    } catch (error) {
      logger.error('Failed to save location', error);
    }
  };

  const steps: WizardStep[] = ['details', 'schedule', 'review', 'invite'];
  const currentStepIndex = steps.indexOf(step);

  const getDefaultMaxParticipants = () => {
    const typeConfig = SESSION_TYPES.find(t => t.key === sessionType);
    return typeConfig?.maxParticipants || 1;
  };

  const canProceed = () => {
    switch (step) {
      case 'details':
        return title.trim().length > 0;
      case 'schedule':
        return selectedDate.trim().length > 0 && location.trim().length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1]);
    } else {
      router.back();
    }
  };

  const toggleFocusArea = (area: FootballObjective) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter(a => a !== area));
    } else {
      setFocusAreas([...focusAreas, area]);
    }
  };

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleCreate = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // Save location for future use
      await saveLocation(location);

      // Create the session offering
      const participants = maxParticipants
        ? parseInt(maxParticipants, 10)
        : getDefaultMaxParticipants();

      const scheduledAt = `${selectedDate}T${selectedTime}:00`;

      const newOffering: SessionOffering = {
        id: `session_${Date.now()}`,
        coachId: currentUser.id,
        coachName: currentUser.name || currentUser.fullName || 'Coach',
        coachPhotoUrl: currentUser.avatar,
        title,
        description: description || undefined,
        sessionType: sessionType === '1on1' ? '1on1' : 'group',
        inviteType,
        maxParticipants: participants,
        location,
        scheduledAt,
        isRecurring: recurrence !== 'once',
        recurrenceType: recurrence === 'weekly' ? 'weekly' : 'none',
        dayOfWeek: recurrence !== 'once' ? new Date(scheduledAt).getDay() : undefined,
        timeOfDay: recurrence !== 'once' ? selectedTime : undefined,
        status: 'active',
        registrations: [],
        createdAt: new Date().toISOString(),
        priceUsd: price ? parseFloat(price) : undefined,
        footballSkill: focusAreas[0] || undefined,
      };

      // Save to storage
      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      offerings.push(newOffering);
      await apiClient.set('session_offerings', offerings);

      // If closed/invite-only mode, send invites to selected athletes
      if (inviteType === 'CLOSED' && selectedAthletes.length > 0) {
        // Would call sessionInviteService.createBulk() here
        logger.info('Sending invites to athletes', { athleteIds: selectedAthletes, inviteType });
      }

      Alert.alert(
        'Session Created!',
        `"${title}" has been created successfully.`,
        [
          {
            text: 'View Schedule',
            onPress: () => router.replace(Routes.SCHEDULE),
          },
          {
            text: 'Create Another',
            onPress: () => {
              // Reset form
              setStep('details');
              setTitle('');
              setDescription('');
              setPrice('');
              setSelectedDate('');
              setFocusAreas([]);
              setInviteType('OPEN');
              setSelectedAthletes([]);
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to create session:', error);
      Alert.alert('Error', 'Failed to create session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((s, i) => (
        <View key={s} style={styles.stepItem}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: i <= currentStepIndex ? palette.tint : palette.border,
              },
            ]}
          >
            {i < currentStepIndex && (
              <Ionicons name="checkmark" size={12} color={Colors.light.onPrimary} />
            )}
          </View>
          {i < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor: i < currentStepIndex ? palette.tint : palette.border,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepLabel = () => {
    const labels = {
      details: 'Type & Details',
      schedule: 'Schedule & Pricing',
      review: 'Review & Publish',
      invite: 'Invite Athletes',
    };
    return (
      <ThemedText style={[styles.stepLabel, { color: palette.muted }]}>
        Step {currentStepIndex + 1} of {steps.length}: {labels[step]}
      </ThemedText>
    );
  };

  const renderDetailsStep = () => (
    <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
      {/* Session Type Selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Session Type
        </ThemedText>
        <View style={styles.typeGrid}>
          {SESSION_TYPES.map((type) => (
            <Clickable
              key={type.key}
              onPress={() => setSessionType(type.key)}
              style={[
                styles.typeCard,
                {
                  backgroundColor: sessionType === type.key ? withAlpha(palette.tint, 0.07) : palette.surface,
                  borderColor: sessionType === type.key ? palette.tint : palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.typeIcon,
                  {
                    backgroundColor: sessionType === type.key ? palette.tint : withAlpha(palette.muted, 0.12),
                  },
                ]}
              >
                <Ionicons
                  name={type.icon}
                  size={22}
                  color={sessionType === type.key ? Colors.light.onPrimary : palette.muted}
                />
              </View>
              <ThemedText
                style={[
                  styles.typeLabel,
                  { color: sessionType === type.key ? palette.tint : palette.text },
                ]}
              >
                {type.label}
              </ThemedText>
              <ThemedText style={[styles.typeDesc, { color: palette.muted }]}>
                {type.description}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      {/* Title Input */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Session Name *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
          ]}
          placeholder="e.g., Striker Finishing Clinic"
          placeholderTextColor={palette.muted}
          value={title}
          onChangeText={setTitle}
        />
      </View>

      {/* Duration Selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Duration
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt) => (
              <Clickable
                key={opt.value}
                onPress={() => setDuration(opt.value)}
                style={[
                  styles.durationChip,
                  {
                    backgroundColor: duration === opt.value ? palette.tint : palette.surface,
                    borderColor: duration === opt.value ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.durationText,
                    { color: duration === opt.value ? Colors.light.onPrimary : palette.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Clickable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Max Participants (for group sessions) */}
      {sessionType !== '1on1' && (
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Max Participants
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.smallInput,
              { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
            ]}
            placeholder={`Default: ${getDefaultMaxParticipants()}`}
            placeholderTextColor={palette.muted}
            value={maxParticipants}
            onChangeText={setMaxParticipants}
            keyboardType="number-pad"
          />
        </View>
      )}

      {/* Description */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Description
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
          ]}
          placeholder="What will athletes learn or work on?"
          placeholderTextColor={palette.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Focus Areas */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Focus Areas
        </ThemedText>
        <View style={styles.focusGrid}>
          {FOCUS_AREAS.map((area) => (
            <Clickable
              key={area}
              onPress={() => toggleFocusArea(area)}
              style={[
                styles.focusChip,
                {
                  backgroundColor: focusAreas.includes(area) ? palette.tint : palette.surface,
                  borderColor: focusAreas.includes(area) ? palette.tint : palette.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.focusText,
                  { color: focusAreas.includes(area) ? Colors.light.onPrimary : palette.text },
                ]}
              >
                {area}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderScheduleStep = () => (
    <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
      {/* Recurrence Selection */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Frequency
        </ThemedText>
        <View style={styles.recurrenceRow}>
          {RECURRENCE_OPTIONS.map((opt) => (
            <Clickable
              key={opt.key}
              onPress={() => setRecurrence(opt.key)}
              style={[
                styles.recurrenceCard,
                {
                  backgroundColor: recurrence === opt.key ? withAlpha(palette.tint, 0.07) : palette.surface,
                  borderColor: recurrence === opt.key ? palette.tint : palette.border,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={20}
                color={recurrence === opt.key ? palette.tint : palette.muted}
              />
              <ThemedText
                style={[
                  styles.recurrenceLabel,
                  { color: recurrence === opt.key ? palette.tint : palette.text },
                ]}
              >
                {opt.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </View>

      {/* Date Input */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {recurrence === 'once' ? 'Date *' : 'Start Date *'}
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
          ]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={palette.muted}
          value={selectedDate}
          onChangeText={setSelectedDate}
        />
      </View>

      {/* Time Input */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Time
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            styles.smallInput,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
          ]}
          placeholder="10:00"
          placeholderTextColor={palette.muted}
          value={selectedTime}
          onChangeText={setSelectedTime}
        />
      </View>

      {/* Location Input with Saved Locations */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Location *
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
          ]}
          placeholder="e.g., Central Park Field 1"
          placeholderTextColor={palette.muted}
          value={location}
          onChangeText={setLocation}
        />
        {savedLocations.length > 0 && (
          <View style={styles.savedLocations}>
            <ThemedText style={[styles.savedLabel, { color: palette.muted }]}>
              Recent:
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.savedRow}>
                {savedLocations.map((loc, i) => (
                  <Clickable
                    key={i}
                    onPress={() => setLocation(loc)}
                    style={[
                      styles.savedChip,
                      {
                        backgroundColor: location === loc ? withAlpha(palette.tint, 0.07) : palette.surface,
                        borderColor: location === loc ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons name="location" size={12} color={palette.muted} />
                    <ThemedText style={[styles.savedText, { color: palette.text }]} numberOfLines={1}>
                      {loc}
                    </ThemedText>
                  </Clickable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Price Input */}
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Price per Session (USD)
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText style={[styles.currencySymbol, { color: palette.muted }]}>$</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.priceInput,
              { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border },
            ]}
            placeholder="0 for free"
            placeholderTextColor={palette.muted}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>
        <ThemedText style={[styles.priceHint, { color: palette.muted }]}>
          Leave empty or set to 0 for free sessions
        </ThemedText>
      </View>
    </Animated.View>
  );

  const renderReviewStep = () => {
    const typeConfig = SESSION_TYPES.find(t => t.key === sessionType);
    const durationLabel = DURATION_OPTIONS.find(d => d.value === duration)?.label || `${duration} min`;
    const recurrenceLabel = RECURRENCE_OPTIONS.find(r => r.key === recurrence)?.label || 'One-time';
    const participants = maxParticipants || getDefaultMaxParticipants();

    return (
      <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
        <SurfaceCard style={styles.reviewCard}>
          {/* Title */}
          <View style={styles.reviewHeader}>
            <ThemedText type="title" style={styles.reviewTitle}>
              {title || 'Untitled Session'}
            </ThemedText>
            <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name={typeConfig?.icon || 'fitness'} size={14} color={palette.tint} />
              <ThemedText style={[styles.typeBadgeText, { color: palette.tint }]}>
                {typeConfig?.label}
              </ThemedText>
            </View>
          </View>

          {/* Description */}
          {description ? (
            <ThemedText style={[styles.reviewDescription, { color: palette.muted }]}>
              {description}
            </ThemedText>
          ) : null}

          <View style={[styles.reviewDivider, { backgroundColor: palette.border }]} />

          {/* Details Grid */}
          <View style={styles.reviewGrid}>
            <View style={styles.reviewItem}>
              <Ionicons name="time-outline" size={18} color={palette.muted} />
              <View>
                <ThemedText style={[styles.reviewItemLabel, { color: palette.muted }]}>
                  Duration
                </ThemedText>
                <ThemedText type="defaultSemiBold">{durationLabel}</ThemedText>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <Ionicons name="calendar-outline" size={18} color={palette.muted} />
              <View>
                <ThemedText style={[styles.reviewItemLabel, { color: palette.muted }]}>
                  Schedule
                </ThemedText>
                <ThemedText type="defaultSemiBold">
                  {selectedDate} at {selectedTime}
                </ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  {recurrenceLabel}
                </ThemedText>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <Ionicons name="location-outline" size={18} color={palette.muted} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.reviewItemLabel, { color: palette.muted }]}>
                  Location
                </ThemedText>
                <ThemedText type="defaultSemiBold" numberOfLines={2}>
                  {location}
                </ThemedText>
              </View>
            </View>

            <View style={styles.reviewItem}>
              <Ionicons name="people-outline" size={18} color={palette.muted} />
              <View>
                <ThemedText style={[styles.reviewItemLabel, { color: palette.muted }]}>
                  Capacity
                </ThemedText>
                <ThemedText type="defaultSemiBold">
                  {participants} {sessionType === '1on1' ? 'athlete' : 'athletes'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.reviewDivider, { backgroundColor: palette.border }]} />

          {/* Price */}
          <View style={styles.reviewPriceRow}>
            <ThemedText style={{ color: palette.muted }}>Price per session</ThemedText>
            <ThemedText type="title" style={{ color: palette.tint }}>
              {price && parseFloat(price) > 0 ? `$${parseFloat(price).toFixed(2)}` : 'Free'}
            </ThemedText>
          </View>

          {/* Focus Areas */}
          {focusAreas.length > 0 && (
            <View style={styles.reviewFocus}>
              <ThemedText style={[styles.reviewItemLabel, { color: palette.muted }]}>
                Focus Areas
              </ThemedText>
              <View style={styles.focusTagsRow}>
                {focusAreas.map(area => (
                  <View
                    key={area}
                    style={[styles.focusTag, { backgroundColor: withAlpha(palette.success, 0.09) }]}
                  >
                    <ThemedText style={[styles.focusTagText, { color: palette.success }]}>
                      {area}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </SurfaceCard>

        <ThemedText style={[styles.reviewNote, { color: palette.muted }]}>
          {inviteType === 'OPEN'
            ? 'Your session will be visible to all athletes once published.'
            : inviteType === 'CLOSED'
            ? 'Only invited athletes will be able to see this session.'
            : 'Only squad members will be able to see this session.'}
        </ThemedText>
      </Animated.View>
    );
  };

  const INVITE_TYPE_OPTIONS: {
    key: SessionInviteType;
    label: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    colorKey: keyof typeof palette;
  }[] = [
    {
      key: 'OPEN',
      label: 'Open Session',
      description: 'Visible when browsing your available sessions',
      icon: 'globe-outline',
      colorKey: 'success',
    },
    {
      key: 'CLOSED',
      label: 'Invite Only',
      description: 'Only athletes you explicitly invite can see/book',
      icon: 'lock-closed-outline',
      colorKey: 'warning',
    },
    {
      key: 'SQUAD_ONLY',
      label: 'Squad Only',
      description: 'Only members of selected squad(s) can see/book',
      icon: 'people-outline',
      colorKey: 'info',
    },
  ];

  const renderInviteStep = () => (
    <Animated.View entering={FadeInRight.springify()} style={styles.stepContent}>
      <View style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Who can join?
        </ThemedText>

        {INVITE_TYPE_OPTIONS.map((option) => (
          <Clickable
            key={option.key}
            onPress={() => setInviteType(option.key)}
            style={[
              styles.inviteModeCard,
              {
                borderColor: inviteType === option.key ? palette.tint : palette.border,
                backgroundColor: inviteType === option.key ? withAlpha(palette.tint, 0.03) : palette.surface,
              },
            ]}
          >
            <View style={[styles.inviteModeIcon, { backgroundColor: withAlpha(palette[option.colorKey], 0.09) }]}>
              <Ionicons name={option.icon} size={24} color={palette[option.colorKey] as string} />
            </View>
            <View style={styles.inviteModeInfo}>
              <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
              <ThemedText style={[styles.inviteModeDesc, { color: palette.muted }]}>
                {option.description}
              </ThemedText>
            </View>
            {inviteType === option.key && (
              <Ionicons name="checkmark-circle" size={24} color={palette.tint} />
            )}
          </Clickable>
        ))}
      </View>

      {inviteType === 'CLOSED' && (
        <SurfaceCard style={styles.athleteList}>
          <ThemedText type="defaultSemiBold" style={styles.athleteListTitle}>
            Select Athletes to Invite
          </ThemedText>
          {pastAthletes.map(athlete => (
            <Clickable
              key={athlete.id}
              onPress={() => toggleAthleteSelection(athlete.id)}
              style={[
                styles.athleteRow,
                {
                  backgroundColor: selectedAthletes.includes(athlete.id)
                    ? withAlpha(palette.tint, 0.03)
                    : 'transparent',
                },
              ]}
            >
              <View style={[styles.athleteAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
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
                  <Ionicons name="checkmark" size={14} color={Colors.light.onPrimary} />
                )}
              </View>
            </Clickable>
          ))}
        </SurfaceCard>
      )}

      {inviteType === 'SQUAD_ONLY' && (
        <SurfaceCard style={styles.athleteList}>
          <ThemedText type="defaultSemiBold" style={styles.athleteListTitle}>
            Squad Access
          </ThemedText>
          <ThemedText style={[styles.inviteModeDesc, { color: palette.muted }]}>
            Only members of your squads will be able to view and book this session.
          </ThemedText>
        </SurfaceCard>
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={goBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.headerCenter}>
            <ThemedText type="subtitle">Create Session</ThemedText>
          </View>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
        </View>

        {/* Step Indicator */}
        {renderStepIndicator()}
        {renderStepLabel()}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 'details' && renderDetailsStep()}
          {step === 'schedule' && renderScheduleStep()}
          {step === 'review' && renderReviewStep()}
          {step === 'invite' && renderInviteStep()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'invite' ? (
            <Button onPress={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Session'}
            </Button>
          ) : (
            <Button onPress={goNext} disabled={!canProceed()}>
              Continue
            </Button>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
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
    width: 60,
    height: 2,
    marginHorizontal: Spacing.xs,
  },
  stepLabel: {
    textAlign: 'center',
    ...Typography.caption,
    paddingBottom: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySmall,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
    borderWidth: 1,
  },
  smallInput: {
    width: 140,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    ...Typography.bodySmallSemiBold,
  },
  typeDesc: {
    ...Typography.caption,
  },
  durationRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  durationChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  durationText: {
    ...Typography.bodySmallSemiBold,
  },
  focusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  focusChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  focusText: {
    ...Typography.smallSemiBold,
  },
  recurrenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  recurrenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  recurrenceLabel: {
    ...Typography.smallSemiBold,
  },
  savedLocations: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  savedLabel: {
    ...Typography.caption,
  },
  savedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxWidth: 180,
  },
  savedText: {
    ...Typography.caption,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  currencySymbol: {
    ...Typography.heading,
  },
  priceInput: {
    flex: 1,
    maxWidth: 120,
  },
  priceHint: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  reviewCard: {
    gap: Spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  reviewTitle: {
    flex: 1,
    ...Typography.title,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    ...Typography.caption,
  },
  reviewDescription: {
    ...Typography.bodySmall,
  },
  reviewDivider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  reviewGrid: {
    gap: Spacing.md,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  reviewItemLabel: {
    ...Typography.caption,
    marginBottom: Spacing.micro,
  },
  reviewPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewFocus: {
    gap: Spacing.xs,
  },
  focusTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  focusTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  focusTagText: {
    ...Typography.caption,
  },
  reviewNote: {
    textAlign: 'center',
    ...Typography.small,
    marginTop: Spacing.md,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  inviteModeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 2,
    gap: Spacing.md,
  },
  inviteModeIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteModeInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  inviteModeDesc: {
    ...Typography.small,
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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteName: {
    flex: 1,
    ...Typography.body,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
