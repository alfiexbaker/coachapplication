/**
 * Extracted sub-components for SafetyChecklist.
 *
 * SafetyStatusIndicator — compact badge for lists.
 * SessionSafetySummary — multi-athlete session safety stats.
 * ChecklistItem interface.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  isComplete: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}

// ─── SafetyStatusIndicator ──────────────────────────────────────────────────

/**
 * Compact safety status indicator for lists
 */
export function SafetyStatusIndicator({
  hasEmergencyContact,
  hasEmergencyConsent,
  onPress }: {
  hasEmergencyContact: boolean;
  hasEmergencyConsent: boolean;
  onPress?: () => void;
}) {
  const { colors: palette } = useTheme();

  const isComplete = hasEmergencyContact && hasEmergencyConsent;

  const content = (
    <Row
      align="center"
      gap="xxs"
      style={[
        styles.statusIndicator,
        {
          backgroundColor: isComplete
            ? withAlpha(palette.success, 0.06)
            : withAlpha(palette.warning, 0.06) },
      ]}
    >
      <Ionicons
        name={isComplete ? 'shield-checkmark' : 'warning'}
        size={14}
        color={isComplete ? palette.success : palette.warning}
      />
      <ThemedText
        style={[
          styles.statusText,
          { color: isComplete ? palette.success : palette.warning },
        ]}
      >
        {isComplete ? 'Safety OK' : 'Incomplete'}
      </ThemedText>
    </Row>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

// ─── SessionSafetySummary ───────────────────────────────────────────────────

/**
 * Session safety summary for multiple athletes
 */
export function SessionSafetySummary({
  totalAthletes,
  athletesWithAlerts,
  missingInfoCount,
  onPress }: {
  totalAthletes: number;
  athletesWithAlerts: number;
  missingInfoCount: number;
  onPress?: () => void;
}) {
  const { colors: palette } = useTheme();

  const hasMissingInfo = missingInfoCount > 0;

  const content = (
    <View style={[styles.summaryCard, { borderColor: palette.border }]}>
      <Row align="center" gap="xs">
        <Ionicons name="shield" size={18} color={palette.tint} />
        <ThemedText type="defaultSemiBold">Session Safety</ThemedText>
      </Row>

      <Row align="center">
        <View style={styles.summaryStat}>
          <ThemedText style={styles.summaryStatValue}>{totalAthletes}</ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            Athletes
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryStat}>
          <ThemedText
            style={[
              styles.summaryStatValue,
              athletesWithAlerts > 0 && { color: palette.warning },
            ]}
          >
            {athletesWithAlerts}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            With Alerts
          </ThemedText>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: palette.border }]} />
        <View style={styles.summaryStat}>
          <ThemedText
            style={[
              styles.summaryStatValue,
              hasMissingInfo && { color: palette.error },
            ]}
          >
            {missingInfoCount}
          </ThemedText>
          <ThemedText style={[styles.summaryStatLabel, { color: palette.muted }]}>
            Missing Info
          </ThemedText>
        </View>
      </Row>

      {hasMissingInfo && (
        <Row align="center" gap="xs" style={[styles.summaryWarning, { backgroundColor: withAlpha(palette.error, 0.03) }]}>
          <Ionicons name="warning" size={14} color={palette.error} />
          <ThemedText style={[styles.summaryWarningText, { color: palette.error }]}>
            {missingInfoCount} athlete{missingInfoCount !== 1 ? 's' : ''} missing emergency contact
          </ThemedText>
        </Row>
      )}
    </View>
  );

  if (onPress) {
    return <Clickable onPress={onPress}>{content}</Clickable>;
  }

  return content;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  statusIndicator: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill },
  statusText: { ...Typography.caption },
  summaryCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.md },
  summaryStat: {
    flex: 1,
    alignItems: 'center' },
  summaryStatValue: { ...Typography.title },
  summaryStatLabel: { ...Typography.caption, marginTop: Spacing.micro },
  summaryDivider: { width: 1, height: 32 },
  summaryWarning: {
    padding: Spacing.sm,
    borderRadius: Radii.sm },
  summaryWarningText: { ...Typography.caption } });
