/**
 * GroupPreviewStep — Preview step for group invite wizard.
 *
 * Shows a summary of invites grouped by parent, stats cards,
 * and a session details summary card.
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row, Column } from '@/components/primitives';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Athlete } from '@/components/coach/invite-athlete-modal';
import type { TimeSlot } from '@/constants/types';

// ─── Parent Preview Card (memo'd) ──────────────────────────────────────────

interface ParentPreviewCardProps {
  parentName: string;
  athletes: Athlete[];
  colors: ThemeColors;
}

const ParentPreviewCard = memo(function ParentPreviewCard({
  parentName,
  athletes,
  colors,
}: ParentPreviewCardProps) {
  return (
    <Column
      gap="xs"
      style={[styles.previewItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <Row align="center" gap="sm">
        <Ionicons name="mail-outline" size={16} color={colors.muted} />
        <ThemedText type="defaultSemiBold" style={styles.flex1}>
          {parentName}
        </ThemedText>
      </Row>
      <Column gap="xxs" style={styles.previewAthletes}>
        {athletes.map((athlete) => (
          <Row key={athlete.id} align="center" gap="xs">
            <View style={[styles.previewDot, { backgroundColor: colors.tint }]} />
            <ThemedText style={{ ...Typography.small }}>{athlete.name}</ThemedText>
            {athlete.age != null && (
              <ThemedText style={{ ...Typography.caption, color: colors.muted }}>
                (Age {athlete.age})
              </ThemedText>
            )}
          </Row>
        ))}
      </Column>
    </Column>
  );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export interface GroupPreviewStepProps {
  selectedAthletes: Athlete[];
  sessionType: string;
  focus: string;
  proposedSlots: TimeSlot[];
  price: string;
  colors: ThemeColors;
}

export const GroupPreviewStep = memo(function GroupPreviewStep({
  selectedAthletes,
  sessionType,
  focus,
  proposedSlots,
  price,
  colors,
}: GroupPreviewStepProps) {
  // Group athletes by parent
  const parentMap = useMemo(() => {
    const map = new Map<string, Athlete[]>();
    selectedAthletes.forEach((athlete) => {
      const existing = map.get(athlete.parentId) || [];
      map.set(athlete.parentId, [...existing, athlete]);
    });
    return map;
  }, [selectedAthletes]);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Column gap="md">
        <ThemedText type="subtitle" style={styles.stepTitle}>
          Preview Invites
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: colors.muted }]}>
          Review before sending. Each parent will receive one invite with their athlete(s).
        </ThemedText>

        {/* Stats */}
        <Row gap="md">
          <Column align="center" paddingV="md" style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <ThemedText type="title" style={{ color: colors.tint }}>
              {parentMap.size}
            </ThemedText>
            <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
              Invite{parentMap.size !== 1 ? 's' : ''}
            </ThemedText>
          </Column>
          <Column align="center" paddingV="md" style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <ThemedText type="title" style={{ color: colors.tint }}>
              {selectedAthletes.length}
            </ThemedText>
            <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
              Athlete{selectedAthletes.length !== 1 ? 's' : ''}
            </ThemedText>
          </Column>
        </Row>

        {/* Parent previews */}
        <Column gap="sm">
          {Array.from(parentMap.entries()).map(([parentId, athletes]) => (
            <ParentPreviewCard
              key={parentId}
              parentName={athletes[0].parentName}
              athletes={athletes}
              colors={colors}
            />
          ))}
        </Column>

        {/* Session summary */}
        <SurfaceCard style={styles.summaryCard}>
          <Row align="center" gap="md">
            <Ionicons name="football-outline" size={18} color={colors.muted} />
            <ThemedText>
              {sessionType} - {focus}
            </ThemedText>
          </Row>
          <Row align="center" gap="md">
            <Ionicons name="calendar-outline" size={18} color={colors.muted} />
            <ThemedText>{proposedSlots.length} time slot(s) proposed</ThemedText>
          </Row>
          {price ? (
            <Row align="center" gap="md">
              <Ionicons name="pricetag-outline" size={18} color={colors.muted} />
              <ThemedText>${price} per athlete</ThemedText>
            </Row>
          ) : null}
        </SurfaceCard>
      </Column>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepTitle: {
    ...Typography.title,
  },
  stepDescription: {
    ...Typography.bodySmall,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: Radii.md,
  },
  previewItem: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  flex1: {
    flex: 1,
  },
  previewAthletes: {
    paddingLeft: Spacing.lg,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  summaryCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
});
