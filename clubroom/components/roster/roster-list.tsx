/**
 * RosterList — Scrollable list of roster athletes with selection support.
 *
 * Renders AthleteRow cards with optional selection checkboxes.
 * Uses GestureHandlerRootView for swipe-to-remove support.
 * Each row is wrapped in Reanimated FadeInDown for staggered entry.
 */

import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { AthleteRow } from '@/components/roster/athlete-row';
import { Spacing, Radii, Components } from '@/constants/theme';
import type { RosterEntry } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { getRosterAthleteName } from '@/utils/roster-display';

interface RosterListProps {
  roster: RosterEntry[];
  selectionMode: boolean;
  selectedAthletes: Set<string>;
  onAthletePress: (entry: RosterEntry) => void;
  onToggleSelection: (athleteId: string) => void;
  onRemove: (entry: RosterEntry) => void;
  onLongPress: (entry: RosterEntry) => void;
}

const RosterListItem = memo(function RosterListItem({
  entry,
  index,
  selectionMode,
  isSelected,
  onPress,
  onToggleSelection,
  onRemove,
  onLongPress,
}: {
  entry: RosterEntry;
  index: number;
  selectionMode: boolean;
  isSelected: boolean;
  onPress: () => void;
  onToggleSelection: () => void;
  onRemove: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const athleteName = getRosterAthleteName(entry);

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <Row align="center">
        {selectionMode && (
          <Clickable
            onPress={onToggleSelection}
            style={styles.checkboxContainer}
            accessibilityLabel={`${isSelected ? 'Deselect' : 'Select'} ${athleteName}`}
            accessibilityRole="checkbox"
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isSelected ? colors.tint : 'transparent',
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={colors.onPrimary} />
              )}
            </View>
          </Clickable>
        )}
        <View style={styles.rowContent}>
          <AthleteRow
            entry={entry}
            onPress={selectionMode ? onToggleSelection : onPress}
            onRemove={onRemove}
            onLongPress={selectionMode ? undefined : onLongPress}
            swipeEnabled={!selectionMode}
          />
        </View>
      </Row>
    </Animated.View>
  );
});

export const RosterList = memo(function RosterList({
  roster,
  selectionMode,
  selectedAthletes,
  onAthletePress,
  onToggleSelection,
  onRemove,
  onLongPress,
}: RosterListProps) {
  const handlePress = useCallback(
    (entry: RosterEntry) => () => onAthletePress(entry),
    [onAthletePress],
  );

  const handleToggle = useCallback(
    (athleteId: string) => () => onToggleSelection(athleteId),
    [onToggleSelection],
  );

  const handleRemove = useCallback(
    (entry: RosterEntry) => () => onRemove(entry),
    [onRemove],
  );

  const handleLongPress = useCallback(
    (entry: RosterEntry) => () => onLongPress(entry),
    [onLongPress],
  );

  return (
    <GestureHandlerRootView style={styles.list}>
      {roster.map((entry, index) => (
        <RosterListItem
          key={entry.id}
          entry={entry}
          index={index}
          selectionMode={selectionMode}
          isSelected={selectedAthletes.has(entry.athleteId)}
          onPress={handlePress(entry)}
          onToggleSelection={handleToggle(entry.athleteId)}
          onRemove={handleRemove(entry)}
          onLongPress={handleLongPress(entry)}
        />
      ))}
    </GestureHandlerRootView>
  );
});

const styles = StyleSheet.create({
  list: {
    gap: Spacing.sm,
  },
  checkboxContainer: {
    paddingRight: Spacing.sm,
    paddingVertical: Spacing.sm,
    minHeight: Components.button.height,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
  },
});
