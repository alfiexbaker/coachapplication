/**
 * SkillsProgressCard — Shows top skills with progress bars.
 *
 * Renders skill name, level number, and a horizontal progress bar
 * for each skill in the provided list.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface SkillItem {
  skill: string;
  level: number;
}

interface SkillsProgressCardProps {
  skills: SkillItem[];
}

export const SkillsProgressCard = memo(function SkillsProgressCard({
  skills,
}: SkillsProgressCardProps) {
  const { colors: palette } = useTheme();

  return (
    <Column gap="sm">
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Skills
      </ThemedText>
      <SurfaceCard style={styles.card}>
        {skills.map((item, index) => (
          <Column key={item.skill} gap="xs">
            <Row justify="between" align="center">
              <ThemedText style={styles.skillName}>{item.skill}</ThemedText>
              <ThemedText style={styles.skillLevel}>{item.level}</ThemedText>
            </Row>
            <View style={[styles.skillBar, { backgroundColor: palette.border }]}>
              <View
                style={[
                  styles.skillFill,
                  { backgroundColor: palette.tint, width: `${item.level}%` },
                ]}
              />
            </View>
            {index < skills.length - 1 && (
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
            )}
          </Column>
        ))}
      </SurfaceCard>
    </Column>
  );
});

const styles = StyleSheet.create({
  sectionTitle: {
    paddingLeft: Spacing.xs,
  },
  card: {
    padding: Spacing.lg,
  },
  skillName: {
    ...Typography.bodySemiBold,
  },
  skillLevel: {
    ...Typography.bodySmallSemiBold,
  },
  skillBar: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  skillFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.sm,
  },
});
