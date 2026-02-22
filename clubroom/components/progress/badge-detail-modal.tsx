import { memo, useCallback, useEffect, useRef } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AllBadgeWithProgress } from '@/services/badge-service';
import { shareBadgeCard } from '@/utils/badge-share';
import { HapticPatterns } from '@/utils/haptics';

interface BadgeDetailModalProps {
  badge: AllBadgeWithProgress | null;
  visible: boolean;
  athleteName?: string;
  onClose: () => void;
}

const RARITY_BY_TIER: Record<1 | 2 | 3, number> = {
  1: 12,
  2: 8,
  3: 3,
};

function categoryColor(category: AllBadgeWithProgress['category'], fallback: string): string {
  if (!category) {
    return fallback;
  }
  return CORNER_COLORS[category] ?? fallback;
}

function toTitleCase(value: string | undefined): string {
  if (!value) {
    return 'General';
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatBadgeDate(value: string | undefined): string {
  if (!value) {
    return 'Date unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable';
  }

  return parsed.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const BadgeDetailModal = memo(function BadgeDetailModal({
  badge,
  visible,
  athleteName,
  onClose,
}: BadgeDetailModalProps) {
  const { colors } = useTheme();
  const captureRef = useRef<View>(null);
  const panelOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(24);
  const heroScale = useSharedValue(0.92);

  useEffect(() => {
    if (!visible || !badge) {
      panelOpacity.value = 0;
      panelTranslateY.value = 24;
      heroScale.value = 0.92;
      return;
    }
    panelOpacity.value = withTiming(1, { duration: 220 });
    panelTranslateY.value = withTiming(0, { duration: 240 });
    heroScale.value = withTiming(1, { duration: 260 });
    void HapticPatterns.tap();
  }, [badge, heroScale, panelOpacity, panelTranslateY, visible]);

  const panelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslateY.value }],
  }));

  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heroScale.value }],
  }));

  const handleShare = useCallback(() => {
    if (!badge) {
      return;
    }
    void HapticPatterns.tap();

    void shareBadgeCard(captureRef, {
      dialogTitle: `Share ${badge.label} badge`,
    });
  }, [badge]);

  if (!badge) {
    return null;
  }

  const accent = categoryColor(badge.category, colors.tint);
  const progress = Math.max(0, Math.min(100, Math.round(badge.progress)));
  const rarity = badge.tier ? RARITY_BY_TIER[badge.tier] : 12;
  const categoryLabel = toTitleCase(badge.category);
  const tierLabel = badge.tier ? `Tier ${badge.tier}` : 'Tier -';
  const earnedDate = formatBadgeDate(badge.earnedAt);
  const athleteLabel = athleteName ?? 'Athlete';
  const subtitle = `${categoryLabel} · ${tierLabel}`;

  const panelBackground = withAlpha(accent, badge.isUnlocked ? 0.12 : 0.08);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Row
        flex
        align="center"
        justify="center"
        style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.55) }]}
      >
        <Animated.View style={[styles.captureWrap, panelStyle]}>
          <View ref={captureRef} collapsable={false} style={styles.captureInner}>
            <SurfaceCard style={styles.card}>
            <Column gap="sm">
              <Row align="center" justify="between">
                <ThemedText style={styles.headerTitle}>Badge Details</ThemedText>
                <Clickable
                  style={styles.closeButton}
                  onPress={onClose}
                  accessibilityLabel="Close badge details"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={18} color={colors.muted} />
                </Clickable>
              </Row>

              <Animated.View style={heroStyle}>
                <Column
                  gap="xxs"
                  align="center"
                  style={[
                    styles.heroWrap,
                    {
                      borderColor: withAlpha(accent, 0.32),
                      backgroundColor: panelBackground,
                    },
                  ]}
                >
                  <Row
                    align="center"
                    justify="center"
                    style={[styles.heroIconWrap, { backgroundColor: withAlpha(accent, 0.2) }]}
                  >
                    <Ionicons
                      name={badge.isUnlocked ? 'ribbon' : 'lock-closed'}
                      size={24}
                      color={badge.isUnlocked ? accent : colors.muted}
                    />
                  </Row>
                  <ThemedText style={styles.title}>{badge.label}</ThemedText>
                  <ThemedText style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</ThemedText>
                </Column>
              </Animated.View>

              <View style={[styles.divider, { backgroundColor: withAlpha(colors.border, 0.8) }]} />

              {badge.isUnlocked ? (
                <Column gap="xxs">
                  <ThemedText style={styles.body}>Awarded to {athleteLabel}</ThemedText>
                  <ThemedText style={[styles.body, { color: colors.muted }]}>
                    Awarded by {badge.awardedBy ?? 'Coach'}
                  </ThemedText>
                  <ThemedText style={[styles.body, { color: colors.muted }]}>{earnedDate}</ThemedText>
                  {badge.description ? (
                    <ThemedText style={[styles.body, { color: colors.muted }]}>
                      {badge.description}
                    </ThemedText>
                  ) : null}
                </Column>
              ) : (
                <Column gap="xxs">
                  <ThemedText style={styles.body}>How to earn</ThemedText>
                  <ThemedText style={[styles.body, { color: colors.muted }]}>
                    {badge.progressLabel}
                  </ThemedText>

                  <Column gap="micro">
                    <ThemedText style={[styles.metaLabel, { color: colors.muted }]}>
                      Progress {progress}%
                    </ThemedText>
                    <View style={[styles.progressTrack, { backgroundColor: withAlpha(colors.border, 0.35) }]}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${progress}%`, backgroundColor: accent },
                        ]}
                      />
                    </View>
                  </Column>
                </Column>
              )}

              <View style={[styles.divider, { backgroundColor: withAlpha(colors.border, 0.8) }]} />

              <Column gap="xxs">
                <ThemedText style={[styles.body, { color: colors.muted }]}>
                  Worth: {badge.pointValue} points
                </ThemedText>
                <ThemedText style={[styles.body, { color: colors.muted }]}>
                  Rarity: {rarity}% of athletes
                </ThemedText>
              </Column>

              {badge.isUnlocked ? (
                <Clickable
                  style={[styles.shareButton, { backgroundColor: withAlpha(accent, 0.14) }]}
                  onPress={handleShare}
                  accessibilityLabel="Share badge"
                  accessibilityRole="button"
                >
                  <Row align="center" justify="center" gap="xxs">
                    <Ionicons name="share-social-outline" size={16} color={accent} />
                    <ThemedText style={[styles.shareText, { color: accent }]}>Share Badge</ThemedText>
                  </Row>
                </Clickable>
              ) : null}
            </Column>
            </SurfaceCard>
          </View>
        </Animated.View>
      </Row>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    paddingHorizontal: Spacing.lg,
  },
  captureWrap: {
    width: '100%',
    maxWidth: 440,
  },
  captureInner: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    width: '100%',
    maxWidth: 440,
  },
  headerTitle: {
    ...Typography.bodySemiBold,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroWrap: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: Radii.pill,
  },
  title: {
    ...Typography.subheading,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.caption,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  body: {
    ...Typography.bodySmall,
  },
  metaLabel: {
    ...Typography.caption,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  shareButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  shareText: {
    ...Typography.bodySmallSemiBold,
  },
});
