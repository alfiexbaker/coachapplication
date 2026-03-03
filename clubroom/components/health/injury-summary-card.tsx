import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Injury } from '@/constants/types';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';

interface InjurySummaryCardProps {
  injury: Injury;
  colors: ThemeColors;
  delay?: number;
}

export const InjurySummaryCard = memo(function InjurySummaryCard({
  injury,
  colors,
  delay = 100,
}: InjurySummaryCardProps) {
  const severityInfo = injuryService.getSeverityInfo(injury.severity);
  const bodyPartLabel = injuryService.getBodyPartLabel(injury.bodyPart);
  const injuryName = getInjuryName(injury.description, bodyPartLabel);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <Row justify="space-between" align="flex-start" style={styles.header}>
          <ThemedText type="title">{bodyPartLabel}</ThemedText>
          <View
            style={[styles.severityBadge, { backgroundColor: withAlpha(severityInfo.color, 0.09) }]}
          >
            <ThemedText style={[styles.severityText, { color: severityInfo.color }]}>
              {severityInfo.label}
            </ThemedText>
          </View>
        </Row>
        <ThemedText style={[styles.description, { color: colors.muted }]}>{injuryName}</ThemedText>
        <Row gap="md" wrap>
          <Row gap="xxs" align="center">
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.muted }]}>
              {injuryService.formatDate(injury.occurredAt)}
            </ThemedText>
          </Row>
          {injury.sharedWithCoach && (
            <Row gap="xxs" align="center">
              <Ionicons name="share-social-outline" size={16} color={colors.tint} />
              <ThemedText style={[styles.metaText, { color: colors.tint }]}>
                Shared with coach
              </ThemedText>
            </Row>
          )}
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

function getInjuryName(description: string, bodyPartLabel: string): string {
  const normalized = description.trim();
  if (!normalized) return `${bodyPartLabel} injury`;

  const firstSentence = normalized.split(/[.!?]/)[0]?.trim() ?? normalized;
  const injuryMatch = firstSentence.match(/^(.{1,48}?\binjury\b)/i);
  if (injuryMatch?.[1]) return injuryMatch[1].trim();

  const words = firstSentence.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return firstSentence;
  return words.slice(0, 3).join(' ');
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.lg },
  header: { marginBottom: Spacing.sm },
  severityBadge: { paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  severityText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  description: {
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
    marginBottom: Spacing.md,
  },
  metaText: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
});
