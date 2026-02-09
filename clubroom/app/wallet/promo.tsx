import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { PromoCodeInput } from '@/components/promo';
import { Spacing, Typography, Radii , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { promoService } from '@/services/promo-service';
import { walletService } from '@/services/wallet-service';
import type { PromoCodeUsage } from '@/constants/types';

const logger = createLogger('PromoCodeScreen');

export default function PromoCodeScreen() {
  const { colors: palette } = useTheme();
  useRouter();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userUsage, setUserUsage] = useState<PromoCodeUsage[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [redeemSuccess, setRedeemSuccess] = useState<{
    code: string;
    creditAmount: number;
    newBalance: number;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      const [usageData, walletBalance] = await Promise.all([
        promoService.getUserUsage(currentUser.id),
        walletService.getBalance(currentUser.id),
      ]);

      setUserUsage(usageData);
      setBalance(walletBalance);
    } catch (error) {
      logger.error('Failed to load promo data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // Clear success message when returning to screen
      setRedeemSuccess(null);
    }, [loadData])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRedeem = useCallback(
    (result: { code: string; creditAmount: number; newBalance: number }) => {
      setRedeemSuccess(result);
      setBalance(result.newBalance);
      // Reload usage history
      loadData();
    },
    [loadData]
  );

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return promoService.formatDate(dateString);
  };

  const renderUsageItem = ({ item, index }: { item: PromoCodeUsage; index: number }) => (
    <Animated.View entering={FadeInDown.delay(100 + index * 50).springify()}>
      <View style={styles.usageItem}>
        <View style={[styles.usageIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="gift" size={18} color={palette.success} />
        </View>
        <View style={styles.usageContent}>
          <View style={styles.usageRow}>
            <ThemedText style={[styles.codeLabel, { color: palette.tint }]}>
              {item.code}
            </ThemedText>
            <ThemedText style={[styles.usageTime, { color: palette.muted }]}>
              {formatTimeAgo(item.usedAt)}
            </ThemedText>
          </View>
          <ThemedText style={[styles.creditAmount, { color: palette.success }]}>
            +{promoService.formatCredit(item.creditAmount)}
          </ThemedText>
        </View>
      </View>
    </Animated.View>
  );

  const renderHeader = () => (
    <>
      {/* Success message */}
      {redeemSuccess && (
        <Animated.View entering={FadeInDown.springify()}>
          <SurfaceCard
            style={[styles.successCard, { borderColor: palette.success }]}
          >
            <View style={[styles.successIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="checkmark-circle" size={32} color={palette.success} />
            </View>
            <ThemedText type="subtitle" style={styles.successTitle}>
              Code Redeemed!
            </ThemedText>
            <ThemedText style={[styles.successMessage, { color: palette.muted }]}>
              {promoService.formatCredit(redeemSuccess.creditAmount)} has been added to your wallet
            </ThemedText>
            <View style={styles.successBalance}>
              <ThemedText style={[styles.balanceLabel, { color: palette.muted }]}>
                New Balance:
              </ThemedText>
              <ThemedText type="title" style={[styles.balanceValue, { color: palette.success }]}>
                {walletService.formatAmount(redeemSuccess.newBalance)}
              </ThemedText>
            </View>
          </SurfaceCard>
        </Animated.View>
      )}

      {/* Current balance */}
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet-outline" size={20} color={palette.muted} />
            <ThemedText style={[styles.balanceHeaderText, { color: palette.muted }]}>
              Current Balance
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.balanceAmount}>
            {walletService.formatAmount(balance)}
          </ThemedText>
        </SurfaceCard>
      </Animated.View>

      {/* Promo code input */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <SurfaceCard style={styles.inputCard}>
          <View style={styles.inputHeader}>
            <Ionicons name="pricetag-outline" size={20} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.inputTitle}>
              Enter Promo Code
            </ThemedText>
          </View>
          <ThemedText style={[styles.inputDescription, { color: palette.muted }]}>
            Enter a promotional code to receive credits in your wallet
          </ThemedText>
          {currentUser?.id && (
            <PromoCodeInput
              userId={currentUser.id}
              onRedeem={handleRedeem}
            />
          )}
        </SurfaceCard>
      </Animated.View>

      {/* Usage history header */}
      {userUsage.length > 0 && (
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Redemption History
            </ThemedText>
            <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
              {userUsage.length} redeemed
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
        <Ionicons name="gift-outline" size={40} color={palette.muted} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
        No codes redeemed yet
      </ThemedText>
      <ThemedText style={[styles.emptyDescription, { color: palette.muted }]}>
        Enter a promo code above to get started
      </ThemedText>
    </View>
  );

  if (loading) {
    return (
      <PageContainer
        header={<PageHeader title="Promo Codes" subtitle="Redeem codes for credits" showBack />}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading...
          </ThemedText>
        </View>
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
        data={userUsage}
        keyExtractor={(item) => item.id}
        renderItem={renderUsageItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!redeemSuccess ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
  },
  listContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
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
  successTitle: {
    ...Typography.title,
    textAlign: 'center',
  },
  successMessage: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  successBalance: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  balanceLabel: {
    ...Typography.bodySmall,
  },
  balanceValue: {
    ...Typography.display,
  },
  balanceCard: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  balanceHeaderText: {
    ...Typography.bodySmallSemiBold,
  },
  balanceAmount: {
    ...Typography.display,
  },
  inputCard: {
    gap: Spacing.md,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inputTitle: {
    ...Typography.subheading,
  },
  inputDescription: {
    ...Typography.small,
    marginTop: -Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.heading,
  },
  sectionCount: {
    ...Typography.small,
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  usageIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageRow: {
    gap: Spacing.micro,
  },
  codeLabel: {
    ...Typography.bodySmallSemiBold,
  },
  usageTime: {
    ...Typography.caption,
  },
  creditAmount: {
    ...Typography.bodySemiBold,
  },
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
  emptyTitle: {
    ...Typography.subheading,
  },
  emptyDescription: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
