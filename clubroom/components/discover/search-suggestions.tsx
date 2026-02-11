/**
 * SearchSuggestions Component (Sprint 8B)
 *
 * Dropdown-style search suggestions panel with three sections:
 * - Recent searches
 * - Popular near you
 * - Browse by area
 */

import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { useTheme } from '@/hooks/useTheme';

import {
  MOCK_RECENT_SEARCHES,
  MOCK_POPULAR,
  MOCK_AREAS,
  SectionHeader,
  SuggestionRow,
} from './search-suggestions-sections';

// Re-export extracted components for backward compat
export {
  MOCK_RECENT_SEARCHES,
  MOCK_POPULAR,
  MOCK_AREAS,
  SectionHeader,
  SuggestionRow,
} from './search-suggestions-sections';
export type { SectionHeaderProps, SuggestionRowProps } from './search-suggestions-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'recent' | 'popular' | 'area';
  subtitle?: string;
}

interface SearchSuggestionsProps {
  recentSearches?: SearchSuggestion[];
  popularNearYou?: SearchSuggestion[];
  browseByArea?: SearchSuggestion[];
  onSuggestionPress?: (suggestion: SearchSuggestion) => void;
  onClearRecent?: () => void;
  visible?: boolean;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SearchSuggestions({
  recentSearches,
  popularNearYou,
  browseByArea,
  onSuggestionPress,
  onClearRecent,
  visible = true,
}: SearchSuggestionsProps) {
  const { colors: palette } = useTheme();

  if (!visible) return null;

  const recents = recentSearches ?? MOCK_RECENT_SEARCHES;
  const popular = popularNearYou ?? MOCK_POPULAR;
  const areas = browseByArea ?? MOCK_AREAS;

  return (
    <SurfaceCard style={styles.card} tactile={false}>
      {recents.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Recent"
            palette={palette}
            onAction={onClearRecent}
            actionLabel="Clear"
          />
          {recents.map((item) => (
            <SuggestionRow
              key={item.id}
              suggestion={item}
              onPress={() => onSuggestionPress?.(item)}
              palette={palette}
            />
          ))}
        </View>
      )}

      {recents.length > 0 && popular.length > 0 && (
        <Divider style={{ marginHorizontal: Spacing.sm }} />
      )}

      {popular.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Popular near you" palette={palette} />
          {popular.map((item) => (
            <SuggestionRow
              key={item.id}
              suggestion={item}
              onPress={() => onSuggestionPress?.(item)}
              palette={palette}
            />
          ))}
        </View>
      )}

      {popular.length > 0 && areas.length > 0 && (
        <Divider style={{ marginHorizontal: Spacing.sm }} />
      )}

      {areas.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Browse by area" palette={palette} />
          {areas.map((item) => (
            <SuggestionRow
              key={item.id}
              suggestion={item}
              onPress={() => onSuggestionPress?.(item)}
              palette={palette}
            />
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xs,
    gap: 0,
  },
  section: {
    paddingVertical: Spacing.xs,
  },
});
