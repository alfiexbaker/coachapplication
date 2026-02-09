import React, { memo, useCallback } from 'react';
import { Alert } from 'react-native';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsRow } from '@/components/settings/settings-row';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsPaymentsSection');

export const SettingsPaymentsSection = memo(function SettingsPaymentsSection() {
  const handlePaymentMethods = useCallback(() => {
    logger.press('PaymentMethods');
    Alert.alert('Coming Soon', 'Stripe integration in Sprint 3');
  }, []);

  const handlePayoutHistory = useCallback(() => {
    logger.press('PayoutHistory');
    Alert.alert('Coming Soon', 'Payment history coming in Sprint 3');
  }, []);

  return (
    <Column gap="sm">
      <SectionHeader title="Payments" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <SettingsRow
          icon="card"
          title="Payment methods"
          subtitle="Manage how you get paid"
          onPress={handlePaymentMethods}
        />
        <SettingsRow
          icon="wallet"
          title="Payout history"
          subtitle="View your earnings and payouts"
          onPress={handlePayoutHistory}
        />
      </SurfaceCard>
    </Column>
  );
});
