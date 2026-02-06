import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii, Components, Typography  , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileAnalyticsProps {
  /** Total profile views in the period. */
  profileViews: number;
  /** Number of times the profile was saved / favourited. */
  saves: number;
  /** Number of enquiry messages received from discovery. */
  enquiries: number;
  /** Number of bookings originating from discovery. */
  bookings: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCompact(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}

function conversionRate(views: number, bookings: number): string {
  if (views === 0) return '0%';
  return `${((bookings / views) * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// Stat tile sub-component
// ---------------------------------------------------------------------------

type IoniconName = keyof typeof Ionicons.glyphMap;

interface StatTileProps {
  icon: IoniconName;
  iconColor: string;
  value: string;
  label: string;
  palette: (typeof Colors)['light'];
}

function StatTile({ icon, iconColor, value, label, palette }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileIconCircle, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
        <Ionicons name={icon} size={Components.icon.md} color={iconColor} />
      </View>
      <ThemedText style={[Typography.title, { color: palette.text, fontVariant: ['tabular-nums'] }]}>
        {value}
      </ThemedText>
      <ThemedText style={[Typography.caption, { color: palette.muted }]}>
        {label}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfileAnalytics({
  profileViews,
  saves,
  enquiries,
  bookings,
}: ProfileAnalyticsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const rate = conversionRate(profileViews, bookings);

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={[Typography.heading, { color: palette.text }]}>
          Profile Performance
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          Anonymous data only
        </ThemedText>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        <StatTile
          icon="eye-outline"
          iconColor={palette.tint}
          value={formatCompact(profileViews)}
          label="Views"
          palette={palette}
        />
        <StatTile
          icon="bookmark-outline"
          iconColor={palette.warning}
          value={formatCompact(saves)}
          label="Saves"
          palette={palette}
        />
        <StatTile
          icon="chatbubble-outline"
          iconColor={palette.success}
          value={formatCompact(enquiries)}
          label="Enquiries"
          palette={palette}
        />
        <StatTile
          icon="calendar-outline"
          iconColor={palette.tint}
          value={formatCompact(bookings)}
          label="Bookings"
          palette={palette}
        />
      </View>

      {/* Conversion rate banner */}
      <View style={[styles.conversionBanner, { backgroundColor: palette.surfaceSecondary }]}>
        <View style={styles.conversionLeft}>
          <Ionicons name="analytics-outline" size={Components.icon.md} color={palette.success} />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>
            View to Booking
          </ThemedText>
        </View>
        <ThemedText style={[Typography.heading, { color: palette.success }]}>
          {rate}
        </ThemedText>
      </View>
    </SurfaceCard>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    gap: Spacing.micro,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  tile: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs / 2,
  },
  tileIconCircle: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs / 2,
  },
  conversionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
  },
  conversionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
