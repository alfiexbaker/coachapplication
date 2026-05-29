import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { DemoBanner } from '@/utils/demo-mode';
import { isDemoMode } from '@/utils/demo-mode-helpers';
import { styles } from './analytics-screen-styles';

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

export const AnalyticsStatCard = function AnalyticsStatCard({
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
};

// ─── TopSkillsSection ────────────────────────────────────────────────────────

interface TopSkillsSectionProps {
  topSkills: [string, number][];
  palette: ThemeColors;
}

const renderTopSkillsSection = function renderTopSkillsSection({
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
};
export const TopSkillsSection = renderTopSkillsSection;

// ─── ScheduleInsightsSection ─────────────────────────────────────────────────

interface ScheduleInsightsSectionProps {
  busiestDay: string;
  palette: ThemeColors;
}

const renderScheduleInsightsSection = function renderScheduleInsightsSection({
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
};
export const ScheduleInsightsSection = renderScheduleInsightsSection;
