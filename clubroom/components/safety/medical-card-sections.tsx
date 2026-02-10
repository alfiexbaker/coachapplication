/**
 * Extracted sub-components for MedicalCard.
 *
 * MedicalInfoRow — reusable row for allergy/condition/medication/restriction.
 * getSeverityBadge — determines alert badge tone.
 * MedicalSummaryRowInner — compact summary for list items.
 * MedicalInfoEmptyStateInner — empty state placeholder.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { MedicalInfo } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── getSeverityBadge ─────────────────────────────────────────────────────────

export function getSeverityBadge(medical: MedicalInfo): { label: string; tone: 'warning' | 'info' } | null {
  if (medical.allergies.length >= 2 || medical.conditions.length >= 2) {
    return { label: 'High Alert', tone: 'warning' };
  }
  if (medical.allergies.length > 0) {
    return { label: 'Allergy Alert', tone: 'warning' };
  }
  if (medical.conditions.length > 0 || medical.medications.length > 0) {
    return { label: 'Medical Info', tone: 'info' };
  }
  return null;
}

// ─── MedicalInfoRow ───────────────────────────────────────────────────────────

interface MedicalInfoRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  palette: ThemeColors;
}

export const MedicalInfoRow = memo(function MedicalInfoRow({
  icon,
  iconColor,
  label,
  value,
  palette }: MedicalInfoRowProps) {
  return (
    <Row align="start" gap="sm">
      <View style={[styles.iconBg, { backgroundColor: withAlpha(iconColor, 0.06) }]}>
        <Ionicons name={icon} size={14} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText style={[styles.infoLabel, { color: palette.muted }]}>{label}</ThemedText>
        <ThemedText style={styles.infoValue}>{value}</ThemedText>
      </View>
    </Row>
  );
});

// ─── MedicalSummaryRowInner ───────────────────────────────────────────────────

interface MedicalSummaryRowInnerProps {
  medical: MedicalInfo;
  onPress?: () => void;
  palette: ThemeColors;
}

export const MedicalSummaryRowInner = memo(function MedicalSummaryRowInner({
  medical,
  onPress,
  palette }: MedicalSummaryRowInnerProps) {
  const hasAlerts =
    medical.allergies.length > 0 ||
    medical.conditions.length > 0 ||
    medical.medications.length > 0;

  if (!hasAlerts) return null;

  const items = [
    ...medical.allergies.map((a) => ({ label: a, type: 'allergy' })),
    ...medical.conditions.map((c) => ({ label: c, type: 'condition' })),
    ...medical.medications.map((m) => ({ label: m, type: 'medication' })),
  ].slice(0, 3);

  const totalCount =
    medical.allergies.length + medical.conditions.length + medical.medications.length;

  return (
    <Clickable onPress={onPress} style={styles.summaryRow}>
      <Row align="center" gap="xs">
        <Ionicons name="medical" size={14} color={palette.warning} />
        <Row wrap gap="xxs" align="center">
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.summaryTag,
                {
                  backgroundColor:
                    item.type === 'allergy'
                      ? withAlpha(palette.error, 0.06)
                      : withAlpha(palette.warning, 0.06) },
              ]}
            >
              <ThemedText
                style={[
                  styles.summaryTagText,
                  { color: item.type === 'allergy' ? palette.error : palette.warning },
                ]}
              >
                {item.label}
              </ThemedText>
            </View>
          ))}
          {totalCount > 3 && (
            <ThemedText style={[styles.moreText, { color: palette.muted }]}>
              +{totalCount - 3} more
            </ThemedText>
          )}
        </Row>
      </Row>
    </Clickable>
  );
});

// ─── MedicalInfoEmptyStateInner ───────────────────────────────────────────────

interface MedicalInfoEmptyStateInnerProps {
  onAddPress?: () => void;
  palette: ThemeColors;
}

export const MedicalInfoEmptyStateInner = memo(function MedicalInfoEmptyStateInner({
  onAddPress,
  palette }: MedicalInfoEmptyStateInnerProps) {
  return (
    <SurfaceCard style={styles.emptyCard}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
        <Ionicons name="medical-outline" size={32} color={palette.muted} />
      </View>
      <ThemedText type="defaultSemiBold">No Medical Information</ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        Add allergies, conditions, or medications for this athlete.
      </ThemedText>
      {onAddPress && (
        <Clickable
          onPress={onAddPress}
          style={[styles.addButton, { borderColor: palette.tint }]}
        >
          <Row align="center" gap="xs">
            <Ionicons name="add" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Add Medical Info</ThemedText>
          </Row>
        </Clickable>
      )}
    </SurfaceCard>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  iconBg: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.micro },
  infoLabel: { ...Typography.caption, marginBottom: 1 },
  infoValue: { ...Typography.bodySmall },
  summaryRow: {
    paddingVertical: Spacing.xxs },
  summaryTag: {
    paddingVertical: Spacing.micro,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.sm },
  summaryTagText: { ...Typography.caption },
  moreText: { ...Typography.caption },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs },
  emptyText: { ...Typography.bodySmall, textAlign: 'center' },
  addButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm } });
