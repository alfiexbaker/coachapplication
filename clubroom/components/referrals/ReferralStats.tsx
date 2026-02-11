/**
 * ReferralStats Component
 *
 * Displays referral statistics including total earnings,
 * number of successful referrals, and pending referrals.
 */

import { View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { withAlpha } from '@/constants/theme';
import { referralService } from '@/services/referral-service';
import type { ReferralStats as ReferralStatsType } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { StatItem, CompactStatItem, StatCard, styles } from './referral-stats-sections';

interface ReferralStatsProps {
  stats: ReferralStatsType;
  variant?: 'default' | 'compact' | 'horizontal';
  showCard?: boolean;
}

export function ReferralStats({ stats, variant = 'default', showCard = true }: ReferralStatsProps) {
  const { colors: palette } = useTheme();

  const content = (
    <>
      {variant === 'horizontal' ? (
        <Row align="center" justify="space-around">
          <StatItem
            icon="wallet-outline"
            iconColor={palette.success}
            value={referralService.formatCredit(stats.totalEarned)}
            label="Total Earned"
            palette={palette}
          />
          <Divider vertical style={{ height: 40 }} />
          <StatItem
            icon="people-outline"
            iconColor={palette.tint}
            value={stats.referredCount.toString()}
            label="Referred"
            palette={palette}
          />
          <Divider vertical style={{ height: 40 }} />
          <StatItem
            icon="time-outline"
            iconColor={palette.warning}
            value={stats.pendingCount.toString()}
            label="Pending"
            palette={palette}
          />
        </Row>
      ) : variant === 'compact' ? (
        <Row gap="lg">
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
        </Row>
      ) : (
        <View style={styles.defaultGrid}>
          <Row gap="sm">
            <StatCard
              icon="wallet-outline"
              iconColor={palette.success}
              iconBgColor={withAlpha(palette.success, 0.09)}
              value={referralService.formatCredit(stats.totalEarned)}
              label="Total Earned"
              description="From successful referrals"
              palette={palette}
            />
          </Row>
          <Row gap="sm">
            <StatCard
              icon="people-outline"
              iconColor={palette.tint}
              iconBgColor={withAlpha(palette.tint, 0.09)}
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
                iconBgColor={withAlpha(palette.warning, 0.09)}
                value={stats.pendingCount.toString()}
                label="Pending"
                description="Awaiting first booking"
                palette={palette}
                flex
              />
            )}
          </Row>
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
