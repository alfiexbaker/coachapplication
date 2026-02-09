import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { StarRow, BadgeBanner, RecapActions } from './session-recap-card-sections';
export type { StarRowProps, BadgeBannerProps, RecapActionsProps } from './session-recap-card-sections';

import { StarRow, BadgeBanner, RecapActions } from './session-recap-card-sections';

/* ---------- Types ---------- */

export interface SessionRecapData {
  athleteName: string;
  date: string;
  coachName: string;
  focusArea: string;
  effortRating: number; // 1-5
  improvements: string[];
  nextSteps: string[];
  badgeEarned?: string;
}

export interface SessionRecapCardProps {
  recap: SessionRecapData;
  onShareWithFamily?: () => void;
  onSave?: () => void;
}

/* ---------- Component ---------- */

export function SessionRecapCard({
  recap,
  onShareWithFamily,
  onSave,
}: SessionRecapCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: palette.tint }]}>
          <Ionicons name="football" size={20} color={palette.surface} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" style={styles.athleteName}>
            {recap.athleteName}
          </ThemedText>
          <ThemedText style={[styles.meta, { color: palette.muted }]}>
            {recap.date} &middot; Coach {recap.coachName}
          </ThemedText>
        </View>
      </View>

      {/* Focus area */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
          FOCUS AREA
        </ThemedText>
        <View style={[styles.focusPill, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.border }]}>
          <Ionicons name="flash-outline" size={14} color={palette.tint} />
          <ThemedText type="defaultSemiBold" style={[styles.focusText, { color: palette.tint }]}>
            {recap.focusArea}
          </ThemedText>
        </View>
      </View>

      {/* Effort rating */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
          EFFORT RATING
        </ThemedText>
        <StarRow rating={recap.effortRating} palette={palette} />
      </View>

      {/* Improvements */}
      {recap.improvements.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            IMPROVEMENTS
          </ThemedText>
          {recap.improvements.map((item, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={styles.bulletText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Next steps */}
      {recap.nextSteps.length > 0 && (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
            NEXT STEPS
          </ThemedText>
          {recap.nextSteps.map((item, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <Ionicons name="arrow-forward-circle-outline" size={16} color={palette.tint} />
              <ThemedText style={styles.bulletText}>{item}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Badge earned */}
      {recap.badgeEarned ? (
        <BadgeBanner badgeName={recap.badgeEarned} palette={palette} />
      ) : null}

      {/* Action buttons */}
      <RecapActions
        onShareWithFamily={onShareWithFamily}
        onSave={onSave}
        palette={palette}
      />

      {/* Branding */}
      <View style={[styles.branding, { borderTopColor: palette.border }]}>
        <Ionicons name="football-outline" size={14} color={palette.muted} />
        <ThemedText style={[styles.brandText, { color: palette.muted }]}>
          Clubroom
        </ThemedText>
      </View>
    </SurfaceCard>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: Spacing.micro,
  },
  athleteName: {
    ...Typography.heading,
  },
  meta: {
    ...Typography.caption,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: {
    ...Typography.micro,
  },
  focusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  focusText: {
    ...Typography.small,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  bulletText: {
    ...Typography.body,
    flex: 1,
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  brandText: {
    ...Typography.caption,
  },
});
