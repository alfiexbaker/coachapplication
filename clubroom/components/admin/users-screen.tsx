import { StyleSheet, View } from 'react-native';

import { PageContainer } from '@/components/primitives/page-container';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useAdminUserSummary } from '@/hooks/use-admin-user-summary';
import { useTheme } from '@/hooks/useTheme';

const HEADER = <ScreenHeader title="Users" subtitle="Active accounts by role" />;

export function AdminUsersScreen() {
  const { colors } = useTheme();
  const { summary, status, error, refreshing, onRefresh, retry } = useAdminUserSummary();

  if (status === 'loading') {
    return (
      <PageContainer header={HEADER}>
        <LoadingState variant="detail" />
      </PageContainer>
    );
  }

  if (status === 'error' || !summary) {
    return (
      <PageContainer header={HEADER}>
        <ErrorState
          message={error?.message ?? 'Could not load active account counts.'}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  const roleCounts = [
    { label: 'Coaches', value: summary.coaches },
    { label: 'Athletes', value: summary.athletes },
    { label: 'Parents', value: summary.parents },
  ];

  return (
    <PageContainer
      header={HEADER}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={styles.content}
    >
      <SurfaceCard style={styles.summaryCard} tactile={false}>
        <View style={styles.total}>
          <ThemedText style={styles.totalValue}>{summary.total}</ThemedText>
          <ThemedText style={[styles.totalLabel, { color: colors.muted }]}>
            Active accounts
          </ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View accessibilityRole="list">
          {roleCounts.map((role, index) => (
            <Row
              key={role.label}
              align="center"
              justify="between"
              style={[
                styles.roleRow,
                index < roleCounts.length - 1
                  ? {
                      borderBottomColor: colors.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    }
                  : undefined,
              ]}
              accessibilityLabel={`${role.label}: ${role.value}`}
            >
              <ThemedText style={styles.roleLabel}>{role.label}</ThemedText>
              <ThemedText style={styles.roleValue}>{role.value}</ThemedText>
            </Row>
          ))}
        </View>
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.lg,
  },
  total: {
    gap: Spacing.xxs,
    paddingBottom: Spacing.md,
  },
  totalValue: {
    ...Typography.display,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    ...Typography.bodySmall,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  roleRow: {
    minHeight: 52,
  },
  roleLabel: {
    ...Typography.body,
  },
  roleValue: {
    ...Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
  },
});
