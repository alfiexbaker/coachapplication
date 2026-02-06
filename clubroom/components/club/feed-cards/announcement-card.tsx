import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
      <View style={styles.headerRow}>
        <View style={styles.authorRow}>
          {data.isAdmin ? (
            <View style={[styles.adminBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="shield-checkmark" size={Components.icon.sm} color={palette.tint} />
              <ThemedText style={[styles.adminText, { color: palette.tint }]}>Admin</ThemedText>
            </View>
          ) : null}
          <ThemedText style={[styles.authorName, { color: palette.text }]}>{data.authorName}</ThemedText>
          <ThemedText style={[styles.dateText, { color: palette.muted }]}>
            {formatDate(data.createdAt)}
          </ThemedText>
        </View>

        {onDismiss ? (
          <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={Components.icon.md} color={palette.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Pinned indicator */}
      {data.isPinned ? (
        <View style={[styles.pinnedRow, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
          <Ionicons name="pin" size={Components.icon.sm} color={palette.tint} />
          <ThemedText style={[styles.pinnedText, { color: palette.tint }]}>Pinned Announcement</ThemedText>
        </View>
      ) : null}

      {/* Content */}
      <ThemedText style={[styles.title, { color: palette.text }]}>{data.title}</ThemedText>
      <ThemedText style={[styles.body, { color: palette.text }]}>{data.body}</ThemedText>

      {/* RSVP integration */}
      {data.rsvp ? (
        <View style={[styles.rsvpContainer, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
          <View style={styles.rsvpInfo}>
            <Ionicons name="calendar-outline" size={Components.icon.sm} color={palette.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.rsvpTitle, { color: palette.text }]}>
                {data.rsvp.eventTitle}
              </ThemedText>
              <ThemedText style={[styles.rsvpCount, { color: palette.muted }]}>
                {data.rsvp.rsvpCount} attending
              </ThemedText>
            </View>
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  adminBadge: {
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
