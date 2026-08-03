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
  loading?: boolean;
  error?: string | null;
  onAdd: () => void;
  onEdit: (observation: CoachObservation) => void;
  onDelete: (observationId: string) => void;
  onRetry?: () => void;
  currentUserId: string;
}

export const SpecialNeedsObservations = function SpecialNeedsObservations({
  observations,
  loading = false,
  error = null,
  onAdd,
  onEdit,
  onDelete,
  onRetry,
  currentUserId,
}: SpecialNeedsObservationsProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Row align="center" justify="space-between">
        <ThemedText type="heading">Coach observations</ThemedText>
        {!error && !loading && (
          <Clickable onPress={onAdd} accessibilityLabel="Add observation" hitSlop={8}>
            <Row gap="xs" align="center">
              <Ionicons name="add" size={18} color={colors.tint} />
              <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                Add
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </Row>

      {loading ? (
        <SurfaceCard style={styles.emptyCard}>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            Loading observations...
          </ThemedText>
        </SurfaceCard>
      ) : error ? (
        <SurfaceCard style={styles.errorCard}>
          <Row gap="xs" align="center">
            <Ionicons name="alert-circle" size={18} color={colors.error} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.error }]}>
              {error}
            </ThemedText>
          </Row>
          {onRetry && (
            <Clickable
              onPress={onRetry}
              accessibilityLabel="Retry loading observations"
              style={[styles.emptyCta, { backgroundColor: withAlpha(colors.error, 0.09) }]}
            >
              <ThemedText style={[Typography.smallSemiBold, { color: colors.error }]}>
                Retry
              </ThemedText>
            </Clickable>
          )}
        </SurfaceCard>
      ) : observations.length === 0 ? (
        <SurfaceCard style={styles.emptyCard}>
          <ThemedText style={[Typography.small, { color: colors.muted, textAlign: 'center' }]}>
            Record what helps in sessions and what to watch for.
          </ThemedText>
        </SurfaceCard>
      ) : (
        observations.map((obs) => (
          <ObservationCard
            key={obs.id}
            observation={obs}
            onEdit={onEdit}
            onDelete={onDelete}
            canManage={obs.coachId === currentUserId}
          />
        ))
      )}
    </View>
  );
};

const ObservationCard = function ObservationCard({
  observation,
  onEdit,
  onDelete,
  canManage,
}: {
  observation: CoachObservation;
  onEdit: (obs: CoachObservation) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  const { colors } = useTheme();

  const handleEdit = () => onEdit(observation);
  const handleDelete = () => onDelete(observation.id);

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
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>{dateLabel}</ThemedText>
      </Row>

      <ThemedText style={Typography.small}>{observation.text}</ThemedText>

      {canManage ? (
        <Row gap="sm" align="center">
          <Clickable onPress={handleEdit} accessibilityLabel="Edit observation" hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: colors.tint }]}>Edit</ThemedText>
          </Clickable>
          <Clickable onPress={handleDelete} accessibilityLabel="Remove observation" hitSlop={8}>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>Remove</ThemedText>
          </Clickable>
        </Row>
      ) : null}
    </SurfaceCard>
  );
};

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
  errorCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  card: { padding: Spacing.sm, gap: Spacing.xs },
});
