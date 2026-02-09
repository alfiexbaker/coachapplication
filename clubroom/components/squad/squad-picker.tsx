/**
 * Squad Picker Component
 *
 * Reusable component for selecting one or more squads.
 * Shows squad name, member count, age group, and allows multi-select.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { ClubSquad } from '@/constants/types';
import { squadService } from '@/services/squad-service';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('SquadPicker');

interface SquadPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (squads: ClubSquad[]) => void;
  clubId: string;
  multiSelect?: boolean;
  selectedSquadIds?: string[];
  title?: string;
  excludeStaffSquad?: boolean;
}

export function SquadPicker({
  visible,
  onClose,
  onSelect,
  clubId,
  multiSelect = false,
  selectedSquadIds = [],
  title = 'Select Squad',
  excludeStaffSquad = true,
}: SquadPickerProps) {
  const { colors: palette } = useTheme();

  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedSquadIds);
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
      setError('Failed to load squads. Tap to retry.');
    } finally {
      setLoading(false);
    }
  }, [clubId, excludeStaffSquad]);

  useEffect(() => {
    loadSquads();
  }, [loadSquads]);

  useEffect(() => {
    setSelectedIds(selectedSquadIds);
  }, [selectedSquadIds, visible]);

  const toggleSquad = (squadId: string) => {
    if (multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(squadId)
          ? prev.filter((id) => id !== squadId)
          : [...prev, squadId]
      );
    } else {
      setSelectedIds([squadId]);
    }
  };

  const selectAll = () => {
    setSelectedIds(squads.map((s) => s.id));
  };

  const selectNone = () => {
    setSelectedIds([]);
  };

  const handleConfirm = () => {
    const selectedSquads = squads.filter((s) => selectedIds.includes(s.id));
    onSelect(selectedSquads);
    onClose();
  };

  const handleClose = () => {
    setSelectedIds(selectedSquadIds);
    onClose();
  };

  const totalMembers = useMemo(() => {
    return squads
      .filter((s) => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + s.memberCount, 0);
  }, [squads, selectedIds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Clickable
            onPress={handleConfirm}
            disabled={selectedIds.length === 0}
          >
            <ThemedText
              style={{
                color: selectedIds.length > 0 ? palette.tint : palette.muted,
                fontWeight: '600',
              }}
            >
              Done
            </ThemedText>
          </Clickable>
        </View>

        {/* Quick Actions */}
        {multiSelect && squads.length > 1 && (
          <View style={styles.quickActions}>
            <Clickable
              onPress={selectAll}
              style={[
                styles.quickActionButton,
                { backgroundColor: withAlpha(palette.tint, 0.06) },
              ]}
            >
              <Ionicons name="checkmark-done" size={14} color={palette.tint} />
              <ThemedText
                style={ { color: palette.tint, ...Typography.caption }}
              >
                Select All
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={selectNone}
              style={[
                styles.quickActionButton,
                { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
              ]}
            >
              <ThemedText style={{ ...Typography.caption, color: palette.text }}>
                Clear
              </ThemedText>
            </Clickable>
          </View>
        )}

        {/* Selected Summary */}
        {selectedIds.length > 0 && (
          <View
            style={[styles.selectedBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          >
            <Ionicons name="people" size={18} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '600', flex: 1 }}>
              {selectedIds.length} squad{selectedIds.length !== 1 ? 's' : ''} selected
              {totalMembers > 0 && ` (${totalMembers} athletes)`}
            </ThemedText>
          </View>
        )}

        {/* Squad List */}
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={{ color: palette.muted }}>
                Loading squads...
              </ThemedText>
            </View>
          ) : error ? (
            <Clickable onPress={loadSquads} style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={palette.error} />
              <ThemedText style={{ color: palette.error, textAlign: 'center' }}>
                {error}
              </ThemedText>
            </Clickable>
          ) : squads.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
                No squads found
              </ThemedText>
            </View>
          ) : (
            squads.map((squad) => {
              const isSelected = selectedIds.includes(squad.id);
              const ageGroup = squadService.getAgeGroupLabel(squad);

              return (
                <Clickable
                  key={squad.id}
                  onPress={() => toggleSquad(squad.id)}
                  style={[
                    styles.squadItem,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.tint, 0.06)
                        : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.squadIcon,
                      { backgroundColor: withAlpha(palette.tint, 0.09) },
                    ]}
                  >
                    <Ionicons name="people" size={24} color={palette.tint} />
                  </View>

                  <View style={styles.squadInfo}>
                    <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                    <View style={styles.squadMeta}>
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: withAlpha(palette.tint, 0.06) },
                        ]}
                      >
                        <ThemedText
                          style={{ ...Typography.caption, color: palette.tint }}
                        >
                          {ageGroup}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                        {squad.memberCount} athlete{squad.memberCount !== 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                    {squad.primaryCoach && (
                      <ThemedText
                        style={{ ...Typography.caption, color: palette.muted }}
                      >
                        Coach: {squad.primaryCoach}
                      </ThemedText>
                    )}
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected ? palette.tint : 'transparent',
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
                    )}
                  </View>
                </Clickable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// Inline squad selector (non-modal) for embedding in forms
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
      <View style={styles.inlineLoading}>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          Loading squads...
        </ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <Clickable onPress={loadSquads} style={styles.inlineError}>
        <Ionicons name="alert-circle" size={16} color={palette.error} />
        <ThemedText style={{ ...Typography.small, color: palette.error }}>
          {error}. Tap to retry.
        </ThemedText>
      </Clickable>
    );
  }

  return (
    <View style={styles.inlineContainer}>
      {label && (
        <ThemedText style={styles.inlineLabel}>{label}</ThemedText>
      )}
      <View style={styles.inlineChips}>
        {squads.map((squad) => {
          const isSelected = selectedSquadIds.includes(squad.id);
          return (
            <Clickable
              key={squad.id}
              onPress={() => toggleSquad(squad.id)}
              style={[
                styles.inlineChip,
                {
                  backgroundColor: isSelected ? palette.tint : palette.surface,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
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
                style={{ ...Typography.caption, color: isSelected ? 'rgba(255,255,255,0.8)' : palette.muted }}
              >
                ({squad.memberCount})
              </ThemedText>
            </Clickable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingContainer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
  },
  errorContainer: {
    paddingVertical: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  squadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  squadIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  squadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaChip: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inline selector styles
  inlineContainer: {
    gap: Spacing.xs,
  },
  inlineLabel: { ...Typography.bodySmallSemiBold },
  inlineChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  inlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  inlineLoading: {
    paddingVertical: Spacing.md,
  },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
});
