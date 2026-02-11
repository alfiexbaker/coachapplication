import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { RSVPButtons } from '@/components/event/rsvp-buttons';
import { EventAttendanceSection } from '@/components/event/event-attendance-section';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventDetail } from '@/hooks/use-event-detail';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

export default function EventDetailScreen() {
  const { colors: palette } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    event, loading, showAttendees, isCoach, typeColor, typeIcon,
    attendeeCounts, currentRSVP, isCreator,
    handleRSVP, handlePublish, handleCancel, toggleAttendees,
  } = useEventDetail(id);

  if (loading || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}><ThemedText>Loading...</ThemedText></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {event.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: event.imageUrl }} style={styles.headerImage} />
            <View style={styles.imageOverlay} />
          </View>
        )}

        <View style={[styles.topBar, !event.imageUrl && { position: 'relative' }]}>
          <Clickable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: event.imageUrl ? 'rgba(0,0,0,0.4)' : palette.surface }]}>
            <Ionicons name="arrow-back" size={24} color={event.imageUrl ? palette.onPrimary : palette.text} />
          </Clickable>
        </View>

        <View style={styles.content}>
          {/* Badges */}
          <Row align="center" gap="xs" wrap style={styles.badgeRow}>
            <Row align="center" gap="xxs" style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.12) }]}>
              <Ionicons name={typeIcon as keyof typeof Ionicons.glyphMap} size={16} color={typeColor} />
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>{eventService.formatEventType(event.eventType)}</ThemedText>
            </Row>
            {event.status === 'DRAFT' && (
              <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                <ThemedText style={[styles.statusText, { color: palette.warning }]}>DRAFT</ThemedText>
              </View>
            )}
            {event.status === 'CANCELLED' && (
              <View style={[styles.statusBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
                <ThemedText style={[styles.statusText, { color: palette.error }]}>CANCELLED</ThemedText>
              </View>
            )}
            {event.isVirtual && (
              <Row align="center" gap="xxs" style={[styles.virtualBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
                <Ionicons name="videocam" size={14} color={palette.accent} />
                <ThemedText style={[styles.virtualText, { color: palette.accent }]}>Virtual</ThemedText>
              </Row>
            )}
          </Row>

          <ThemedText type="title" style={styles.title}>{event.title}</ThemedText>
          <ThemedText style={[styles.clubName, { color: palette.muted }]}>{event.clubId} - Posted by {event.createdBy}</ThemedText>

          {/* Detail cards */}
          <View style={styles.detailsSection}>
            <SurfaceCard style={styles.detailCard}>
              <Row align="center" gap="md" style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}><Ionicons name="calendar" size={20} color={palette.tint} /></View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold">{eventService.formatEventDate(event.date)}</ThemedText>
                  <ThemedText style={[styles.detailSubtext, { color: palette.muted }]}>{eventService.formatEventTime(event.startTime, event.endTime)}</ThemedText>
                </View>
              </Row>
            </SurfaceCard>

            <SurfaceCard style={styles.detailCard}>
              <Row align="center" gap="md" style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}><Ionicons name="location" size={20} color={palette.tint} /></View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold">{event.venue}</ThemedText>
                  {event.address && <ThemedText style={[styles.detailSubtext, { color: palette.muted }]}>{event.address}</ThemedText>}
                </View>
              </Row>
              {event.isVirtual && event.meetingLink && (
                <Clickable style={[styles.linkButton, { borderColor: palette.tint }]}>
                  <Row align="center" justify="center" gap="xxs">
                    <Ionicons name="videocam" size={16} color={palette.tint} />
                    <ThemedText style={[styles.linkText, { color: palette.tint }]}>Join Meeting</ThemedText>
                  </Row>
                </Clickable>
              )}
            </SurfaceCard>

            {event.price > 0 && (
              <SurfaceCard style={styles.detailCard}>
                <Row align="center" gap="md" style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}><Ionicons name="cash" size={20} color={palette.success} /></View>
                  <View style={styles.detailContent}>
                    <ThemedText type="defaultSemiBold">{eventService.formatPrice(event.price, event.currency)}</ThemedText>
                    <ThemedText style={[styles.detailSubtext, { color: palette.muted }]}>per person</ThemedText>
                  </View>
                </Row>
              </SurfaceCard>
            )}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About this event</ThemedText>
            <ThemedText style={styles.description}>{event.description}</ThemedText>
          </View>

          {/* Audience */}
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Who can attend</ThemedText>
            <Row align="center" gap="xs" style={[styles.audienceBadge, { backgroundColor: palette.surface }]}>
              <Ionicons name="people" size={16} color={palette.icon} />
              <ThemedText>{eventService.formatAudience(event.targetAudience)}</ThemedText>
            </Row>
          </View>

          {/* RSVP */}
          {event.status === 'PUBLISHED' && event.rsvpRequired && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>RSVP</ThemedText>
              {event.rsvpDeadline && <ThemedText style={[styles.rsvpDeadline, { color: palette.muted }]}>Respond by {eventService.formatEventDate(event.rsvpDeadline)}</ThemedText>}
              <RSVPButtons event={event} currentRSVP={currentRSVP} onRSVP={handleRSVP} />
            </View>
          )}

          {/* Attendance */}
          <EventAttendanceSection event={event} attendeeCounts={attendeeCounts} showAttendees={showAttendees} isCoach={isCoach} onToggleAttendees={toggleAttendees} />

          {/* Coach actions */}
          {isCreator && event.status === 'DRAFT' && (
            <View style={styles.actionSection}><Button onPress={handlePublish}>Publish Event</Button></View>
          )}
          {isCreator && event.status === 'PUBLISHED' && (
            <View style={styles.actionSection}><Button variant="outline" onPress={handleCancel}>Cancel Event</Button></View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageContainer: { height: 220, position: 'relative' },
  headerImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, zIndex: 10 },
  backButton: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  badgeRow: {},
  typeBadge: { paddingHorizontal: Spacing.xs + Spacing.xxs, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  typeBadgeText: { ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize) },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm },
  statusText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), letterSpacing: 0.5 },
  virtualBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm },
  virtualText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  title: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize), lineHeight: scaleFont(32) },
  clubName: { ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize), marginTop: -Spacing.sm },
  detailsSection: { gap: Spacing.sm },
  detailCard: { padding: Spacing.md, gap: Spacing.sm },
  detailRow: {},
  detailIcon: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  detailContent: { flex: 1 },
  detailSubtext: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize), marginTop: Spacing.micro },
  linkButton: { paddingVertical: Spacing.xs, borderRadius: Radii.md, borderWidth: 1, marginTop: Spacing.xs },
  linkText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  description: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize), lineHeight: scaleFont(23) },
  audienceBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, alignSelf: 'flex-start' },
  rsvpDeadline: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize), marginTop: -Spacing.xs },
  actionSection: { marginTop: Spacing.md },
});
