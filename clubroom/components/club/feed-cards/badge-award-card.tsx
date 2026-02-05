import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const celebratoryBg = `${palette.warning}10`;

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
      <View style={styles.headerRow}>
        <View style={styles.typeRow}>
          <Ionicons name="ribbon-outline" size={Components.icon.sm} color={palette.warning} />
          <ThemedText style={[styles.typeLabel, { color: palette.warning }]}>Badge Awarded</ThemedText>
        </View>
        <ThemedText style={[styles.dateText, { color: palette.muted }]}>
          {formatDate(data.awardedAt)}
        </ThemedText>
      </View>

      {/* Badge display */}
      <View style={styles.badgeContainer}>
        <View style={[styles.trophyCircle, { backgroundColor: `${palette.warning}20` }]}>
          <Ionicons name="trophy" size={Components.icon.xl} color={palette.warning} />
        </View>
        <View style={styles.badgeInfo}>
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
        </View>
      </View>

      {/* Reason */}
      {data.reason ? (
        <View style={[styles.reasonContainer, { backgroundColor: palette.surface }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.reasonText, { color: palette.text }]}>
            {data.reason}
          </ThemedText>
        </View>
      ) : null}

      {/* Footer: likes + comments */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerAction} onPress={onLike}>
          <Ionicons name="heart-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.likeCount}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerAction} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.commentCount}</ThemedText>
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  trophyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInfo: {
    flex: 1,
    gap: 2,
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
