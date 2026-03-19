import { memo, useMemo, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { CORNER_COLORS } from '@/constants/four-corner-mapping';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MonthSummary, SessionMedia } from '@/types/progress-types';
import { AnimatedCounter } from './animated-counter';

export interface FamilyHighlightItem {
  athleteId: string;
  athleteName: string;
  sessionsAttended: number;
  streakWeeks: number;
  mostImprovedSkill?: string;
}

interface ParentValueSummaryProps {
  summary: MonthSummary;
  monthTitle?: string;
  media?: SessionMedia[];
  coachQuote?: string;
  coachQuotes?: string[];
  familyHighlights?: FamilyHighlightItem[];
  onShare?: () => void;
}

function buildFooterCopy(items: FamilyHighlightItem[]): string {
  const activeCount = items.filter(
    (item) =>
      item.sessionsAttended > 0 || item.streakWeeks > 0 || Boolean(item.mostImprovedSkill),
  ).length;
  if (activeCount <= 1) {
    return 'Progress is building this month.';
  }
  if (activeCount === 2) {
    return 'Both players are progressing!';
  }
  return 'Everyone is progressing in their own way!';
}

interface StatCardDef {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  color: string;
}

export const ParentValueSummary = memo(function ParentValueSummary({
  summary,
  monthTitle,
  media,
  coachQuote,
  coachQuotes,
  familyHighlights,
  onShare,
}: ParentValueSummaryProps) {
  const { colors } = useTheme();
  const showHighlights = familyHighlights && familyHighlights.length >= 2;
  const resolvedCoachQuotes = useMemo(() => {
    const fromList = (coachQuotes ?? []).map((quote) => quote.trim()).filter((quote) => quote.length > 0);
    if (fromList.length > 0) {
      return fromList.slice(0, 3);
    }
    return coachQuote?.trim() ? [coachQuote.trim()] : [];
  }, [coachQuote, coachQuotes]);

  const photoUris = useMemo(() => {
    if (!media?.length) return [];
    return media
      .flatMap((m) => m.photos)
      .filter((p) => p?.uri)
      .slice(0, 3)
      .map((p) => p.thumbnailUri || p.uri);
  }, [media]);

  const statCards = useMemo<StatCardDef[]>(() => [
    { icon: 'calendar', label: 'Sessions', value: summary.sessionsAttended, color: CORNER_COLORS.physical },
    { icon: 'trending-up', label: 'Skills Up', value: summary.skillsImproved, color: CORNER_COLORS.technical },
    { icon: 'ribbon', label: 'Badges', value: summary.badgesEarned, color: CORNER_COLORS.psychological },
    { icon: 'chatbubble-ellipses', label: 'Feedback', value: summary.feedbackCount, color: CORNER_COLORS.social },
  ], [summary]);

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" justify="between" gap="xs" wrap>
          <ThemedText style={styles.title}>
            {monthTitle ? `${monthTitle} Summary` : 'This Month'}
          </ThemedText>
          {onShare ? (
            <Clickable
              style={[
                styles.headerAction,
                {
                  backgroundColor: withAlpha(colors.success, 0.1),
                  borderColor: withAlpha(colors.success, 0.25),
                },
              ]}
              onPress={onShare}
              accessibilityLabel="Share progress report"
              accessibilityRole="button"
            >
              <Row align="center" justify="center" gap="xxs">
                <Ionicons name="share-outline" size={14} color={colors.success} />
                <ThemedText style={[styles.headerActionText, { color: colors.success }]}>
                  Share
                </ThemedText>
              </Row>
            </Clickable>
          ) : null}
        </Row>

        {photoUris.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photoStrip}
          >
            {photoUris.map((uri, index) => (
              <Image
                key={`photo-${index}`}
                source={{ uri }}
                style={styles.photoThumb}
                contentFit="cover"
                recyclingKey={`parent-photo-${index}`}
              />
            ))}
          </ScrollView>
        ) : null}

        <Column gap="xs">
          <Row gap="xs">
            {statCards.slice(0, 2).map((stat) => (
              <View
                key={stat.label}
                style={[styles.statCard, { backgroundColor: withAlpha(stat.color, 0.08), borderColor: withAlpha(stat.color, 0.2) }]}
              >
                <Column align="center" gap="xxs">
                  <Ionicons name={stat.icon as ComponentProps<typeof Ionicons>['name']} size={20} color={stat.color} />
                  <AnimatedCounter value={stat.value} style={[styles.statValue, { color: stat.color }]} />
                  <ThemedText style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</ThemedText>
                </Column>
              </View>
            ))}
          </Row>
          <Row gap="xs">
            {statCards.slice(2, 4).map((stat) => (
              <View
                key={stat.label}
                style={[styles.statCard, { backgroundColor: withAlpha(stat.color, 0.08), borderColor: withAlpha(stat.color, 0.2) }]}
              >
                <Column align="center" gap="xxs">
                  <Ionicons name={stat.icon as ComponentProps<typeof Ionicons>['name']} size={20} color={stat.color} />
                  <AnimatedCounter value={stat.value} style={[styles.statValue, { color: stat.color }]} />
                  <ThemedText style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</ThemedText>
                </Column>
              </View>
            ))}
          </Row>
        </Column>

        {resolvedCoachQuotes.length > 0 ? (
          <>
            <View style={[styles.divider, { backgroundColor: withAlpha(colors.border, 0.9) }]} />
            <Column gap="xs">
              {resolvedCoachQuotes.map((quote, index) => (
                <Row key={`${quote}-${index}`} gap="xs" align="start">
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.tint} />
                  <ThemedText style={[styles.quoteText, { color: colors.text }]}>
                    "{quote}"
                  </ThemedText>
                </Row>
              ))}
            </Column>
          </>
        ) : null}

        {showHighlights ? (
          <>
            <View style={[styles.divider, { backgroundColor: withAlpha(colors.border, 0.9) }]} />
            <ThemedText style={styles.highlightsHeading}>Family Highlights</ThemedText>
            <Column gap="sm">
              {familyHighlights.map((item) => (
                <Column
                  key={item.athleteId}
                  gap="xxs"
                  style={[styles.highlightRow, { borderColor: withAlpha(colors.border, 0.8) }]}
                >
                  <Row align="center" gap="xxs" wrap>
                    <Ionicons name="person-circle-outline" size={14} color={colors.tint} />
                    <ThemedText style={styles.highlightName}>{item.athleteName}</ThemedText>
                    <ThemedText style={[styles.highlightMeta, { color: colors.muted }]}>
                      {item.sessionsAttended} sessions
                    </ThemedText>
                    <Row align="center" gap="micro">
                      <Ionicons name="flame" size={12} color={colors.warning} />
                      <ThemedText style={[styles.highlightMeta, { color: colors.warning }]}>
                        {item.streakWeeks}
                      </ThemedText>
                    </Row>
                  </Row>
                  <ThemedText style={[styles.highlightSubline, { color: colors.muted }]}>
                    Most improved: {item.mostImprovedSkill ?? 'Consistent effort'}
                  </ThemedText>
                </Column>
              ))}
            </Column>
            <ThemedText style={[styles.highlightsFooter, { color: colors.success }]}>
              {buildFooterCopy(familyHighlights)}
            </ThemedText>
          </>
        ) : null}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    flexShrink: 1,
  },
  headerAction: {
    minHeight: 32,
    borderRadius: Radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  headerActionText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  photoStrip: {
    gap: Spacing.xs,
  },
  photoThumb: {
    width: 100,
    height: 72,
    borderRadius: Radii.md,
  },
  statCard: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    ...Typography.title,
    fontWeight: '800',
  },
  statLabel: {
    ...Typography.micro,
    fontWeight: '600',
  },
  quoteText: {
    ...Typography.bodySmall,
    fontStyle: 'italic',
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  highlightsHeading: {
    ...Typography.bodySmallSemiBold,
  },
  highlightRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.xs,
  },
  highlightName: {
    ...Typography.bodySmallSemiBold,
  },
  highlightMeta: {
    ...Typography.caption,
  },
  highlightSubline: {
    ...Typography.bodySmall,
  },
  highlightsFooter: {
    ...Typography.bodySmallSemiBold,
  },
});
