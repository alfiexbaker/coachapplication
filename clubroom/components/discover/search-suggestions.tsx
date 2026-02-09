/**
 * SearchSuggestions Component (Sprint 8B)
 *
 * Dropdown-style search suggestions panel with three sections:
 * - Recent searches
 * - Popular near you
 * - Browse by area
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { Clickable } from '@/components/primitives/clickable';
import { useTheme, type ThemeColors } from '@/hooks/useTheme';

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
// Mock data
// ---------------------------------------------------------------------------

const MOCK_RECENT_SEARCHES: SearchSuggestion[] = [
  { id: 'r1', text: 'Goalkeeping coach', type: 'recent' },
  { id: 'r2', text: 'Under 10 dribbling', type: 'recent' },
  { id: 'r3', text: 'James Whitfield', type: 'recent' },
];

const MOCK_POPULAR: SearchSuggestion[] = [
  { id: 'p1', text: 'Football fitness training', type: 'popular', subtitle: '24 coaches' },
  { id: 'p2', text: '1-on-1 shooting drills', type: 'popular', subtitle: '18 coaches' },
  { id: 'p3', text: 'Goalkeeper training', type: 'popular', subtitle: '9 coaches' },
  { id: 'p4', text: 'Defending skills', type: 'popular', subtitle: '15 coaches' },
];

const MOCK_AREAS: SearchSuggestion[] = [
  { id: 'a1', text: 'North London', type: 'area', subtitle: '42 coaches' },
  { id: 'a2', text: 'South London', type: 'area', subtitle: '37 coaches' },
  { id: 'a3', text: 'East London', type: 'area', subtitle: '28 coaches' },
  { id: 'a4', text: 'West London', type: 'area', subtitle: '31 coaches' },
  { id: 'a5', text: 'Central London', type: 'area', subtitle: '53 coaches' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  palette,
  onAction,
  actionLabel,
}: {
  title: string;
  palette: ThemeColors;
  onAction?: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={headerStyles.container}>
      <ThemedText style={[headerStyles.title, { color: palette.text }]}>{title}</ThemedText>
      {onAction && actionLabel && (
        <Clickable onPress={onAction} accessibilityLabel={actionLabel}>
          <ThemedText style={[headerStyles.action, { color: palette.tint }]}>
            {actionLabel}
          </ThemedText>
        </Clickable>
      )}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  title: {
    ...Typography.subheading,
  },
  action: {
    ...Typography.smallSemiBold,
  },
});

function SuggestionRow({
  suggestion,
  onPress,
  palette,
}: {
  suggestion: SearchSuggestion;
  onPress: () => void;
  palette: ThemeColors;
}) {
  const iconName = getIconForType(suggestion.type);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={suggestion.text}
      onPress={onPress}
      style={({ pressed }) => [
        rowStyles.container,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[rowStyles.iconCircle, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons name={iconName} size={Components.icon.md} color={palette.muted} />
      </View>
      <View style={rowStyles.textContainer}>
        <ThemedText style={[rowStyles.text, { color: palette.text }]} numberOfLines={1}>
          {suggestion.text}
        </ThemedText>
        {suggestion.subtitle && (
          <ThemedText style={[rowStyles.subtitle, { color: palette.muted }]}>
            {suggestion.subtitle}
          </ThemedText>
        )}
      </View>
      <Ionicons name="arrow-forward-outline" size={Components.icon.sm} color={palette.border} />
    </Pressable>
  );
}

function getIconForType(type: SearchSuggestion['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'recent':
      return 'time-outline';
    case 'popular':
      return 'trending-up-outline';
    case 'area':
      return 'map-outline';
  }
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  iconCircle: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...Typography.body,
  },
  subtitle: {
    ...Typography.caption,
    marginTop: 1,
  },
});

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
      {/* Recent searches */}
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

      {/* Divider */}
      {recents.length > 0 && popular.length > 0 && (
        <Divider style={{ marginHorizontal: Spacing.sm }} />
      )}

      {/* Popular near you */}
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

      {/* Divider */}
      {popular.length > 0 && areas.length > 0 && (
        <Divider style={{ marginHorizontal: Spacing.sm }} />
      )}

      {/* Browse by area */}
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.xs,
    gap: 0,
  },
  section: {
    paddingVertical: Spacing.xs,
  },
});
