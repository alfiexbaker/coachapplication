/**
 * SpecialNeedsObservations — Coach's own observation section on the SEN screen.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachObservation } from '@/services/coach-observation-service';

interface SpecialNeedsObservationsProps {
  observations: CoachObservation[];
  onAdd: () => void;
  onEdit: (observation: CoachObservation) => void;
  onDelete: (observationId: string) => void;
}

export const SpecialNeedsObservations = memo(function SpecialNeedsObservations({
  observations,
  onAdd,
  onEdit,
  onDelete,
}: SpecialNeedsObservationsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading">My Observations</ThemedText>
        <Clickable
          onPress={onAdd}
          accessibilityLabel="Add observation"
          hitSlop={8}
        >
          <Row gap="xs" align="center">
            <Ionicons name="add" size={18} color={colors.tint} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>Add</ThemedText>
          </Row>
        </Clickable>
      </Row>

      {observations.length === 0 ? (
        <SurfaceCard style={styles.emptyCard}>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            {`Add your first observation - what works in sessions, strategies you've tried, things to watch for.`}
          </ThemedText>
          <Clickable
            onPress={onAdd}
            accessibilityLabel="Add first observation"
            style={[styles.emptyCta, { backgroundColor: withAlpha(colors.tint, 0.09) }]}
          >
            <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
              Add Observation
            </ThemedText>
          </Clickable>
        </SurfaceCard>
      ) : (
        observations.map((obs) => (
          <ObservationCard
            key={obs.id}
            observation={obs}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}
    </View>
  );
});

const ObservationCard = memo(function ObservationCard({
  observation,
  onEdit,
  onDelete,
}: {
  observation: CoachObservation;
  onEdit: (obs: CoachObservation) => void;
  onDelete: (id: string) => void;
}) {
  const { colors } = useTheme();

  const handleEdit = useCallback(() => onEdit(observation), [observation, onEdit]);
  const handleDelete = useCallback(() => onDelete(observation.id), [observation.id, onDelete]);

  const dateLabel = new Date(observation.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" justify="space-between">
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
          {observation.category.charAt(0) + observation.category.slice(1).toLowerCase()}
        </ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
          {dateLabel}
        </ThemedText>
      </Row>

      <ThemedText style={Typography.small}>{observation.text}</ThemedText>

      <Row align="center" justify="space-between">
        {observation.isPrivate ? (
          <Row gap="xs" align="center">
            <Ionicons name="lock-closed" size={12} color={colors.muted} />
            <ThemedText style={[Typography.micro, { color: colors.muted, textTransform: 'none' }]}>
              Private
            </ThemedText>
          </Row>
        ) : (
          <View />
        )}
        <Row gap="sm" align="center">
          <Clickable
            onPress={handleEdit}
            accessibilityLabel="Edit observation"
            hitSlop={8}
          >
            <ThemedText style={[Typography.caption, { color: colors.tint }]}>Edit</ThemedText>
          </Clickable>
          <Clickable
            onPress={handleDelete}
            accessibilityLabel="Delete observation"
            hitSlop={8}
          >
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>Delete</ThemedText>
          </Clickable>
        </Row>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  emptyCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  emptyCta: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  card: { padding: Spacing.sm, gap: Spacing.xs },
});
