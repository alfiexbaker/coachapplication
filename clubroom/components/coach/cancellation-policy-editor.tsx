/**
 * CancellationPolicyEditor — Composition root.
 * Coaches choose preset or custom cancellation policies with refund tiers.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { schedulingRulesService, POLICY_TEMPLATES } from '@/services/scheduling-rules-service';
import type { CancellationPolicy, RefundTier } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { PRESETS, type PresetKey } from './cancellation-policy-helpers';
import { PresetCard, TierTable, EditableTierRow } from './cancellation-policy-cards';

interface CancellationPolicyEditorProps {
  onSave?: (policy: CancellationPolicy) => void;
  onBack?: () => void;
}

export default function CancellationPolicyEditor({ onSave }: CancellationPolicyEditorProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('standard');
  const [customTiers, setCustomTiers] = useState<RefundTier[]>([
    { hoursBeforeSession: 24, refundPercentage: 100, description: 'Full refund 24+ hours before' },
    { hoursBeforeSession: 0, refundPercentage: 0, description: 'No refund less than 24 hours before' },
  ]);

  useEffect(() => {
    (async () => {
      try {
        const existing = await schedulingRulesService.getCancellationPolicy(coachId);
        if (existing) {
          const matched = (['flexible', 'standard', 'strict'] as const).find(k => POLICY_TEMPLATES[k].name === existing.name);
          setSelectedPreset(matched ?? 'custom');
          if (!matched) setCustomTiers(existing.tiers);
        }
      } catch { /* defaults fine */ } finally { setLoading(false); }
    })();
  }, [coachId]);

  const displayTiers: RefundTier[] = selectedPreset === 'custom' ? customTiers : (POLICY_TEMPLATES[selectedPreset]?.tiers ?? []);

  const updateCustomTier = useCallback((index: number, field: keyof RefundTier, value: string | number) => {
    setCustomTiers(prev => { const next = [...prev]; next[index] = { ...next[index], [field]: value }; return next; });
  }, []);
  const removeCustomTier = useCallback((index: number) => setCustomTiers(prev => prev.filter((_, i) => i !== index)), []);
  const addCustomTier = useCallback(() => setCustomTiers(prev => [...prev, { hoursBeforeSession: 0, refundPercentage: 0, description: '' }]), []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const policy = await schedulingRulesService.setCancellationPolicy(coachId, selectedPreset === 'custom' ? 'custom' : selectedPreset, selectedPreset === 'custom' ? customTiers : undefined);
      onSave?.(policy);
      Alert.alert('Policy saved', 'Your cancellation policy has been updated.');
    } catch { Alert.alert('Error', 'Failed to save cancellation policy. Please try again.'); }
    finally { setSaving(false); }
  }, [coachId, selectedPreset, customTiers, onSave]);

  if (loading) {
    return <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}><ActivityIndicator size="large" color={palette.tint} /></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: palette.background }]} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.headerArea}>
        <ThemedText style={[styles.headerTitle, { color: palette.text }]}>Cancellation Policy</ThemedText>
        <ThemedText style={[styles.headerSubtitle, { color: palette.muted }]}>Choose a preset or create a custom policy. Parents will see this before booking.</ThemedText>
      </View>

      <View style={styles.presetsContainer}>
        {PRESETS.map(preset => <PresetCard key={preset.key} preset={preset} selected={selectedPreset === preset.key} onPress={() => setSelectedPreset(preset.key)} />)}
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>Refund tiers</ThemedText>
      </View>

      {selectedPreset !== 'custom' ? (
        <TierTable tiers={displayTiers} />
      ) : (
        <View style={styles.customTiersContainer}>
          {customTiers.map((tier, idx) => <EditableTierRow key={idx} tier={tier} index={idx} onUpdate={updateCustomTier} onRemove={removeCustomTier} canRemove={customTiers.length > 1} />)}
          <Clickable style={[styles.addTierButton, { borderColor: palette.border }]} onPress={addCustomTier}>
            <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.addTierText, { color: palette.tint }]}>Add tier</ThemedText>
          </Clickable>
        </View>
      )}

      <Clickable style={[styles.saveButton, { backgroundColor: palette.tint }, saving ? styles.saveButtonDisabled : undefined].filter(Boolean) as ViewStyle[]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color={palette.surface} /> : <ThemedText style={[styles.saveButtonText, { color: palette.surface }]}>Save policy</ThemedText>}
      </Clickable>
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerArea: { paddingHorizontal: Spacing.xs, marginBottom: Spacing.md },
  headerTitle: { ...Typography.title, marginBottom: Spacing.xs / 2 },
  headerSubtitle: { ...Typography.body },
  presetsContainer: { gap: Spacing.xs, marginBottom: Spacing.md },
  sectionHeader: { paddingHorizontal: Spacing.xs, marginBottom: Spacing.xs },
  sectionTitle: { ...Typography.heading },
  customTiersContainer: { gap: Spacing.sm, marginBottom: Spacing.md },
  addTierButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderWidth: 1, borderStyle: 'dashed', borderRadius: Radii.card },
  addTierText: { ...Typography.bodySemiBold },
  saveButton: { height: Components.button.height, borderRadius: Components.button.borderRadius, alignItems: 'center' as const, justifyContent: 'center' as const, marginTop: Spacing.sm },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { ...Typography.bodySemiBold },
  bottomSpacer: { height: Spacing.lg },
});
