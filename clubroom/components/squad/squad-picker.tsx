/**
 * Squad Picker Component
 *
 * Modal component for selecting one or more squads.
 * Shows squad name, member count, age group, and allows multi-select.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { ClubSquad } from '@/constants/types';
import { squadService } from '@/services/squad-service';
import { useTheme } from '@/hooks/useTheme';

import { SquadPickerItem, QuickActionBar, SelectedBanner } from './squad-picker-sections';

// Re-export InlineSquadSelector for backward compat
export { InlineSquadSelector } from './inline-squad-selector';

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

  const toggleSquad = useCallback((squadId: string) => {
    if (multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(squadId)
          ? prev.filter((id) => id !== squadId)
          : [...prev, squadId]
      );
    } else {
      setSelectedIds([squadId]);
    }
  }, [multiSelect]);

  const handleConfirm = useCallback(() => {
    const selectedSquads = squads.filter((s) => selectedIds.includes(s.id));
    onSelect(selectedSquads);
    onClose();
  }, [squads, selectedIds, onSelect, onClose]);

  const handleClose = useCallback(() => {
    setSelectedIds(selectedSquadIds);
    onClose();
  }, [selectedSquadIds, onClose]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(squads.map((s) => s.id));
  }, [squads]);

  const handleClear = useCallback(() => {
    setSelectedIds([]);
  }, []);

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
          <Clickable onPress={handleConfirm} disabled={selectedIds.length === 0}>
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

        {multiSelect && squads.length > 1 && (
          <QuickActionBar onSelectAll={handleSelectAll} onClear={handleClear} />
        )}

        <SelectedBanner selectedCount={selectedIds.length} totalMembers={totalMembers} />

        {/* Squad List */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={{ color: palette.muted }}>Loading squads...</ThemedText>
            </View>
          ) : error ? (
            <Clickable onPress={loadSquads} style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={palette.error} />
              <ThemedText style={{ color: palette.error, textAlign: 'center' }}>{error}</ThemedText>
            </Clickable>
          ) : squads.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>No squads found</ThemedText>
            </View>
          ) : (
            squads.map((squad) => (
              <SquadPickerItem
                key={squad.id}
                squad={squad}
                isSelected={selectedIds.includes(squad.id)}
                onToggle={toggleSquad}
              />
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  loadingContainer: { paddingVertical: Spacing['2xl'], alignItems: 'center' },
  errorContainer: { paddingVertical: Spacing['2xl'], alignItems: 'center', gap: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
});
