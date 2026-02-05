import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PurchaseButton } from '@/components/packages/PurchaseButton';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { packageService } from '@/services/package-service';
import type { SessionPackage } from '@/constants/types';

const logger = createLogger('PackageDetailScreen');

/**
 * Package detail screen - view package details and purchase
 */
export default function PackageDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [pkg, setPkg] = useState<SessionPackage | null>(null);
  const [loading, setLoading] = useState(true);

  const isCoach = currentUser?.role === 'COACH';
  const isOwnPackage = pkg?.coachId === currentUser?.id;

  useFocusEffect(
    useCallback(() => {
      async function loadPackage() {
        if (!id) return;
        setLoading(true);
        try {
          const data = await packageService.getPackageById(id);
          setPkg(data);
        } catch (error) {
          logger.error('Failed to load package:', error);
          showToast('Failed to load package', 'error');
        } finally {
          setLoading(false);
        }
      }
      loadPackage();
    }, [id, showToast])
  );

  const handlePurchaseSuccess = (purchaseId: string) => {
    showToast('Package purchased successfully!', 'success');
    router.back();
  };

  const handlePurchaseError = (error: string) => {
    showToast(error, 'error');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitleText}>Package Details</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading package...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!pkg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitleText}>Package Details</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText style={[styles.loadingText, { color: palette.error }]}>
            Package not found
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const pricePerSession = pkg.pricePerSession ?? Math.round((pkg.price / pkg.sessionCount) * 100) / 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitleText}>Package Details</ThemedText>
        {isOwnPackage && (
          <Clickable
            onPress={() => router.push('/packages/manage')}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={24} color={palette.tint} />
          </Clickable>
        )}
        {!isOwnPackage && <View style={{ width: 24 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Package Header */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.mainCard}>
            {/* Discount Badge */}
            {pkg.discountPercent > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: palette.success }]}>
                <ThemedText style={styles.discountText}>
                  Save {pkg.discountPercent}%
                </ThemedText>
              </View>
            )}

            <View style={styles.mainContent}>
              <ThemedText type="title" style={styles.packageName}>
                {pkg.name}
              </ThemedText>

              {pkg.coachName && (
                <View style={styles.coachRow}>
                  <Ionicons name="person-circle-outline" size={16} color={palette.muted} />
                  <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                    by {pkg.coachName}
                  </ThemedText>
                </View>
              )}

              {/* Price */}
              <View style={styles.priceSection}>
                <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>
                  Package Price
                </ThemedText>
                <ThemedText type="title" style={[styles.price, { color: palette.tint }]}>
                  {packageService.formatPrice(pkg.price, pkg.currency)}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Description */}
        {pkg.description && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Description
              </ThemedText>
              <ThemedText style={[styles.description, { color: palette.muted }]}>
                {pkg.description}
              </ThemedText>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Package Details */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              What&apos;s Included
            </ThemedText>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: `${palette.tint}10` }]}>
                  <Ionicons name="calendar-outline" size={20} color={palette.tint} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold" style={styles.detailValue}>
                    {pkg.sessionCount}
                  </ThemedText>
                  <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>
                    Sessions
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: `${palette.success}10` }]}>
                  <Ionicons name="pricetag-outline" size={20} color={palette.success} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold" style={styles.detailValue}>
                    {packageService.formatPrice(pricePerSession, pkg.currency)}
                  </ThemedText>
                  <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>
                    Per Session
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={[styles.detailIcon, { backgroundColor: `${palette.warning}10` }]}>
                  <Ionicons name="time-outline" size={20} color={palette.warning} />
                </View>
                <View style={styles.detailContent}>
                  <ThemedText type="defaultSemiBold" style={styles.detailValue}>
                    {pkg.validDays}
                  </ThemedText>
                  <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>
                    Days Valid
                  </ThemedText>
                </View>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Focus Areas */}
        {pkg.focus && pkg.focus.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Focus Areas
              </ThemedText>
              <View style={styles.focusRow}>
                {pkg.focus.map((f) => (
                  <View key={f} style={[styles.focusTag, { backgroundColor: `${palette.tint}10` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
                    <ThemedText style={[styles.focusText, { color: palette.tint }]}>{f}</ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* How It Works */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              How It Works
            </ThemedText>
            <View style={styles.howItWorks}>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.stepNumberText}>1</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>
                  Purchase this package using your wallet balance
                </ThemedText>
              </View>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.stepNumberText}>2</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>
                  Book sessions with this coach as usual
                </ThemedText>
              </View>
              <View style={styles.step}>
                <View style={[styles.stepNumber, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.stepNumberText}>3</ThemedText>
                </View>
                <ThemedText style={styles.stepText}>
                  Sessions are deducted from your package automatically
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Purchase Button - Only for non-coaches viewing others' packages */}
      {!isCoach && pkg.isActive && (
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={[styles.footer, { backgroundColor: palette.background }]}
        >
          <PurchaseButton
            pkg={pkg}
            onPurchaseSuccess={handlePurchaseSuccess}
            onPurchaseError={handlePurchaseError}
          />
        </Animated.View>
      )}

      {/* Inactive Package Warning */}
      {!pkg.isActive && (
        <View style={[styles.footer, { backgroundColor: palette.background }]}>
          <View style={[styles.inactiveBanner, { backgroundColor: `${palette.error}15` }]}>
            <Ionicons name="alert-circle-outline" size={20} color={palette.error} />
            <ThemedText style={[styles.inactiveText, { color: palette.error }]}>
              This package is currently unavailable for purchase
            </ThemedText>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitleText: {
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 14,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  mainCard: {
    padding: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomLeftRadius: Radii.md,
    zIndex: 1,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  packageName: {
    fontSize: 24,
    lineHeight: 30,
    paddingRight: Spacing.xl,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachName: {
    fontSize: 14,
  },
  priceSection: {
    marginTop: Spacing.sm,
  },
  priceLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 32,
  },
  sectionCard: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    gap: 2,
  },
  detailValue: {
    fontSize: 16,
  },
  detailLabel: {
    fontSize: 11,
  },
  focusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  focusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.md,
  },
  focusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  howItWorks: {
    gap: Spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inactiveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  inactiveText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
