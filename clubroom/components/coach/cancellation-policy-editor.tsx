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
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows, Components } from '@/constants/theme';
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
  return (
    <Pressable
      style={[styles.presetCard, selected && styles.presetCardSelected]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <View style={[styles.presetIconCircle, selected && styles.presetIconCircleSelected]}>
        <Ionicons
          name={preset.icon}
          size={20}
          color={selected ? Colors.light.surface : Colors.light.muted}
        />
      </View>
      <View style={styles.presetInfo}>
        <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]}>
          {preset.label}
        </Text>
        <Text style={styles.presetDescription}>{preset.description}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

function TierTable({ tiers }: { tiers: RefundTier[] }) {
  const sorted = [...tiers].sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);

  return (
    <View style={styles.tierTable}>
      {/* Header */}
      <View style={styles.tierHeaderRow}>
        <Text style={[styles.tierHeaderCell, { flex: 2 }]}>Cancellation window</Text>
        <Text style={[styles.tierHeaderCell, { flex: 1, textAlign: 'right' }]}>Refund</Text>
      </View>
      {/* Rows */}
      {sorted.map((tier, idx) => {
        const isLast = idx === sorted.length - 1;
        const refundColor =
          tier.refundPercentage >= 75
            ? Colors.light.success
            : tier.refundPercentage >= 25
              ? Colors.light.warning
              : Colors.light.error;

        return (
          <View
            key={`${tier.hoursBeforeSession}-${tier.refundPercentage}`}
            style={[styles.tierRow, !isLast && styles.tierRowBorder]}
          >
            <Text style={[styles.tierCell, { flex: 2 }]}>{tier.description}</Text>
            <View style={[styles.tierBadge, { backgroundColor: refundColor + '18' }]}>
              <Text style={[styles.tierBadgeText, { color: refundColor }]}>
                {tier.refundPercentage}%
              </Text>
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
  return (
    <View style={styles.editableTierRow}>
      <View style={styles.editableTierFields}>
        <View style={styles.editableField}>
          <Text style={styles.editableFieldLabel}>Hours before</Text>
          <TextInput
            style={styles.editableInput}
            value={String(tier.hoursBeforeSession)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= 0) onUpdate(index, 'hoursBeforeSession', num);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.light.border}
          />
        </View>
        <View style={styles.editableField}>
          <Text style={styles.editableFieldLabel}>Refund %</Text>
          <TextInput
            style={styles.editableInput}
            value={String(tier.refundPercentage)}
            onChangeText={(text) => {
              const num = parseInt(text, 10);
              if (!isNaN(num) && num >= 0 && num <= 100) onUpdate(index, 'refundPercentage', num);
            }}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={Colors.light.border}
          />
        </View>
      </View>
      <TextInput
        style={styles.editableDescInput}
        value={tier.description}
        onChangeText={(text) => onUpdate(index, 'description', text)}
        placeholder="Description for this tier"
        placeholderTextColor={Colors.light.border}
      />
      {canRemove && (
        <Pressable style={styles.removeTierButton} onPress={() => onRemove(index)}>
          <Ionicons name="trash-outline" size={16} color={Colors.light.error} />
          <Text style={styles.removeTierText}>Remove</Text>
        </Pressable>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.text} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>Cancellation Policy</Text>
        <Text style={styles.headerSubtitle}>
          Choose a preset or create a custom policy. Parents will see this before booking.
        </Text>
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
        <Text style={styles.sectionTitle}>Refund tiers</Text>
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
          <Pressable style={styles.addTierButton} onPress={addCustomTier}>
            <Ionicons name="add-circle-outline" size={18} color={Colors.light.tint} />
            <Text style={styles.addTierText}>Add tier</Text>
          </Pressable>
        </View>
      )}

      {/* Save button */}
      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={Colors.light.surface} />
        ) : (
          <Text style={styles.saveButtonText}>Save policy</Text>
        )}
      </Pressable>

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
    backgroundColor: Colors.light.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    color: Colors.light.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.light.muted,
  },

  // Presets
  presetsContainer: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  presetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  presetCardSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.surface,
  },
  presetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  presetIconCircleSelected: {
    backgroundColor: Colors.light.tint,
  },
  presetInfo: {
    flex: 1,
  },
  presetLabel: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  presetLabelSelected: {
    color: Colors.light.tint,
  },
  presetDescription: {
    ...Typography.small,
    color: Colors.light.muted,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  radioOuterSelected: {
    borderColor: Colors.light.tint,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.tint,
  },

  // Section
  sectionHeader: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading,
    color: Colors.light.text,
  },

  // Tier table
  tierTable: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    ...Shadows.light.card,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  tierHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    backgroundColor: Colors.light.background,
  },
  tierHeaderCell: {
    ...Typography.caption,
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 12,
  },
  tierRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  tierCell: {
    ...Typography.body,
    color: Colors.light.text,
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  tierBadgeText: {
    ...Typography.bodySemiBold,
    fontSize: 13,
  },

  // Custom tiers editor
  customTiersContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  editableTierRow: {
    backgroundColor: Colors.light.surface,
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
    color: Colors.light.muted,
    marginBottom: 4,
  },
  editableInput: {
    height: 40,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
    color: Colors.light.text,
  },
  editableDescInput: {
    height: 40,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: Spacing.xs,
    ...Typography.body,
    color: Colors.light.text,
    marginBottom: Spacing.xs,
  },
  removeTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
  },
  removeTierText: {
    ...Typography.small,
    color: Colors.light.error,
  },
  addTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.light.border,
    borderRadius: Radii.card,
  },
  addTierText: {
    ...Typography.bodySemiBold,
    color: Colors.light.tint,
  },

  // Save button
  saveButton: {
    height: Components.button.height,
    backgroundColor: Colors.light.tint,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.bodySemiBold,
    color: Colors.light.surface,
  },

  bottomSpacer: {
    height: Spacing.lg,
  },
});
