/**
 * Sprint 7B - Trial Session Editor
 *
 * Allows coaches to configure trial session offerings.
 */

import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Switch, ActivityIndicator, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { trialService, type TrialOffering } from '@/services/trial-service';
import { useTheme } from '@/hooks/useTheme';
import { useToast } from '@/components/ui/toast';
import { ErrorState } from '@/components/ui/screen-states';
import { TrialDiscoveryPreview } from './trial-discovery-preview';

import { TrialFormFields } from './trial-session-editor-sections';
import { validateTrialForm } from './trial-session-editor-helpers';
import { Row, Column } from '@/components/primitives';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrialSessionEditorProps {
  onSave?: (offering: TrialOffering) => void;
  onBack?: () => void;
}

const DEFAULT_TRIAL_FORM = {
  enabled: false,
  trialPrice: '15',
  normalPrice: '45',
  durationMinutes: '60',
  limitPerFamily: '1',
  description: 'Try a session with no commitment. See if we are the right fit for your child.',
} as const;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TrialSessionEditor({ onSave, onBack }: TrialSessionEditorProps) {
  const { colors: palette } = useTheme();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const coachName = currentUser?.name ?? 'Coach';
  const trialSettingsWritable = Boolean(coachId);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState<boolean>(DEFAULT_TRIAL_FORM.enabled);
  const [trialPrice, setTrialPrice] = useState<string>(DEFAULT_TRIAL_FORM.trialPrice);
  const [normalPrice, setNormalPrice] = useState<string>(DEFAULT_TRIAL_FORM.normalPrice);
  const [durationMinutes, setDurationMinutes] = useState<string>(
    DEFAULT_TRIAL_FORM.durationMinutes,
  );
  const [limitPerFamily, setLimitPerFamily] = useState<string>(DEFAULT_TRIAL_FORM.limitPerFamily);
  const [description, setDescription] = useState<string>(DEFAULT_TRIAL_FORM.description);

  useEffect(() => {
    if (!coachId) {
      setLoadError(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(null);
    void runAsyncTryCatchFinally(
      async () => {
        const existing = await trialService.getTrialOffering(coachId);
        if (!active) return;
        setEnabled(existing?.enabled ?? DEFAULT_TRIAL_FORM.enabled);
        setTrialPrice(String(existing?.trialPrice ?? DEFAULT_TRIAL_FORM.trialPrice));
        setNormalPrice(String(existing?.normalPrice ?? DEFAULT_TRIAL_FORM.normalPrice));
        setDurationMinutes(String(existing?.durationMinutes ?? DEFAULT_TRIAL_FORM.durationMinutes));
        setLimitPerFamily(String(existing?.limitPerFamily ?? DEFAULT_TRIAL_FORM.limitPerFamily));
        setDescription(existing?.description ?? DEFAULT_TRIAL_FORM.description);
      },
      async () => {
        if (active) {
          setLoadError('Trial settings could not be loaded.');
        }
      },
      () => {
        if (active) {
          setLoading(false);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [coachId, loadVersion]);

  const handleToggleEnabled = (newValue: boolean) => {
    if (!trialSettingsWritable) {
      showToast('Sign in to change trial settings.', 'error');
      return;
    }

    setEnabled(newValue);
    showToast(
      newValue
        ? 'Trial session enabled. Save to publish it.'
        : 'Trial session hidden. Save to apply changes.',
      'success',
    );
  };

  const handleSave = async () => {
    if (!trialSettingsWritable) {
      showToast('Sign in to save trial settings.', 'error');
      return;
    }

    if (enabled) {
      const error = validateTrialForm({
        trialPrice,
        normalPrice,
        durationMinutes,
        limitPerFamily,
        description,
      });
      if (error) {
        uiFeedback.showToast(error, 'error');
        return;
      }
    }

    setSaving(true);

    await runAsyncTryCatchFinally(
      async () => {
        const offering = await trialService.upsertTrialOffering(coachId, {
          enabled,
          trialPrice: parseFloat(trialPrice) || 0,
          normalPrice: parseFloat(normalPrice) || 0,
          durationMinutes: parseInt(durationMinutes, 10) || 60,
          limitPerFamily: parseInt(limitPerFamily, 10) || 1,
          description,
        });
        onSave?.(offering);
        showToast(enabled ? 'Trial session is now live' : 'Trial sessions disabled', 'success');
      },
      async (error) => {
        showToast('Failed to save trial settings', 'error');
      },
      () => {
        setSaving(false);
      },
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: palette.background }]}>
        <ErrorState
          title="Trial settings unavailable"
          message={loadError}
          onRetry={() => setLoadVersion((version) => version + 1)}
        />
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
              {!trialSettingsWritable
                ? 'Sign in to manage trial sessions'
                : enabled
                  ? 'Trial sessions are visible to parents'
                  : 'Trial sessions are hidden'}
            </ThemedText>
          </Column>
          <Switch
            value={enabled}
            onValueChange={handleToggleEnabled}
            disabled={!trialSettingsWritable}
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
            { backgroundColor: trialSettingsWritable ? palette.tint : palette.border },
            saving || !trialSettingsWritable ? styles.saveButtonDisabled : undefined,
          ].filter(Boolean) as ViewStyle[]
        }
        onPress={handleSave}
        disabled={saving || !trialSettingsWritable}
      >
        {saving ? (
          <ActivityIndicator size="small" color={palette.surface} />
        ) : (
          <ThemedText
            style={[
              Typography.bodySemiBold,
              { color: trialSettingsWritable ? palette.surface : palette.muted },
            ]}
          >
            {trialSettingsWritable ? 'Save Trial Settings' : 'Trial Settings Unavailable'}
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
  errorContainer: { flex: 1 },
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
