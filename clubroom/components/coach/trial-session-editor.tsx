/**
 * Sprint 7B - Trial Session Editor
 *
 * Allows coaches to configure trial session offerings.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Switch, ActivityIndicator, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { trialService, type TrialOffering } from '@/services/trial-service';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { TrialDiscoveryPreview } from './trial-discovery-preview';

import { validateTrialForm, TrialFormFields } from './trial-session-editor-sections';
import { Row, Column } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';

// Re-export extracted components for backward compat
export { validateTrialForm, TrialFormFields } from './trial-session-editor-sections';
export type { TrialFormValues, TrialFormFieldsProps } from './trial-session-editor-sections';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrialSessionEditorProps {
  onSave?: (offering: TrialOffering) => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TrialSessionEditor({ onSave, onBack }: TrialSessionEditorProps) {
  const { colors: palette } = useTheme();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const coachName = currentUser?.name ?? 'Coach';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [trialPrice, setTrialPrice] = useState('15');
  const [normalPrice, setNormalPrice] = useState('45');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [limitPerFamily, setLimitPerFamily] = useState('1');
  const [description, setDescription] = useState(
    'Try a session with no commitment. See if we are the right fit for your child.',
  );

  useEffect(() => {
    (async () => {
      try {
        const existing = await trialService.getTrialOffering(coachId);
        if (existing) {
          setEnabled(existing.enabled);
          setTrialPrice(String(existing.trialPrice));
          setNormalPrice(String(existing.normalPrice));
          setDurationMinutes(String(existing.durationMinutes));
          setLimitPerFamily(String(existing.limitPerFamily));
          setDescription(existing.description);
        }
      } catch {
        // Defaults are fine
      } finally {
        setLoading(false);
      }
    })();
  }, [coachId]);

  const handleToggleEnabled = useCallback((newValue: boolean) => {
    if (newValue) {
      uiFeedback.alert(
        'Publish Trial Session',
        'Your trial session will be visible to:\n\n• New clients in discovery\n• On your public profile\n• In booking flows\n\nMake sure pricing and details are correct.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Publish', onPress: () => setEnabled(true) },
        ],
      );
    } else {
      uiFeedback.alert(
        'Hide Trial Session',
        'Your trial session will be hidden from:\n\n• Discovery search\n• Your public profile\n• New client booking flows\n\nExisting trial bookings will continue.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Hide', onPress: () => setEnabled(false) },
        ],
      );
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (enabled) {
      const error = validateTrialForm({
        trialPrice,
        normalPrice,
        durationMinutes,
        limitPerFamily,
        description,
      });
      if (error) {
        uiFeedback.alert('Validation Error', error);
        return;
      }
    }

    setSaving(true);
    try {
      const offering = await trialService.upsertTrialOffering(coachId, {
        enabled,
        trialPrice: parseFloat(trialPrice) || 0,
        normalPrice: parseFloat(normalPrice) || 0,
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        limitPerFamily: parseInt(limitPerFamily, 10) || 1,
        description,
      });
      onSave?.(offering);
      showToast(
        enabled ? 'Trial session is now live' : 'Trial sessions disabled',
        'success',
      );
    } catch {
      showToast('Failed to save trial settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    enabled,
    trialPrice,
    normalPrice,
    durationMinutes,
    limitPerFamily,
    description,
    coachId,
    onSave,
  ]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  const currentOffering: Partial<TrialOffering> = {
    enabled,
    trialPrice: parseFloat(trialPrice) || 0,
    normalPrice: parseFloat(normalPrice) || 0,
    durationMinutes: parseInt(durationMinutes, 10) || 60,
    description,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: palette.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <ThemedText style={[Typography.title, { color: palette.text }]}>Trial Sessions</ThemedText>
        <ThemedText style={[Typography.body, { color: palette.muted, marginTop: Spacing.xs / 2 }]}>
          Offer discounted first sessions to attract new families. Parents can only use a trial once
          per family.
        </ThemedText>
      </View>

      <SurfaceCard style={styles.toggleCard}>
        <Row style={styles.toggleRow}>
          <Column flex>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              Enable Trial Sessions
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              {enabled ? 'Trial sessions are visible to parents' : 'Trial sessions are hidden'}
            </ThemedText>
          </Column>
          <Switch
            value={enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: palette.border, true: withAlpha(palette.success, 0.5) }}
            thumbColor={enabled ? palette.success : palette.surface}
          />
        </Row>
      </SurfaceCard>

      {enabled && (
        <TrialFormFields
          trialPrice={trialPrice}
          normalPrice={normalPrice}
          durationMinutes={durationMinutes}
          limitPerFamily={limitPerFamily}
          description={description}
          onTrialPriceChange={setTrialPrice}
          onNormalPriceChange={setNormalPrice}
          onDurationChange={setDurationMinutes}
          onLimitChange={setLimitPerFamily}
          onDescriptionChange={setDescription}
          palette={palette}
        />
      )}

      <TrialDiscoveryPreview offering={currentOffering} coachName={coachName} palette={palette} />

      <Clickable
        style={
          [
            styles.saveButton,
            { backgroundColor: palette.tint },
            saving ? styles.saveButtonDisabled : undefined,
          ].filter(Boolean) as ViewStyle[]
        }
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color={palette.surface} />
        ) : (
          <ThemedText style={[Typography.bodySemiBold, { color: palette.surface }]}>
            Save Trial Settings
          </ThemedText>
        )}
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
  toggleCard: { marginBottom: Spacing.sm },
  toggleRow: { alignItems: 'center', gap: Spacing.sm },
  saveButton: {
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginHorizontal: Spacing.xs,
  },
  saveButtonDisabled: { opacity: 0.6 },
  bottomSpacer: { height: Spacing.lg },
});
