import React, { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsRow } from '@/components/settings/settings-row';
import { createLogger } from '@/utils/logger';
import { Routes } from '@/navigation/routes';

const logger = createLogger('SettingsPaymentsSection');

export const SettingsPaymentsSection = memo(function SettingsPaymentsSection() {
  const handleEarningsReconciler = useCallback(() => {
    logger.press('EarningsReconciler');
    router.push(Routes.EARNINGS);
  }, []);

  return (
    <Column gap="sm">
      <SectionHeader title="Earnings" subtitle="Coach payment reconciliation" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <SettingsRow
          icon="wallet"
          title="Earnings Reconciler"
          subtitle="Track owed, paid, and written-off session payments"
          onPress={handleEarningsReconciler}
        />
      </SurfaceCard>
    </Column>
  );
});
