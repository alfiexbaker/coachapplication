import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface TopSkill {
  skill: string;
  sessionCount: number;
  revenue: number;
}

interface AnalyticsTopSkillsProps {
  colors: ThemeColors;
  skills: TopSkill[];
  formatCurrency: (amount: number) => string;
}

export const AnalyticsTopSkills = memo(function AnalyticsTopSkills({
  colors,
  skills,
  formatCurrency,
}: AnalyticsTopSkillsProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="xs" align="center" style={styles.header}>
        <Ionicons name="football" size={20} color={colors.tint} />
        <ThemedText style={styles.title}>Top Skills Taught</ThemedText>
      </Row>
      <View style={styles.list}>
        {skills.map((skill, index) => (
          <Row key={skill.skill} align="center">
            <Row gap="xs" align="center" style={{ flex: 1 }}>
              <ThemedText style={styles.rank}>{index + 1}.</ThemedText>
              <ThemedText style={styles.name}>{skill.skill}</ThemedText>
            </Row>
            <Row gap={4} align="baseline" style={{ marginRight: Spacing.md }}>
              <ThemedText style={[styles.sessions, { color: colors.tint }]}>
                {skill.sessionCount}
              </ThemedText>
              <ThemedText style={[styles.sessionsLabel, { color: colors.muted }]}>
                sessions
              </ThemedText>
            </Row>
            <ThemedText style={[styles.revenue, { color: colors.success }]}>
              {formatCurrency(skill.revenue)}
            </ThemedText>
          </Row>
        ))}
      </View>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  header: { marginBottom: Spacing.md },
  title: { ...Typography.subheading },
  list: { gap: Spacing.md },
  rank: { ...Typography.bodySmallSemiBold, width: 24 },
  name: { ...Typography.bodySemiBold },
  sessions: { ...Typography.subheading },
  sessionsLabel: { ...Typography.caption },
  revenue: { ...Typography.bodySmallSemiBold, width: 60, textAlign: 'right' },
});
