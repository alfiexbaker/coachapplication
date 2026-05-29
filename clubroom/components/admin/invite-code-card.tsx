/**
 * InviteCodeCard — Renders a single invite code in the admin list.
 *
 * Displays code, status badge, usage stats, and toggle action.
 * Memoized for FlatList performance.
 */

import React from 'react';
import { StyleSheet } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { InviteCode } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface InviteCodeCardProps {
  item: InviteCode;
  onDeactivate: (codeId: string) => void;
  onCopy: (code: string) => void;
}

function getStatusInfo(item: InviteCode, palette: ReturnType<typeof useTheme>['colors']) {
  const isExpired = new Date(item.expiresAt) < new Date();
  const isExhausted = item.currentUses >= item.maxUses;
  const isActive = item.status === 'active' && !isExpired && !isExhausted;

  const statusColor = isActive
    ? palette.success
    : item.status === 'expired' || isExpired
      ? palette.error
      : palette.muted;

  const statusLabel = isActive ? 'Active' : isExhausted ? 'Exhausted' : 'Expired';

  return { statusColor, statusLabel };
}

export const InviteCodeCard = function InviteCodeCard({
  item,
  onDeactivate,
  onCopy,
}: InviteCodeCardProps) {
  const { colors: palette } = useTheme();
  const { statusColor, statusLabel } = getStatusInfo(item, palette);

  const handleDeactivate = () => {
    onDeactivate(item.id);
  };

  const handleCopy = () => {
    onCopy(item.code);
  };

  return (
    <SurfaceCard style={styles.codeCard}>
      <Column gap="xs">
        <Row justify="between" align="center">
          <Clickable
            onPress={handleCopy}
            style={[styles.codeBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}
            accessibilityLabel={`Copy code ${item.code}`}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.codeText, { color: statusColor }]}>{item.code}</ThemedText>
          </Clickable>
          <Row style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </ThemedText>
          </Row>
        </Row>
        <ThemedText type="subtitle" style={styles.schoolName}>
          {item.schoolName}
        </ThemedText>
      </Column>

      <Row gap="lg">
        <Column gap="micro">
          <ThemedText style={styles.statLabel}>Uses</ThemedText>
          <ThemedText style={styles.statValue}>
            {item.currentUses} / {item.maxUses}
          </ThemedText>
        </Column>
        <Column gap="micro">
          <ThemedText style={styles.statLabel}>Expires</ThemedText>
          <ThemedText style={styles.statValue}>
            {new Date(item.expiresAt).toLocaleDateString()}
          </ThemedText>
        </Column>
        <Column gap="micro">
          <ThemedText style={styles.statLabel}>Created</ThemedText>
          <ThemedText style={styles.statValue}>
            {new Date(item.createdAt).toLocaleDateString()}
          </ThemedText>
        </Column>
      </Row>

      <Clickable
        onPress={handleDeactivate}
        style={[styles.actionButton, { backgroundColor: palette.border }]}
        accessibilityLabel={item.status === 'active' ? 'Deactivate code' : 'Reactivate code'}
        accessibilityRole="button"
      >
        <ThemedText style={styles.actionButtonText}>
          {item.status === 'active' ? 'Deactivate' : 'Reactivate'}
        </ThemedText>
      </Clickable>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  codeCard: {
    gap: Spacing.md,
  },
  codeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  codeText: {
    fontFamily: 'monospace',
    ...Typography.subheading,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  schoolName: {
    textAlign: 'left',
  },
  statLabel: {
    ...Typography.caption,
    opacity: 0.6,
  },
  statValue: {
    ...Typography.bodySemiBold,
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  actionButtonText: {
    ...Typography.bodySemiBold,
  },
});
