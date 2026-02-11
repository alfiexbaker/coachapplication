import React, { memo } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { renderStars, COVER_HEIGHT, AVATAR_SIZE } from '@/hooks/use-public-profile';
import type { Coach } from '@/services/coach-service';
import { Row } from '@/components/primitives';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PublicProfileHeroProps {
  coach: Coach;
  onShare: () => void;
  onBook: () => void;
  onMessage: () => void;
}

export const PublicProfileHero = memo(function PublicProfileHero({
  coach,
  onShare,
  onBook,
  onMessage,
}: PublicProfileHeroProps) {
  const { colors: palette } = useTheme();
  const stars = renderStars(coach.rating, palette.rating);

  return (
    <>
      {/* Cover */}
      <View style={styles.coverContainer}>
        {coach.coverPhotoUrl ? (
          <Image source={{ uri: coach.coverPhotoUrl }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: palette.tint }]}>
            <Ionicons
              name="image-outline"
              size={Components.icon.xl}
              color={withAlpha(palette.surface, 0.25)}
            />
          </View>
        )}
        <Row style={styles.headerButtons}>
          <Clickable
            onPress={() => router.back()}
            style={[styles.headerBtn, { backgroundColor: withAlpha(palette.text, 0.4) }]}
          >
            <Ionicons name="arrow-back" size={Components.icon.lg} color={palette.onPrimary} />
          </Clickable>
          <Clickable
            accessibilityLabel="Share profile"
            onPress={onShare}
            style={[styles.headerBtn, { backgroundColor: withAlpha(palette.text, 0.4) }]}
          >
            <Ionicons name="share-outline" size={Components.icon.lg} color={palette.onPrimary} />
          </Clickable>
        </Row>
        <View style={styles.avatarContainer}>
          {coach.profilePhotoUrl ? (
            <Image
              source={{ uri: coach.profilePhotoUrl }}
              style={[styles.avatar, { borderColor: palette.surface }]}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: palette.tint, borderColor: palette.surface },
              ]}
            >
              <ThemedText style={[styles.avatarInitials, { color: palette.onPrimary }]}>
                {coach.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <Row style={styles.nameRow}>
          <ThemedText style={[Typography.display, { color: palette.text, flex: 1 }]}>
            {coach.name}
          </ThemedText>
          {coach.badges?.includes('Verified') && (
            <Row
              style={[styles.verifiedBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}
            >
              <Ionicons name="checkmark-circle" size={Components.icon.sm} color={palette.success} />
              <ThemedText style={[Typography.caption, { color: palette.success }]}>
                Verified
              </ThemedText>
            </Row>
          )}
        </Row>
        <Row style={styles.ratingRow}>
          <Row style={styles.starsRow}>
            {stars.map((s, i) => (
              <Ionicons key={i} name={s.name} size={14} color={s.color} />
            ))}
          </Row>
          <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
            {coach.rating.toFixed(1)}
          </ThemedText>
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            ({coach.reviewCount} reviews)
          </ThemedText>
        </Row>
        {coach.location ? (
          <Row style={styles.locationRow}>
            <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
            <ThemedText style={[Typography.body, { color: palette.muted }]}>
              {coach.location.city}
              {coach.location.state ? `, ${coach.location.state}` : ''}
            </ThemedText>
          </Row>
        ) : null}
        {coach.badges && coach.badges.length > 0 ? (
          <Row style={styles.badgesRow}>
            {coach.badges.map((badge, i) => (
              <Row
                key={i}
                style={[styles.badgePill, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              >
                <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                <ThemedText style={[Typography.caption, { color: palette.success }]}>
                  {badge}
                </ThemedText>
              </Row>
            ))}
          </Row>
        ) : null}
        <Row style={styles.ctaRow}>
          <Clickable
            onPress={onBook}
            style={[styles.bookButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="calendar-outline" size={Components.icon.md} color={palette.surface} />
            <ThemedText style={[Typography.bodySemiBold, { color: palette.surface }]}>
              Book a Session
            </ThemedText>
          </Clickable>
          <Clickable
            onPress={onMessage}
            style={[styles.messageButton, { borderColor: palette.border }]}
          >
            <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.text} />
          </Clickable>
        </Row>
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  coverContainer: { height: COVER_HEIGHT + AVATAR_SIZE / 2, position: 'relative' },
  coverImage: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
  coverPlaceholder: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: { position: 'absolute', bottom: 0, left: Spacing.lg },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { ...Typography.display },
  profileInfo: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.xs },
  nameRow: { alignItems: 'center', gap: Spacing.sm },
  verifiedBadge: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  ratingRow: { alignItems: 'center', gap: Spacing.xs },
  starsRow: { gap: Spacing.micro },
  locationRow: { alignItems: 'center', gap: Spacing.xs / 2 },
  badgesRow: { flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs / 2 },
  badgePill: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  ctaRow: { gap: Spacing.sm, marginTop: Spacing.sm },
  bookButton: {
    flex: 1,
    height: Components.button.height,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Components.button.borderRadius,
  },
  messageButton: {
    width: Components.button.height,
    height: Components.button.height,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
