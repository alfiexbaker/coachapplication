/**
 * ReferralStats Component
 *
 * Displays referral statistics including total earnings,
 * number of successful referrals, and pending referrals.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';
import type { ReferralStats as ReferralStatsType } from '@/constants/types';

interface ReferralStatsProps {
  /** Referral statistics to display */
  stats: ReferralStatsType;
  /** Display variant */
  variant?: 'default' | 'compact' | 'horizontal';
  /** Whether to show the card wrapper */
  showCard?: boolean;
}

/**
 * Component displaying referral statistics.
 *
 * @example
 * ```tsx
 * <ReferralStats stats={userStats} />
 * <ReferralStats stats={userStats} variant="horizontal" />
 * <ReferralStats stats={userStats} variant="compact" showCard={false} />
 * ```
 */
export function ReferralStats({
  stats,
  variant = 'default',
  showCard = true,
}: ReferralStatsProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const content = (
    <>
      {variant === 'horizontal' ? (
        <View style={styles.horizontalRow}>
          <StatItem
            icon="wallet-outline"
            iconColor={palette.success}
            value={referralService.formatCredit(stats.totalEarned)}
            label="Total Earned"
            palette={palette}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <StatItem
            icon="people-outline"
            iconColor={palette.tint}
            value={stats.referredCount.toString()}
            label="Referred"
            palette={palette}
          />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <StatItem
            icon="time-outline"
            iconColor={palette.warning}
            value={stats.pendingCount.toString()}
            label="Pending"
            palette={palette}
          />
        </View>
      ) : variant === 'compact' ? (
        <View style={styles.compactRow}>
          <CompactStatItem
            icon="wallet-outline"
            iconColor={palette.success}
            value={referralService.formatCredit(stats.totalEarned)}
            label="earned"
            palette={palette}
          />
          <CompactStatItem
            icon="people-outline"
            iconColor={palette.tint}
            value={stats.referredCount.toString()}
            label="referred"
            palette={palette}
          />
          {stats.pendingCount > 0 && (
            <CompactStatItem
              icon="time-outline"
              iconColor={palette.warning}
              value={stats.pendingCount.toString()}
              label="pending"
              palette={palette}
            />
          )}
        </View>
      ) : (
        <View style={styles.defaultGrid}>
          <View style={styles.defaultRow}>
            <StatCard
              icon="wallet-outline"
              iconColor={palette.success}
              iconBgColor={`${palette.success}15`}
              value={referralService.formatCredit(stats.totalEarned)}
              label="Total Earned"
              description="From successful referrals"
              palette={palette}
            />
          </View>
          <View style={styles.defaultRow}>
            <StatCard
              icon="people-outline"
              iconColor={palette.tint}
              iconBgColor={`${palette.tint}15`}
              value={stats.referredCount.toString()}
              label="Friends Referred"
              description="Completed sign-ups"
              palette={palette}
              flex
            />
            {stats.pendingCount > 0 && (
              <StatCard
                icon="time-outline"
                iconColor={palette.warning}
                iconBgColor={`${palette.warning}15`}
                value={stats.pendingCount.toString()}
                label="Pending"
                description="Awaiting first booking"
                palette={palette}
                flex
              />
            )}
          </View>
        </View>
      )}
    </>
  );

  if (!showCard) {
    return content;
  }

  return (
    <SurfaceCard style={variant === 'horizontal' ? styles.horizontalCard : styles.card}>
      {content}
    </SurfaceCard>
  );
}

// ============================================================================
// INTERNAL COMPONENTS
// ============================================================================

interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  palette: (typeof Colors)['light'];
}

function StatItem({ icon, iconColor, value, label, palette }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function CompactStatItem({ icon, iconColor, value, label, palette }: StatItemProps) {
  return (
    <View style={styles.compactStatItem}>
      <Ionicons name={icon} size={16} color={iconColor} />
      <ThemedText type="defaultSemiBold" style={styles.compactValue}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>
        {label}
      </ThemedText>
    </View>
  );
}

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  value: string;
  label: string;
  description: string;
  palette: (typeof Colors)['light'];
  flex?: boolean;
}

function StatCard({
  icon,
  iconColor,
  iconBgColor,
  value,
  label,
  description,
  palette,
  flex,
}: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: palette.background }, flex ? styles.flexCard : undefined]}>
      <View style={[styles.statCardIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.statCardContent}>
        <ThemedText type="title" style={styles.statCardValue}>
          {value}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.statCardLabel}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.statCardDescription, { color: palette.muted }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  horizontalCard: {
    padding: Spacing.md,
  },

  // Horizontal variant
  horizontalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: scaleFont(22),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    width: 1,
    height: 40,
  },

  // Compact variant
  compactRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  compactStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactValue: {
    fontSize: scaleFont(15),
  },
  compactLabel: {
    fontSize: scaleFont(13),
  },

  // Default variant
  defaultGrid: {
    gap: Spacing.sm,
  },
  defaultRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  flexCard: {
    flex: 1,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardContent: {
    gap: 2,
  },
  statCardValue: {
    fontSize: scaleFont(28),
    fontWeight: '700',
  },
  statCardLabel: {
    fontSize: scaleFont(14),
  },
  statCardDescription: {
    fontSize: scaleFont(12),
  },
});
