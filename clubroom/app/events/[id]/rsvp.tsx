import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useToast } from '@/components/ui/toast';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventRSVP } from '@/hooks/use-event-rsvp';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import { formatInUserTimezone } from '@/utils/timezone';
import { useRequiredParam } from '@/hooks/use-required-param';
import type { RSVPStatus } from '@/constants/types';

export default function EventRSVPScreen() {
  const { colors: palette } = useTheme();
  const { showToast } = useToast();
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : '';
  const {
    event,
    currentRSVP,
    isCoach,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    selectedStatus,
    note,
    isFull,
    rsvpClosed,
    reminderSending,
    attendeeCounts,
    setNote,
    handleStatusSelect,
    handleSubmit,
    handleSendReminder,
  } = useEventRSVP(id);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (!idParam.valid) {
    return renderShell(<ErrorState message="Invalid event RSVP link." onRetry={() => router.back()} />);
  }

  const rsvpDeadlineDate =
    event?.rsvpDeadline && !Number.isNaN(new Date(event.rsvpDeadline).getTime())
      ? new Date(event.rsvpDeadline)
      : null;
  const isPastDeadline = Boolean(rsvpDeadlineDate && new Date() > rsvpDeadlineDate);
  const isSubmitClosed = rsvpClosed || isPastDeadline;

  const handleSubmitWithDeadlineCheck = async () => {
    if (isPastDeadline) {
      showToast('RSVP deadline has passed', 'error');
      return;
    }
    await handleSubmit();
  };

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message || 'Failed to load RSVP details.'} onRetry={retry} />);
  }

  if (status === 'empty' || !event) {
    return renderShell(
      <EmptyState
        icon="calendar-outline"
        title="Event not found"
        message="This event could not be loaded."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderShell(
    <>
      <PageHeader
        title="RSVP"
        showBack
        backIcon="close"
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={[styles.header, { borderBottomColor: palette.border }]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Event summary */}
          <SurfaceCard style={styles.eventCard}>
            <ThemedText type="defaultSemiBold" style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </ThemedText>
            <View style={styles.eventDetails}>
              <Row align="center" gap="xxs" style={styles.eventDetailRow}>
                <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>
                  {eventService.formatEventDate(event.date)}
                </ThemedText>
              </Row>
              <Row align="center" gap="xxs" style={styles.eventDetailRow}>
                <Ionicons name="time-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>
                  {eventService.formatEventTime(event.startTime, event.endTime)}
                </ThemedText>
              </Row>
              <Row align="center" gap="xxs" style={styles.eventDetailRow}>
                <Ionicons name="location-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.eventDetailText, { color: palette.muted }]}>
                  {event.venue}
                </ThemedText>
              </Row>
            </View>
            {event.maxAttendees && (
              <View style={[styles.capacitySection, { borderTopColor: palette.border }]}>
                <Row justify="space-between" style={styles.capacityHeader}>
                  <ThemedText style={[styles.capacityLabel, { color: palette.muted }]}>
                    Spots remaining
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.capacityValue,
                      { color: isFull ? palette.error : palette.success },
                    ]}
                  >
                    {Math.max(
                      0,
                      event.maxAttendees - attendeeCounts.going,
                    )}{' '}
                    / {event.maxAttendees}
                  </ThemedText>
                </Row>
                <View style={[styles.capacityBar, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.capacityFill,
                      {
                        backgroundColor: isFull ? palette.error : palette.success,
                        width: `${Math.min(100, (attendeeCounts.going / event.maxAttendees) * 100)}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            )}
            <Row wrap style={styles.rsvpCountRow}>
              <Row
                align="center"
                gap="xxs"
                style={[
                  styles.rsvpCountChip,
                  { backgroundColor: withAlpha(palette.success, 0.09) },
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={palette.success} />
                <ThemedText style={[styles.rsvpCountText, { color: palette.success }]}>
                  {attendeeCounts.going} going
                </ThemedText>
              </Row>
              <Row
                align="center"
                gap="xxs"
                style={[
                  styles.rsvpCountChip,
                  { backgroundColor: withAlpha(palette.warning, 0.09) },
                ]}
              >
                <Ionicons name="help-circle-outline" size={14} color={palette.warning} />
                <ThemedText style={[styles.rsvpCountText, { color: palette.warning }]}>
                  {attendeeCounts.maybe} maybe
                </ThemedText>
              </Row>
              <Row
                align="center"
                gap="xxs"
                style={[styles.rsvpCountChip, { backgroundColor: withAlpha(palette.error, 0.09) }]}
              >
                <Ionicons name="close-circle-outline" size={14} color={palette.error} />
                <ThemedText style={[styles.rsvpCountText, { color: palette.error }]}>
                  {attendeeCounts.notGoing} can&apos;t
                </ThemedText>
              </Row>
            </Row>
          </SurfaceCard>

          {isCoach && attendeeCounts.maybe > 0 && !rsvpClosed && (
            <View
              style={[
                styles.reminderCard,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              <Row align="center" gap="sm" style={styles.reminderHeader}>
                <Ionicons name="notifications-outline" size={18} color={palette.tint} />
                <ThemedText type="defaultSemiBold">
                  {attendeeCounts.maybe} maybe response{attendeeCounts.maybe === 1 ? '' : 's'}
                </ThemedText>
              </Row>
              <ThemedText style={[styles.reminderBody, { color: palette.muted }]}>
                Send a reminder to attendees who marked maybe.
              </ThemedText>
              <Button
                onPress={handleSendReminder}
                disabled={reminderSending}
                variant="secondary"
                style={styles.reminderButton}
              >
                {reminderSending ? 'Sending...' : 'Send Reminder'}
              </Button>
            </View>
          )}

          {isPastDeadline && rsvpDeadlineDate && (
            <Row
              align="center"
              gap="sm"
              style={[styles.warningBanner, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
            >
              <Ionicons name="time" size={20} color={palette.warning} />
              <ThemedText style={[styles.warningText, { color: palette.warning }]}>
                RSVP deadline was{' '}
                {formatInUserTimezone(rsvpDeadlineDate, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZoneName: 'short',
                })}
              </ThemedText>
            </Row>
          )}

          {isFull && !currentRSVP && !rsvpClosed && (
            <Row
              align="center"
              gap="sm"
              style={[styles.warningBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}
            >
              <Ionicons name="alert-circle" size={20} color={palette.error} />
              <ThemedText style={[styles.warningText, { color: palette.error }]}>
                This event is at full capacity
              </ThemedText>
            </Row>
          )}

          {currentRSVP && (
            <Row
              align="center"
              gap="sm"
              style={[
                styles.currentRSVPBanner,
                {
                  backgroundColor: withAlpha(
                    eventService.getRSVPStatusColor(currentRSVP.status),
                    0.09,
                  ),
                },
              ]}
            >
              <Ionicons
                name={
                  eventService.getRSVPStatusIcon(
                    currentRSVP.status,
                  ) as keyof typeof Ionicons.glyphMap
                }
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
                </ThemedText>
              </View>
            </Row>
          )}

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
                    const isDisabled =
                      status === 'GOING' && isFull && currentRSVP?.status !== 'GOING';
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
                            opacity: isDisabled ? 0.5 : 1,
                          },
                        ]}
                      >
                        <Row align="center" gap="sm">
                          <Ionicons
                            name={
                              eventService.getRSVPStatusIcon(
                                status,
                              ) as keyof typeof Ionicons.glyphMap
                            }
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
                        </Row>
                      </Clickable>
                    );
                  })}
                </View>
              </View>

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
                      color: palette.text,
                    },
                  ]}
                  placeholder="Any dietary requirements, questions, etc."
                  placeholderTextColor={palette.muted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>
            </>
          )}
        </ScrollView>

        {(!rsvpClosed || isPastDeadline) && (
          <View
            style={[
              styles.footer,
              { borderTopColor: palette.border, backgroundColor: palette.background },
            ]}
          >
            <Button
              onPress={handleSubmitWithDeadlineCheck}
              disabled={isSubmitClosed || !selectedStatus || submitting}
              style={styles.submitButton}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={palette.onPrimary} />
              ) : isSubmitClosed ? (
                'RSVP Closed'
              ) : currentRSVP ? (
                'Update Response'
              ) : (
                'Submit RSVP'
              )}
            </Button>
            {isPastDeadline ? (
              <ThemedText style={[styles.footerHint, { color: palette.muted }]}>
                Responses can no longer be submitted after the RSVP deadline.
              </ThemedText>
            ) : null}
          </View>
        )}
      </KeyboardAvoidingView>
    </>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { borderBottomWidth: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.lg },
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
  rsvpCountRow: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  rsvpCountChip: {
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  rsvpCountText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  reminderCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reminderHeader: {},
  reminderBody: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  reminderButton: { marginTop: Spacing.xxs },
  warningBanner: { padding: Spacing.md, borderRadius: Radii.md },
  warningText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
    flex: 1,
  },
  currentRSVPBanner: { padding: Spacing.md, borderRadius: Radii.md },
  currentRSVPInfo: { flex: 1 },
  currentRSVPLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  currentRSVPStatus: {
    ...Typography.bodySemiBold,
    fontSize: scaleFont(Typography.bodySemiBold.fontSize),
  },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  statusOptions: { gap: Spacing.sm },
  statusOption: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  statusOptionText: {
    ...Typography.subheading,
    fontSize: scaleFont(Typography.subheading.fontSize),
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    minHeight: 100,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  submitButton: { paddingVertical: 14 },
  footerHint: {
    marginTop: Spacing.xs,
    textAlign: 'center',
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
});
