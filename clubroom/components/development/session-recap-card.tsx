import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

/* ---------- Sub-components ---------- */

function StarRow({
  rating,
  palette,
}: {
  rating: number;
  palette: Palette;
}) {
  return (
    <View style={starStyles.row}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Ionicons
          key={i}
          name={i < rating ? 'star' : 'star-outline'}
          size={18}
          color={i < rating ? palette.warning : palette.border}
        />
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 2 },
});

type Palette = (typeof Colors)['light'];

/* ---------- Component ---------- */

export function SessionRecapCard({
  recap,
  onShareWithFamily,
  onSave,
}: SessionRecapCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
        <View style={[styles.focusPill, { backgroundColor: `${palette.tint}10`, borderColor: palette.border }]}>
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
        <View style={[styles.badgeBanner, { backgroundColor: `${palette.warning}15`, borderColor: `${palette.warning}40` }]}>
          <Ionicons name="ribbon" size={20} color={palette.warning} />
          <View style={styles.badgeText}>
            <ThemedText style={[styles.badgeLabel, { color: palette.warning }]}>
              Badge Earned!
            </ThemedText>
            <ThemedText type="defaultSemiBold">{recap.badgeEarned}</ThemedText>
          </View>
        </View>
      ) : null}

      {/* Action buttons */}
      <View style={styles.actions}>
        {onShareWithFamily && (
          <Clickable onPress={onShareWithFamily} accessibilityLabel="Share with Family">
            <View style={[styles.button, { backgroundColor: palette.tint }]}>
              <Ionicons name="share-outline" size={18} color={palette.surface} />
              <ThemedText style={[styles.buttonText, { color: palette.surface }]}>
                Share with Family
              </ThemedText>
            </View>
          </Clickable>
        )}
        {onSave && (
          <Clickable onPress={onSave} accessibilityLabel="Save">
            <View
              style={[
                styles.button,
                styles.buttonOutline,
                { borderColor: palette.border },
              ]}
            >
              <Ionicons name="bookmark-outline" size={18} color={palette.tint} />
              <ThemedText style={[styles.buttonText, { color: palette.tint }]}>
                Save
              </ThemedText>
            </View>
          </Clickable>
        )}
      </View>

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
    gap: 2,
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
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  badgeText: {
    flex: 1,
    gap: 2,
  },
  badgeLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  buttonText: {
    ...Typography.bodySemiBold,
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
