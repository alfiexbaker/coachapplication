/**
 * Cancellation Policy Editor
 *
 * Allows coaches to choose between preset policies (Flexible, Standard, Strict)
 * or create a custom policy with editable tiers. Displays a tier table showing
 * the refund percentages at each time window.
 *
 * USER STORY:
 * "As a coach, I want to set clear cancellation terms so parents know
 * exactly what refund they'll receive if they need to cancel."
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Typography, Shadows, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  schedulingRulesService,
  POLICY_TEMPLATES,
} from '@/services/scheduling-rules-service';
import type { CancellationPolicy, RefundTier } from '@/constants/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PresetKey = 'flexible' | 'standard' | 'strict' | 'custom';

interface PresetOption {
  key: PresetKey;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PRESETS: PresetOption[] = [
  {
    key: 'flexible',
    label: 'Flexible',
    description: 'Full refund up to 6 hours before',
    icon: 'happy-outline',
  },
  {
    key: 'standard',
    label: 'Standard',
    description: 'Full refund 24+ hours before',
    icon: 'shield-checkmark-outline',
  },
  {
    key: 'strict',
    label: 'Strict',
    description: 'Full refund only 48+ hours before',
    icon: 'lock-closed-outline',
  },
  {
    key: 'custom',
    label: 'Custom',
    description: 'Define your own refund tiers',
    icon: 'settings-outline',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PresetCard({
  preset,
  selected,
  onPress,
}: {
  preset: PresetOption;
  selected: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable
      style={[
        styles.presetCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
        selected ? { borderColor: palette.tint } : undefined,
      ].filter(Boolean) as ViewStyle[]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${preset.label} policy${selected ? ', selected' : ''}`}
    >
      <View style={[styles.presetIconCircle, { backgroundColor: palette.background }, selected ? { backgroundColor: palette.tint } : undefined]}>
        <Ionicons
          name={preset.icon}
          size={20}
          color={selected ? palette.surface : palette.muted}
        />
      </View>
      <View style={styles.presetInfo}>
        <ThemedText style={[styles.presetLabel, { color: palette.text }, selected ? { color: palette.tint } : undefined]} numberOfLines={1}>
          {preset.label}
        </ThemedText>
        <ThemedText style={[styles.presetDescription, { color: palette.muted }]} numberOfLines={2}>
          {preset.description}
        </ThemedText>
      </View>
      <View style={[styles.radioOuter, { borderColor: palette.border }, selected ? { borderColor: palette.tint } : undefined]}>
        {selected && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
      </View>
    </Clickable>
  );
}

function TierTable({ tiers }: { tiers: RefundTier[] }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);

  return (
    <View style={[styles.tierTable, { backgroundColor: palette.surface }]}>
      {/* Header */}
      <View style={[styles.tierHeaderRow, { backgroundColor: palette.background }]}>
        <ThemedText style={[styles.tierHeaderCell, { flex: 2, color: palette.muted }]}>Cancellation window</ThemedText>
        <ThemedText style={[styles.tierHeaderCell, { flex: 1, textAlign: 'right', color: palette.muted }]}>Refund</ThemedText>
      </View>
      {/* Rows */}
      {sorted.map((tier, idx) => {
        const isLast = idx === sorted.length - 1;
        const refundColor =
          tier.refundPercentage >= 75
            ? palette.success
            : tier.refundPercentage >= 25
              ? palette.warning
              : palette.error;

        return (
          <View
            key={`${tier.hoursBeforeSession}-${tier.refundPercentage}`}
            style={[styles.tierRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: palette.border }]}
          >
            <ThemedText style={[styles.tierCell, { flex: 2, color: palette.text }]} numberOfLines={2}>{tier.description}</ThemedText>
            <View style={[styles.tierBadge, { backgroundColor: refundColor + '18' }]}>
              <ThemedText style={[styles.tierBadgeText, { color: refundColor }]}>
                {tier.refundPercentage}%
              </ThemedText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

interface EditableTierRowProps {
  tier: RefundTier;
  index: number;
  onUpdate: (index: number, field: keyof RefundTier, value: string | number) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

function EditableTierRow({ tier, index, onUpdate, onRemove, canRemove }: EditableTierRowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.editableTierRow, { backgroundColor: palette.surface }]}>
      <View style={styles.editableTierFields}>
        <View style={styles.editableField}>
          <ThemedText style={[styles.editableFieldLabel, { color: palette.muted }]}>Hours before</ThemedText>
          <TextInput
            style={[styles.editableInput, { borderColor: palette.border, color: palette.text }]}
            value={String(tier.hoursBeforeSession)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= 0) onUpdate(index, 'hoursBeforeSession', num);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={palette.muted}
          />
        </View>
        <View style={styles.editableField}>
          <ThemedText style={[styles.editableFieldLabel, { color: palette.muted }]}>Refund %</ThemedText>
          <TextInput
            style={[styles.editableInput, { borderColor: palette.border, color: palette.text }]}
            value={String(tier.refundPercentage)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= 0 && num <= 100) onUpdate(index, 'refundPercentage', num);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={palette.muted}
          />
        </View>
      </View>
      <TextInput
        style={[styles.editableDescInput, { borderColor: palette.border, color: palette.text }]}
        value={tier.description}
        onChangeText={(text) => onUpdate(index, 'description', text)}
        placeholder="Description for this tier"
        placeholderTextColor={palette.muted}
      />
      {canRemove && (
        <Clickable style={styles.removeTierButton} onPress={() => onRemove(index)}>
          <Ionicons name="trash-outline" size={16} color={palette.error} />
          <ThemedText style={[styles.removeTierText, { color: palette.error }]}>Remove</ThemedText>
        </Clickable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface CancellationPolicyEditorProps {
  onSave?: (policy: CancellationPolicy) => void;
  onBack?: () => void;
}

export default function CancellationPolicyEditor({ onSave, onBack }: CancellationPolicyEditorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('standard');
  const [customTiers, setCustomTiers] = useState<RefundTier[]>([
    { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full refund 24+ hours before' },
    { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund less than 24 hours before' },
  ]);

  // Load existing policy
  useEffect(() => {
    (async () => {
      try {
        const existing = await schedulingRulesService.getCancellationPolicy(coachId);
        if (existing) {
          // Determine which preset matches
          const matchedPreset = (['flexible', 'standard', 'strict'] as const).find((key) => {
            const tmpl = POLICY_TEMPLATES[key];
            return tmpl.name === existing.name;
          });
          setSelectedPreset(matchedPreset ?? 'custom');
          if (!matchedPreset) {
            setCustomTiers(existing.tiers);
          }
        }
      } catch {
        // Defaults are fine
      } finally {
        setLoading(false);
      }
    })();
  }, [coachId]);

  // Get display tiers for selected preset
  const displayTiers: RefundTier[] =
    selectedPreset === 'custom'
      ? customTiers
      : (POLICY_TEMPLATES[selectedPreset]?.tiers ?? []);

  // Custom tier management
  const updateCustomTier = useCallback(
    (index: number, field: keyof RefundTier, value: string | number) => {
      setCustomTiers((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const removeCustomTier = useCallback((index: number) => {
    setCustomTiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addCustomTier = useCallback(() => {
    setCustomTiers((prev) => [
      ...prev,
      { hoursBeforeSession: 0, refundPercentage: 0, description: '' },
    ]);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const policy = await schedulingRulesService.setCancellationPolicy(
        coachId,
        selectedPreset === 'custom' ? 'custom' : selectedPreset,
        selectedPreset === 'custom' ? customTiers : undefined,
      );
      onSave?.(policy);
      Alert.alert('Policy saved', 'Your cancellation policy has been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save cancellation policy. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coachId, selectedPreset, customTiers, onSave]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerArea}>
        <ThemedText style={[styles.headerTitle, { color: palette.text }]}>Cancellation Policy</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>
          Choose a preset or create a custom policy. Parents will see this before booking.
        </ThemedText>
      </View>

      {/* Preset cards */}
      <View style={styles.presetsContainer}>
        {PRESETS.map((preset) => (
          <PresetCard
            key={preset.key}
            preset={preset}
            selected={selectedPreset === preset.key}
            onPress={() => setSelectedPreset(preset.key)}
          />
        ))}
      </View>

      {/* Tier table (read-only for presets) */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Refund tiers</ThemedText>
      </View>

      {selectedPreset !== 'custom' ? (
        <TierTable tiers={displayTiers} />
      ) : (
        <View style={styles.customTiersContainer}>
          {customTiers.map((tier, idx) => (
            <EditableTierRow
              key={idx}
              tier={tier}
              index={idx}
              onUpdate={updateCustomTier}
              onRemove={removeCustomTier}
              canRemove={customTiers.length > 1}
            />
          ))}
          <Clickable style={[styles.addTierButton, { borderColor: palette.border }]} onPress={addCustomTier}>
            <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.addTierText, { color: palette.tint }]}>Add tier</ThemedText>
          </Clickable>
        </View>
      )}

      {/* Save button */}
      <Clickable
        style={[styles.saveButton, { backgroundColor: palette.tint }, saving ? styles.saveButtonDisabled : undefined].filter(Boolean) as ViewStyle[]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={palette.surface} />
        ) : (
          <ThemedText style={[styles.saveButtonText, { color: palette.surface }]}>Save policy</ThemedText>
        )}
      </Clickable>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  headerArea: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.title,
    marginBottom: Spacing.xs / 2,
  },
  headerSubtitle: {
    ...Typography.body,
  },

  // Presets
  presetsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.card,
    padding: Spacing.sm,
    borderWidth: 1.5,
  },
  presetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  presetInfo: {
    flex: 1,
  },
  presetLabel: {
    ...Typography.bodySemiBold,
  },
  presetDescription: {
    ...Typography.small,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginLeft: Spacing.xs,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Section
  sectionHeader: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading,
  },

  // Tier table
  tierTable: {
    borderRadius: Radii.card,
    ...Shadows.light.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
  },
  tierHeaderCell: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  tierCell: {
    ...Typography.body,
  },
  tierBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  tierBadgeText: {
    ...Typography.bodySemiBold,
    fontSize: Typography.small.fontSize,
  },

  // Custom tiers editor
  customTiersContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editableTierRow: {
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.subtle,
  },
  editableTierFields: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  editableField: {
    flex: 1,
  },
  editableFieldLabel: {
    ...Typography.caption,
    marginBottom: Spacing.xs / 2,
  },
  editableInput: {
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
  },
  editableDescInput: {
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  removeTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    alignSelf: 'flex-end',
  },
  removeTierText: {
    ...Typography.small,
  },
  addTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radii.card,
  },
  addTierText: {
    ...Typography.bodySemiBold,
  },

  // Save button
  saveButton: {
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.bodySemiBold,
  },

  bottomSpacer: {
    height: Spacing.lg,
  },
});
