/**
 * Wallet Promo Code Screen
 *
 * Redeem promo codes for wallet credits, view redemption history.
 * All state/logic in useWalletPromo hook.
 */

import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { PromoCodeInput } from '@/components/promo';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useWalletPromo, formatTimeAgo } from '@/hooks/use-wallet-promo';
import { promoService } from '@/services/promo-service';
import { walletService } from '@/services/wallet-service';
import type { PromoCodeUsage } from '@/constants/types';

export default function PromoCodeScreen() {
  const { colors: palette } = useTheme();
  const c = useWalletPromo();

  const renderUsageItem = ({ item, index }: { item: PromoCodeUsage; index: number }) => (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()}>
      <Row align="center" gap="md" style={styles.usageItem}>
        <View style={[styles.usageIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="gift" size={18} color={palette.success} />
        </View>
        <Row align="center" justify="space-between" flex style={styles.usageContent}>
          <View style={styles.usageRow}>
            <ThemedText style={[styles.codeLabel, { color: palette.tint }]}>{item.code}</ThemedText>
            <ThemedText style={[styles.usageTime, { color: palette.muted }]}>
              {formatTimeAgo(item.usedAt)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.creditAmount, { color: palette.success }]}>
            +{promoService.formatCredit(item.creditAmount)}
          </ThemedText>
        </Row>
      </Row>
    </Animated.View>
  );

  const renderHeader = () => (
    <>
      {c.redeemSuccess && (
        <Animated.View entering={FadeInDown.springify()}>
          <SurfaceCard style={[styles.successCard, { borderColor: palette.success }]}>
            <View
              style={[styles.successIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}
            >
              <Ionicons name="checkmark-circle" size={32} color={palette.success} />
            </View>
            <ThemedText type="subtitle" style={styles.successTitle}>
              Code Redeemed!
            </ThemedText>
            <ThemedText style={[styles.successMessage, { color: palette.muted }]}>
              {promoService.formatCredit(c.redeemSuccess.creditAmount)} has been added to your
              wallet
            </ThemedText>
            <Row align="baseline" gap="xs" style={styles.successBalance}>
              <ThemedText style={[styles.balanceLabel, { color: palette.muted }]}>
                New Balance:
              </ThemedText>
              <ThemedText type="title" style={[styles.balanceValue, { color: palette.success }]}>
                {walletService.formatAmount(c.redeemSuccess.newBalance)}
              </ThemedText>
            </Row>
          </SurfaceCard>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.balanceCard}>
          <Row align="center" gap="xs">
            <Ionicons name="wallet-outline" size={20} color={palette.muted} />
            <ThemedText style={[styles.balanceHeaderText, { color: palette.muted }]}>
              Current Balance
            </ThemedText>
          </Row>
          <ThemedText type="title" style={styles.balanceAmount}>
            {walletService.formatAmount(c.balance)}
          </ThemedText>
        </SurfaceCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SurfaceCard style={styles.inputCard}>
          <Row align="center" gap="sm">
            <Ionicons name="pricetag-outline" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.inputTitle}>
              Enter Promo Code
            </ThemedText>
          </Row>
          <ThemedText style={[styles.inputDescription, { color: palette.muted }]}>
            Enter a promotional code to receive credits in your wallet
          </ThemedText>
          {c.userId && <PromoCodeInput userId={c.userId} onRedeem={c.handleRedeem} />}
        </SurfaceCard>
      </Animated.View>

      {c.userUsage.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <Row align="center" justify="space-between" style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Redemption History
            </ThemedText>
            <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
              {c.userUsage.length} redeemed
            </ThemedText>
          </Row>
        </Animated.View>
      )}
    </>
  );

  if (c.status === 'loading') {
    return (
      <PageContainer
        header={<PageHeader title="Promo Codes" subtitle="Redeem codes for credits" showBack />}
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (c.status === 'error') {
    return (
      <PageContainer
        header={<PageHeader title="Promo Codes" subtitle="Redeem codes for credits" showBack />}
      >
        <ErrorState
          message={c.error?.message || 'Failed to load promo code data.'}
          onRetry={c.retry}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={<PageHeader title="Promo Codes" subtitle="Redeem codes for credits" showBack />}
      gap={Spacing.md}
      scrollable={false}
    >
      <FlatList
        data={c.userUsage}
        keyExtractor={(item) => item.id}
        renderItem={renderUsageItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          !c.redeemSuccess ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
                <Ionicons name="gift-outline" size={40} color={palette.muted} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
                No codes redeemed yet
              </ThemedText>
              <ThemedText style={[styles.emptyDesc, { color: palette.muted }]}>
                Enter a promo code above to get started
              </ThemedText>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={c.refreshing}
            onRefresh={c.handleRefresh}
            tintColor={palette.tint}
          />
        }
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.bodySmall },
  listContent: { paddingBottom: Spacing.xl, gap: Spacing.md },
  successCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderWidth: 2,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: { ...Typography.title, textAlign: 'center' },
  successMessage: { ...Typography.bodySmall, textAlign: 'center' },
  successBalance: { marginTop: Spacing.xs },
  balanceLabel: { ...Typography.bodySmall },
  balanceValue: { ...Typography.display },
  balanceCard: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  balanceHeader: {},
  balanceHeaderText: { ...Typography.bodySmallSemiBold },
  balanceAmount: { ...Typography.display },
  inputCard: { gap: Spacing.md },
  inputHeader: {},
  inputTitle: { ...Typography.subheading },
  inputDescription: { ...Typography.small, marginTop: -Spacing.xs },
  sectionHeader: { marginTop: Spacing.sm },
  sectionTitle: { ...Typography.heading },
  sectionCount: { ...Typography.small },
  usageItem: { paddingVertical: Spacing.sm },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageContent: {},
  usageRow: { gap: Spacing.micro },
  codeLabel: { ...Typography.bodySmallSemiBold },
  usageTime: { ...Typography.caption },
  creditAmount: { ...Typography.bodySemiBold },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { ...Typography.subheading },
  emptyDesc: { ...Typography.bodySmall, textAlign: 'center' },
});
