import { StyleSheet, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SessionRecapData {
  id: string;
  focusArea: string;
  attendanceCount: number;
  totalCount: number;
  coachSummary: string;
  date: string;
  coachName?: string;
  likeCount: number;
  commentCount: number;
}

export interface SessionRecapCardProps {
  data: SessionRecapData;
  onLike?: () => void;
  onComment?: () => void;
  onPress?: () => void;
}

export function SessionRecapCard({ data, onLike, onComment, onPress }: SessionRecapCardProps) {
  const { colors: palette } = useTheme();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.typeRow}>
          <Ionicons name="clipboard-outline" size={Components.icon.sm} color={palette.muted} />
          <ThemedText style={[styles.typeLabel, { color: palette.muted }]}>Session Recap</ThemedText>
        </View>
        <ThemedText style={[styles.dateText, { color: palette.muted }]}>{formatDate(data.date)}</ThemedText>
      </View>

      {/* Focus area title */}
      <ThemedText style={[styles.focusArea, { color: palette.text }]}>{data.focusArea}</ThemedText>

      {/* Attendance stat */}
      <View style={[styles.attendanceRow, { backgroundColor: palette.surfaceSecondary }]}>
        <Ionicons name="people-outline" size={Components.icon.md} color={palette.tint} />
        <ThemedText style={[styles.attendanceText, { color: palette.text }]}>
          {data.attendanceCount}/{data.totalCount} attended
        </ThemedText>
      </View>

      {/* Coach summary */}
      <ThemedText style={[styles.summary, { color: palette.text }]}>{data.coachSummary}</ThemedText>

      {/* Coach attribution */}
      {data.coachName ? (
        <ThemedText style={[styles.coachAttribution, { color: palette.muted }]}>
          -- {data.coachName}
        </ThemedText>
      ) : null}

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable style={styles.footerAction} onPress={onLike}>
          <Ionicons name="heart-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.likeCount}</ThemedText>
        </Pressable>
        <Pressable style={styles.footerAction} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.muted} />
          <ThemedText style={[styles.footerCount, { color: palette.muted }]}>{data.commentCount}</ThemedText>
        </Pressable>
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
  },
  dateText: {
    ...Typography.caption,
  },
  focusArea: {
    ...Typography.heading,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  attendanceText: {
    ...Typography.bodySemiBold,
  },
  summary: {
    ...Typography.body,
  },
  coachAttribution: {
    ...Typography.small,
    fontStyle: 'italic',
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
