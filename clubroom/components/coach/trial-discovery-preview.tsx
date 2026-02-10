import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { TrialOffering } from '@/services/trial-service';
import { Row } from '@/components/primitives';

export function FieldLabel({ label, hint, palette }: { label: string; hint?: string; palette: ThemeColors }) {
  return (
    <View style={styles.fieldLabelContainer}>
      <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>{label}</ThemedText>
      {hint ? (
        <ThemedText style={[Typography.small, { color: palette.muted }]}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

export function TrialDiscoveryPreview({
  offering,
  coachName,
  palette,
}: {
  offering: Partial<TrialOffering>;
  coachName: string;
  palette: ThemeColors;
}) {
  return (
    <View style={styles.previewSection}>
      <ThemedText style={[Typography.heading, { color: palette.text, marginBottom: Spacing.sm }]}>
        Discovery Preview
      </ThemedText>
      <SurfaceCard style={styles.previewCard}>
        <Row style={styles.previewHeader}>
          <View style={[styles.previewAvatar, { backgroundColor: palette.tint }]}>
            <ThemedText style={{ ...Typography.subheading, color: palette.onPrimary }}>
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
        </Row>

        {offering.enabled ? (
          <Row style={[styles.previewTrialBadge, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
            <Ionicons name="flash-outline" size={Components.icon.sm} color={palette.success} />
            <ThemedText style={[Typography.bodySemiBold, { color: palette.success }]}>
              Trial Session Available
            </ThemedText>
          </Row>
        ) : null}

        <Row style={styles.previewPricing}>
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
              <View style={[styles.previewSavingBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
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
        </Row>

        {offering.description ? (
          <ThemedText style={[Typography.small, { color: palette.muted }]} numberOfLines={2}>
            {offering.description}
          </ThemedText>
        ) : null}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldLabelContainer: {
    gap: Spacing.micro,
  },
  previewSection: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
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
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  previewPricing: {
    alignItems: 'baseline',
    gap: Spacing.xs,
  },
  previewSavingBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
});

