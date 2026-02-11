import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SkillRating } from '@/hooks/use-dev-session';
import { AVAILABLE_SKILLS } from '@/hooks/use-dev-session';
import { Row } from '@/components/primitives';

export interface DevSessionSkillsProps {
  selectedSkills: string[];
  skillRatings: SkillRating[];
  onToggleSkill: (skill: string) => void;
  onUpdateRating: (skill: string, rating: number) => void;
  colors: ThemeColors;
}

export const DevSessionSkills = memo(function DevSessionSkills({
  selectedSkills,
  skillRatings,
  onToggleSkill,
  onUpdateRating,
  colors,
}: DevSessionSkillsProps) {
  return (
    <Column gap="md">
      <Column gap="sm">
        <ThemedText type="subtitle" style={Typography.subheading}>
          Skills Covered
        </ThemedText>
        <SurfaceCard style={{ padding: Spacing.md }}>
          <Row style={styles.grid}>
            {AVAILABLE_SKILLS.map((skill) => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <Clickable
                  key={skill}
                  onPress={() => onToggleSkill(skill)}
                  style={[
                    styles.skillBtn,
                    { backgroundColor: isSelected ? colors.tint : colors.surface },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.smallSemiBold,
                      { color: isSelected ? colors.onPrimary : colors.foreground },
                    ]}
                  >
                    {skill}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </SurfaceCard>
      </Column>

      {skillRatings.length > 0 && (
        <Column gap="sm">
          <ThemedText type="subtitle" style={Typography.subheading}>
            Skill Ratings (1-10)
          </ThemedText>
          <SurfaceCard style={{ padding: Spacing.md, gap: Spacing.md }}>
            {skillRatings.map((sr) => (
              <View key={sr.skill} style={{ gap: Spacing.xxs }}>
                <ThemedText style={Typography.bodySmallSemiBold}>{sr.skill}</ThemedText>
                <Row style={styles.ratingSlider}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <Clickable
                      key={num}
                      onPress={() => onUpdateRating(sr.skill, num)}
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            num <= sr.rating ? colors.tint : withAlpha(colors.muted, 0.19),
                        },
                      ]}
                    >
                      {num === sr.rating && (
                        <ThemedText style={[Typography.caption, { color: colors.onPrimary }]}>
                          {num}
                        </ThemedText>
                      )}
                    </Clickable>
                  ))}
                </Row>
              </View>
            ))}
          </SurfaceCard>
        </Column>
      )}
    </Column>
  );
});

const styles = StyleSheet.create({
  grid: { flexWrap: 'wrap', gap: Spacing.xs },
  skillBtn: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  ratingSlider: { justifyContent: 'space-between', alignItems: 'center' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
