import { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { groupSessionService } from '@/services/group-session-service';
import { SESSION_TYPE_COLORS } from '@/hooks/use-group-sessions';
import type { GroupSession } from '@/constants/types';
import { getGroupSessionClubLabel, getGroupSessionCoachName } from '@/utils/group-display';

interface GroupSessionCardProps {
  session: GroupSession;
  index: number;
  onPress: () => void;
}

export const GroupSessionCard = memo(function GroupSessionCard({
  session,
  index,
  onPress,
}: GroupSessionCardProps) {
  const { colors } = useTheme();
  const clubLabel = getGroupSessionClubLabel(session);
  const coachName = getGroupSessionCoachName(session);

  const firstDate = session.schedule[0];
  const isFree = session.pricePerParticipant === 0;
  const spotsLeft = session.maxParticipants - session.currentParticipants;
  const isFull = spotsLeft <= 0;
  const spotsColor = isFull ? colors.error : spotsLeft <= 3 ? colors.warning : colors.success;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.card} onPress={onPress}>
        {session.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: session.imageUrl }} style={styles.image} resizeMode="cover" />
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: SESSION_TYPE_COLORS[session.sessionType] },
              ]}
            >
              <ThemedText
                style={[
                  Typography.caption,
                  { color: colors.onPrimary, textTransform: 'uppercase', letterSpacing: 0.5 },
                ]}
              >
                {groupSessionService.formatSessionType(session.sessionType)}
              </ThemedText>
            </View>
            {isFree && (
              <View style={[styles.freeBadge, { backgroundColor: colors.tint }]}>
                <ThemedText style={[Typography.caption, { color: colors.onPrimary }]}>
                  FREE
                </ThemedText>
              </View>
            )}
          </View>
        )}

        <View style={styles.content}>
          <Row align="flex-start" justify="space-between">
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <ThemedText type="defaultSemiBold" style={Typography.subheading} numberOfLines={2}>
                {session.title}
              </ThemedText>
              {clubLabel && (
                <ThemedText
                  style={[Typography.caption, { color: colors.muted, marginTop: Spacing.micro }]}
                >
                  {clubLabel}
                </ThemedText>
              )}
            </View>
            {!isFree && (
              <ThemedText type="heading" style={[Typography.heading, { color: colors.tint }]}>
                {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
              </ThemedText>
            )}
          </Row>

          <ThemedText style={[Typography.small, { color: colors.muted }]} numberOfLines={2}>
            {session.description}
          </ThemedText>

          <View style={{ gap: Spacing.xxs }}>
            <Row gap="xxs" align="center">
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <ThemedText style={[Typography.caption, { color: colors.muted, flex: 1 }]}>
                {firstDate
                  ? new Date(firstDate.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Date TBC'}
                {session.schedule.length > 1 && ` + ${session.schedule.length - 1} more`}
              </ThemedText>
            </Row>
            <Row gap="xxs" align="center">
              <Ionicons name="location-outline" size={14} color={colors.muted} />
              <ThemedText
                style={[Typography.caption, { color: colors.muted, flex: 1 }]}
                numberOfLines={1}
              >
                {session.location}
              </ThemedText>
            </Row>
            {(session.ageMin || session.ageMax) && (
              <Row gap="xxs" align="center">
                <Ionicons name="people-outline" size={14} color={colors.muted} />
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                  Ages {session.ageMin || 'Any'}-{session.ageMax || 'Any'}
                </ThemedText>
              </Row>
            )}
          </View>

          <Row align="center" justify="space-between" style={{ marginTop: Spacing.xxs }}>
            <Row gap="xxs" align="center">
              <View style={[styles.coachPhotoPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="person" size={12} color={colors.muted} />
              </View>
              <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                {coachName}
              </ThemedText>
            </Row>
            <View style={[styles.spotsBadge, { backgroundColor: withAlpha(spotsColor, 0.09) }]}>
              <ThemedText style={[Typography.caption, { color: spotsColor }]}>
                {isFull
                  ? session.waitlistEnabled
                    ? `Waitlist (${session.waitlistCount})`
                    : 'Full'
                  : `${spotsLeft} spots left`}
              </ThemedText>
            </View>
          </Row>

          {session.focus && session.focus.length > 0 && (
            <Row gap="xxs" style={{ marginTop: Spacing.xxs }}>
              {session.focus.slice(0, 3).map((f) => (
                <View
                  key={f}
                  style={[styles.focusTag, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
                >
                  <ThemedText style={[Typography.micro, { color: colors.tint }]}>{f}</ThemedText>
                </View>
              ))}
            </Row>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  imageContainer: { position: 'relative', height: 160 },
  image: { width: '100%', height: '100%' },
  typeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  freeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  content: { padding: Spacing.md, gap: 8 },
  coachPhoto: { width: 20, height: 20, borderRadius: Radii.md },
  coachPhotoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotsBadge: { paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  focusTag: { paddingHorizontal: 8, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
});
