import { StyleSheet, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { ChatThreadSummary } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ThreadSummaryProps {
  thread: ChatThreadSummary;
}

export function ThreadSummary({ thread }: ThreadSummaryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.headerRow}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}22` }]}
          accessibilityLabel={`Coach ${thread.coachName} avatar placeholder`}>
          <IconSymbol name="person.circle" size={28} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{thread.coachName}</ThemedText>
          <ThemedText style={styles.subtitle}>{thread.serviceName}</ThemedText>
        </View>
        {thread.unreadCount ? (
          <View style={[styles.badge, { backgroundColor: palette.tint }]}>
            <ThemedText style={styles.badgeLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">
              {thread.unreadCount}
            </ThemedText>
          </View>
        ) : null}
      </View>
      <View style={styles.metaRow}>
        <IconSymbol name="calendar" size={18} color={palette.icon} />
        <ThemedText>{new Date(thread.scheduledFor).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</ThemedText>
      </View>
      <View style={styles.metaRow}>
        <IconSymbol name="map.fill" size={18} color={palette.icon} />
        <ThemedText>{thread.location}</ThemedText>
      </View>
      <View style={[styles.safetyBanner, { backgroundColor: scheme === 'dark' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(251, 146, 60, 0.15)' }]}
        accessibilityRole="text">
        <IconSymbol name="shield.checkerboard" size={18} color={palette.secondary} />
        <ThemedText style={styles.safetyCopy}>{thread.safetyCopy}</ThemedText>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    height: 48,
    width: 48,
    borderRadius: Radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    opacity: 0.8,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  badgeLabel: {
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  safetyBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  safetyCopy: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
