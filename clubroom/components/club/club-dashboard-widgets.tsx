import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MatchResult } from '@/services/club-service';
import { Row } from '@/components/primitives';

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  palette: ThemeColors;
}

export const StatCard = memo(function StatCard({ label, value, icon, palette }: StatCardProps) {
  return (
    <SurfaceCard style={styles.statCard} tactile={false}>
      <Ionicons name={icon} size={Components.icon.lg} color={palette.tint} />
      <ThemedText style={{ ...Typography.title, color: palette.foreground }}>{value}</ThemedText>
      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>{label}</ThemedText>
    </SurfaceCard>
  );
});

// ---------------------------------------------------------------------------
// Outcome Badge
// ---------------------------------------------------------------------------

function OutcomeBadge({ outcome, palette }: { outcome: 'W' | 'D' | 'L'; palette: ThemeColors }) {
  const config = {
    W: { bg: palette.success, label: 'W' },
    D: { bg: palette.warning, label: 'D' },
    L: { bg: palette.error, label: 'L' },
  }[outcome];

  return (
    <View style={[styles.outcomeBadge, { backgroundColor: config.bg }]}>
      <ThemedText style={[styles.outcomeBadgeText, { color: palette.onPrimary }]}>
        {config.label}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Result Row
// ---------------------------------------------------------------------------

interface ResultRowProps {
  result: MatchResult;
  palette: ThemeColors;
}

export const ResultRow = memo(function ResultRow({ result, palette }: ResultRowProps) {
  const formattedDate = new Date(result.date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <Row style={[styles.resultRow, { borderBottomColor: palette.border }]}>
      <OutcomeBadge outcome={result.outcome} palette={palette} />
      <View style={styles.resultInfo}>
        <ThemedText style={{ ...Typography.bodySemiBold, color: palette.foreground }}>
          vs {result.opponent}
        </ThemedText>
        <ThemedText style={{ ...Typography.small, color: palette.muted }}>
          {result.squad} &middot; {formattedDate}
        </ThemedText>
      </View>
      <ThemedText style={{ ...Typography.heading, color: palette.foreground }}>
        {result.scoreHome} - {result.scoreAway}
      </ThemedText>
    </Row>
  );
});

// ---------------------------------------------------------------------------
// Quick Action
// ---------------------------------------------------------------------------

interface QuickActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  palette: ThemeColors;
}

export const QuickAction = memo(function QuickAction({
  icon,
  label,
  onPress,
  palette,
}: QuickActionProps) {
  return (
    <Clickable
      onPress={onPress}
      accessibilityLabel={label}
      style={[
        styles.quickAction,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Ionicons name={icon} size={Components.icon.lg} color={palette.tint} />
      <ThemedText style={{ ...Typography.caption, color: palette.muted }}>{label}</ThemedText>
    </Clickable>
  );
});

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  outcomeBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomeBadgeText: { ...Typography.caption },
  resultRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  resultInfo: { flex: 1, gap: Spacing.micro },
  quickAction: {
    flex: 1,
    height: 80,
    borderRadius: Radii.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
  },
});
