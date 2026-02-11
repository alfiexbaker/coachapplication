/**
 * FilterChipGroup - Group of selectable filter chips.
 *
 * Supports single-select (radio) and multi-select (checkbox) modes.
 * Can be displayed horizontally (scroll) or wrapped (grid).
 */

import { ScrollView, StyleSheet } from 'react-native';

import { Row } from '@/components/primitives/row';
import { FilterChip } from './FilterChip';
import { Spacing } from '@/constants/theme';

export interface FilterOption<T = string> {
  /** Unique identifier */
  id: T;
  /** Display label */
  label: string;
  /** Optional icon (Ionicons name) */
  icon?: string;
}

export interface FilterChipGroupProps<T = string> {
  /** Available options */
  options: FilterOption<T>[] | string[];
  /** Currently selected value(s) */
  selected: T | T[];
  /** Selection change handler */
  onChange: (selected: T | T[]) => void;
  /** Allow multiple selections (default: false) */
  multiSelect?: boolean;
  /** Layout mode */
  layout?: 'horizontal' | 'wrap';
  /** Chip size */
  size?: 'sm' | 'md';
  /** Show checkmarks on selected items */
  showCheckmarks?: boolean;
  /** Maximum selections allowed (only for multiSelect) */
  maxSelections?: number;
}

export function FilterChipGroup<T = string>({
  options,
  selected,
  onChange,
  multiSelect = false,
  layout = 'horizontal',
  size = 'md',
  showCheckmarks = false,
  maxSelections,
}: FilterChipGroupProps<T>) {
  // Normalize options to FilterOption format
  const normalizedOptions: FilterOption<T>[] = options.map((opt) =>
    typeof opt === 'string' ? { id: opt as T, label: opt } : (opt as FilterOption<T>),
  );

  // Normalize selected to array for consistent handling
  const selectedSet = new Set(
    Array.isArray(selected) ? selected : selected !== undefined ? [selected] : [],
  );

  const handlePress = (id: T) => {
    if (multiSelect) {
      const newSet = new Set(selectedSet);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        // Check max selections
        if (maxSelections && newSet.size >= maxSelections) {
          return; // Don't add if at max
        }
        newSet.add(id);
      }
      onChange(Array.from(newSet) as T[]);
    } else {
      // Single select - toggle off if clicking same item
      onChange(selectedSet.has(id) ? (undefined as T) : id);
    }
  };

  const Container = layout === 'horizontal' ? HorizontalContainer : WrapContainer;

  return (
    <Container>
      {normalizedOptions.map((option) => (
        <FilterChip
          key={String(option.id)}
          label={option.label}
          icon={option.icon}
          active={selectedSet.has(option.id)}
          onPress={() => handlePress(option.id)}
          size={size}
          showCheckmark={showCheckmarks}
          disabled={
            maxSelections !== undefined &&
            !selectedSet.has(option.id) &&
            selectedSet.size >= maxSelections
          }
        />
      ))}
    </Container>
  );
}

function HorizontalContainer({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.horizontalContent}
    >
      {children}
    </ScrollView>
  );
}

function WrapContainer({ children }: { children: React.ReactNode }) {
  return (
    <Row wrap gap="xs">
      {children}
    </Row>
  );
}

const styles = StyleSheet.create({
  horizontalContent: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  // wrapContent replaced by Row primitive
});
