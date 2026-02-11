/**
 * Group Session Detail Screen
 *
 * Full detail view for a group training session.
 * Shows hero image, schedule, capacity, coach info, and registration.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { WaitlistBanner } from '@/components/group/waitlist-banner';
import { GroupSessionHero } from '@/components/group/group-session-hero';
import { GroupSessionDetails } from '@/components/group/group-session-details';
import { GroupSessionCoachActions } from '@/components/group/group-session-coach-actions';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useGroupSession } from '@/hooks/use-group-session';
import { groupSessionService } from '@/services/group-session-service';
import { getGroupSessionClubLabel } from '@/utils/group-display';

export default function GroupSessionDetailScreen() {
  const { colors } = useTheme();
  const {
    id, session, roster, loading, registering,
    isCoach, userHasChildren, spotsLeft, isFull, isFree,
    handleRegister, handleCancel,
  } = useGroupSession();

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </Row>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <EmptyState icon="calendar-outline" title="Session not found" message="This session may have been removed." actionLabel="Go Back" onPressAction={() => router.back()} />
      </SafeAreaView>
    );
  }

  const capacityColor = isFull ? colors.error : spotsLeft <= 3 ? colors.warning : colors.success;
  const clubLabel = getGroupSessionClubLabel(session);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <GroupSessionHero session={session} isCoach={isCoach} />

        <View style={styles.content}>
          {/* Title & Price */}
          <Row justify="between" align="start" style={styles.titleSection}>
            <View style={{ flex: 1 }}>
              <ThemedText type="title">{session.title}</ThemedText>
              {clubLabel && (
                <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.xxs }]}>by {clubLabel}</ThemedText>
              )}
            </View>
            <View style={styles.priceSection}>
              <ThemedText type="heading" style={[Typography.display, { color: colors.tint }]}>
                {isFree ? 'Free' : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
              </ThemedText>
              {!isFree && <ThemedText style={[Typography.caption, { color: colors.muted }]}>per person</ThemedText>}
            </View>
          </Row>

          {/* Waitlist */}
          {isFull && session.waitlistEnabled && (
            <WaitlistBanner waitlistCount={session.waitlistCount} onJoinWaitlist={handleRegister} loading={registering} />
          )}

          {/* Capacity */}
          <Row align="center" gap="xs" style={[styles.capacityBadge, { backgroundColor: withAlpha(capacityColor, 0.09) }]}>
            <Ionicons name={isFull ? 'warning' : 'people'} size={18} color={capacityColor} />
            <ThemedText style={{ color: capacityColor, fontWeight: '600' }}>
              {isFull ? `Full - ${session.waitlistCount} on waitlist` : `${spotsLeft} of ${session.maxParticipants} spots left`}
            </ThemedText>
          </Row>

          <GroupSessionDetails session={session} />
          {isCoach && <GroupSessionCoachActions sessionId={id} rosterCount={roster.length} onCancel={handleCancel} />}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Registration Footer */}
      {userHasChildren && !isFull && (
        <Row align="center" justify="between" style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View>
            <ThemedText type="heading" style={{ color: colors.tint }}>
              {isFree ? 'Free' : groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{spotsLeft} spots left</ThemedText>
          </View>
          <Button onPress={handleRegister} disabled={registering}>
            {registering ? 'Registering...' : 'Register Now'}
          </Button>
        </Row>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.md },
  titleSection: {},
  priceSection: { alignItems: 'flex-end' },
  capacityBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, alignSelf: 'flex-start' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
});
