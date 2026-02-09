import React, { memo } from 'react';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Typography, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { NotificationsPanel } from '@/components/notification/notifications-panel';

interface SettingsAlertsSectionProps {
  role: string | undefined;
}

export const SettingsAlertsSection = memo(function SettingsAlertsSection({
  role,
}: SettingsAlertsSectionProps) {
  const { colors: palette } = useTheme();

  if (role === 'USER') return null;

  return (
    <Column gap="sm">
      <SectionHeader title="Latest alerts" subtitle="Inline so they never take a full page" />
      <SurfaceCard>
        <NotificationsPanel limit={3} />
        <ThemedText style={{ marginTop: Spacing.sm, ...Typography.small, color: palette.muted }}>
          Alerts stay inline here; manage the toggles below.
        </ThemedText>
      </SurfaceCard>
    </Column>
  );
});
