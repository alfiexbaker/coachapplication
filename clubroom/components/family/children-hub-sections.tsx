/**
 * ChildrenHubSections — Quick access hub sections (Progress, Badges, Goals).
 *
 * Each section is a navigable SurfaceCard with icon, title, subtitle,
 * stat chip, and optional unseen count badge.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ─────────────────────────────────────────────────────────────────────

type HubSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  stat?: string | number;
  color?: string;
  unseenCount?: number;
};

interface ChildrenHubSectionsProps {
  totalSessions: number;
  totalBadges: number;
  totalUnseenBadges: number;
  progressRoute: string;
}

// ─── Section Card (memo for map) ───────────────────────────────────────────────

const HubSectionCard = memo(function HubSectionCard({
  section,
  index,
}: {
  section: HubSection;
  index: number;
}) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => {
    router.push(section.route as Href);
  }, [section.route]);

  const hasUnseen = !!section.unseenCount && section.unseenCount > 0;

  return (
    <Animated.View entering={FadeInDown.delay(200 + index * 50).springify()}>
      <Clickable
        onPress={handlePress}
        accessibilityLabel={`${section.title}: ${section.subtitle}`}
        accessibilityRole="button"
      >
        <SurfaceCard
          style={
            [
              styles.sectionCard,
              hasUnseen && { borderColor: section.color, borderWidth: 1 },
            ].filter(Boolean) as ViewStyle[]
          }
        >
          <Row align="center" gap="md">
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: withAlpha(section.color || palette.tint, 0.09) },
              ]}
            >
              <Ionicons name={section.icon} size={24} color={section.color || palette.tint} />
              {hasUnseen && (
                <View style={[styles.iconBadge, { backgroundColor: section.color }]}>
                  <ThemedText style={[styles.iconBadgeText, { color: palette.onPrimary }]}>
                    {section.unseenCount! > 9 ? '9+' : section.unseenCount}
                  </ThemedText>
                </View>
              )}
            </View>
            <Column gap="xxs" style={styles.contentFlex}>
              <Row align="center" justify="between">
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  {section.title}
                </ThemedText>
                {hasUnseen ? (
                  <View style={[styles.newChip, { backgroundColor: section.color }]}>
                    <ThemedText style={[styles.newChipText, { color: palette.onPrimary }]}>
                      {section.unseenCount} new
                    </ThemedText>
                  </View>
                ) : section.stat ? (
                  <Chip dense>{section.stat}</Chip>
                ) : null}
              </Row>
              <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                {section.subtitle}
              </ThemedText>
            </Column>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Row>
        </SurfaceCard>
      </Clickable>
    </Animated.View>
  );
});

// ─── Main Component ────────────────────────────────────────────────────────────

export const ChildrenHubSections = memo(function ChildrenHubSections({
  totalSessions,
  totalBadges,
  totalUnseenBadges,
  progressRoute,
}: ChildrenHubSectionsProps) {
  const { colors: palette } = useTheme();

  const hubSections: HubSection[] = [
    {
      id: 'progress',
      title: 'Progress',
      subtitle: 'View skill ratings and feedback',
      icon: 'trending-up-outline',
      route: progressRoute,
      stat: `${totalSessions} sessions`,
      color: palette.tint,
    },
    {
      id: 'badges',
      title: 'Badges',
      subtitle: 'Achievements and milestones',
      icon: 'ribbon-outline',
      route: '/badges',
      stat: `${totalBadges} earned`,
      color: palette.warning,
      unseenCount: totalUnseenBadges,
    },
    {
      id: 'goals',
      title: 'Goals',
      subtitle: 'Current objectives and targets',
      icon: 'flag-outline',
      route: '/bookings/objectives',
      stat: 'Active',
      color: palette.success,
    },
  ];

  return (
    <Column gap="xs">
      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
        Quick Access
      </ThemedText>
      {hubSections.map((section, index) => (
        <HubSectionCard key={section.id} section={section} index={index} />
      ))}
    </Column>
  );
});

const styles = StyleSheet.create({
  sectionLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  sectionCard: {
    padding: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  iconBadgeText: {
    ...Typography.micro,
  },
  contentFlex: {
    flex: 1,
  },
  sectionTitle: {
    ...Typography.subheading,
  },
  sectionSubtitle: {
    ...Typography.small,
  },
  newChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.rounded,
  },
  newChipText: {
    ...Typography.caption,
  },
});
