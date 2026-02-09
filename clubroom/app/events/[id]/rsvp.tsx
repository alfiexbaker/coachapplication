import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { ClubEvent, EventRSVP, RSVPStatus } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('EventRSVPScreen');

export default function EventRSVPScreen() {
  const { colors: palette } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [currentRSVP, setCurrentRSVP] = useState<EventRSVP | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [guestCount, setGuestCount] = useState(0);
  const [note, setNote] = useState('');

  const loadData = useCallback(async () => {
    if (!id || !currentUser) return;
    try {
      const [eventData, rsvpData] = await Promise.all([
        eventService.getEvent(id),
        eventService.getUserEventRSVP(id, currentUser.id),
      ]);
      setEvent(eventData);
      setCurrentRSVP(rsvpData);

      // Pre-fill form if existing RSVP
      if (rsvpData) {
        setSelectedStatus(rsvpData.status);
        setGuestCount(rsvpData.guestCount);
        setNote(rsvpData.note || '');
      }
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleStatusSelect = (status: RSVPStatus) => {
    setSelectedStatus(status);
    // Reset guest count if not going
    if (status !== 'GOING') {
      setGuestCount(0);
    }
  };

  const handleSubmit = async () => {
    if (!event || !currentUser || !selectedStatus) return;

    setSubmitting(true);
    try {
      await eventService.submitRSVP({
        eventId: event.id,
        userId: currentUser.id,
        userName: currentUser.name || 'Unknown',
        userPhotoUrl: currentUser.avatar,
        userRole: isCoach ? 'COACH' : 'PARENT',
        status: selectedStatus,
        guestCount: selectedStatus === 'GOING' ? guestCount : 0,
        note: note.trim() || undefined });

      Alert.alert(
        'RSVP Submitted',
        `Your response has been saved: ${eventService.formatRSVPStatus(selectedStatus)}`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Failed to submit RSVP:', error);
      Alert.alert('Error', 'Failed to save your response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            Event not found
          </ThemedText>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const isFull = eventService.isEventFull(event);
  const rsvpClosed = eventService.isRSVPClosed(event);
  const { going, totalGuests } = eventService.getAttendeeCounts(event.attendees);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          RSVP
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Event summary card */}
          <SurfaceCard style={styles.eventCard}>
            <View style={styles.eventInfo}>
              <ThemedText type="defaultSemiBold" style={styles.eventTitle} numberOfLines={2}>
                {event.title}
              </ThemedText>
              <View style={styles.eventDetails}>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>
                    {eventService.formatEventDate(event.date)}
                  </ThemedText>
                </View>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>
                    {eventService.formatEventTime(event.startTime, event.endTime)}
                  </ThemedText>
                </View>
                <View style={styles.eventDetailRow}>
                  <Ionicons name="location-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>
                    {event.venue}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Capacity indicator */}
            {event.maxAttendees && (
              <View style={[styles.capacitySection, { borderTopColor: palette.border }]}>
                <View style={styles.capacityHeader}>
                  <ThemedText style={[styles.capacityLabel, { color: palette.muted }]}>
                    Spots remaining
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.capacityValue,
                      { color: isFull ? palette.error : palette.success },
                    ]}
                  >
                    {Math.max(0, event.maxAttendees - going - totalGuests)} / {event.maxAttendees}
                  </ThemedText>
                </View>
                <View style={[styles.capacityBar, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.capacityFill,
                      {
                        backgroundColor: isFull ? palette.error : palette.success,
                        width: `${Math.min(100, ((going + totalGuests) / event.maxAttendees) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </SurfaceCard>

          {/* RSVP closed or full warning */}
          {rsvpClosed && (
            <View style={[styles.warningBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="time" size={20} color={palette.warning} />
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>
                RSVP deadline has passed
              </ThemedText>
            </View>
          )}

          {isFull && !currentRSVP && !rsvpClosed && (
            <View style={[styles.warningBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <ThemedText style={[styles.warningText, { color: palette.error }]}>
                This event is at full capacity
              </ThemedText>
            </View>
          )}

          {/* Current RSVP indicator */}
          {currentRSVP && (
            <View style={[styles.currentRSVPBanner, { backgroundColor: withAlpha(eventService.getRSVPStatusColor(currentRSVP.status), 0.09) }]}>
              <Ionicons
                name={eventService.getRSVPStatusIcon(currentRSVP.status) as keyof typeof Ionicons.glyphMap}
                size={20}
                color={eventService.getRSVPStatusColor(currentRSVP.status)}
              />
              <View style={styles.currentRSVPInfo}>
                <ThemedText style={[styles.currentRSVPLabel, { color: palette.muted }]}>
                  Current response
                </ThemedText>
                <ThemedText
                  style={[
                    styles.currentRSVPStatus,
                    { color: eventService.getRSVPStatusColor(currentRSVP.status) },
                  ]}
                >
                  {eventService.formatRSVPStatus(currentRSVP.status)}
                  {currentRSVP.guestCount > 0 && ` (+${currentRSVP.guestCount} guests)`}
                </ThemedText>
              </View>
            </View>
          )}

          {/* RSVP selection */}
          {!rsvpClosed && (
            <>
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Will you attend?
                </ThemedText>

                <View style={styles.statusOptions}>
                  {(['GOING', 'MAYBE', 'NOT_GOING'] as RSVPStatus[]).map((status) => {
                    const isSelected = selectedStatus === status;
                    const color = eventService.getRSVPStatusColor(status);
                    const isDisabled = status === 'GOING' && isFull && currentRSVP?.status !== 'GOING';

                    return (
                      <Clickable
                        key={status}
                        onPress={() => handleStatusSelect(status)}
                        disabled={isDisabled}
                        style={[
                          styles.statusOption,
                          {
                            backgroundColor: isSelected ? color : 'transparent',
                            borderColor: isSelected ? color : palette.border,
                            opacity: isDisabled ? 0.5 : 1 },
                        ]}
                      >
                        <Ionicons
                          name={eventService.getRSVPStatusIcon(status) as keyof typeof Ionicons.glyphMap}
                          size={24}
                          color={isSelected ? palette.onPrimary : color}
                        />
                        <ThemedText
                          style={[
                            styles.statusOptionText,
                            { color: isSelected ? palette.onPrimary : palette.text },
                          ]}
                        >
                          {eventService.formatRSVPStatus(status)}
                        </ThemedText>
                      </Clickable>
                    );
                  })}
                </View>
              </View>

              {/* Guest count (only for GOING) */}
              {selectedStatus === 'GOING' && (
                <View style={styles.section}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Additional guests
                  </ThemedText>
                  <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                    How many additional guests are you bringing? (Not including yourself)
                  </ThemedText>

                  <View style={styles.guestCounter}>
                    <Clickable
                      onPress={() => setGuestCount(Math.max(0, guestCount - 1))}
                      style={[styles.counterButton, { borderColor: palette.border }]}
                    >
                      <Ionicons name="remove" size={24} color={palette.text} />
                    </Clickable>

                    <View style={[styles.counterValue, { borderColor: palette.border }]}>
                      <ThemedText style={styles.counterValueText}>{guestCount}</ThemedText>
                    </View>

                    <Clickable
                      onPress={() => setGuestCount(guestCount + 1)}
                      style={[styles.counterButton, { borderColor: palette.border }]}
                    >
                      <Ionicons name="add" size={24} color={palette.text} />
                    </Clickable>
                  </View>
                </View>
              )}

              {/* Note (optional) */}
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Add a note (optional)
                </ThemedText>

                <TextInput
                  style={[
                    styles.noteInput,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                      color: palette.text },
                  ]}
                  placeholder="Any dietary requirements, questions, etc."
                  placeholderTextColor={palette.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}
        </ScrollView>

        {/* Submit button */}
        {!rsvpClosed && (
          <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
            <Button
              onPress={handleSubmit}
              disabled={!selectedStatus || submitting}
              style={styles.submitButton}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={palette.onPrimary} />
              ) : currentRSVP ? (
                'Update Response'
              ) : (
                'Submit RSVP'
              )}
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  flex: {
    flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md },
  errorText: {
    ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize),
    textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center' },
  headerTitle: {
    ...Typography.heading, fontSize: scaleFont(Typography.heading.fontSize) },
  headerSpacer: {
    width: 40 },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 100 },
  eventCard: {
    padding: Spacing.md,
    gap: Spacing.md },
  eventInfo: {
    gap: Spacing.xs },
  eventTitle: {
    ...Typography.heading, fontSize: scaleFont(Typography.heading.fontSize) },
  eventDetails: {
    gap: Spacing.xxs,
    marginTop: Spacing.xxs },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs },
  eventDetailText: {
    ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  capacitySection: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1 },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxs },
  capacityLabel: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  capacityValue: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  capacityBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden' },
  capacityFill: {
    height: '100%',
    borderRadius: Radii.xs },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md },
  warningText: {
    ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
    flex: 1 },
  currentRSVPBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md },
  currentRSVPInfo: {
    flex: 1 },
  currentRSVPLabel: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  currentRSVPStatus: {
    ...Typography.bodySemiBold, fontSize: scaleFont(Typography.bodySemiBold.fontSize) },
  section: {
    gap: Spacing.sm },
  sectionTitle: {
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  sectionSubtitle: {
    ...Typography.small, fontSize: scaleFont(Typography.small.fontSize),
    marginTop: -4 },
  statusOptions: {
    gap: Spacing.sm },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5 },
  statusOptionText: {
    ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  guestCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  counterValue: {
    width: 80,
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center' },
  counterValueText: {
    ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
    minHeight: 100 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1 },
  submitButton: {
    paddingVertical: 14 } });