import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { WaitlistBanner } from '@/components/group/waitlist-banner';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { hasChildren } from '@/utils/user-helpers';
import type { GroupSession, GroupRegistration } from '@/constants/types';

const logger = createLogger('GroupSessionDetailScreen');

// Decorative: group session type category colors
const SESSION_TYPE_COLORS = {
  CAMP: '#FF6B35',
  CLINIC: '#7B68EE',
  TEAM_TRAINING: '#2E8B57',
  TRAINING: '#2E8B57',
  OPEN_SESSION: '#4169E1',
  TRIAL: '#20B2AA',
} as const;

export default function GroupSessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [session, setSession] = useState<GroupSession | null>(null);
  const [roster, setRoster] = useState<GroupRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const isCoach = currentUser?.id === session?.coachId;
  const userHasChildren = hasChildren(currentUser);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionData, rosterData] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getSessionRoster(id),
      ]);
      setSession(sessionData);
      setRoster(rosterData);
    } catch (error) {
      logger.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async () => {
    if (!session || !currentUser) return;

    setRegistering(true);
    try {
      await groupSessionService.register(
        session.id,
        `athlete_${currentUser.id}`,
        `${currentUser.name}'s Child`,
        currentUser.id,
        currentUser.name || 'Parent'
      );
      await loadData();
      Alert.alert(
        'Success',
        session.currentParticipants >= session.maxParticipants
          ? 'You have been added to the waitlist!'
          : 'Registration successful!'
      );
    } catch (error) {
      logger.error('Failed to register:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancel = async () => {
    if (!session) return;

    Alert.alert('Cancel Session', 'Are you sure you want to cancel this session?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await groupSessionService.cancelSession(session.id);
            router.back();
          } catch (error) {
            logger.error('Failed to cancel:', error);
          }
        } },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="calendar-outline"
          title="Session not found"
          message="This session may have been removed."
          actionLabel="Go Back"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const spotsLeft = session.maxParticipants - session.currentParticipants;
  const isFull = spotsLeft <= 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _firstDate = session.schedule[0];
  const isFree = session.pricePerParticipant === 0;

  const type = SESSION_TYPE_COLORS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Header */}
        <View style={styles.imageContainer}>
          {session.imageUrl ? (
            <Image source={{ uri: session.imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: type[session.sessionType] }]}>
              <Ionicons name="calendar" size={48} color="rgba(255,255,255,0.6)" />{/* Decorative: semi-transparent icon on colored bg */}
            </View>
          )}
          <View style={styles.imageOverlay} />
          <Clickable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]} // Decorative: overlay button scrim
          >
            <Ionicons name="arrow-back" size={22} color={palette.onPrimary} />
          </Clickable>
          {isCoach && (
            <Clickable
              onPress={() => router.push(Routes.groupSessionRoster(id))}
              style={[styles.rosterButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]} // Decorative: overlay button scrim
            >
              <Ionicons name="people" size={20} color={palette.onPrimary} />
            </Clickable>
          )}
          <View style={[styles.typeBadge, { backgroundColor: type[session.sessionType] }]}>
            <ThemedText style={[styles.typeText, { color: palette.onPrimary }]}>
              {groupSessionService.formatSessionType(session.sessionType)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.content}>
          {/* Title & Price */}
          <View style={styles.titleSection}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{session.title}</ThemedText>
              {session.clubName && (
                <ThemedText style={[styles.clubName, { color: palette.muted }]}>
                  by {session.clubName}
                </ThemedText>
              )}
            </View>
            <View style={styles.priceSection}>
              <ThemedText type="heading" style={[styles.price, { color: palette.tint }]}>
                {isFree ? 'Free' : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
              </ThemedText>
              {!isFree && <ThemedText style={[styles.priceNote, { color: palette.muted }]}>per person</ThemedText>}
            </View>
          </View>

          {/* Capacity */}
          {isFull && session.waitlistEnabled && (
            <WaitlistBanner
              waitlistCount={session.waitlistCount}
              onJoinWaitlist={handleRegister}
              loading={registering}
            />
          )}

          <View
            style={[
              styles.capacityBadge,
              {
                backgroundColor: isFull
                  ? withAlpha(palette.error, 0.09)
                  : spotsLeft <= 3
                  ? withAlpha(palette.warning, 0.09)
                  : withAlpha(palette.success, 0.09) },
            ]}
          >
            <Ionicons
              name={isFull ? 'warning' : 'people'}
              size={18}
              color={isFull ? palette.error : spotsLeft <= 3 ? palette.warning : palette.success}
            />
            <ThemedText
              style={{
                color: isFull ? palette.error : spotsLeft <= 3 ? palette.warning : palette.success,
                fontWeight: '600' }}
            >
              {isFull
                ? `Full - ${session.waitlistCount} on waitlist`
                : `${spotsLeft} of ${session.maxParticipants} spots left`}
            </ThemedText>
          </View>

          {/* Description */}
          {session.description && (
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <SurfaceCard style={styles.card}>
                <ThemedText type="defaultSemiBold">About</ThemedText>
                <ThemedText style={[styles.description, { color: palette.muted }]}>
                  {session.description}
                </ThemedText>
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Schedule */}
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <SurfaceCard style={styles.card}>
              <ThemedText type="defaultSemiBold">Schedule</ThemedText>
              {session.schedule.map((sched, idx) => (
                <View key={idx} style={styles.scheduleRow}>
                  <View style={[styles.scheduleIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                    <Ionicons name="calendar" size={16} color={palette.tint} />
                  </View>
                  <View>
                    <ThemedText type="defaultSemiBold">
                      {new Date(sched.date).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long' })}
                    </ThemedText>
                    <ThemedText style={[styles.scheduleTime, { color: palette.muted }]}>
                      {sched.startTime} - {sched.endTime}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </SurfaceCard>
          </Animated.View>

          {/* Location */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <SurfaceCard style={styles.card}>
              <View style={styles.cardRow}>
                <Ionicons name="location" size={20} color={palette.tint} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Location</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>{session.location}</ThemedText>
                </View>
              </View>
            </SurfaceCard>
          </Animated.View>

          {/* Coach */}
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <SurfaceCard style={styles.card}>
              <View style={styles.cardRow}>
                {session.coachPhotoUrl ? (
                  <Image source={{ uri: session.coachPhotoUrl }} style={styles.coachPhoto} />
                ) : (
                  <View style={[styles.coachPhotoPlaceholder, { backgroundColor: palette.border }]}>
                    <Ionicons name="person" size={20} color={palette.muted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{session.coachName}</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>Coach</ThemedText>
                </View>
                <Clickable
                  style={[styles.messageButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={palette.tint} />
                </Clickable>
              </View>
            </SurfaceCard>
          </Animated.View>

          {/* Requirements */}
          {(session.ageMin || session.ageMax || session.skillLevel || session.equipment?.length) && (
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <SurfaceCard style={styles.card}>
                <ThemedText type="defaultSemiBold">Requirements</ThemedText>
                {(session.ageMin || session.ageMax) && (
                  <View style={styles.requirementRow}>
                    <Ionicons name="people-outline" size={16} color={palette.muted} />
                    <ThemedText style={{ color: palette.muted }}>
                      Ages {session.ageMin || 'Any'} - {session.ageMax || 'Any'}
                    </ThemedText>
                  </View>
                )}
                {session.skillLevel && session.skillLevel !== 'ALL' && (
                  <View style={styles.requirementRow}>
                    <Ionicons name="star-outline" size={16} color={palette.muted} />
                    <ThemedText style={{ color: palette.muted }}>{session.skillLevel} level</ThemedText>
                  </View>
                )}
                {session.equipment && session.equipment.length > 0 && (
                  <View style={styles.requirementRow}>
                    <Ionicons name="bag-outline" size={16} color={palette.muted} />
                    <ThemedText style={{ color: palette.muted }}>Bring: {session.equipment.join(', ')}</ThemedText>
                  </View>
                )}
              </SurfaceCard>
            </Animated.View>
          )}

          {/* Focus Areas */}
          {session.focus && session.focus.length > 0 && (
            <View style={styles.focusSection}>
              <ThemedText type="defaultSemiBold" style={styles.focusTitle}>
                Focus Areas
              </ThemedText>
              <View style={styles.focusRow}>
                {session.focus.map((f) => (
                  <View key={f} style={[styles.focusTag, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                    <ThemedText style={[styles.focusText, { color: palette.tint }]}>{f}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Coach Actions */}
          {isCoach && (
            <View style={styles.coachActions}>
              <Clickable
                onPress={() => router.push(Routes.groupSessionRoster(id))}
                style={[styles.coachActionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
              >
                <Ionicons name="people" size={20} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                  View Roster ({roster.length})
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={handleCancel}
                style={[styles.coachActionButton, { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error }]}
              >
                <Ionicons name="close-circle" size={20} color={palette.error} />
                <ThemedText style={{ color: palette.error, fontWeight: '600' }}>Cancel Session</ThemedText>
              </Clickable>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {/* Registration Footer */}
      {userHasChildren && !isFull && (
        <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <View>
            <ThemedText type="heading" style={{ color: palette.tint }}>
              {isFree ? 'Free' : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
            </ThemedText>
            <ThemedText style={[styles.footerNote, { color: palette.muted }]}>{spotsLeft} spots left</ThemedText>
          </View>
          <Button onPress={handleRegister} disabled={registering}>
            {registering ? 'Registering...' : 'Register Now'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md },
  imageContainer: {
    position: 'relative',
    height: 220 },
  image: {
    width: '100%',
    height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center' },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)' }, // Decorative: image darkening overlay
  backButton: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  rosterButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  typeBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm },
  typeText: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md },
  titleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start' },
  clubName: {
    ...Typography.small,
    marginTop: Spacing.xxs },
  priceSection: {
    alignItems: 'flex-end' },
  price: {
    ...Typography.display },
  priceNote: {
    ...Typography.caption },
  capacityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignSelf: 'flex-start' },
  card: {
    gap: Spacing.sm },
  description: {
    ...Typography.bodySmall },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  scheduleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  scheduleTime: {
    ...Typography.small },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md },
  coachPhoto: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl },
  coachPhotoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center' },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1 },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  focusSection: {
    marginTop: Spacing.sm },
  focusTitle: {
    marginBottom: Spacing.xs },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs },
  focusTag: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md },
  focusText: {
    ...Typography.smallSemiBold },
  coachActions: {
    gap: Spacing.sm,
    marginTop: Spacing.md },
  coachActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1 },
  bottomSpacer: {
    height: 100 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderTopWidth: 1 },
  footerNote: {
    ...Typography.caption } });