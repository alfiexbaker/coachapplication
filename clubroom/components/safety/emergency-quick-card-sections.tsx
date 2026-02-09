import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import type { EmergencyContact } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Types ──────────────────────────────────────────────────────

interface MedicalItem {
  label: string;
  type: 'allergy' | 'condition' | 'medication';
}

function getItemColor(type: MedicalItem['type'], palette: ThemeColors): string {
  if (type === 'allergy') return palette.error;
  if (type === 'condition') return palette.warning;
  return palette.tint;
}

function getItemIcon(type: MedicalItem['type']): keyof typeof Ionicons.glyphMap {
  if (type === 'allergy') return 'alert-circle';
  if (type === 'condition') return 'fitness';
  return 'medkit';
}

// ─── MedicalItemChips ───────────────────────────────────────────

export interface MedicalItemChipsProps {
  topItems: MedicalItem[];
  remainingCount: number;
  palette: ThemeColors;
}

export const MedicalItemChips = memo(function MedicalItemChips({
  topItems,
  remainingCount,
  palette,
}: MedicalItemChipsProps) {
  if (topItems.length === 0) return null;

  return (
    <View style={styles.summarySection}>
      <View style={styles.itemsRow}>
        {topItems.map((item, index) => {
          const color = getItemColor(item.type, palette);
          return (
            <View
              key={`${item.type}-${index}`}
              style={[styles.itemChip, { backgroundColor: withAlpha(color, 0.06) }]}
            >
              <Ionicons name={getItemIcon(item.type)} size={12} color={color} />
              <ThemedText style={[styles.itemText, { color }]} numberOfLines={1}>
                {item.label}
              </ThemedText>
            </View>
          );
        })}
        {remainingCount > 0 && (
          <View style={[styles.moreChip, { backgroundColor: palette.surfaceSecondary }]}>
            <ThemedText style={[styles.moreText, { color: palette.muted }]}>
              +{remainingCount} more
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
});

// ─── EmergencyCallSection ───────────────────────────────────────

export interface EmergencyCallSectionProps {
  contact: EmergencyContact;
  onCall?: () => void;
  palette: ThemeColors;
}

export const EmergencyCallSection = memo(function EmergencyCallSection({
  contact,
  onCall,
  palette,
}: EmergencyCallSectionProps) {
  return (
    <View style={[styles.callSection, { borderTopColor: palette.border }]}>
      <View style={styles.contactInfo}>
        <ThemedText style={[styles.contactLabel, { color: palette.muted }]}>
          Emergency Contact
        </ThemedText>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {contact.name}
        </ThemedText>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          {contact.relationship} - {contact.phone}
        </ThemedText>
      </View>
      <Clickable
        onPress={onCall}
        style={[styles.callButton, { backgroundColor: palette.success }]}
      >
        <Ionicons name="call" size={22} color={palette.onSuccess} />
      </Clickable>
    </View>
  );
});

// ─── NoContactWarning ───────────────────────────────────────────

export interface NoContactWarningProps {
  palette: ThemeColors;
}

export const NoContactWarning = memo(function NoContactWarning({ palette }: NoContactWarningProps) {
  return (
    <View style={[styles.warningSection, { backgroundColor: withAlpha(palette.warning, 0.03) }]}>
      <Ionicons name="warning" size={16} color={palette.warning} />
      <ThemedText style={[styles.warningText, { color: palette.warning }]}>
        No emergency contact on file
      </ThemedText>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  summarySection: {
    paddingHorizontal: Components.card.padding,
    paddingBottom: Components.card.padding,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  itemChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  itemText: { ...Typography.caption, maxWidth: 100 },
  moreChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  moreText: { ...Typography.caption },
  callSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Components.card.padding,
    borderTopWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: { ...Typography.caption, marginBottom: Spacing.micro },
  callButton: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  warningSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Components.card.padding,
    marginHorizontal: Components.card.padding,
    marginBottom: Components.card.padding,
    borderRadius: Radii.md,
  },
  warningText: { ...Typography.smallSemiBold },
});
