import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface AnnouncementData {
  id: string;
  title: string;
  body: string;
  authorName: string;
  isAdmin: boolean;
  createdAt: string;
  isPinned?: boolean;
  /** If the announcement includes an RSVP-able event */
  rsvp?: {
    eventTitle: string;
    rsvpCount: number;
    hasRsvped: boolean;
  };
}

export interface AnnouncementCardProps {
  data: AnnouncementData;
  onDismiss?: () => void;
  onRsvp?: () => void;
  onPress?: () => void;
}

export function AnnouncementCard({ data, onDismiss, onRsvp, onPress }: AnnouncementCardProps) {
  const { colors: palette } = useTheme();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SurfaceCard
      style={[styles.card, { borderLeftColor: palette.tint, borderLeftWidth: 3 }]}
      onPress={onPress}
    >
      {/* Header: admin badge + dismiss */}
      <Row style={styles.headerRow}>
        <Row style={styles.authorRow}>
          {data.isAdmin ? (
            <Row style={[styles.adminBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="shield-checkmark" size={Components.icon.sm} color={palette.tint} />
              <ThemedText style={[styles.adminText, { color: palette.tint }]}>Admin</ThemedText>
            </Row>
          ) : null}
          <ThemedText style={[styles.authorName, { color: palette.text }]}>{data.authorName}</ThemedText>
          <ThemedText style={[styles.dateText, { color: palette.muted }]}>
            {formatDate(data.createdAt)}
          </ThemedText>
        </Row>

        {onDismiss ? (
          <Clickable accessibilityLabel="Close" onPress={onDismiss} hitSlop={8}>
            <Ionicons name="close" size={Components.icon.md} color={palette.muted} />
          </Clickable>
        ) : null}
      </Row>

      {/* Pinned indicator */}
      {data.isPinned ? (
        <Row style={[styles.pinnedRow, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
          <Ionicons name="pin" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.pinnedText, { color: palette.tint }]}>Pinned Announcement</ThemedText>
        </Row>
      ) : null}

      {/* Content */}
      <ThemedText style={[styles.title, { color: palette.text }]}>{data.title}</ThemedText>
      <ThemedText style={[styles.body, { color: palette.text }]}>{data.body}</ThemedText>

      {/* RSVP integration */}
      {data.rsvp ? (
        <View style={[styles.rsvpContainer, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
          <Row style={styles.rsvpInfo}>
            <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.rsvpTitle, { color: palette.text }]}>
                {data.rsvp.eventTitle}
              </ThemedText>
              <ThemedText style={[styles.rsvpCount, { color: palette.muted }]}>
                {data.rsvp.rsvpCount} attending
              </ThemedText>
            </View>
          </Row>
          <Clickable
            onPress={onRsvp}
            accessibilityLabel={data.rsvp.hasRsvped ? 'Going' : 'RSVP'}
            style={{
              backgroundColor: data.rsvp.hasRsvped ? palette.surfaceSecondary : palette.tint,
              height: Components.buttonCompact.height,
              borderRadius: Radii.sm,
              paddingHorizontal: Spacing.sm,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.xs / 2,
              borderWidth: data.rsvp.hasRsvped ? 1 : 0,
              borderColor: palette.border,
            }}
          >
            <Ionicons
              name={data.rsvp.hasRsvped ? 'checkmark' : 'hand-right-outline'}
              size={Components.icon.sm}
              color={data.rsvp.hasRsvped ? palette.success : palette.onPrimary}
            />
            <ThemedText
              style={{
                ...Typography.caption,
                fontWeight: '600',
                color: data.rsvp.hasRsvped ? palette.success : palette.onPrimary,
              }}
            >
              {data.rsvp.hasRsvped ? 'Going' : 'RSVP'}
            </ThemedText>
          </Clickable>
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  adminBadge: {
    alignItems: 'center',
    gap: Spacing.micro,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  adminText: {
    ...Typography.micro,
  },
  authorName: {
    ...Typography.bodySemiBold,
  },
  dateText: {
    ...Typography.caption,
  },
  pinnedRow: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  pinnedText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  title: {
    ...Typography.heading,
  },
  body: {
    ...Typography.body,
  },
  rsvpContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  rsvpInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rsvpTitle: {
    ...Typography.bodySemiBold,
  },
  rsvpCount: {
    ...Typography.small,
  },
});
