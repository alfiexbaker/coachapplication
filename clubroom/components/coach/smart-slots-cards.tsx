/**
 * Smart Slots — SuggestionCard and StatsSummary sub-components.
 */
import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { Spacing, Radii, Typography, Shadows, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import type { SlotSuggestion } from './smart-slots-data';
import { MOCK_STATS } from './smart-slots-data';
import { Row } from '@/components/primitives';
import { DemoBanner } from '@/utils/demo-mode';

// ---------------------------------------------------------------------------
// SuggestionCard
// ---------------------------------------------------------------------------

function SuggestionCardInner({
  suggestion,
  onAction,
}: {
  suggestion: SlotSuggestion;
  onAction: (s: SlotSuggestion) => void;
}) {
  const { colors, scheme } = useTheme();
  const isAdd = suggestion.type === 'add';
  const iconName: keyof typeof Ionicons.glyphMap = isAdd ? 'trending-up' : 'trending-down';
  const iconColor = isAdd ? colors.success : colors.warning;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].subtle]}>
      <Row style={styles.cardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <Row style={styles.cardHeaderText}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {suggestion.day} {suggestion.time}
          </Text>
          <View style={[styles.metricBadge, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
            <Text style={[styles.metricText, { color: iconColor }]}>{suggestion.metric}</Text>
          </View>
        </Row>
      </Row>
      <Text style={[styles.cardDescription, { color: colors.muted }]}>
        {suggestion.description}
      </Text>
      <Clickable
        style={[
          styles.actionButton,
          { backgroundColor: isAdd ? colors.tint : colors.surface },
          !isAdd && { borderWidth: 1, borderColor: colors.border },
        ]}
        onPress={() => onAction(suggestion)}
      >
        <Ionicons
          name={isAdd ? 'add' : 'remove'}
          size={16}
          color={isAdd ? colors.onPrimary : colors.muted}
        />
        <Text style={[styles.actionButtonText, { color: isAdd ? colors.onPrimary : colors.muted }]}>
          {isAdd ? 'Add slot' : 'Remove slot'}
        </Text>
      </Clickable>
    </View>
  );
}

export const SuggestionCard = memo(SuggestionCardInner);

// ---------------------------------------------------------------------------
// StatsSummary
// ---------------------------------------------------------------------------

function StatsSummaryInner({ isDemoData = true }: { isDemoData?: boolean }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={styles.statsWrap}>
      {isDemoData ? (
        <DemoBanner message="Smart Slots stats are demo data until enough booking history is available." />
      ) : null}
      <Row style={[styles.statsContainer, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {MOCK_STATS.totalSessionsLastMonth}
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Sessions (30d)</Text>
        </View>
        <Divider vertical />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {Math.round(MOCK_STATS.averageBookingRate * 100)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Fill rate</Text>
        </View>
        <Divider vertical />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{MOCK_STATS.waitlistCount}</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>On waitlist</Text>
        </View>
      </Row>
    </View>
  );
}

export const StatsSummary = memo(StatsSummaryInner);

const styles = StyleSheet.create({
  // Suggestion card
  card: { borderRadius: Radii.card, padding: Spacing.sm },
  cardHeader: { alignItems: 'center', marginBottom: Spacing.xs },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.xs,
  },
  cardHeaderText: { flex: 1, alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { ...Typography.bodySemiBold },
  metricBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.pill },
  metricText: { ...Typography.caption, fontWeight: '600' },
  cardDescription: { ...Typography.small, marginBottom: Spacing.sm },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    height: 36,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-end',
  },
  actionButtonText: { ...Typography.caption, fontWeight: '600' },
  // Stats
  statsWrap: { gap: Spacing.xs },
  statsContainer: { borderRadius: Radii.card, padding: Spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption, marginTop: Spacing.micro },
});
