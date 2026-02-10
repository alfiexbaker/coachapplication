import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { ClubSquad } from '@/constants/types';
import { squadService } from '@/services/squad-service';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('InlineSquadSelector');

interface InlineSquadSelectorProps {
  clubId: string;
  selectedSquadIds: string[];
  onSelectionChange: (squadIds: string[]) => void;
  multiSelect?: boolean;
  excludeStaffSquad?: boolean;
  label?: string;
}

export function InlineSquadSelector({
  clubId,
  selectedSquadIds,
  onSelectionChange,
  multiSelect = false,
  excludeStaffSquad = true,
  label = 'Select Squad',
}: InlineSquadSelectorProps) {
  const { colors: palette } = useTheme();

  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSquads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await squadService.getSquads(clubId);
      if (excludeStaffSquad) {
        data = data.filter((s) => !s.name.toLowerCase().includes('staff'));
      }
      setSquads(data);
    } catch (err) {
      logger.error('Failed to load squads', err);
      setError('Failed to load squads');
    } finally {
      setLoading(false);
    }
  }, [clubId, excludeStaffSquad]);

  useEffect(() => {
    loadSquads();
  }, [loadSquads]);

  const toggleSquad = (squadId: string) => {
    if (multiSelect) {
      const newSelection = selectedSquadIds.includes(squadId)
        ? selectedSquadIds.filter((id) => id !== squadId)
        : [...selectedSquadIds, squadId];
      onSelectionChange(newSelection);
    } else {
      onSelectionChange([squadId]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          Loading squads...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <Clickable onPress={loadSquads} style={styles.error}>
        <Row align="center" gap="xs">
          <Ionicons name="alert-circle" size={16} color={palette.error} />
          <ThemedText style={{ ...Typography.small, color: palette.error }}>
            {error}. Tap to retry.
          </ThemedText>
        </Row>
      </Clickable>
    );
  }

  return (
    <View style={styles.container}>
      {label && (
        <ThemedText style={styles.label}>{label}</ThemedText>
      )}
      <Row wrap gap="xs">
        {squads.map((squad) => {
          const isSelected = selectedSquadIds.includes(squad.id);
          return (
            <Clickable
              key={squad.id}
              onPress={() => toggleSquad(squad.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons
                  name="people"
                  size={14}
                  color={isSelected ? palette.onPrimary : palette.muted}
                />
                <ThemedText
                  style={{ ...Typography.small, color: isSelected ? palette.onPrimary : palette.text }}
                >
                  {squad.name}
                </ThemedText>
                <ThemedText
                  style={{ ...Typography.caption, color: isSelected ? withAlpha(palette.onPrimary, 0.8) : palette.muted }}
                >
                  ({squad.memberCount})
                </ThemedText>
              </Row>
            </Clickable>
          );
        })}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: { ...Typography.bodySmallSemiBold },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  loading: {
    paddingVertical: Spacing.md,
  },
  error: {
    paddingVertical: Spacing.md,
  },
});
