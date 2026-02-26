/**
 * Smart Slots — Composition root.
 *
 * Booking pattern analysis and scheduling suggestions for coaches.
 * Shows heatmap, stats, and actionable suggestions.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import type { SmartSlotsProps, SlotSuggestion } from './smart-slots-data';
import { MOCK_SUGGESTIONS, MOCK_HEATMAP } from './smart-slots-data';
import { HeatmapGrid } from './smart-slots-heatmap';
import { SuggestionCard, StatsSummary } from './smart-slots-cards';
import { Row } from '@/components/primitives';
import { DemoBanner, isDemoMode } from '@/utils/demo-mode';

export default function SmartSlots({
  coachId,
  onAddSlot,
  onRemoveSlot,
  onCopyLastWeek,
}: SmartSlotsProps) {
  const { colors, scheme } = useTheme();
  const demoMode = isDemoMode();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const suggestions = useMemo(
    () => MOCK_SUGGESTIONS.filter((s) => !dismissedIds.has(s.id)),
    [dismissedIds],
  );
  const addSuggestions = suggestions.filter((s) => s.type === 'add');
  const removeSuggestions = suggestions.filter((s) => s.type === 'remove');

  const handleSuggestionAction = useCallback(
    (suggestion: SlotSuggestion) => {
      if (suggestion.type === 'add') {
        onAddSlot?.(suggestion.day, suggestion.time);
        Alert.alert(
          'Slot added',
          `${suggestion.day} at ${suggestion.time} has been added to your availability.`,
        );
      } else {
        onRemoveSlot?.(suggestion.day, suggestion.time);
        Alert.alert(
          'Slot removed',
          `${suggestion.day} at ${suggestion.time} has been removed from your availability.`,
        );
      }
      setDismissedIds((prev) => new Set(prev).add(suggestion.id));
    },
    [onAddSlot, onRemoveSlot],
  );

  const handleCopyLastWeek = useCallback(() => {
    Alert.alert(
      'Copy last week?',
      'This will duplicate your availability from last week into next week.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Copy',
          onPress: () => {
            onCopyLastWeek?.();
            Alert.alert('Done', "Last week's availability has been copied to next week.");
          },
        },
      ],
    );
  }, [onCopyLastWeek]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Smart Slots</Text>
        <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
          Insights from your booking patterns to help optimise your availability.
        </Text>
        {demoMode ? (
          <DemoBanner message="Showing sample Smart Slots insights (demo data)." />
        ) : null}
      </View>

      <StatsSummary isDemoData={demoMode} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Booking heatmap</Text>
      {demoMode ? (
        <Text style={[styles.sourceText, { color: colors.muted }]}>
          Sample heatmap preview
        </Text>
      ) : null}
      <HeatmapGrid data={MOCK_HEATMAP} />

      <Clickable
        style={[styles.copyWeekButton, { backgroundColor: colors.surface }, Shadows[scheme].subtle]}
        onPress={handleCopyLastWeek}
      >
        <Ionicons name="copy-outline" size={18} color={colors.tint} />
        <Text style={[styles.copyWeekText, { color: colors.tint }]}>
          Copy last week&apos;s schedule
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Clickable>

      {addSuggestions.length > 0 && (
        <>
          <Row style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={18} color={colors.success} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular slots to add</Text>
          </Row>
          <View style={styles.suggestionsContainer}>
            {addSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleSuggestionAction} />
            ))}
          </View>
        </>
      )}

      {removeSuggestions.length > 0 && (
        <>
          <Row style={styles.sectionHeader}>
            <Ionicons name="analytics-outline" size={18} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Low-demand slots</Text>
          </Row>
          <View style={styles.suggestionsContainer}>
            {removeSuggestions.map((s) => (
              <SuggestionCard key={s.id} suggestion={s} onAction={handleSuggestionAction} />
            ))}
          </View>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm },
  headerArea: { paddingHorizontal: Spacing.xs, marginBottom: Spacing.md },
  headerTitle: { ...Typography.title, marginBottom: Spacing.xxs },
  headerSubtitle: { ...Typography.body },
  sectionTitle: {
    ...Typography.heading,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  copyWeekButton: {
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radii.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 14,
    marginTop: Spacing.md,
  },
  copyWeekText: { flex: 1, ...Typography.bodySemiBold },
  suggestionsContainer: { gap: Spacing.xs },
  sourceText: { ...Typography.caption, paddingHorizontal: Spacing.xs, marginTop: -Spacing.xs },
  bottomSpacer: { height: Spacing.lg },
});
