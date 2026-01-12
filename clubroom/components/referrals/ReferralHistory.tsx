/**
 * ReferralHistory Component
 *
 * Displays a list of referrals with their status and details.
 * Shows both completed and pending referrals.
 */

import { View, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';
import type { Referral } from '@/constants/types';

interface ReferralHistoryProps {
  /** List of referrals to display */
  referrals: Referral[];
  /** Whether the list is loading */
  loading?: boolean;
  /** Maximum number of items to display (undefined for all) */
  maxItems?: number;
  /** Callback when a referral is pressed */
  onReferralPress?: (referral: Referral) => void;
  /** Whether to show the card wrapper */
  showCard?: boolean;
  /** Title for the section */
  title?: string;
  /** Show empty state when no referrals */
  showEmptyState?: boolean;
}

/**
 * Component displaying referral history.
 *
 * @example
 * ```tsx
 * <ReferralHistory referrals={userReferrals} />
 * <ReferralHistory referrals={userReferrals} maxItems={5} />
 * ```
 */
export function ReferralHistory({
  referrals,
  loading = false,
  maxItems,
  onReferralPress,
  showCard = true,
  title = 'Referral History',
  showEmptyState = true,
}: ReferralHistoryProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const displayReferrals = maxItems ? referrals.slice(0, maxItems) : referrals;

  const renderItem = ({ item, index }: { item: Referral; index: number }) => (
    <ReferralHistoryItem
      referral={item}
      onPress={onReferralPress ? () => onReferralPress(item) : undefined}
      isLast={index === displayReferrals.length - 1}
    />
  );

  const content = (
    <>
      {title && (
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {referrals.length > 0 && (
            <ThemedText style={[styles.count, { color: palette.muted }]}>
              {referrals.length} total
            </ThemedText>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      ) : displayReferrals.length === 0 ? (
        showEmptyState && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: `${palette.muted}15` }]}>
              <Ionicons name="people-outline" size={32} color={palette.muted} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
              No referrals yet
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Share your referral code with friends to start earning credits!
            </ThemedText>
          </View>
        )
      ) : (
        <View style={styles.list}>
          {displayReferrals.map((referral, index) => (
            <ReferralHistoryItem
              key={referral.id}
              referral={referral}
              onPress={onReferralPress ? () => onReferralPress(referral) : undefined}
              isLast={index === displayReferrals.length - 1}
            />
          ))}
        </View>
      )}

      {maxItems && referrals.length > maxItems && (
        <View style={styles.moreContainer}>
          <ThemedText style={[styles.moreText, { color: palette.tint }]}>
            +{referrals.length - maxItems} more referrals
          </ThemedText>
        </View>
      )}
    </>
  );

  if (!showCard) {
    return <View style={styles.container}>{content}</View>;
  }

  return <SurfaceCard style={styles.card}>{content}</SurfaceCard>;
}

// ============================================================================
// REFERRAL HISTORY ITEM
// ============================================================================

interface ReferralHistoryItemProps {
  referral: Referral;
  onPress?: () => void;
  isLast: boolean;
}

export function ReferralHistoryItem({ referral, onPress, isLast }: ReferralHistoryItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const { label: statusLabel, color: statusColor } = referralService.getStatusInfo(referral.status);
  const formattedDate = referralService.formatDate(referral.createdAt);

  // Get initials from name
  const initials = referral.refereeName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SurfaceCard
      style={[styles.item, !isLast && styles.itemWithBorder]}
      onPress={onPress}
      tactile={Boolean(onPress)}
    >
      <View style={styles.itemContent}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}15` }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {initials}
          </ThemedText>
        </View>

        {/* Details */}
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={1}>
              {referral.refereeName}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </ThemedText>
            </View>
          </View>

          <View style={styles.itemMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {formattedDate}
              </ThemedText>
            </View>

            {referral.status === 'COMPLETED' && referral.creditAwarded > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="wallet-outline" size={12} color={palette.success} />
                <ThemedText style={[styles.metaText, { color: palette.success }]}>
                  +{referralService.formatCredit(referral.creditAwarded)}
                </ThemedText>
              </View>
            )}

            {referral.status === 'PENDING' && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={palette.warning} />
                <ThemedText style={[styles.metaText, { color: palette.warning }]}>
                  Awaiting first booking
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Chevron if pressable */}
        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        )}
      </View>
    </SurfaceCard>
  );
}

// ============================================================================
// REFERRAL HISTORY SKELETON
// ============================================================================

export function ReferralHistorySkeleton() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.skeletonTitle, { backgroundColor: palette.border }]} />
      </View>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.item, i < 3 && styles.itemWithBorder]}>
          <View style={styles.itemContent}>
            <View style={[styles.avatar, { backgroundColor: palette.border }]} />
            <View style={styles.itemDetails}>
              <View style={[styles.skeletonName, { backgroundColor: palette.border }]} />
              <View style={[styles.skeletonMeta, { backgroundColor: palette.border }]} />
            </View>
          </View>
        </View>
      ))}
    </SurfaceCard>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: scaleFont(16),
  },
  count: {
    fontSize: scaleFont(13),
  },
  list: {
    gap: 0,
  },
  item: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  itemWithBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  itemName: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  itemMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: scaleFont(12),
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  emptyText: {
    fontSize: scaleFont(14),
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: scaleFont(20),
  },

  // Loading
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },

  // More link
  moreContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  moreText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
  },

  // Skeleton
  skeletonTitle: {
    width: 120,
    height: 20,
    borderRadius: Radii.sm,
  },
  skeletonName: {
    width: 140,
    height: 16,
    borderRadius: Radii.sm,
  },
  skeletonMeta: {
    width: 100,
    height: 12,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
});
