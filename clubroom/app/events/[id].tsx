import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { RSVPButtons } from '@/components/event/rsvp-buttons';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { ClubEvent, RSVPStatus, EventAttendee } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { eventService } from '@/services/event-service';
import { scaleFont } from '@/utils/scale';

export default function EventDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';

  const [event, setEvent] = useState<ClubEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendees, setShowAttendees] = useState(false);

  const loadEvent = useCallback(async () => {
    if (!id) return;
    try {
      const data = await eventService.getEvent(id);
      setEvent(data);
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadEvent();
    }, [loadEvent])
  );

  const handleRSVP = async (status: RSVPStatus, guestCount: number) => {
    if (!event || !currentUser) return;

    try {
      await eventService.rsvp(
        event.id,
        currentUser.id,
        currentUser.name || 'Unknown',
        isCoach ? 'COACH' : 'PARENT',
        status,
        guestCount,
        currentUser.avatar
      );
      await loadEvent();
    } catch (error) {
      console.error('Failed to RSVP:', error);
      Alert.alert('Error', 'Failed to save your response. Please try again.');
    }
  };

  const handlePublish = async () => {
    if (!event) return;

    Alert.alert('Publish Event', 'This will notify all club members about this event.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Publish',
        onPress: async () => {
          try {
            await eventService.publishEvent(event.id);
            await eventService.inviteClub(event.id);
            await loadEvent();
            Alert.alert('Success', 'Event published and members notified!');
          } catch (error) {
            console.error('Failed to publish:', error);
            Alert.alert('Error', 'Failed to publish event.');
          }
        },
      },
    ]);
  };

  const handleCancel = async () => {
    if (!event) return;

    Alert.alert('Cancel Event', 'Are you sure you want to cancel this event?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await eventService.cancelEvent(event.id);
            await loadEvent();
          } catch (error) {
            console.error('Failed to cancel:', error);
            Alert.alert('Error', 'Failed to cancel event.');
          }
        },
      },
    ]);
  };

  if (loading || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const typeColor = eventService.getEventTypeColor(event.eventType);
  const typeIcon = eventService.getEventTypeIcon(event.eventType);
  const { going, maybe, notGoing, totalGuests } = eventService.getAttendeeCounts(event.attendees);
  const currentRSVP = currentUser ? eventService.getUserRSVP(event.attendees, currentUser.id) : undefined;
  const isCreator = currentUser?.id === event.createdBy;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header image */}
        {event.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: event.imageUrl }} style={styles.headerImage} />
            <View style={styles.imageOverlay} />
          </View>
        )}

        {/* Back button */}
        <View style={[styles.topBar, !event.imageUrl && { position: 'relative' }]}>
          <Clickable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: event.imageUrl ? 'rgba(0,0,0,0.4)' : palette.surface }]}
          >
            <Ionicons name="arrow-back" size={24} color={event.imageUrl ? '#FFFFFF' : palette.text} />
          </Clickable>
        </View>

        <View style={styles.content}>
          {/* Type badge and status */}
          <View style={styles.badgeRow}>
            <View style={[styles.typeBadge, { backgroundColor: `${typeColor}20` }]}>
              <Ionicons name={typeIcon as any} size={16} color={typeColor} />
              <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>
                {eventService.formatEventType(event.eventType)}
              </ThemedText>
            </View>
            {event.status === 'DRAFT' && (
              <View style={[styles.statusBadge, { backgroundColor: `${palette.warning}15` }]}>
                <ThemedText style={[styles.statusText, { color: palette.warning }]}>DRAFT</ThemedText>
              </View>
            )}
            {event.status === 'CANCELLED' && (
              <View style={[styles.statusBadge, { backgroundColor: `${palette.error}15` }]}>
                <ThemedText style={[styles.statusText, { color: palette.error }]}>CANCELLED</ThemedText>
              </View>
            )}
            {event.isVirtual && (
              <View style={[styles.virtualBadge, { backgroundColor: `${palette.accent}15` }]}>
                <Ionicons name="videocam" size={14} color={palette.accent} />
                <ThemedText style={[styles.virtualText, { color: palette.accent }]}>Virtual</ThemedText>
              </View>
            )}
          </View>

          {/* Title */}
          <ThemedText type="title" style={styles.title}>
            {event.title}
          </ThemedText>

          {/* Club info */}
          <ThemedText style={[styles.clubName, { color: palette.muted }]}>
            {event.clubName} - Posted by {event.createdByName}
          </ThemedText>

          {/* Details cards */}
          <View style={styles.detailsSection}>
            <SurfaceCard style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: `${palette.tint}15` }]}>
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
              </View>
            </SurfaceCard>

            <SurfaceCard style={styles.detailCard}>
              <View style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: `${palette.tint}15` }]}>
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
              </View>
              {event.isVirtual && event.meetingLink && (
                <Clickable style={[styles.linkButton, { borderColor: palette.tint }]}>
                  <Ionicons name="videocam" size={16} color={palette.tint} />
                  <ThemedText style={[styles.linkText, { color: palette.tint }]}>
                    Join Meeting
                  </ThemedText>
                </Clickable>
              )}
            </SurfaceCard>

            {event.price > 0 && (
              <SurfaceCard style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <View style={[styles.detailIcon, { backgroundColor: `${palette.success}15` }]}>
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
                </View>
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
            <View style={[styles.audienceBadge, { backgroundColor: palette.surface }]}>
              <Ionicons name="people" size={16} color={palette.icon} />
              <ThemedText>{eventService.formatAudience(event.targetAudience)}</ThemedText>
            </View>
          </View>

          {/* RSVP section */}
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
              <RSVPButtons
                event={event}
                currentRSVP={currentRSVP}
                onRSVP={handleRSVP}
              />
            </View>
          )}

          {/* Attendance summary */}
          <View style={styles.section}>
            <Clickable
              onPress={() => setShowAttendees(!showAttendees)}
              style={styles.attendanceHeader}
            >
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Attendance ({going + totalGuests} confirmed)
              </ThemedText>
              <Ionicons
                name={showAttendees ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={palette.icon}
              />
            </Clickable>

            <View style={styles.attendanceStats}>
              <View style={[styles.statBox, { backgroundColor: `${palette.success}15` }]}>
                <ThemedText style={[styles.statNumber, { color: palette.success }]}>
                  {going}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.success }]}>Going</ThemedText>
              </View>
              <View style={[styles.statBox, { backgroundColor: `${palette.warning}15` }]}>
                <ThemedText style={[styles.statNumber, { color: palette.warning }]}>
                  {maybe}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.warning }]}>Maybe</ThemedText>
              </View>
              <View style={[styles.statBox, { backgroundColor: `${palette.error}15` }]}>
                <ThemedText style={[styles.statNumber, { color: palette.error }]}>
                  {notGoing}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: palette.error }]}>Can't Go</ThemedText>
              </View>
              {totalGuests > 0 && (
                <View style={[styles.statBox, { backgroundColor: palette.surface }]}>
                  <ThemedText style={styles.statNumber}>+{totalGuests}</ThemedText>
                  <ThemedText style={[styles.statLabel, { color: palette.muted }]}>Guests</ThemedText>
                </View>
              )}
            </View>

            {showAttendees && event.attendees.length > 0 && (
              <View style={styles.attendeeList}>
                {event.attendees
                  .filter((a) => a.status === 'GOING')
                  .map((attendee) => (
                    <View key={attendee.userId} style={styles.attendeeRow}>
                      <View style={[styles.attendeeAvatar, { backgroundColor: palette.border }]}>
                        <ThemedText style={styles.attendeeInitial}>
                          {attendee.userName.charAt(0)}
                        </ThemedText>
                      </View>
                      <View style={styles.attendeeInfo}>
                        <ThemedText>{attendee.userName}</ThemedText>
                        {attendee.guestCount > 0 && (
                          <ThemedText style={[styles.guestCount, { color: palette.muted }]}>
                            +{attendee.guestCount} guest{attendee.guestCount > 1 ? 's' : ''}
                          </ThemedText>
                        )}
                      </View>
                      <View style={[styles.statusDot, { backgroundColor: palette.success }]} />
                    </View>
                  ))}
              </View>
            )}
          </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    height: 220,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
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
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  virtualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  virtualText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(26),
    lineHeight: scaleFont(32),
  },
  clubName: {
    fontSize: scaleFont(14),
    marginTop: -Spacing.sm,
  },
  detailsSection: {
    gap: Spacing.sm,
  },
  detailCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailSubtext: {
    fontSize: scaleFont(13),
    marginTop: 2,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  linkText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  description: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(23),
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignSelf: 'flex-start',
  },
  rsvpDeadline: {
    fontSize: scaleFont(13),
    marginTop: -Spacing.xs,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  statNumber: {
    fontSize: scaleFont(20),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  attendeeList: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  attendeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeInitial: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  attendeeInfo: {
    flex: 1,
  },
  guestCount: {
    fontSize: scaleFont(12),
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionSection: {
    marginTop: Spacing.md,
  },
});
