/**
 * Sprint 7B - Trial Session Editor
 *
 * Allows coaches to configure trial session offerings:
 * - Enable/disable trial sessions with a toggle
 * - Set trial price, normal price, duration, and family limit
 * - Add a description for the trial
 * - Preview how the trial appears in the discovery feed
 *
 * USER STORY:
 * "As a coach, I want to offer discounted trial sessions so new families
 * can experience my coaching before committing to regular bookings."
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components, Typography, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  trialService,
  type TrialOffering,
} from '@/services/trial-service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrialSessionEditorProps {
  onSave?: (offering: TrialOffering) => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FieldLabel({ label, hint, palette }: { label: string; hint?: string; palette: any }) {
  return (
    <View style={styles.fieldLabelContainer}>
      <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>{label}</ThemedText>
      {hint ? (
        <ThemedText style={[Typography.small, { color: palette.muted }]}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

function DiscoveryPreview({
  offering,
  coachName,
  palette,
}: {
  offering: Partial<TrialOffering>;
  coachName: string;
  palette: any;
}) {
  return (
    <View style={styles.previewSection}>
      <ThemedText style={[Typography.heading, { color: palette.text, marginBottom: Spacing.sm }]}>
        Discovery Preview
      </ThemedText>
      <SurfaceCard style={styles.previewCard}>
        {/* Coach info row */}
        <View style={styles.previewHeader}>
          <View style={[styles.previewAvatar, { backgroundColor: palette.tint }]}>
            <ThemedText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
              {coachName.split(' ').map((n) => n[0]).join('')}
            </ThemedText>
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              {coachName}
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              Football Coach
            </ThemedText>
          </View>
        </View>

        {/* Trial badge */}
        {offering.enabled ? (
          <View style={[styles.previewTrialBadge, { backgroundColor: `${palette.success}12` }]}>
            <Ionicons name="flash-outline" size={Components.icon.sm} color={palette.success} />
            <ThemedText style={[Typography.bodySemiBold, { color: palette.success }]}>
              Trial Session Available
            </ThemedText>
          </View>
        ) : null}

        {/* Pricing comparison */}
        <View style={styles.previewPricing}>
          {offering.enabled ? (
            <>
              <ThemedText style={[Typography.title, { color: palette.tint }]}>
                {'\u00A3'}{offering.trialPrice ?? 0}
              </ThemedText>
              <ThemedText
                style={[
                  Typography.body,
                  {
                    color: palette.muted,
                    textDecorationLine: 'line-through',
                  },
                ]}
              >
                {'\u00A3'}{offering.normalPrice ?? 0}
              </ThemedText>
              <View style={[styles.previewSavingBadge, { backgroundColor: `${palette.success}15` }]}>
                <ThemedText style={[Typography.caption, { color: palette.success }]}>
                  Save {'\u00A3'}{(offering.normalPrice ?? 0) - (offering.trialPrice ?? 0)}
                </ThemedText>
              </View>
            </>
          ) : (
            <ThemedText style={[Typography.title, { color: palette.tint }]}>
              {'\u00A3'}{offering.normalPrice ?? 0}
            </ThemedText>
          )}
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            / {offering.durationMinutes ?? 60} min
          </ThemedText>
        </View>

        {/* Description */}
        {offering.description ? (
          <ThemedText style={[Typography.small, { color: palette.muted }]} numberOfLines={2}>
            {offering.description}
          </ThemedText>
        ) : null}
      </SurfaceCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TrialSessionEditor({ onSave, onBack }: TrialSessionEditorProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const coachId = currentUser?.id ?? '';
  const coachName = currentUser?.name ?? 'Coach';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [trialPrice, setTrialPrice] = useState('15');
  const [normalPrice, setNormalPrice] = useState('45');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [limitPerFamily, setLimitPerFamily] = useState('1');
  const [description, setDescription] = useState(
    'Try a session with no commitment. See if we are the right fit for your child.'
  );

  // -----------------------------------------------------------------------
  // Load existing offering
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  const handleSave = useCallback(async () => {
    const parsedTrialPrice = parseFloat(trialPrice);
    const parsedNormalPrice = parseFloat(normalPrice);
    const parsedDuration = parseInt(durationMinutes, 10);
    const parsedLimit = parseInt(limitPerFamily, 10);

    if (enabled) {
      if (isNaN(parsedTrialPrice) || parsedTrialPrice < 0) {
        Alert.alert('Invalid Price', 'Please enter a valid trial price.');
        return;
      }
      if (isNaN(parsedNormalPrice) || parsedNormalPrice <= 0) {
        Alert.alert('Invalid Price', 'Please enter a valid normal price.');
        return;
      }
      if (parsedTrialPrice >= parsedNormalPrice) {
        Alert.alert('Invalid Pricing', 'Trial price should be less than the normal price.');
        return;
      }
      if (isNaN(parsedDuration) || parsedDuration < 15) {
        Alert.alert('Invalid Duration', 'Session duration must be at least 15 minutes.');
        return;
      }
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        Alert.alert('Invalid Limit', 'Limit per family must be at least 1.');
        return;
      }
    }

    setSaving(true);
    try {
      const offering = await trialService.upsertTrialOffering(coachId, {
        enabled,
        trialPrice: parsedTrialPrice || 0,
        normalPrice: parsedNormalPrice || 0,
        durationMinutes: parsedDuration || 60,
        limitPerFamily: parsedLimit || 1,
        description,
      });
      onSave?.(offering);
      Alert.alert('Saved', enabled ? 'Trial session offering is now live.' : 'Trial sessions have been disabled.');
    } catch {
      Alert.alert('Error', 'Failed to save trial settings. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [enabled, trialPrice, normalPrice, durationMinutes, limitPerFamily, description, coachId, onSave]);

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

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
      {/* Header */}
      <View style={styles.headerArea}>
        <ThemedText style={[Typography.title, { color: palette.text }]}>Trial Sessions</ThemedText>
        <ThemedText style={[Typography.body, { color: palette.muted, marginTop: Spacing.xs / 2 }]}>
          Offer discounted first sessions to attract new families. Parents can only use a trial once per family.
        </ThemedText>
      </View>

      {/* Enable toggle */}
      <SurfaceCard style={styles.toggleCard}>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              Enable Trial Sessions
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              {enabled ? 'Trial sessions are visible to parents' : 'Trial sessions are hidden'}
            </ThemedText>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ false: palette.border, true: `${palette.success}80` }}
            thumbColor={enabled ? palette.success : palette.surface}
          />
        </View>
      </SurfaceCard>

      {/* Configuration fields */}
      {enabled ? (
        <SurfaceCard style={styles.fieldsCard}>
          {/* Trial Price */}
          <FieldLabel label="Trial Price" hint="What you charge for the trial" palette={palette} />
          <View style={[styles.inputRow, { borderColor: palette.border }]}>
            <ThemedText style={[Typography.body, { color: palette.muted }]}>{'\u00A3'}</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={trialPrice}
              onChangeText={setTrialPrice}
              keyboardType="decimal-pad"
              placeholder="15"
              placeholderTextColor={palette.muted}
            />
          </View>

          {/* Normal Price */}
          <FieldLabel label="Normal Session Price" hint="Your regular rate for comparison" palette={palette} />
          <View style={[styles.inputRow, { borderColor: palette.border }]}>
            <ThemedText style={[Typography.body, { color: palette.muted }]}>{'\u00A3'}</ThemedText>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={normalPrice}
              onChangeText={setNormalPrice}
              keyboardType="decimal-pad"
              placeholder="45"
              placeholderTextColor={palette.muted}
            />
          </View>

          {/* Duration */}
          <FieldLabel label="Duration" hint="Length of the trial session" palette={palette} />
          <View style={[styles.inputRow, { borderColor: palette.border }]}>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="number-pad"
              placeholder="60"
              placeholderTextColor={palette.muted}
            />
            <ThemedText style={[Typography.body, { color: palette.muted }]}>minutes</ThemedText>
          </View>

          {/* Limit per family */}
          <FieldLabel label="Limit per Family" hint="How many trial sessions each family can book" palette={palette} />
          <View style={[styles.inputRow, { borderColor: palette.border }]}>
            <TextInput
              style={[styles.input, { color: palette.text }]}
              value={limitPerFamily}
              onChangeText={setLimitPerFamily}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={palette.muted}
            />
            <ThemedText style={[Typography.body, { color: palette.muted }]}>session(s)</ThemedText>
          </View>

          {/* Description */}
          <FieldLabel label="Description" hint="What parents will see about the trial" palette={palette} />
          <TextInput
            style={[styles.descriptionInput, { borderColor: palette.border, color: palette.text }]}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholder="Describe your trial offering..."
            placeholderTextColor={palette.muted}
            textAlignVertical="top"
          />
        </SurfaceCard>
      ) : null}

      {/* Discovery Preview */}
      <DiscoveryPreview offering={currentOffering} coachName={coachName} palette={palette} />

      {/* Save Button */}
      <Clickable
        style={[styles.saveButton, { backgroundColor: palette.tint }, saving && styles.saveButtonDisabled]}
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

  // Toggle
  toggleCard: {
    marginBottom: Spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  // Fields
  fieldsCard: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  fieldLabelContainer: {
    gap: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    height: Components.input.height,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
  },
  input: {
    flex: 1,
    height: Components.input.height,
    ...Typography.body,
  },
  descriptionInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body,
  },

  // Preview
  previewSection: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewAvatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTrialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  previewPricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  previewSavingBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },

  // Save
  saveButton: {
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    marginHorizontal: Spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },

  bottomSpacer: {
    height: Spacing.lg,
  },
});
