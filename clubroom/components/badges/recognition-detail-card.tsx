/**
 * RecognitionDetailCard — Full recognition card shown when parent taps a badge.
 * The "screenshot moment" — designed to be shared on WhatsApp.
 */
import { memo, useCallback } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { CategoryInfo } from '@/constants/progression';
import { formatShortDateWithYear } from '@/utils/format';
import type { BadgeAward, BadgeCategory } from '@/constants/types';

const CATEGORY_ICONS: Record<BadgeCategory, string> = {
  technical: 'football-outline',
  physical: 'fitness-outline',
  psychological: 'bulb-outline',
  social: 'people-outline',
};

interface RecognitionDetailCardProps {
  visible: boolean;
  award: BadgeAward | null;
  coachName?: string;
  athleteName?: string;
  onClose: () => void;
  onShare?: (award: BadgeAward) => void;
}

function RecognitionDetailCardInner({
  visible,
  award,
  coachName,
  athleteName,
  onClose,
  onShare,
}: RecognitionDetailCardProps) {
  const { colors: palette } = useTheme();
  const insets = useSafeAreaInsets();

  const handleShare = useCallback(() => {
    if (award && onShare) {
      onShare(award);
    }
  }, [award, onShare]);

  if (!award) return null;

  const category = award.badgeCategory as BadgeCategory | undefined;
  const categoryLabel = category ? CategoryInfo[category]?.label : 'Development';
  const categoryIcon = category ? CATEGORY_ICONS[category] : 'ribbon-outline';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay }]}>
        <Animated.View
          entering={FadeInDown.duration(300).springify()}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}
        >
          {/* Close button */}
          <Clickable
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: withAlpha(palette.text, 0.5) }]}
            accessibilityLabel="Close recognition detail"
          >
            <Ionicons name="close" size={20} color={palette.onPrimary} />
          </Clickable>

          {/* Card */}
          <SurfaceCard style={[styles.card, { backgroundColor: palette.background }]}>
            {/* Category banner */}
            <Animated.View
              entering={FadeIn.delay(100)}
              style={[styles.categoryBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
            >
              <Row align="center" gap="xs" justify="center">
                <Ionicons name={categoryIcon as any} size={20} color={palette.tint} />
                <ThemedText style={[Typography.caption, { color: palette.tint, letterSpacing: 1 }]}>
                  {categoryLabel.toUpperCase()} RECOGNITION
                </ThemedText>
              </Row>
            </Animated.View>

            {/* Badge label */}
            <Column align="center" gap="xs" style={styles.headerSection}>
              <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
                <Ionicons name="ribbon" size={32} color={palette.tint} />
              </View>
              <ThemedText type="title" style={[Typography.title, { textAlign: 'center' }]}>
                {award.badgeLabel}
              </ThemedText>
            </Column>

            {/* Athlete name */}
            {athleteName ? (
              <Column align="center" gap="micro">
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  Awarded to
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={Typography.heading}>
                  {athleteName}
                </ThemedText>
              </Column>
            ) : null}

            {/* Reason / message */}
            <View style={[styles.reasonBox, { backgroundColor: withAlpha(palette.text, 0.03) }]}>
              <ThemedText style={[Typography.body, { textAlign: 'center', fontStyle: 'italic' }]}>
                &ldquo;{award.reason}&rdquo;
              </ThemedText>
            </View>

            {/* Coach attribution + note */}
            {award.note ? (
              <ThemedText style={[Typography.bodySmall, { color: palette.muted, textAlign: 'center' }]}>
                {award.note}
              </ThemedText>
            ) : null}

            {/* Coach + date */}
            <Row align="center" justify="center" gap="sm" style={styles.metaRow}>
              {coachName ? (
                <Row align="center" gap="xxs">
                  <Ionicons name="person-outline" size={14} color={palette.muted} />
                  <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                    Coach {coachName}
                  </ThemedText>
                </Row>
              ) : null}
              <Row align="center" gap="xxs">
                <Ionicons name="calendar-outline" size={14} color={palette.muted} />
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  {formatShortDateWithYear(award.awardedAt)}
                </ThemedText>
              </Row>
            </Row>

            {/* Branding */}
            <Row align="center" justify="center" gap="xxs" style={styles.branding}>
              <Ionicons name="shield-checkmark" size={12} color={palette.muted} />
              <ThemedText style={[Typography.micro, { color: palette.muted }]}>
                CLUBROOM
              </ThemedText>
            </Row>
          </SurfaceCard>

          {/* Share button */}
          {onShare ? (
            <Animated.View entering={FadeIn.delay(200)} style={styles.shareRow}>
              <Button onPress={handleShare} style={styles.shareButton}>
                Share Recognition
              </Button>
            </Animated.View>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

export const RecognitionDetailCard = memo(RecognitionDetailCardInner);

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  sheet: { width: '100%', maxWidth: 380, alignItems: 'center' },
  closeButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  card: {
    width: '100%',
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: Radii.xl,
    alignItems: 'stretch',
  },
  categoryBanner: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    alignSelf: 'center',
  },
  headerSection: {
    paddingTop: Spacing.xs,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonBox: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  metaRow: {
    paddingTop: Spacing.xs,
  },
  branding: {
    paddingTop: Spacing.xs,
  },
  shareRow: {
    marginTop: Spacing.md,
    width: '100%',
  },
  shareButton: {
    width: '100%',
  },
});
