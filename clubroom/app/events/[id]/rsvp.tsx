import { View, StyleSheet, ScrollView, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventRSVP } from '@/hooks/use-event-rsvp';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import type { RSVPStatus } from '@/constants/types';

export default function EventRSVPScreen() {
  const { colors: palette } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    event, currentRSVP, loading, submitting, selectedStatus,
    guestCount, note, isFull, rsvpClosed, attendeeCounts,
    setGuestCount, setNote, handleStatusSelect, handleSubmit,
  } = useEventRSVP(id);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={palette.tint} /></View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>Event not found</ThemedText>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Row align="center" justify="space-between" style={[styles.header, { borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}><Ionicons name="close" size={24} color={palette.text} /></Clickable>
        <ThemedText type="subtitle" style={styles.headerTitle}>RSVP</ThemedText>
        <View style={styles.headerSpacer} />
      </Row>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Event summary */}
          <SurfaceCard style={styles.eventCard}>
            <ThemedText type="defaultSemiBold" style={styles.eventTitle} numberOfLines={2}>{event.title}</ThemedText>
            <View style={styles.eventDetails}>
              <Row align="center" gap="xxs" style={styles.eventDetailRow}><Ionicons name="calendar-outline" size={14} color={palette.muted} /><ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>{eventService.formatEventDate(event.date)}</ThemedText></Row>
              <Row align="center" gap="xxs" style={styles.eventDetailRow}><Ionicons name="time-outline" size={14} color={palette.muted} /><ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>{eventService.formatEventTime(event.startTime, event.endTime)}</ThemedText></Row>
              <Row align="center" gap="xxs" style={styles.eventDetailRow}><Ionicons name="location-outline" size={14} color={palette.muted} /><ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>{event.venue}</ThemedText></Row>
            </View>
            {event.maxAttendees && (
              <View style={[styles.capacitySection, { borderTopColor: palette.border }]}>
                <Row justify="space-between" style={styles.capacityHeader}>
                  <ThemedText style={[styles.capacityLabel, { color: palette.muted }]}>Spots remaining</ThemedText>
                  <ThemedText style={[styles.capacityValue, { color: isFull ? palette.error : palette.success }]}>
                    {Math.max(0, event.maxAttendees - attendeeCounts.going - attendeeCounts.totalGuests)} / {event.maxAttendees}
                  </ThemedText>
                </Row>
                <View style={[styles.capacityBar, { backgroundColor: palette.border }]}>
                  <View style={[styles.capacityFill, { backgroundColor: isFull ? palette.error : palette.success, width: `${Math.min(100, ((attendeeCounts.going + attendeeCounts.totalGuests) / event.maxAttendees) * 100)}%` }]} />
                </View>
              </View>
            )}
          </SurfaceCard>

          {rsvpClosed && (
            <Row align="center" gap="sm" style={[styles.warningBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="time" size={20} color={palette.warning} />
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>RSVP deadline has passed</ThemedText>
            </Row>
          )}

          {isFull && !currentRSVP && !rsvpClosed && (
            <Row align="center" gap="sm" style={[styles.warningBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <ThemedText style={[styles.warningText, { color: palette.error }]}>This event is at full capacity</ThemedText>
            </Row>
          )}

          {currentRSVP && (
            <Row align="center" gap="sm" style={[styles.currentRSVPBanner, { backgroundColor: withAlpha(eventService.getRSVPStatusColor(currentRSVP.status), 0.09) }]}>
              <Ionicons name={eventService.getRSVPStatusIcon(currentRSVP.status) as keyof typeof Ionicons.glyphMap} size={20} color={eventService.getRSVPStatusColor(currentRSVP.status)} />
              <View style={styles.currentRSVPInfo}>
                <ThemedText style={[styles.currentRSVPLabel, { color: palette.muted }]}>Current response</ThemedText>
                <ThemedText style={[styles.currentRSVPStatus, { color: eventService.getRSVPStatusColor(currentRSVP.status) }]}>
                  {eventService.formatRSVPStatus(currentRSVP.status)}{currentRSVP.guestCount > 0 && ` (+${currentRSVP.guestCount} guests)`}
                </ThemedText>
              </View>
            </Row>
          )}

          {!rsvpClosed && (
            <>
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Will you attend?</ThemedText>
                <View style={styles.statusOptions}>
                  {(['GOING', 'MAYBE', 'NOT_GOING'] as RSVPStatus[]).map((status) => {
                    const isSelected = selectedStatus === status;
                    const color = eventService.getRSVPStatusColor(status);
                    const isDisabled = status === 'GOING' && isFull && currentRSVP?.status !== 'GOING';
                    return (
                      <Clickable key={status} onPress={() => handleStatusSelect(status)} disabled={isDisabled}
                        style={[styles.statusOption, { backgroundColor: isSelected ? color : 'transparent', borderColor: isSelected ? color : palette.border, opacity: isDisabled ? 0.5 : 1 }]}>
                        <Row align="center" gap="sm">
                          <Ionicons name={eventService.getRSVPStatusIcon(status) as keyof typeof Ionicons.glyphMap} size={24} color={isSelected ? palette.onPrimary : color} />
                          <ThemedText style={[styles.statusOptionText, { color: isSelected ? palette.onPrimary : palette.text }]}>{eventService.formatRSVPStatus(status)}</ThemedText>
                        </Row>
                      </Clickable>
                    );
                  })}
                </View>
              </View>

              {selectedStatus === 'GOING' && (
                <View style={styles.section}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Additional guests</ThemedText>
                  <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>How many additional guests are you bringing? (Not including yourself)</ThemedText>
                  <Row align="center" justify="center" gap="md" style={styles.guestCounter}>
                    <Clickable accessibilityLabel="Decrease guest count" onPress={() => setGuestCount(Math.max(0, guestCount - 1))} style={[styles.counterButton, { borderColor: palette.border }]}><Ionicons name="remove" size={24} color={palette.text} /></Clickable>
                    <View style={[styles.counterValue, { borderColor: palette.border }]}><ThemedText style={styles.counterValueText}>{guestCount}</ThemedText></View>
                    <Clickable accessibilityLabel="Increase guest count" onPress={() => setGuestCount(guestCount + 1)} style={[styles.counterButton, { borderColor: palette.border }]}><Ionicons name="add" size={24} color={palette.text} /></Clickable>
                  </Row>
                </View>
              )}

              <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Add a note (optional)</ThemedText>
                <TextInput style={[styles.noteInput, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]} placeholder="Any dietary requirements, questions, etc." placeholderTextColor={palette.muted} value={note} onChangeText={setNote} multiline numberOfLines={3} textAlignVertical="top" />
              </View>
            </>
          )}
        </ScrollView>

        {!rsvpClosed && (
          <View style={[styles.footer, { borderTopColor: palette.border, backgroundColor: palette.background }]}>
            <Button onPress={handleSubmit} disabled={!selectedStatus || submitting} style={styles.submitButton}>
              {submitting ? <ActivityIndicator size="small" color={palette.onPrimary} /> : currentRSVP ? 'Update Response' : 'Submit RSVP'}
            </Button>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  errorText: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize), textAlign: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.heading, fontSize: scaleFont(Typography.heading.fontSize) },
  headerSpacer: { width: 40 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 100 },
  eventCard: { padding: Spacing.md, gap: Spacing.md },
  eventTitle: { ...Typography.heading, fontSize: scaleFont(Typography.heading.fontSize) },
  eventDetails: { gap: Spacing.xxs, marginTop: Spacing.xxs },
  eventDetailRow: {},
  eventDetailText: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  capacitySection: { paddingTop: Spacing.sm, borderTopWidth: 1 },
  capacityHeader: { marginBottom: Spacing.xxs },
  capacityLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  capacityValue: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  capacityBar: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  capacityFill: { height: '100%', borderRadius: Radii.xs },
  warningBanner: { padding: Spacing.md, borderRadius: Radii.md },
  warningText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize), flex: 1 },
  currentRSVPBanner: { padding: Spacing.md, borderRadius: Radii.md },
  currentRSVPInfo: { flex: 1 },
  currentRSVPLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  currentRSVPStatus: { ...Typography.bodySemiBold, fontSize: scaleFont(Typography.bodySemiBold.fontSize) },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  sectionSubtitle: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize), marginTop: -4 },
  statusOptions: { gap: Spacing.sm },
  statusOption: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  statusOptionText: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  guestCounter: {},
  counterButton: { width: 48, height: 48, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  counterValue: { width: 80, height: 48, borderRadius: Radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  counterValueText: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  noteInput: { borderWidth: 1, borderRadius: Radii.md, padding: Spacing.md, ...Typography.body, fontSize: scaleFont(Typography.body.fontSize), minHeight: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
  submitButton: { paddingVertical: 14 },
});
