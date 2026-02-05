import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { InlineSquadSelector } from '@/components/squad/squad-picker';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { eventService, CreateEventInput } from '@/services/event-service';
import { squadService } from '@/services/squad-service';
import { inviteService as bulkInviteService } from '@/services/invite';
import type { ClubEventType, EventTargetAudience, ClubSquad } from '@/constants/types';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('CreateEventScreen');

// Default club ID for demo
const DEFAULT_CLUB_ID = 'club_lions';

const EVENT_TYPES: { key: ClubEventType; label: string; icon: string }[] = [
  { key: 'TOURNAMENT', label: 'Tournament', icon: 'trophy' },
  { key: 'SOCIAL', label: 'Social', icon: 'people' },
  { key: 'MEETING', label: 'Meeting', icon: 'chatbubbles' },
  { key: 'PRESENTATION', label: 'Presentation', icon: 'ribbon' },
  { key: 'FUNDRAISER', label: 'Fundraiser', icon: 'cash' },
  { key: 'TRIAL_DAY', label: 'Trial Day', icon: 'football' },
  { key: 'OTHER', label: 'Other', icon: 'calendar' },
];

const AUDIENCE_OPTIONS: { key: EventTargetAudience | 'SQUADS'; label: string; description: string; icon: string }[] = [
  { key: 'ALL', label: 'Everyone', description: 'All club members', icon: 'globe-outline' },
  { key: 'SQUADS', label: 'Specific Squads', description: 'Select which squads to invite', icon: 'people-outline' },
  { key: 'COACHES', label: 'Coaches Only', description: 'Staff and coaches', icon: 'school-outline' },
  { key: 'PARENTS', label: 'Parents Only', description: 'Parents and guardians', icon: 'person-outline' },
  { key: 'ATHLETES', label: 'Athletes Only', description: 'Players and athletes', icon: 'football-outline' },
];

type WizardStep = 'type' | 'details' | 'schedule' | 'audience' | 'review';

export default function CreateEventScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [step, setStep] = useState<WizardStep>('type');
  const [loading, setLoading] = useState(false);

  // Form state
  const [eventType, setEventType] = useState<ClubEventType>('SOCIAL');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [targetAudience, setTargetAudience] = useState<EventTargetAudience | 'SQUADS'>('ALL');
  const [selectedSquadIds, setSelectedSquadIds] = useState<string[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [maxAttendees, setMaxAttendees] = useState('');
  const [price, setPrice] = useState('0');
  const [rsvpRequired, setRsvpRequired] = useState(true);
  const [rsvpDeadline, setRsvpDeadline] = useState('');

  // Load squads on mount
  useEffect(() => {
    loadSquads();
  }, []);

  const loadSquads = async () => {
    try {
      const data = await squadService.getSquads(DEFAULT_CLUB_ID);
      setSquads(data.filter(s => !s.name.toLowerCase().includes('staff')));
    } catch (error) {
      logger.error('Failed to load squads:', error);
    }
  };

  const totalInviteCount = squads
    .filter(s => selectedSquadIds.includes(s.id))
    .reduce((sum, s) => sum + s.memberCount, 0);

  const steps: WizardStep[] = ['type', 'details', 'schedule', 'audience', 'review'];
  const currentStepIndex = steps.indexOf(step);

  const canProceed = () => {
    switch (step) {
      case 'type':
        return true;
      case 'details':
        return title.trim().length > 0 && (venue.trim().length > 0 || isVirtual);
      case 'schedule':
        return date.trim().length > 0;
      case 'audience':
        // If squads selected, require at least one squad
        return targetAudience !== 'SQUADS' || selectedSquadIds.length > 0;
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

  const handleCreate = async (publish: boolean = false) => {
    if (!currentUser) return;

    setLoading(true);
    try {
      if (targetAudience === 'SQUADS' && selectedSquadIds.length > 0 && publish) {
        // Use bulk invite service for squad-based event creation
        const result = await bulkInviteService.inviteSquadsToEvent({
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          title,
          description,
          eventType,
          date,
          startTime,
          endTime: endTime || undefined,
          venue: isVirtual ? 'Online' : venue,
          isVirtual,
          squadIds: selectedSquadIds,
          createdBy: currentUser.id,
          createdByName: currentUser.name || 'Coach',
          price: parseFloat(price) || 0,
          maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
        });

        Alert.alert(
          'Event Created!',
          `${title} created and ${result.inviteResult.successful} invite${result.inviteResult.successful !== 1 ? 's' : ''} sent to squad members.`,
          [
            {
              text: 'OK',
              onPress: () => router.replace({
                pathname: '/events/[id]',
                params: { id: result.event.id },
              }),
            },
          ]
        );
      } else {
        // Standard event creation flow
        const input: CreateEventInput = {
          clubId: DEFAULT_CLUB_ID,
          clubName: 'Lions FC Academy',
          createdBy: currentUser.id,
          createdByName: currentUser.name || 'Coach',
          title,
          description,
          eventType,
          date,
          startTime,
          endTime: endTime || undefined,
          venue: isVirtual ? 'Online' : venue,
          address: isVirtual ? undefined : address || undefined,
          isVirtual,
          meetingLink: isVirtual ? meetingLink || undefined : undefined,
          targetAudience: targetAudience === 'SQUADS' ? 'ALL' : targetAudience,
          maxAttendees: maxAttendees ? parseInt(maxAttendees, 10) : undefined,
          price: parseFloat(price) || 0,
          currency: 'GBP',
          rsvpRequired,
          rsvpDeadline: rsvpDeadline || undefined,
        };

        const event = await eventService.createEvent(input);

        if (publish) {
          await eventService.publishEvent(event.id);
          await eventService.inviteClub(event.id);
        }

        router.replace({
          pathname: '/events/[id]',
          params: { id: event.id },
        });
      }
    } catch (error) {
      logger.error('Failed to create event:', error);
      Alert.alert('Error', 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'type':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              What type of event?
            </ThemedText>
            <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
              Choose the category that best fits your event
            </ThemedText>
            <View style={styles.typeGrid}>
              {EVENT_TYPES.map((type) => {
                const typeColor = eventService.getEventTypeColor(type.key);
                return (
                  <Clickable
                    key={type.key}
                    onPress={() => setEventType(type.key)}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: eventType === type.key ? `${typeColor}15` : palette.surface,
                        borderColor: eventType === type.key ? typeColor : palette.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.typeIcon,
                        {
                          backgroundColor: eventType === type.key ? typeColor : palette.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={type.icon as any}
                        size={24}
                        color={eventType === type.key ? '#fff' : palette.muted}
                      />
                    </View>
                    <ThemedText
                      style={[
                        styles.typeLabel,
                        { color: eventType === type.key ? typeColor : palette.text },
                      ]}
                    >
                      {type.label}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          </Animated.View>
        );

      case 'details':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Event details
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Title *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="e.g., End of Season Presentation"
                placeholderTextColor={palette.muted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description</ThemedText>
              <TextInput
                style={[styles.textArea, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="What should attendees know about this event?"
                placeholderTextColor={palette.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>

            <Clickable
              onPress={() => setIsVirtual(!isVirtual)}
              style={styles.toggleRow}
            >
              <View style={styles.toggleInfo}>
                <ThemedText type="defaultSemiBold">Virtual Event</ThemedText>
                <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
                  This event will be held online
                </ThemedText>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: isVirtual ? palette.tint : palette.border },
                ]}
              >
                <View
                  style={[
                    styles.toggleHandle,
                    { transform: [{ translateX: isVirtual ? 18 : 2 }] },
                  ]}
                />
              </View>
            </Clickable>

            {!isVirtual ? (
              <>
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Venue *</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                    placeholder="e.g., Bradwell Community Centre"
                    placeholderTextColor={palette.muted}
                    value={venue}
                    onChangeText={setVenue}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Address</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                    placeholder="Full address"
                    placeholderTextColor={palette.muted}
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
              </>
            ) : (
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Meeting Link</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="https://zoom.us/j/..."
                  placeholderTextColor={palette.muted}
                  value={meetingLink}
                  onChangeText={setMeetingLink}
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>
            )}
          </Animated.View>
        );

      case 'schedule':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              When is it?
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Date *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.muted}
                value={date}
                onChangeText={setDate}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Start Time</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="10:00"
                  placeholderTextColor={palette.muted}
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>End Time</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                  placeholder="12:00"
                  placeholderTextColor={palette.muted}
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>RSVP Deadline</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="YYYY-MM-DD (optional)"
                placeholderTextColor={palette.muted}
                value={rsvpDeadline}
                onChangeText={setRsvpDeadline}
              />
            </View>
          </Animated.View>
        );

      case 'audience':
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Who can attend?
            </ThemedText>

            <View style={styles.audienceGrid}>
              {AUDIENCE_OPTIONS.map((option) => (
                <Clickable
                  key={option.key}
                  onPress={() => {
                    setTargetAudience(option.key);
                    // Clear squad selection if not selecting squads
                    if (option.key !== 'SQUADS') {
                      setSelectedSquadIds([]);
                    }
                  }}
                  style={[
                    styles.audienceCard,
                    {
                      backgroundColor:
                        targetAudience === option.key ? `${palette.tint}15` : palette.surface,
                      borderColor: targetAudience === option.key ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View style={styles.audienceRadio}>
                    <View
                      style={[
                        styles.radioOuter,
                        { borderColor: targetAudience === option.key ? palette.tint : palette.border },
                      ]}
                    >
                      {targetAudience === option.key && (
                        <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />
                      )}
                    </View>
                  </View>
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={targetAudience === option.key ? palette.tint : palette.muted}
                  />
                  <View style={styles.audienceInfo}>
                    <ThemedText type="defaultSemiBold">{option.label}</ThemedText>
                    <ThemedText style={[styles.audienceDesc, { color: palette.muted }]}>
                      {option.description}
                    </ThemedText>
                  </View>
                </Clickable>
              ))}
            </View>

            {/* Squad selector when SQUADS audience is chosen */}
            {targetAudience === 'SQUADS' && (
              <SurfaceCard style={styles.squadSelectorCard}>
                <View style={styles.squadSelectorHeader}>
                  <Ionicons name="people" size={20} color={palette.tint} />
                  <ThemedText type="defaultSemiBold">Select Squads</ThemedText>
                </View>
                <InlineSquadSelector
                  clubId={DEFAULT_CLUB_ID}
                  selectedSquadIds={selectedSquadIds}
                  onSelectionChange={setSelectedSquadIds}
                  multiSelect
                />
                {selectedSquadIds.length > 0 && (
                  <View style={[styles.squadSummary, { backgroundColor: `${palette.tint}10` }]}>
                    <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
                    <ThemedText style={{ color: palette.tint, fontSize: 13 }}>
                      {selectedSquadIds.length} squad{selectedSquadIds.length !== 1 ? 's' : ''} selected ({totalInviteCount} athletes)
                    </ThemedText>
                  </View>
                )}
              </SurfaceCard>
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Max Attendees (optional)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="Leave empty for unlimited"
                placeholderTextColor={palette.muted}
                value={maxAttendees}
                onChangeText={setMaxAttendees}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Price per person (GBP)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: palette.surface, color: palette.text }]}
                placeholder="0 for free"
                placeholderTextColor={palette.muted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>

            <Clickable
              onPress={() => setRsvpRequired(!rsvpRequired)}
              style={styles.toggleRow}
            >
              <View style={styles.toggleInfo}>
                <ThemedText type="defaultSemiBold">Require RSVP</ThemedText>
                <ThemedText style={[styles.toggleDesc, { color: palette.muted }]}>
                  Ask members to confirm attendance
                </ThemedText>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: rsvpRequired ? palette.tint : palette.border },
                ]}
              >
                <View
                  style={[
                    styles.toggleHandle,
                    { transform: [{ translateX: rsvpRequired ? 18 : 2 }] },
                  ]}
                />
              </View>
            </Clickable>
          </Animated.View>
        );

      case 'review':
        const typeColor = eventService.getEventTypeColor(eventType);
        return (
          <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
            <ThemedText type="title" style={styles.stepTitle}>
              Review your event
            </ThemedText>

            <SurfaceCard style={styles.reviewCard}>
              <View style={[styles.reviewTypeBadge, { backgroundColor: `${typeColor}20` }]}>
                <Ionicons
                  name={eventService.getEventTypeIcon(eventType) as any}
                  size={16}
                  color={typeColor}
                />
                <ThemedText style={[styles.reviewTypeText, { color: typeColor }]}>
                  {eventService.formatEventType(eventType)}
                </ThemedText>
              </View>

              <ThemedText type="subtitle" style={styles.reviewTitle}>
                {title}
              </ThemedText>

              {description && (
                <ThemedText style={[styles.reviewDescription, { color: palette.muted }]}>
                  {description}
                </ThemedText>
              )}

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Ionicons name="calendar-outline" size={18} color={palette.icon} />
                <ThemedText>{date} at {startTime}{endTime && ` - ${endTime}`}</ThemedText>
              </View>

              <View style={styles.reviewRow}>
                <Ionicons name="location-outline" size={18} color={palette.icon} />
                <ThemedText>{isVirtual ? 'Online (Virtual)' : venue}</ThemedText>
              </View>

              <View style={styles.reviewRow}>
                <Ionicons name="people-outline" size={18} color={palette.icon} />
                <ThemedText>
                  {targetAudience === 'SQUADS'
                    ? `Specific Squads (${selectedSquadIds.length} selected)`
                    : eventService.formatAudience(targetAudience as any)}
                </ThemedText>
              </View>

              <View style={styles.reviewRow}>
                <Ionicons name="cash-outline" size={18} color={palette.icon} />
                <ThemedText>{eventService.formatPrice(parseFloat(price) || 0, 'GBP')}</ThemedText>
              </View>
            </SurfaceCard>
          </Animated.View>
        );
    }
  };

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
          <ThemedText type="subtitle" style={{ flex: 1, textAlign: 'center' }}>
            Create Event
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {steps.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                { backgroundColor: i <= currentStepIndex ? palette.tint : palette.border },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer buttons */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {step === 'review' ? (
            <View style={styles.reviewButtons}>
              <Button
                variant="outline"
                onPress={() => handleCreate(false)}
                disabled={loading}
                style={styles.reviewButton}
              >
                Save Draft
              </Button>
              <Button
                onPress={() => handleCreate(true)}
                disabled={loading}
                style={styles.reviewButton}
              >
                {loading ? 'Creating...' : 'Publish'}
              </Button>
            </View>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepSubtitle: {
    textAlign: 'center',
    fontSize: scaleFont(14),
    marginTop: -Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  typeCard: {
    width: '30%',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 2,
  },
  typeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: scaleFont(15),
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: scaleFont(15),
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    fontSize: scaleFont(12),
    marginTop: 2,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleHandle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  audienceGrid: {
    gap: Spacing.sm,
  },
  audienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  audienceRadio: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  audienceInfo: {
    flex: 1,
  },
  audienceDesc: {
    fontSize: scaleFont(12),
    marginTop: 2,
  },
  squadSelectorCard: {
    gap: Spacing.md,
  },
  squadSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  squadSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  reviewCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  reviewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    alignSelf: 'flex-start',
  },
  reviewTypeText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  reviewTitle: {
    marginTop: Spacing.xs,
  },
  reviewDescription: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: Spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  reviewButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  reviewButton: {
    flex: 1,
  },
});
