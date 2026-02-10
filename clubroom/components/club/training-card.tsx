import { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession } from '@/constants/types';

interface TrainingCardProps {
  session: GroupSession;
  index: number;
  userHasChildrenView: boolean;
}

export const TrainingCard = memo(function TrainingCard({ session, index, userHasChildrenView }: TrainingCardProps) {
  const { colors } = useTheme();

  const nextDate = groupSessionService.getNextTrainingDate(session);
  const dayName = session.recurringPattern
    ? groupSessionService.formatDayOfWeek(session.recurringPattern.dayOfWeek)
    : '';

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.card} onPress={() => router.push(Routes.groupSession(session.id))}>
        {/* Header: Title + Price */}
        <Row justify="space-between" align="flex-start">
          <View style={styles.titleSection}>
            <ThemedText type="defaultSemiBold" style={Typography.subheading}>{session.title}</ThemedText>
            {session.squadName && (
              <View style={[styles.squadBadge, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                <ThemedText style={[Typography.caption, { color: colors.tint }]}>{session.squadName}</ThemedText>
              </View>
            )}
          </View>
          {session.pricePerParticipant === 0 ? (
            <View style={[styles.freeBadge, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
              <ThemedText style={[Typography.caption, { color: colors.success }]}>FREE</ThemedText>
            </View>
          ) : (
            <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
              {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
            </ThemedText>
          )}
        </Row>

        {/* Details */}
        <View style={styles.details}>
          {session.isRecurring && session.recurringPattern && (
            <DetailRow icon="repeat" iconColor={colors.tint} colors={colors}>
              Every {dayName} at {session.recurringPattern.startTime}
            </DetailRow>
          )}
          {nextDate && (
            <DetailRow icon="calendar" iconColor={colors.warning} colors={colors}>
              Next: {new Date(nextDate.date).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })} - {nextDate.startTime} to {nextDate.endTime}
            </DetailRow>
          )}
          <DetailRow icon="location" iconColor={colors.muted} colors={colors} textColor={colors.muted}>
            {session.location}
          </DetailRow>
          <Row gap="sm" align="center">
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(colors.muted, 0.09) }]}>
              <Ionicons name="people" size={14} color={colors.muted} />
            </View>
            <ThemedText style={{ color: colors.muted }}>
              {session.currentParticipants}/{session.maxParticipants} participants
            </ThemedText>
            {session.waitlistCount > 0 && (
              <ThemedText style={[Typography.caption, { color: colors.warning }]}>
                (+{session.waitlistCount} waitlist)
              </ThemedText>
            )}
          </Row>
        </View>

        {/* Coach */}
        <Row style={[styles.coachSection, { borderTopColor: colors.border }]}>
          {session.coachPhotoUrl ? (
            <Image source={{ uri: session.coachPhotoUrl }} style={styles.coachPhoto} />
          ) : (
            <View style={[styles.coachPhoto, { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="person" size={14} color={colors.muted} />
            </View>
          )}
          <ThemedText style={[Typography.small, { color: colors.muted, flex: 1 }]}>
            Coach {session.coachName}
          </ThemedText>
          {userHasChildrenView && (
            <Clickable style={[styles.rsvpButton, { backgroundColor: colors.tint }]}>
              <ThemedText style={[Typography.caption, { color: colors.onPrimary }]}>RSVP</ThemedText>
            </Clickable>
          )}
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

function DetailRow({ icon, iconColor, colors, textColor, children }: {
  icon: string; iconColor: string; colors: { text: string }; textColor?: string; children: React.ReactNode;
}) {
  return (
    <Row gap="sm" align="center">
      <View style={[styles.iconCircle, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
        <Ionicons name={icon as any} size={14} color={iconColor} />
      </View>
      <ThemedText style={{ color: textColor || colors.text }} numberOfLines={icon === 'location' ? 1 : undefined}>
        {children}
      </ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  titleSection: { flex: 1, gap: Spacing.xs, marginRight: Spacing.md },
  squadBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  freeBadge: { paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  details: { gap: Spacing.sm },
  iconCircle: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  coachSection: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1 },
  coachPhoto: { width: 28, height: 28, borderRadius: Radii.lg },
  rsvpButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.sm },
});
