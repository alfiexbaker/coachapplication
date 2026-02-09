/**
 * NeedsAttentionSection — Priority athletes section at the top of the athletes tab.
 *
 * Shows athletes with: no session in 14+ days, open concerns, missing session notes.
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RosterEntry } from '@/constants/types';

// ============================================================================
// TYPES
// ============================================================================

interface NeedsAttentionSectionProps {
  roster: RosterEntry[];
}

interface AttentionItem {
  athlete: RosterEntry;
  reason: string;
  icon: string;
  color: string;
}

// ============================================================================
// ATTENTION ITEM
// ============================================================================

const AttentionItemCard = React.memo(function AttentionItemCard({
  item,
}: {
  item: AttentionItem;
}) {
  const { colors } = useTheme();

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(Routes.rosterAthlete(item.athlete.athleteId));
  }, [item.athlete.athleteId]);

  return (
    <Clickable onPress={handlePress}>
      <Row gap="sm" align="center" style={styles.itemRow}>
        <View style={[styles.itemIcon, { backgroundColor: withAlpha(item.color, 0.09) }]}>
          <Ionicons name={item.icon as 'alert-circle'} size={16} color={item.color} />
        </View>
        <Column gap="micro" style={styles.flex1}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {item.athlete.athleteName}
          </ThemedText>
          <ThemedText style={[styles.reason, { color: colors.muted }]} numberOfLines={1}>
            {item.reason}
          </ThemedText>
        </Column>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Row>
    </Clickable>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function NeedsAttentionSectionInner({ roster }: NeedsAttentionSectionProps) {
  const { colors } = useTheme();

  const attentionItems = useMemo(() => {
    const items: AttentionItem[] = [];
    const now = Date.now();
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

    for (const athlete of roster) {
      if (athlete.status !== 'ACTIVE') continue;

      // No session in 14+ days
      if (!athlete.lastSessionDate) {
        items.push({
          athlete,
          reason: 'No sessions recorded',
          icon: 'alert-circle',
          color: colors.warning,
        });
      } else if (now - new Date(athlete.lastSessionDate).getTime() > twoWeeksMs) {
        const days = Math.floor(
          (now - new Date(athlete.lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        items.push({
          athlete,
          reason: `Last session ${days} days ago`,
          icon: 'time-outline',
          color: colors.warning,
        });
      }

      // No upcoming session
      if (!athlete.nextSessionDate && athlete.lastSessionDate) {
        const alreadyAdded = items.some((i) => i.athlete.athleteId === athlete.athleteId);
        if (!alreadyAdded) {
          items.push({
            athlete,
            reason: 'No upcoming session booked',
            icon: 'calendar-outline',
            color: colors.muted,
          });
        }
      }
    }

    return items.slice(0, 5); // Max 5 items
  }, [roster, colors]);

  if (attentionItems.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(50).springify()}>
      <SurfaceCard style={styles.card}>
        <Row gap="xs" align="center">
          <View style={[styles.headerIcon, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
            <Ionicons name="flag" size={16} color={colors.warning} />
          </View>
          <ThemedText type="defaultSemiBold">Needs Attention</ThemedText>
          <View style={[styles.countBadge, { backgroundColor: withAlpha(colors.warning, 0.12) }]}>
            <ThemedText style={[styles.countText, { color: colors.warning }]}>
              {attentionItems.length}
            </ThemedText>
          </View>
        </Row>

        <Column gap="xs">
          {attentionItems.map((item) => (
            <AttentionItemCard key={item.athlete.athleteId} item={item} />
          ))}
        </Column>
      </SurfaceCard>
    </Animated.View>
  );
}

export const NeedsAttentionSection = React.memo(NeedsAttentionSectionInner);

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  flex1: { flex: 1 },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginLeft: 'auto',
  },
  countText: {
    ...Typography.caption,
  },
  itemRow: {
    paddingVertical: Spacing.xs,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reason: {
    ...Typography.small,
  },
});
