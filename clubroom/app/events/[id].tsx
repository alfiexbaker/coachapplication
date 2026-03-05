import { View, StyleSheet, ScrollView, RefreshControl, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { RSVPButtons } from '@/components/event/rsvp-buttons';
import { EventAttendanceSection } from '@/components/event/event-attendance-section';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventDetail } from '@/hooks/use-event-detail';
import { useRequiredParam } from '@/hooks/use-required-param';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import { uiFeedback } from '@/services/ui-feedback';

export default function EventDetailScreen() {
  const { colors: palette } = useTheme();
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : '';
  const {
    event,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    showAttendees,
    isCoach,
    typeColor,
    typeIcon,
    attendeeCounts,
    currentRSVP,
    isCreator,
    handleRSVP,
    handlePublish,
    handleCancel,
    toggleAttendees,
  } = useEventDetail(id);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  const handleJoinMeeting = async () => {
    if (!event?.meetingLink) return;
    try {
      const supported = await Linking.canOpenURL(event.meetingLink);
      if (!supported) {
        uiFeedback.showToast('This meeting link is not supported on this device.', 'error');
        return;
      }
      await Linking.openURL(event.meetingLink);
    } catch {
      uiFeedback.showToast('Try opening the meeting link again.', 'error');
    }
  };

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (!idParam.valid) {
    return renderShell(<ErrorState message="Invalid event link." onRetry={() => router.back()} />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message || 'Failed to load event details.'} onRetry={retry} />);
  }

  if (status === 'empty' || !event) {
    return renderShell(
      <EmptyState
        icon="calendar-outline"
        title="Event not found"
        message="This event no longer exists or you no longer have access to it."
        actionLabel="Go Back"
        onPressAction={() => router.back()}
      />,
    );
  }

  return renderShell(
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
        {event.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: event.imageUrl }} style={styles.headerImage} />
            <View
              style={[styles.imageOverlay, { backgroundColor: withAlpha(palette.text, 0.2) }]}
            />
          </View>
        )}

        <View style={[styles.topBar, !event.imageUrl && { position: 'relative' }]}>
          <Clickable
            onPress={() => router.back()}
            style={[
              styles.backButton,
              { backgroundColor: event.imageUrl ? withAlpha(palette.text, 0.4) : palette.surface },
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={event.imageUrl ? palette.onPrimary : palette.text}
            />
          </Clickable>
        </View>

        <View style={styles.content}>
          {/* Badges */}
          <Row align="center" gap="xs" wrap style={styles.badgeRow}>
            <Row
              align="center"
              gap="xxs"
              style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.12) }]}
            >
              <Ionicons
                name={typeIcon as keyof typeof Ionicons.glyphMap}
                size={16}
                color={typeColor}
              />
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                {eventService.formatEventType(event.eventType)}
              </ThemedText>
            </Row>
            {event.status === 'DRAFT' && (
              <View
                style={[styles.statusBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
              >
                <ThemedText style={[styles.statusText, { color: palette.warning }]}>
                  DRAFT
                </ThemedText>
              </View>
            )}
            {event.status === 'CANCELLED' && (
              <View
                style={[styles.statusBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}
              >
                <ThemedText style={[styles.statusText, { color: palette.error }]}>
                  CANCELLED
                </ThemedText>
              </View>
            )}
            {event.isVirtual && (
              <Row
                align="center"
                gap="xxs"
                style={[styles.virtualBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}
              >
                <Ionicons name="videocam" size={14} color={palette.accent} />
                <ThemedText style={[styles.virtualText, { color: palette.accent }]}>
                  Virtual
                </ThemedText>
              </Row>
            )}
          </Row>

          <ThemedText type="title" style={styles.title}>
            {event.title}
          </ThemedText>
          <ThemedText style={[styles.clubName, { color: palette.muted }]}>
            {event.clubId} - Posted by {event.createdBy}
          </ThemedText>

          {/* Detail cards */}
          <View style={styles.detailsSection}>
            <SurfaceCard style={styles.detailCard}>
              <Row align="center" gap="md" style={styles.detailRow}>
                <View
                  style={[styles.detailIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
                >
                  <Ionicons name="calendar" size={20} color={palette.tint} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold">
                    {eventService.formatEventDate(event.date)}
                  </ThemedText>
                  <ThemedText style={[styles.detailSubtext, { color: palette.muted }]}>
                    {eventService.formatEventTime(event.startTime, event.endTime)}
                  </ThemedText>
                </View>
              </Row>
            </SurfaceCard>

            <SurfaceCard style={styles.detailCard}>
              <Row align="center" gap="md" style={styles.detailRow}>
                <View
                  style={[styles.detailIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
                >
                  <Ionicons name="location" size={20} color={palette.tint} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold">{event.venue}</ThemedText>
                  {event.address && (
                    <ThemedText style={[styles.detailSubtext, { color: palette.muted }]}>
                      {event.address}
                    </ThemedText>
                  )}
                </View>
              </Row>
              {event.isVirtual && event.meetingLink && (
                <Clickable
                  style={[styles.linkButton, { borderColor: palette.tint }]}
                  onPress={handleJoinMeeting}
                  accessibilityLabel="Join virtual meeting"
                >
                  <Row align="center" justify="center" gap="xxs">
                    <Ionicons name="videocam" size={16} color={palette.tint} />
                    <ThemedText style={[styles.linkText, { color: palette.tint }]}>
                      Join Meeting
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
            </SurfaceCard>

            {event.price > 0 && (
              <SurfaceCard style={styles.detailCard}>
                <Row align="center" gap="md" style={styles.detailRow}>
                  <View
                    style={[
                      styles.detailIcon,
                      { backgroundColor: withAlpha(palette.success, 0.09) },
                    ]}
                  >
                    <Ionicons name="cash" size={20} color={palette.success} />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText type="defaultSemiBold">
                      {eventService.formatPrice(event.price, event.currency)}
                    </ThemedText>
                    <ThemedText style={[styles.detailSubtext, { color: palette.muted }]}>
                      per person
                    </ThemedText>
                  </View>
                </Row>
              </SurfaceCard>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              About this event
            </ThemedText>
            <ThemedText style={styles.description}>{event.description}</ThemedText>
          </View>

          {/* Audience */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Who can attend
            </ThemedText>
            <Row
              align="center"
              gap="xs"
              style={[styles.audienceBadge, { backgroundColor: palette.surface }]}
            >
              <Ionicons name="people" size={16} color={palette.icon} />
              <ThemedText>{eventService.formatAudience(event.targetAudience)}</ThemedText>
            </Row>
          </View>

          {/* RSVP */}
          {event.status === 'PUBLISHED' && event.rsvpRequired && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                RSVP
              </ThemedText>
              {event.rsvpDeadline && (
                <ThemedText style={[styles.rsvpDeadline, { color: palette.muted }]}>
                  Respond by {eventService.formatEventDate(event.rsvpDeadline)}
                </ThemedText>
              )}
              <RSVPButtons event={event} currentRSVP={currentRSVP} onRSVP={handleRSVP} />
            </View>
          )}

          {/* Attendance */}
          <EventAttendanceSection
            event={event}
            attendeeCounts={attendeeCounts}
            showAttendees={showAttendees}
            isCoach={isCoach}
            onToggleAttendees={toggleAttendees}
          />

          {/* Coach actions */}
          {isCreator && event.status === 'DRAFT' && (
            <View style={styles.actionSection}>
              <Button onPress={handlePublish}>Publish Event</Button>
            </View>
          )}
          {isCreator && event.status === 'PUBLISHED' && (
            <View style={styles.actionSection}>
              <Button variant="outline" onPress={handleCancel}>
                Cancel Event
              </Button>
            </View>
          )}
        </View>
    </ScrollView>,
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  imageContainer: { height: 220, position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  badgeRow: {},
  typeBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm },
  statusText: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
    letterSpacing: 0.5,
  },
  virtualBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm },
  virtualText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  title: {
    ...Typography.display,
    fontSize: scaleFont(Typography.display.fontSize),
    lineHeight: scaleFont(32),
  },
  clubName: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
    marginTop: -Spacing.sm,
  },
  detailsSection: { gap: Spacing.sm },
  detailCard: { padding: Spacing.md, gap: Spacing.sm },
  detailRow: {},
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: { flex: 1 },
  detailSubtext: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
    marginTop: Spacing.micro,
  },
  linkButton: {
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  linkText: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  description: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(23),
  },
  audienceBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignSelf: 'flex-start',
  },
  rsvpDeadline: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
    marginTop: -Spacing.xs,
  },
  actionSection: { marginTop: Spacing.md },
});
