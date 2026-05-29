import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SwitcherChild } from './child-switcher';

interface ChildSwitcherListProps {
  options: SwitcherChild[];
  selectedId: string | undefined;
  activeChildId: string | null | undefined;
  pendingChildId: string | null;
  isSwitching: boolean;
  palette: ThemeColors;
  onSelect: (childId: string) => void;
}

export function ChildSwitcherList({
  options,
  selectedId,
  activeChildId,
  pendingChildId,
  isSwitching,
  palette,
  onSelect,
}: ChildSwitcherListProps) {
  const childItems = getChildSwitcherItems(
    options,
    selectedId,
    activeChildId,
    pendingChildId,
    isSwitching,
    palette,
    onSelect,
  );

  return (
    <FlatList
      horizontal
      data={childItems}
      keyExtractor={keyChildSwitcherItem}
      renderItem={renderChildSwitcherItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    />
  );
}

interface ChildSwitcherItem {
  key: string;
  child: SwitcherChild;
  isSelected: boolean;
  isActiveChild: boolean;
  isPending: boolean;
  isSwitching: boolean;
  accentColor: string;
  palette: ThemeColors;
  onPress: () => void;
}

function getChildSwitcherItems(
  options: SwitcherChild[],
  selectedId: string | undefined,
  activeChildId: string | null | undefined,
  pendingChildId: string | null,
  isSwitching: boolean,
  palette: ThemeColors,
  onSelect: (childId: string) => void,
): ChildSwitcherItem[] {
  return options.map((child) => ({
    key: child.id,
    child,
    isSelected: child.id === selectedId,
    isActiveChild: child.id === activeChildId,
    isPending: pendingChildId === child.id && isSwitching,
    isSwitching,
    accentColor: child.colorCode || palette.tint,
    palette,
    onPress: () => onSelect(child.id),
  }));
}

function keyChildSwitcherItem(item: ChildSwitcherItem) {
  return item.key;
}

function renderChildSwitcherItem({ item }: ListRenderItemInfo<ChildSwitcherItem>) {
  const { child, palette, accentColor, isSelected, isActiveChild, isPending, isSwitching } = item;

  return (
    <Clickable
      onPress={item.onPress}
      disabled={isSwitching}
      style={[
        styles.chip,
        {
          borderColor: isSelected ? withAlpha(accentColor, 0.35) : palette.border,
          backgroundColor: isSelected
            ? withAlpha(accentColor, 0.12)
            : withAlpha(palette.surface, 0.45),
        },
      ]}
      accessibilityRole="tab"
      accessibilityLabel={`View progress for ${child.name}`}
      accessibilityState={{ selected: isSelected, disabled: isSwitching }}
    >
      <Row align="center" gap="xs">
        <View
          style={[
            styles.dot,
            {
              backgroundColor: isSelected ? accentColor : withAlpha(accentColor, 0.55),
            },
          ]}
        />

        <ThemedText
          style={[
            styles.chipName,
            { color: isSelected ? palette.text : palette.muted },
            isSelected && styles.chipNameActive,
          ]}
          numberOfLines={1}
        >
          {child.name}
        </ThemedText>

        {isPending ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : isSelected ? (
          <Ionicons name="checkmark" size={12} color={accentColor} />
        ) : null}
        {isActiveChild && !isSelected && !isPending && (
          <View style={[styles.activeHint, { borderColor: withAlpha(accentColor, 0.5) }]} />
        )}
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.xs,
  },
  chip: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    minHeight: 34,
    borderWidth: 1,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
  },
  activeHint: {
    width: 7,
    height: 7,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  chipName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  chipNameActive: {
    fontWeight: '700',
  },
});
