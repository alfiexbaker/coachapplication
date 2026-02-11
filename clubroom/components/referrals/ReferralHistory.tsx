/**
 * ReferralHistory Component
 *
 * Displays a list of referrals with their status and details.
 * Shows both completed and pending referrals.
 */

import { View, StyleSheet } from 'react-native';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { Referral } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import {
  ReferralHistoryItemInner,
  ReferralHistorySkeletonInner,
  ReferralEmptyState,
} from './referral-history-sections';

interface ReferralHistoryProps {
  referrals: Referral[];
  loading?: boolean;
  maxItems?: number;
  onReferralPress?: (referral: Referral) => void;
  showCard?: boolean;
  title?: string;
  showEmptyState?: boolean;
}

export function ReferralHistory({
  referrals,
  loading = false,
  maxItems,
  onReferralPress,
  showCard = true,
  title = 'Referral History',
  showEmptyState = true,
}: ReferralHistoryProps) {
  const { colors: palette } = useTheme();

  const displayReferrals = maxItems ? referrals.slice(0, maxItems) : referrals;

  const content = (
    <>
      {title && (
        <Row align="center" justify="space-between" style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>
          {referrals.length > 0 && (
            <ThemedText style={[styles.count, { color: palette.muted }]}>
              {referrals.length} total
            </ThemedText>
          )}
        </Row>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      ) : displayReferrals.length === 0 ? (
        showEmptyState && <ReferralEmptyState palette={palette} />
      ) : (
        <View style={styles.list}>
          {displayReferrals.map((referral, index) => (
            <ReferralHistoryItemInner
              key={referral.id}
              referral={referral}
              onPress={onReferralPress ? () => onReferralPress(referral) : undefined}
              isLast={index === displayReferrals.length - 1}
              palette={palette}
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

// Re-export for backward compat
export function ReferralHistoryItem(props: {
  referral: Referral;
  onPress?: () => void;
  isLast: boolean;
}) {
  const { colors: palette } = useTheme();
  return <ReferralHistoryItemInner {...props} palette={palette} />;
}

export function ReferralHistorySkeleton() {
  const { colors: palette } = useTheme();
  return <ReferralHistorySkeletonInner palette={palette} />;
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  card: { padding: Spacing.md, gap: Spacing.sm },
  header: {
    marginBottom: Spacing.xs,
  },
  title: { fontSize: scaleFont(16) },
  count: { fontSize: scaleFont(13) },
  list: { gap: 0 },
  loadingContainer: { paddingVertical: Spacing.xl, alignItems: 'center' },
  moreContainer: { alignItems: 'center', paddingTop: Spacing.sm },
  moreText: { fontSize: scaleFont(14), fontWeight: '500' },
});
