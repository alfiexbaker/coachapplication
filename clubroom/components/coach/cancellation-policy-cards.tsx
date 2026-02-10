/**
 * CancellationPolicyEditor — Sub-components: PresetCard, TierTable, EditableTierRow.
 */
import { memo } from 'react';
import { View, StyleSheet, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Shadows, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RefundTier } from '@/constants/types';
import type { PresetOption } from './cancellation-policy-helpers';
import { Row } from '@/components/primitives';

// --- PresetCard ---
export const PresetCard = memo(function PresetCard({ preset, selected, onPress }: { preset: PresetOption; selected: boolean; onPress: () => void }) {
  const { colors: palette } = useTheme();
  return (
    <Clickable
      style={[styles.presetCard, { backgroundColor: palette.surface, borderColor: palette.border }, selected ? { borderColor: palette.tint } : undefined].filter(Boolean) as ViewStyle[]}
      onPress={onPress} accessibilityRole="radio" accessibilityLabel={`${preset.label} policy${selected ? ', selected' : ''}`}
    >
      <View style={[styles.presetIconCircle, { backgroundColor: palette.background }, selected ? { backgroundColor: palette.tint } : undefined]}>
        <Ionicons name={preset.icon} size={20} color={selected ? palette.surface : palette.muted} />
      </View>
      <View style={styles.presetInfo}>
        <ThemedText style={[styles.presetLabel, { color: palette.text }, selected ? { color: palette.tint } : undefined]} numberOfLines={1}>{preset.label}</ThemedText>
        <ThemedText style={[styles.presetDescription, { color: palette.muted }]} numberOfLines={2}>{preset.description}</ThemedText>
      </View>
      <View style={[styles.radioOuter, { borderColor: palette.border }, selected ? { borderColor: palette.tint } : undefined]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
      </View>
    </Clickable>
  );
});

// --- TierTable ---
export const TierTable = memo(function TierTable({ tiers }: { tiers: RefundTier[] }) {
  const { colors: palette, scheme } = useTheme();
  const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);
  return (
    <View style={[styles.tierTable, Shadows[scheme].card, { backgroundColor: palette.surface }]}>
      <Row style={[styles.tierHeaderRow, { backgroundColor: palette.background }]}>
        <ThemedText style={[styles.tierHeaderCell, { flex: 2, color: palette.muted }]}>Cancellation window</ThemedText>
        <ThemedText style={[styles.tierHeaderCell, { flex: 1, textAlign: 'right', color: palette.muted }]}>Refund</ThemedText>
      </Row>
      {sorted.map((tier, idx) => {
        const isLast = idx === sorted.length - 1;
        const refundColor = tier.refundPercentage >= 75 ? palette.success : tier.refundPercentage >= 25 ? palette.warning : palette.error;
        return (
          <Row key={`${tier.hoursBeforeSession}-${tier.refundPercentage}`} style={[styles.tierRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }]}>
            <ThemedText style={[styles.tierCell, { flex: 2, color: palette.text }]} numberOfLines={2}>{tier.description}</ThemedText>
            <View style={[styles.tierBadge, { backgroundColor: withAlpha(refundColor, 0.09) }]}>
              <ThemedText style={[styles.tierBadgeText, { color: refundColor }]}>{tier.refundPercentage}%</ThemedText>
            </View>
          </Row>
        );
      })}
    </View>
  );
});

// --- EditableTierRow ---
interface EditableTierRowProps {
  tier: RefundTier;
  index: number;
  onUpdate: (index: number, field: keyof RefundTier, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export const EditableTierRow = memo(function EditableTierRow({ tier, index, onUpdate, onRemove, canRemove }: EditableTierRowProps) {
  const { colors: palette, scheme } = useTheme();
  return (
    <View style={[styles.editableTierRow, Shadows[scheme].subtle, { backgroundColor: palette.surface }]}>
      <Row style={styles.editableTierFields}>
        <View style={styles.editableField}>
          <ThemedText style={[styles.editableFieldLabel, { color: palette.muted }]}>Hours before</ThemedText>
          <TextInput style={[styles.editableInput, { borderColor: palette.border, color: palette.text }]}
            value={String(tier.hoursBeforeSession)} keyboardType="number-pad" placeholder="0" placeholderTextColor={palette.muted}
            onChangeText={(text) => { const n = parseInt(text, 10); if (!isNaN(n) && n >= 0) onUpdate(index, 'hoursBeforeSession', n); }} />
        </View>
        <View style={styles.editableField}>
          <ThemedText style={[styles.editableFieldLabel, { color: palette.muted }]}>Refund %</ThemedText>
          <TextInput style={[styles.editableInput, { borderColor: palette.border, color: palette.text }]}
            value={String(tier.refundPercentage)} keyboardType="number-pad" placeholder="0" placeholderTextColor={palette.muted}
            onChangeText={(text) => { const n = parseInt(text, 10); if (!isNaN(n) && n >= 0 && n <= 100) onUpdate(index, 'refundPercentage', n); }} />
        </View>
      </Row>
      <TextInput style={[styles.editableDescInput, { borderColor: palette.border, color: palette.text }]}
        value={tier.description} placeholder="Description for this tier" placeholderTextColor={palette.muted}
        onChangeText={(text) => onUpdate(index, 'description', text)} />
      {canRemove && (
        <Clickable style={styles.removeTierButton} onPress={() => onRemove(index)}>
          <Ionicons name="trash-outline" size={16} color={palette.error} />
          <ThemedText style={[styles.removeTierText, { color: palette.error }]}>Remove</ThemedText>
        </Clickable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  presetCard: { alignItems: 'center', borderRadius: Radii.card, padding: Spacing.sm, borderWidth: 1.5 },
  presetIconCircle: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  presetInfo: { flex: 1 },
  presetLabel: { ...Typography.bodySemiBold },
  presetDescription: { ...Typography.small, marginTop: Spacing.micro },
  radioOuter: { width: 22, height: 22, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center' as const, justifyContent: 'center' as const, marginLeft: Spacing.xs },
  radioInner: { width: 12, height: 12, borderRadius: Radii.sm },
  tierTable: { borderRadius: Radii.card, overflow: 'hidden', marginBottom: Spacing.md },
  tierHeaderRow: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2 },
  tierHeaderCell: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierRow: { alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  tierCell: { ...Typography.body },
  tierBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs / 2, borderRadius: Radii.pill },
  tierBadgeText: { ...Typography.bodySemiBold, fontSize: Typography.small.fontSize },
  editableTierRow: { borderRadius: Radii.card, padding: Spacing.sm },
  editableTierFields: { gap: Spacing.sm, marginBottom: Spacing.xs },
  editableField: { flex: 1 },
  editableFieldLabel: { ...Typography.caption, marginBottom: Spacing.xs / 2 },
  editableInput: { height: Components.button.height, borderRadius: Radii.sm, borderWidth: 1, paddingHorizontal: Spacing.xs, ...Typography.body },
  editableDescInput: { height: Components.button.height, borderRadius: Radii.sm, borderWidth: 1, paddingHorizontal: Spacing.xs, ...Typography.body, marginBottom: Spacing.xs },
  removeTierButton: { alignItems: 'center', gap: Spacing.xs / 2, alignSelf: 'flex-end' },
  removeTierText: { ...Typography.small },
});
