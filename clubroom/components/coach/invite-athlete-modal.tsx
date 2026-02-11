/**
 * InviteAthleteModal — Composition root.
 * Multi-select athlete picker with search, filters, and quick select actions.
 */
import { useCallback } from 'react';
import { View, StyleSheet, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInviteAthletes } from '@/hooks/use-invite-athletes';
import type { Athlete, Squad } from '@/hooks/use-invite-athletes';

import { FilterPanel, QuickSelect } from './invite-athlete-filters';
import { AthleteList } from './invite-athlete-list';
import { Row } from '@/components/primitives';

// Re-export types for backward compatibility
export type { Athlete, Squad } from '@/hooks/use-invite-athletes';

interface InviteAthleteModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (athletes: Athlete[]) => void;
  athletes: Athlete[];
  squads?: Squad[];
  multiSelect?: boolean;
  title?: string;
}

export function InviteAthleteModal({
  visible,
  onClose,
  onSelect,
  athletes,
  squads = [],
  multiSelect = true,
  title = 'Select Athletes',
}: InviteAthleteModalProps) {
  const { colors: palette } = useTheme();
  const state = useInviteAthletes(athletes, squads);

  const handleConfirm = useCallback(() => {
    onSelect(state.selectedAthletes);
    state.resetAll();
    onClose();
  }, [onSelect, state, onClose]);

  const handleClose = useCallback(() => {
    state.resetAll();
    onClose();
  }, [state, onClose]);

  const handleToggle = useCallback(
    (athlete: Athlete) => {
      state.toggleAthlete(athlete, multiSelect);
    },
    [state, multiSelect],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <Row style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose}>
            <ThemedText style={{ color: palette.muted }}>Cancel</ThemedText>
          </Clickable>
          <ThemedText type="subtitle">{title}</ThemedText>
          <Clickable onPress={handleConfirm} disabled={state.selectedAthletes.length === 0}>
            <ThemedText
              style={{
                color: state.selectedAthletes.length > 0 ? palette.tint : palette.muted,
                fontWeight: '600',
              }}
            >
              Done
            </ThemedText>
          </Clickable>
        </Row>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Row
            style={[
              styles.searchBar,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              style={[styles.searchInput, { color: palette.text }]}
              placeholder="Search athletes or parents..."
              placeholderTextColor={palette.muted}
              value={state.searchQuery}
              onChangeText={state.setSearchQuery}
            />
            {state.searchQuery.length > 0 && (
              <Clickable accessibilityLabel="Clear search" onPress={() => state.setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </Clickable>
            )}
            <Clickable onPress={() => state.setShowFilters(!state.showFilters)}>
              <Ionicons
                name={state.showFilters ? 'options' : 'options-outline'}
                size={20}
                color={state.hasActiveFilters ? palette.tint : palette.muted}
              />
            </Clickable>
          </Row>
        </View>

        {/* Filters */}
        {state.showFilters && (
          <FilterPanel
            skillFilter={state.skillFilter}
            ageFilter={state.ageFilter}
            squadFilter={state.squadFilter}
            availableSquads={state.availableSquads}
            hasActiveFilters={state.hasActiveFilters}
            onSkillFilter={state.setSkillFilter}
            onAgeFilter={state.setAgeFilter}
            onSquadFilter={state.setSquadFilter}
            onReset={state.resetFilters}
          />
        )}

        {/* Quick Select */}
        {multiSelect && (
          <QuickSelect
            filteredCount={state.filteredAthletes.length}
            availableSquads={state.availableSquads}
            onSelectAll={state.selectAll}
            onSelectNone={state.selectNone}
            onSelectBySquad={state.selectBySquad}
            onSelectBySkill={state.selectBySkillLevel}
          />
        )}

        {/* Selected Banner */}
        {state.selectedAthletes.length > 0 && (
          <Row style={[styles.selectedBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              {state.selectedAthletes.length} athlete
              {state.selectedAthletes.length !== 1 ? 's' : ''} selected
            </ThemedText>
            <Clickable onPress={state.selectNone}>
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Clear</ThemedText>
            </Clickable>
          </Row>
        )}

        {/* List */}
        <AthleteList
          groupedByParent={state.groupedByParent}
          selectedAthletes={state.selectedAthletes}
          searchQuery={state.searchQuery}
          filteredCount={state.filteredAthletes.length}
          onToggle={handleToggle}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  searchContainer: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  searchBar: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: { ...Typography.body, flex: 1 },
  selectedBanner: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
});
