/**
 * Upcoming Events Carousel
 *
 * Horizontal scrolling list of upcoming session invites,
 * displayed as cards with cover images, titles, and avatar stacks.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { CoverImageHero } from '@/components/invite/cover-image-hero';
import { AvatarStack } from '@/components/invite/avatar-stack';
import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import type { SessionInvite } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { getSessionInviteCoachName } from '@/utils/session-invite-display';

interface UpcomingEventsCarouselProps {
  invites: SessionInvite[];
  onPress: (inviteId: string) => void;
}

const CARD_WIDTH = 280;

const EventCard = memo(function EventCardComponent({
  invite,
  onPress,
}: {
  invite: SessionInvite;
  onPress: (id: string) => void;
}) {
  const { colors: palette, scheme } = useTheme();
  const shadows = Shadows[scheme];

  const firstSlot = invite.proposedSlots[0];
  const dateStr = firstSlot
    ? new Date(firstSlot.date + 'T00:00:00').toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';
  const timeStr = firstSlot ? `${firstSlot.startTime} - ${firstSlot.endTime}` : '';

  const goingCount = invite.rsvpCounts?.going ?? 0;
  const attendees = (invite.rsvpResponses ?? [])
    .filter((r) => r.status === 'going')
    .map((r) => ({
      id: r.userId,
      name: r.userName,
      photoUrl: r.userPhotoUrl,
    }));

  const handlePress = useCallback(() => onPress(invite.id), [onPress, invite.id]);
  const coachName = getSessionInviteCoachName(invite);

  return (
    <Clickable
      onPress={handlePress}
      accessibilityLabel={`${invite.sessionType} invite from ${coachName}`}
      style={[
        styles.card,
        {
          backgroundColor: palette.surface,
          ...shadows.card,
        },
      ]}
    >
      <CoverImageHero
        imageUrl={invite.coverImageUrl}
        sessionType={invite.sessionType}
        height={140}
      />
      <View style={styles.cardContent}>
        <ThemedText style={styles.cardTitle} numberOfLines={1}>
          {invite.sessionType} - {invite.focus}
        </ThemedText>
        <ThemedText style={[styles.cardMeta, { color: palette.muted }]} numberOfLines={1}>
          {dateStr} {timeStr && `\u00B7 ${timeStr}`}
        </ThemedText>
        {goingCount > 0 && (
          <View style={styles.avatarSection}>
            <AvatarStack attendees={attendees} goingCount={goingCount} maxVisible={3} />
          </View>
        )}
      </View>
    </Clickable>
  );
});

const Separator = () => <View style={styles.separator} />;

function UpcomingEventsCarouselComponent({ invites, onPress }: UpcomingEventsCarouselProps) {
  const { colors: palette, scheme } = useTheme();

  const renderItem = useCallback(
    ({ item }: { item: SessionInvite }) => (
      <EventCard invite={item} onPress={onPress} />
    ),
    [onPress]
  );

  const keyExtractor = useCallback((item: SessionInvite) => item.id, []);

  if (invites.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="heading" style={{ color: palette.text }}>
          Upcoming Events
        </ThemedText>
      </View>
      <FlatList
        data={invites}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        pagingEnabled={false}
        snapToInterval={CARD_WIDTH + Spacing.sm}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={Separator}
      />
    </View>
  );
}

export const UpcomingEventsCarousel = memo(UpcomingEventsCarouselComponent);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  header: {
    paddingHorizontal: Spacing.md,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  cardContent: {
    padding: Spacing.sm,
    gap: Spacing.xxs,
  },
  cardTitle: {
    ...Typography.bodySemiBold,
  },
  cardMeta: {
    ...Typography.small,
  },
  avatarSection: {
    marginTop: Spacing.xxs,
  },
  separator: {
    width: Spacing.sm,
  },
});
