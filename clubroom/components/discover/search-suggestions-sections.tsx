import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import type { ThemeColors } from '@/hooks/useTheme';

import type { SearchSuggestion } from './search-suggestions';

/* ---------- Mock Data ---------- */

export const MOCK_RECENT_SEARCHES: SearchSuggestion[] = [
  { id: 'r1', text: 'Goalkeeping coach', type: 'recent' },
  { id: 'r2', text: 'Under 10 dribbling', type: 'recent' },
  { id: 'r3', text: 'James Whitfield', type: 'recent' },
];

export const MOCK_POPULAR: SearchSuggestion[] = [
  { id: 'p1', text: 'Football fitness training', type: 'popular', subtitle: '24 coaches' },
  { id: 'p2', text: '1-on-1 shooting drills', type: 'popular', subtitle: '18 coaches' },
  { id: 'p3', text: 'Goalkeeper training', type: 'popular', subtitle: '9 coaches' },
  { id: 'p4', text: 'Defending skills', type: 'popular', subtitle: '15 coaches' },
];

export const MOCK_AREAS: SearchSuggestion[] = [
  { id: 'a1', text: 'North London', type: 'area', subtitle: '42 coaches' },
  { id: 'a2', text: 'South London', type: 'area', subtitle: '37 coaches' },
  { id: 'a3', text: 'East London', type: 'area', subtitle: '28 coaches' },
  { id: 'a4', text: 'West London', type: 'area', subtitle: '31 coaches' },
  { id: 'a5', text: 'Central London', type: 'area', subtitle: '53 coaches' },
];

/* ---------- Helpers ---------- */

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

/* ---------- SectionHeader ---------- */

export interface SectionHeaderProps {
  title: string;
  palette: ThemeColors;
  onAction?: () => void;
  actionLabel?: string;
}

export const SectionHeader = memo(function SectionHeader({
  title,
  palette,
  onAction,
  actionLabel,
}: SectionHeaderProps) {
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
});

const headerStyles = StyleSheet.create({
  container: {
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

/* ---------- SuggestionRow ---------- */

export interface SuggestionRowProps {
  suggestion: SearchSuggestion;
  onPress: () => void;
  palette: ThemeColors;
}

export const SuggestionRow = memo(function SuggestionRow({
  suggestion,
  onPress,
  palette,
}: SuggestionRowProps) {
  const iconName = getIconForType(suggestion.type);

  return (
    <Clickable accessibilityLabel={suggestion.text} onPress={onPress} style={rowStyles.container}>
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
    </Clickable>
  );
});

const rowStyles = StyleSheet.create({
  container: {
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
