/**
 * Extracted sub-components for CoachAnalyticsScreen.
 *
 * AnalyticsStatCard — single stat card (sessions, clients, rating, revenue).
 * TopSkillsSection — ranked skills list.
 * ScheduleInsightsSection — busiest day insight.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { DemoBanner, isDemoMode } from '@/utils/demo-mode';

// ─── AnalyticsStatCard ───────────────────────────────────────────────────────

interface AnalyticsStatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string | number;
  label: string;
  changeIcon?: keyof typeof Ionicons.glyphMap;
  changeColor?: string;
  changeText: string;
  palette: ThemeColors;
}

export const AnalyticsStatCard = memo(function AnalyticsStatCard({
  icon,
  iconColor,
  value,
  label,
  changeIcon,
  changeColor,
  changeText,
  palette,
}: AnalyticsStatCardProps) {
  return (
    <SurfaceCard style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: withAlpha(iconColor, 0.12) }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <ThemedText type="title" style={styles.statNumber}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>{label}</ThemedText>
      <Row style={styles.change}>
        {changeIcon && changeColor && <Ionicons name={changeIcon} size={14} color={changeColor} />}
        <ThemedText style={[styles.changeText, { color: palette.muted }]}>{changeText}</ThemedText>
      </Row>
    </SurfaceCard>
  );
});

// ─── TopSkillsSection ────────────────────────────────────────────────────────

interface TopSkillsSectionProps {
  topSkills: [string, number][];
  palette: ThemeColors;
}

export const TopSkillsSection = memo(function TopSkillsSection({
  topSkills,
  palette,
}: TopSkillsSectionProps) {
  if (topSkills.length === 0) return null;

  return (
    <SurfaceCard style={styles.section}>
      <Row style={styles.sectionHeader}>
        <Ionicons name="football" size={20} color={palette.tint} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Top Skills Taught
        </ThemedText>
      </Row>
      <View style={styles.skillsList}>
        {topSkills.map(([skill, count], index) => (
          <Row key={skill} style={styles.skillRow}>
            <Row style={styles.skillInfo}>
              <ThemedText type="defaultSemiBold" style={styles.skillRank}>
                {index + 1}.
              </ThemedText>
              <ThemedText style={styles.skillName}>{skill}</ThemedText>
            </Row>
            <Row style={styles.skillCount}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.skillCountText, { color: palette.tint }]}
              >
                {count}
              </ThemedText>
              <ThemedText style={[styles.skillCountLabel, { color: palette.muted }]}>
                sessions
              </ThemedText>
            </Row>
          </Row>
        ))}
      </View>
    </SurfaceCard>
  );
});

// ─── ScheduleInsightsSection ─────────────────────────────────────────────────

interface ScheduleInsightsSectionProps {
  busiestDay: string;
  palette: ThemeColors;
}

export const ScheduleInsightsSection = memo(function ScheduleInsightsSection({
  busiestDay,
  palette,
}: ScheduleInsightsSectionProps) {
  if (busiestDay === 'N/A') return null;
  const demoMode = isDemoMode();

  return (
    <SurfaceCard style={styles.section}>
      {demoMode ? (
        <DemoBanner message="Analytics insights shown here may use demo data in mock mode." />
      ) : null}
      <Row style={styles.sectionHeader}>
        <Ionicons name="calendar-outline" size={20} color={palette.tint} />
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Schedule Insights
        </ThemedText>
      </Row>
      <Row style={styles.insightRow}>
        <ThemedText style={{ color: palette.muted }}>Busiest Day</ThemedText>
        <ThemedText type="defaultSemiBold">{busiestDay}</ThemedText>
      </Row>
    </SurfaceCard>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.display, letterSpacing: -0.8 },
  subtitle: {
    ...Typography.body,
    fontWeight: '500',
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statNumber: { ...Typography.display },
  statLabel: {
    ...Typography.smallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  change: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    marginTop: Spacing.xs / 2,
  },
  changeText: { ...Typography.caption },
  section: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.subheading },
  skillsList: {
    gap: Spacing.md,
  },
  skillRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillInfo: {
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  skillRank: { ...Typography.bodySmall, width: 24 },
  skillName: { ...Typography.body },
  skillCount: {
    alignItems: 'baseline',
    gap: Spacing.xs / 2,
  },
  skillCountText: { ...Typography.heading },
  skillCountLabel: { ...Typography.caption },
  insightRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
