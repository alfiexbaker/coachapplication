import { StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface BadgeAwardData {
  id: string;
  badgeName: string;
  athleteName: string;
  coachName: string;
  reason: string;
  awardedAt: string;
  likeCount: number;
  commentCount: number;
}

export interface BadgeAwardCardProps {
  data: BadgeAwardData;
  onLike?: () => void;
  onComment?: () => void;
  onPress?: () => void;
}

export function BadgeAwardCard({ data, onLike, onComment, onPress }: BadgeAwardCardProps) {
  const { colors: palette } = useTheme();

  const celebratoryBg = withAlpha(palette.warning, 0.06);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <SurfaceCard
      style={[styles.card, { backgroundColor: celebratoryBg }]}
      onPress={onPress}
    >
      {/* Header */}
      <Row style={styles.headerRow}>
        <Row style={styles.typeRow}>
          <Ionicons name="ribbon-outline" size={Components.icon.sm} color={palette.warning} />
          <ThemedText style={[styles.typeLabel, { color: palette.warning }]}>Badge Awarded</ThemedText>
        </Row>
        <ThemedText style={[styles.dateText, { color: palette.muted }]}>
          {formatDate(data.awardedAt)}
        </ThemedText>
      </Row>

      {/* Badge display */}
      <Row style={styles.badgeContainer}>
        <Row style={[styles.trophyCircle, { backgroundColor: withAlpha(palette.warning, 0.12) }]}>
          <Ionicons name="trophy" size={Components.icon.xl} color={palette.warning} />
        </Row>
        <Row style={styles.badgeInfo}>
          <ThemedText style={[styles.badgeName, { color: palette.text }]}>
            {data.badgeName}
          </ThemedText>
          <ThemedText style={[styles.athleteName, { color: palette.text }]}>
            Awarded to{' '}
            <ThemedText style={styles.nameHighlight}>{data.athleteName}</ThemedText>
          </ThemedText>
          <ThemedText style={[styles.coachLabel, { color: palette.muted }]}>
            by {data.coachName}
          </ThemedText>
        </Row>
      </Row>

      {/* Reason */}
      {data.reason ? (
        <Row style={[styles.reasonContainer, { backgroundColor: palette.surface }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.reasonText, { color: palette.text }]}>
            {data.reason}
          </ThemedText>
        </Row>
      ) : null}

      {/* Footer: likes + comments */}
      <Row style={styles.footer}>
        <Clickable style={styles.footerAction} onPress={onLike}>
          <Ionicons name="heart-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.likeCount}</ThemedText>
        </Clickable>
        <Clickable style={styles.footerAction} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.commentCount}</ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  typeLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  dateText: {
    ...Typography.caption,
  },
  badgeContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trophyCircle: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  badgeName: {
    ...Typography.heading,
  },
  athleteName: {
    ...Typography.body,
  },
  nameHighlight: {
    ...Typography.bodySemiBold,
  },
  coachLabel: {
    ...Typography.small,
  },
  reasonContainer: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  reasonText: {
    ...Typography.body,
    flex: 1,
  },
  footer: {
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  footerCount: {
    ...Typography.small,
  },
});
