import React, { memo } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeImage } from '@/components/primitives/safe-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SCREEN_WIDTH, COVER_HEIGHT } from '@/hooks/use-coach-detail';
import type { Coach } from '@/services/coach-service';
import { renderStars } from '@/components/coach/coach-detail-reviews';
import { Row } from '@/components/primitives';

interface CoachDetailHeroProps {
  coach: Coach;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followLabel: string;
  canFollowAction: boolean;
  followLoading: boolean;
  onFollow: () => void | Promise<void>;
  onMessage: () => void;
}

export const CoachDetailHero = memo(function CoachDetailHero({
  coach,
  isOwnProfile,
  isFollowing,
  followLabel,
  canFollowAction,
  followLoading,
  onFollow,
  onMessage,
}: CoachDetailHeroProps) {
  const { colors: palette } = useTheme();
  const isMutedFollowButton = isFollowing || !canFollowAction;
  const followIcon: keyof typeof Ionicons.glyphMap =
    followLabel === 'Accept Request'
      ? 'checkmark-circle'
      : followLabel === 'Request Sent'
        ? 'time-outline'
        : isFollowing
          ? 'checkmark-done'
          : 'add';
  const followTextColor = isMutedFollowButton ? palette.text : palette.onPrimary;

  return (
    <>
      {/* Cover + Avatar */}
      <View style={styles.coverContainer}>
        {coach.coverPhotoUrl ? (
          <SafeImage source={{ uri: coach.coverPhotoUrl }} fallbackIcon="image-outline" fallbackIconSize={48} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: palette.tint }]} />
        )}
        <Clickable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: withAlpha(palette.text, 0.4) }]}
        >
          <Ionicons name="arrow-back" size={24} color={palette.onPrimary} />
        </Clickable>
        <View style={styles.avatarContainer}>
          {coach.profilePhotoUrl ? (
            <SafeImage
              source={{ uri: coach.profilePhotoUrl }}
              fallbackIcon="person-circle-outline"
              fallbackIconSize={40}
              style={[styles.avatar, { borderColor: palette.onPrimary }]}
            />
          ) : (
            <View
              style={[
                styles.avatarPlaceholder,
                { backgroundColor: palette.tint, borderColor: palette.onPrimary },
              ]}
            >
              <ThemedText style={[styles.avatarText, { color: palette.onPrimary }]}>
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
        <ThemedText type="title" style={styles.name}>
          {coach.name}
        </ThemedText>
        {coach.location && (
          <Row style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color={palette.muted} />
            <ThemedText style={{ color: palette.muted }}>
              {coach.location.city}
              {coach.location.state ? `, ${coach.location.state}` : ''}
            </ThemedText>
          </Row>
        )}
        {coach.badges && coach.badges.length > 0 && (
          <Row style={styles.badgesRow}>
            {coach.badges.slice(0, 3).map((badge, index) => (
              <Row
                key={index}
                style={[styles.badge, { backgroundColor: withAlpha(palette.success, 0.09) }]}
              >
                <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                <ThemedText style={{ color: palette.success, ...Typography.caption }}>
                  {badge}
                </ThemedText>
              </Row>
            ))}
          </Row>
        )}
        <Row style={styles.statsRow}>
          <View style={styles.statBlock}>
            <ThemedText type="defaultSemiBold">{coach.rating.toFixed(1)}</ThemedText>
            <Row style={styles.starsRow}>{renderStars(coach.rating, palette.warning)}</Row>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statBlock}>
            <ThemedText type="defaultSemiBold">{coach.reviewCount}</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Reviews</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
          <View style={styles.statBlock}>
            <ThemedText type="defaultSemiBold">{coach.totalSessions}</ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
              Sessions
            </ThemedText>
          </View>
        </Row>
        {!isOwnProfile && (
          <Row style={styles.actionButtons}>
            <Clickable
              onPress={onFollow}
              disabled={!canFollowAction || followLoading}
              style={[
                styles.followButton,
                {
                  backgroundColor: isMutedFollowButton ? palette.surface : palette.tint,
                  borderColor: isMutedFollowButton ? palette.border : palette.tint,
                },
              ]}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color={followTextColor} />
              ) : (
                <Ionicons
                  name={followIcon}
                  size={18}
                  color={followTextColor}
                />
              )}
              <ThemedText
                style={{ color: followTextColor, fontWeight: '600' }}
              >
                {followLabel}
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={onMessage}
              style={[styles.messageButton, { borderColor: palette.border }]}
            >
              <Ionicons name="chatbubble-outline" size={18} color={palette.text} />
            </Clickable>
          </Row>
        )}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  coverContainer: { height: COVER_HEIGHT + 50, position: 'relative' },
  coverImage: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
  coverPlaceholder: { width: SCREEN_WIDTH, height: COVER_HEIGHT, opacity: 0.8 },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: { position: 'absolute', bottom: 0, left: Spacing.lg },
  avatar: { width: 100, height: 100, borderRadius: Radii.pill, borderWidth: 4 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  profileInfo: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  name: { ...Typography.display },
  locationRow: { alignItems: 'center', gap: Spacing.xxs },
  badgesRow: { flexWrap: 'wrap', gap: Spacing.xs },
  badge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statsRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  statBlock: { alignItems: 'center', gap: Spacing.micro },
  statDivider: { width: 1, height: 30 },
  starsRow: { gap: Spacing.micro },
  actionButtons: { gap: Spacing.sm, marginTop: Spacing.sm },
  followButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
