import { View, StyleSheet, ScrollView, RefreshControl, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Row } from '@/components/primitives/row';
import { AttendeeList } from '@/components/event/AttendeeList';
import { CheckInButton } from '@/components/event/CheckInButton';
import { RSVPButtons } from '@/components/event/rsvp-buttons';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventDetail } from '@/hooks/use-event-detail';
import { useRequiredParam } from '@/hooks/use-required-param';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';
import { uiFeedback } from '@/services/ui-feedback';

function MetaPill({
  icon,
  label,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tone: string;
}) {
  return (
    <Row
      align="center"
      gap="xxs"
      style={[styles.metaPill, { backgroundColor: withAlpha(tone, 0.1) }]}
    >
      <Ionicons name={icon} size={14} color={tone} />
      <ThemedText style={[styles.metaPillText, { color: tone }]}>{label}</ThemedText>
    </Row>
  );
}

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
    isCoach,
    actorRole,
    actorUserId,
    actorName,
    typeColor,
    typeIcon,
    attendeeCounts,
    currentRSVP,
    rsvps,
    attendance,
    attendanceStats,
    currentAttendance,
    isCreator,
    isOrganizer,
    isEventToday,
    checkInAvailable,
    responseSummaryLabel,
    reminderTargetCount,
    canShareRecap,
    handleRSVP,
    handlePublish,
    handleCancel,
    handleSendReminder,
    handleCheckIn,
    handleUndoCheckIn,
    handleOpenRecap,
    handleOpenFullAttendance,
  } = useEventDetail(id);

  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(
      <>
        <PageHeader
          title="Event"
          subtitle="Loading event workspace"
          showBack
          onBackPress={() => router.back()}
          centerTitle
          containerStyle={[styles.header, { borderBottomColor: palette.border }]}
        />
        <LoadingState variant="detail" />
      </>,
    );
  }

  if (!idParam.valid) {
    return renderShell(<ErrorState message="Invalid event link." onRetry={() => router.back()} />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState message={error?.message || 'Failed to load event details.'} onRetry={retry} />
    );
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

  const rsvpPreview =
    currentRSVP && event.rsvpRequired
      ? {
          userId: currentRSVP.userId,
          userRole: currentRSVP.userRole,
          status: currentRSVP.status,
          guestCount: currentRSVP.guestCount,
          respondedAt: currentRSVP.respondedAt,
        }
      : undefined;

  const handleJoinMeeting = async () => {
    if (!event.meetingLink) return;

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

  return renderShell(
    <>
      <PageHeader
        title="Event"
        subtitle={eventService.formatEventType(event.eventType)}
        showBack
        onBackPress={() => router.back()}
        centerTitle
        containerStyle={[styles.header, { borderBottomColor: palette.border }]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        <View style={styles.titleBlock}>
          <Row align="center" gap="xs" wrap style={styles.badgeRow}>
            <MetaPill icon={typeIcon as keyof typeof Ionicons.glyphMap} label={eventService.formatEventType(event.eventType)} tone={typeColor} />
            {event.status === 'DRAFT' ? <MetaPill icon="create-outline" label="Draft" tone={palette.warning} /> : null}
            {event.status === 'CANCELLED' ? <MetaPill icon="close-circle-outline" label="Cancelled" tone={palette.error} /> : null}
            {event.isVirtual ? <MetaPill icon="videocam-outline" label="Virtual" tone={palette.tint} /> : null}
            {event.price > 0 ? <MetaPill icon="cash-outline" label={eventService.formatPrice(event.price, event.currency)} tone={palette.success} /> : null}
          </Row>

          <ThemedText type="title" style={styles.title}>
            {event.title}
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {eventService.formatEventDate(event.date)} · {eventService.formatEventTime(event.startTime, event.endTime)}
          </ThemedText>
        </View>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Overview
          </ThemedText>
          <View style={styles.detailList}>
            <DetailRow
              paletteColor={palette.tint}
              mutedColor={palette.muted}
              icon="calendar-outline"
              label="When"
              value={`${eventService.formatEventDate(event.date)} · ${eventService.formatEventTime(event.startTime, event.endTime)}`}
            />
            <DetailRow
              paletteColor={palette.tint}
              mutedColor={palette.muted}
              icon={event.isVirtual ? 'videocam-outline' : 'location-outline'}
              label="Where"
              value={event.isVirtual ? event.meetingLink || 'Virtual event' : event.venue}
              subvalue={!event.isVirtual ? event.address : undefined}
            />
            <DetailRow
              paletteColor={palette.tint}
              mutedColor={palette.muted}
              icon="people-outline"
              label="Audience"
              value={eventService.formatAudience(event.targetAudience)}
              subvalue={
                event.maxAttendees
                  ? `${attendeeCounts.going}/${event.maxAttendees} confirmed`
                  : `${attendeeCounts.going} confirmed`
              }
            />
            {event.rsvpRequired ? (
              <DetailRow
                paletteColor={palette.warning}
                mutedColor={palette.muted}
                icon="notifications-outline"
                label="Responses"
                value={responseSummaryLabel}
                subvalue={event.rsvpDeadline ? `Respond by ${eventService.formatEventDate(event.rsvpDeadline)}` : undefined}
              />
            ) : null}
          </View>
          {event.isVirtual && event.meetingLink ? (
            <Button variant="outline" onPress={handleJoinMeeting}>
              Join meeting
            </Button>
          ) : null}
          <ThemedText style={[styles.description, { color: palette.text }]}>{event.description}</ThemedText>
        </SurfaceCard>

        {event.status === 'PUBLISHED' && event.rsvpRequired ? (
          <SurfaceCard style={styles.card}>
            <Row align="center" justify="space-between" style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Your response
                </ThemedText>
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                  Update your status here.
                </ThemedText>
              </View>
              {currentRSVP ? (
                <ThemedText style={[styles.helperText, { color: palette.muted }]}>
                  {eventService.formatRSVPStatus(currentRSVP.status)}
                </ThemedText>
              ) : null}
            </Row>
            <RSVPButtons event={event} currentRSVP={rsvpPreview} onRSVP={handleRSVP} />
          </SurfaceCard>
        ) : null}

        <SurfaceCard style={styles.card}>
          <Row align="center" justify="space-between" style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Responses
              </ThemedText>
              <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                {responseSummaryLabel}
              </ThemedText>
            </View>
            {isOrganizer && reminderTargetCount > 0 && event.status === 'PUBLISHED' ? (
              <Button variant="outline" onPress={handleSendReminder}>
                Remind {reminderTargetCount}
              </Button>
            ) : null}
          </Row>

          <Row style={styles.statsRow} gap="sm">
            <StatCard
              label="Going"
              value={String(attendeeCounts.going)}
              tone={palette.success}
            />
            <StatCard
              label="Maybe"
              value={String(attendeeCounts.maybe)}
              tone={palette.warning}
            />
            <StatCard
              label="Can't go"
              value={String(attendeeCounts.notGoing)}
              tone={palette.error}
            />
          </Row>

          {rsvps.length > 0 ? (
            <View style={styles.attendeeListWrap}>
              <AttendeeList
                rsvps={rsvps}
                attendance={attendance}
                stats={attendanceStats || undefined}
                onAttendeePress={undefined}
                showStats={false}
                emptyMessage="No responses yet."
              />
            </View>
          ) : (
            <ThemedText style={[styles.emptyCopy, { color: palette.muted }]}>
              No responses yet.
            </ThemedText>
          )}

          {isOrganizer ? (
            <Button variant="outline" onPress={handleOpenFullAttendance}>
              Open full response list
            </Button>
          ) : null}
        </SurfaceCard>

        {(event.status === 'PUBLISHED' || currentAttendance) && (
          <SurfaceCard style={styles.card}>
            <Row align="center" justify="space-between" style={styles.sectionHeader}>
              <View style={styles.sectionHeaderText}>
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Attendance
                </ThemedText>
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                  {attendanceStats
                    ? `${attendanceStats.checkedInCount} checked in · ${attendanceStats.attendanceRate}% rate`
                    : isEventToday || checkInAvailable
                      ? 'Check-in is open.'
                      : 'Check-in opens on event day.'}
                </ThemedText>
              </View>
              {isEventToday ? (
                <MetaPill icon="today-outline" label="Today" tone={palette.success} />
              ) : null}
            </Row>

            <CheckInButton
              event={event}
              userId={actorUserId}
              userName={actorName}
              userRole={actorRole}
              currentAttendance={currentAttendance}
              onCheckIn={handleCheckIn}
              onUndoCheckIn={handleUndoCheckIn}
              disabled={!currentRSVP && !isCoach}
            />

            {!currentRSVP && !isCoach ? (
              <ThemedText style={[styles.helperText, { color: palette.muted }]}>
                Respond to the event before checking in.
              </ThemedText>
            ) : null}
          </SurfaceCard>
        )}

        {(isOrganizer || canShareRecap) && (
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Organizer actions
            </ThemedText>
            <View style={styles.actionStack}>
              {isCreator && event.status === 'DRAFT' ? (
                <Button onPress={handlePublish}>Publish event</Button>
              ) : null}
              {isCreator && event.status === 'PUBLISHED' ? (
                <Button variant="outline" onPress={handleCancel}>
                  Cancel event
                </Button>
              ) : null}
              {canShareRecap ? (
                <Button variant="secondary" onPress={handleOpenRecap}>
                  Share update
                </Button>
              ) : null}
            </View>
          </SurfaceCard>
        )}
      </ScrollView>
    </>,
  );
}

function DetailRow({
  icon,
  label,
  value,
  subvalue,
  paletteColor,
  mutedColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subvalue?: string;
  paletteColor: string;
  mutedColor: string;
}) {
  return (
    <Row align="center" gap="md" style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: withAlpha(paletteColor, 0.1) }]}>
        <Ionicons name={icon} size={18} color={paletteColor} />
      </View>
      <View style={styles.detailContent}>
        <ThemedText style={[styles.detailLabel, { color: mutedColor }]}>{label}</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.detailValue}>
          {value}
        </ThemedText>
        {subvalue ? (
          <ThemedText style={[styles.detailSubvalue, { color: mutedColor }]}>{subvalue}</ThemedText>
        ) : null}
      </View>
    </Row>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: withAlpha(tone, 0.1) }]}>
      <ThemedText style={[styles.statValue, { color: tone }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: tone }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  titleBlock: { gap: Spacing.sm },
  badgeRow: { gap: Spacing.xs },
  metaPill: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  metaPillText: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  title: {
    ...Typography.display,
    fontSize: scaleFont(Typography.display.fontSize),
    lineHeight: scaleFont(32),
  },
  subtitle: {
    ...Typography.bodySmall,
    fontSize: scaleFont(Typography.bodySmall.fontSize),
  },
  card: { padding: Spacing.md, gap: Spacing.md },
  sectionHeader: { alignItems: 'flex-start', gap: Spacing.sm },
  sectionHeaderText: { flex: 1, gap: Spacing.xxs },
  sectionTitle: {
    ...Typography.subheading,
    fontSize: scaleFont(Typography.subheading.fontSize),
  },
  sectionHint: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
  },
  detailList: { gap: Spacing.sm },
  detailRow: { alignItems: 'flex-start' },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: { flex: 1, gap: Spacing.micro },
  detailLabel: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  detailValue: {
    ...Typography.bodySmallSemiBold,
    fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  detailSubvalue: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
  },
  description: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
  },
  helperText: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
  },
  statsRow: { gap: Spacing.sm },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statValue: {
    ...Typography.title,
    fontSize: scaleFont(Typography.title.fontSize),
  },
  statLabel: {
    ...Typography.caption,
    fontSize: scaleFont(Typography.caption.fontSize),
  },
  attendeeListWrap: { minHeight: 220 },
  emptyCopy: {
    ...Typography.small,
    fontSize: scaleFont(Typography.small.fontSize),
  },
  actionStack: { gap: Spacing.sm },
});
