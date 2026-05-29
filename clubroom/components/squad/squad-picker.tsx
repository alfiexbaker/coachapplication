/**
 * Squad Picker Component
 *
 * Modal component for selecting one or more squads.
 * Shows squad name, member count, age group, and allows multi-select.
 */

import { useState, useEffect, startTransition } from 'react';
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { createLogger } from '@/utils/logger';
import type { ClubSquad } from '@/constants/types';
import { squadService } from '@/services/squad-service';
import { useTheme } from '@/hooks/useTheme';

import { SquadPickerItem, QuickActionBar, SelectedBanner } from './squad-picker-sections';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

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

const EMPTY_SELECTED_SQUAD_IDS: string[] = [];

export function SquadPicker({
  visible,
  onClose,
  onSelect,
  clubId,
  multiSelect = false,
  selectedSquadIds = EMPTY_SELECTED_SQUAD_IDS,
  title = 'Select Squad',
  excludeStaffSquad = true,
}: SquadPickerProps) {
  const { colors: palette } = useTheme();

  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => selectedSquadIds);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const retryLoadSquads = () => {
    void loadPickerSquads(clubId, excludeStaffSquad, setSquads, setLoading, setError);
  };

  useEffect(() => {
    startTransition(() => {
      void loadPickerSquads(clubId, excludeStaffSquad, setSquads, setLoading, setError);
    });
  }, [clubId, excludeStaffSquad]);

  useEffect(() => {
    startTransition(() => {
      setSelectedIds(selectedSquadIds);
    });
  }, [selectedSquadIds, visible]);

  const toggleSquad = (squadId: string) => {
    if (multiSelect) {
      setSelectedIds((prev) =>
        prev.includes(squadId) ? prev.filter((id) => id !== squadId) : [...prev, squadId],
      );
    } else {
      setSelectedIds([squadId]);
    }
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

  const handleSelectAll = () => {
    setSelectedIds(squads.map((s) => s.id));
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const totalMembers = (() => {
    return squads
      .filter((s) => selectedIds.includes(s.id))
      .reduce((sum, s) => sum + s.memberCount, 0);
  })();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <Row
          align="center"
          justify="between"
          style={[styles.header, { borderBottomColor: palette.border }]}
        >
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
        </Row>

        {multiSelect && squads.length > 1 && (
          <QuickActionBar onSelectAll={handleSelectAll} onClear={handleClear} />
        )}

        <SelectedBanner selectedCount={selectedIds.length} totalMembers={totalMembers} />

        {/* Squad List */}
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={{ color: palette.muted }}>Loading squads…</ThemedText>
            </View>
          ) : error ? (
            <Clickable onPress={retryLoadSquads} style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={palette.error} />
              <ThemedText style={{ color: palette.error, textAlign: 'center' }}>{error}</ThemedText>
            </Clickable>
          ) : squads.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
                No squads found
              </ThemedText>
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

async function loadPickerSquads(
  clubId: string,
  excludeStaffSquad: boolean,
  setSquads: (squads: ClubSquad[]) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
) {
  setLoading(true);
  setError(null);

  await runAsyncTryCatchFinally(
    async () => {
      let data = await squadService.getSquads(clubId);
      if (excludeStaffSquad) {
        data = data.filter((squad) => !squad.name.toLowerCase().includes('staff'));
      }
      setSquads(data);
    },
    async (err) => {
      logger.error('Failed to load squads', err);
      setError('Failed to load squads. Tap to retry.');
    },
    () => {
      setLoading(false);
    },
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: { padding: Spacing.lg, gap: Spacing.sm },
  loadingContainer: { paddingVertical: Spacing['2xl'], alignItems: 'center' },
  errorContainer: { paddingVertical: Spacing['2xl'], alignItems: 'center', gap: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Spacing['2xl'] },
});
