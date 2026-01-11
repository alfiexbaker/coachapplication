/**
 * Squad Picker Component
 *
 * Reusable component for selecting one or more squads.
 * Shows squad name, member count, age group, and allows multi-select.
 */

import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ClubSquad } from '@/constants/types';
import { squadService } from '@/services/squad-service';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(selectedSquadIds);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSquads();
  }, [clubId]);

  useEffect(() => {
    setSelectedIds(selectedSquadIds);
  }, [selectedSquadIds, visible]);

  const loadSquads = async () => {
    setLoading(true);
    try {
      let data = await squadService.getSquads(clubId);
      if (excludeStaffSquad) {
        data = data.filter((s) => !s.name.toLowerCase().includes('staff'));
      }
      setSquads(data);
    } catch (error) {
      console.error('Failed to load squads:', error);
    } finally {
      setLoading(false);
    }
  };

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
                { backgroundColor: `${palette.tint}10` },
              ]}
            >
              <Ionicons name="checkmark-done" size={14} color={palette.tint} />
              <ThemedText
                style={{ color: palette.tint, fontSize: 12, fontWeight: '600' }}
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
              <ThemedText style={{ color: palette.text, fontSize: 12 }}>
                Clear
              </ThemedText>
            </Clickable>
          </View>
        )}

        {/* Selected Summary */}
        {selectedIds.length > 0 && (
          <View
            style={[styles.selectedBanner, { backgroundColor: `${palette.tint}10` }]}
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
                        ? `${palette.tint}10`
                        : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.squadIcon,
                      { backgroundColor: `${palette.tint}15` },
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
                          { backgroundColor: `${palette.tint}10` },
                        ]}
                      >
                        <ThemedText
                          style={{ fontSize: 11, color: palette.tint }}
                        >
                          {ageGroup}
                        </ThemedText>
                      </View>
                      <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                        {squad.memberCount} athlete{squad.memberCount !== 1 ? 's' : ''}
                      </ThemedText>
                    </View>
                    {squad.primaryCoach && (
                      <ThemedText
                        style={{ color: palette.muted, fontSize: 11 }}
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
                      <Ionicons name="checkmark" size={14} color="#fff" />
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSquads();
  }, [clubId]);

  const loadSquads = async () => {
    setLoading(true);
    try {
      let data = await squadService.getSquads(clubId);
      if (excludeStaffSquad) {
        data = data.filter((s) => !s.name.toLowerCase().includes('staff'));
      }
      setSquads(data);
    } catch (error) {
      console.error('Failed to load squads:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
          Loading squads...
        </ThemedText>
      </View>
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
                color={isSelected ? '#fff' : palette.muted}
              />
              <ThemedText
                style={{
                  fontSize: 13,
                  color: isSelected ? '#fff' : palette.text,
                }}
              >
                {squad.name}
              </ThemedText>
              <ThemedText
                style={{
                  fontSize: 11,
                  color: isSelected ? 'rgba(255,255,255,0.8)' : palette.muted,
                }}
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
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squadInfo: {
    flex: 1,
    gap: 2,
  },
  squadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inline selector styles
  inlineContainer: {
    gap: Spacing.xs,
  },
  inlineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
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
});
