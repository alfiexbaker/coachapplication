import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row, Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PublicReview } from '@/services/coach-service';
import { buildCoachReviewProofSummary } from '@/utils/coach-review-proof';

export const CoachReviewProofSummary = function CoachReviewProofSummary({
  reviews,
}: {
  reviews: PublicReview[];
}) {
  const { colors: palette } = useTheme();
  const summary = buildCoachReviewProofSummary(reviews);

  if (reviews.length === 0) {
    return null;
  }

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" gap="xs">
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.success} />
          <ThemedText type="defaultSemiBold">Proof from real sessions</ThemedText>
        </Row>

        <Row gap="sm">
          <ProofStat
            label="Verified"
            value={String(summary.verifiedReviewCount)}
            tone={palette.success}
          />
          <ProofStat label="Players" value={String(summary.athleteCount)} tone={palette.tint} />
          <ProofStat
            label="Avg rating"
            value={summary.averageRating > 0 ? summary.averageRating.toFixed(1) : '0.0'}
            tone={palette.warning}
          />
        </Row>

        {summary.recentSessionTypes.length > 0 ? (
          <Column gap="xxs">
            <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>
              Recent session types
            </ThemedText>
            <Row gap="xs" wrap>
              {summary.recentSessionTypes.map((label) => (
                <View
                  key={label}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: withAlpha(palette.tint, 0.08),
                      borderColor: withAlpha(palette.tint, 0.18),
                    },
                  ]}
                >
                  <ThemedText style={[styles.pillText, { color: palette.tint }]}>{label}</ThemedText>
                </View>
              ))}
            </Row>
          </Column>
        ) : null}

        {summary.strongestSignals.length > 0 ? (
          <Column gap="xxs">
            <ThemedText style={[styles.metaLabel, { color: palette.muted }]}>Most praised</ThemedText>
            <Row gap="xs" wrap>
              {summary.strongestSignals.map((label) => (
                <View
                  key={label}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: withAlpha(palette.success, 0.08),
                      borderColor: withAlpha(palette.success, 0.18),
                    },
                  ]}
                >
                  <ThemedText style={[styles.pillText, { color: palette.success }]}>
                    {label}
                  </ThemedText>
                </View>
              ))}
            </Row>
          </Column>
        ) : null}
      </Column>
    </SurfaceCard>
  );
};

function ProofStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={[styles.statCard, { backgroundColor: withAlpha(tone, 0.08) }]}>
      <ThemedText style={[styles.statValue, { color: tone }]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: tone }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statValue: { ...Typography.title },
  statLabel: { ...Typography.caption },
  metaLabel: { ...Typography.caption },
  pill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  pillText: { ...Typography.caption, fontWeight: '600' },
});
