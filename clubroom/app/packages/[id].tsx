/**
 * Package Detail Screen
 *
 * View package details and purchase. Shows description, included items,
 * focus areas, how-it-works steps. All state/logic in usePackageDetail hook.
 */

import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { PurchaseButton } from '@/components/packages/PurchaseButton';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePackageDetail } from '@/hooks/use-package-detail';
import { packageService } from '@/services/package-service';

const HOW_IT_WORKS = [
  'Purchase this package using your wallet balance',
  'Book sessions with this coach as usual',
  'Sessions are deducted from your package automatically',
];

export default function PackageDetailScreen() {
  const { colors: palette } = useTheme();
  const c = usePackageDetail();

  if (c.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>Loading package...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!c.pkg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Header />
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText style={[styles.loadingText, { color: palette.error }]}>Package not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const pkg = c.pkg;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Header editVisible={c.isOwnPackage} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Card */}
        <Animated.View entering={FadeInDown.delay(50).springify()}>
          <SurfaceCard style={styles.mainCard}>
            {pkg.discountPercent > 0 && (
              <View style={[styles.discountBadge, { backgroundColor: palette.success }]}>
                <ThemedText style={[styles.discountText, { color: palette.onPrimary }]}>Save {pkg.discountPercent}%</ThemedText>
              </View>
            )}
            <View style={styles.mainContent}>
              <ThemedText type="title" style={styles.packageName}>{pkg.name}</ThemedText>
              {pkg.coachName && (
                <Row align="center" gap="xxs">
                  <Ionicons name="person-circle-outline" size={16} color={palette.muted} />
                  <ThemedText style={[styles.coachName, { color: palette.muted }]}>by {pkg.coachName}</ThemedText>
                </Row>
              )}
              <View style={styles.priceSection}>
                <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>Package Price</ThemedText>
                <ThemedText type="title" style={[styles.price, { color: palette.tint }]}>{packageService.formatPrice(pkg.price, pkg.currency)}</ThemedText>
              </View>
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Description */}
        {pkg.description && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Description</ThemedText>
              <ThemedText style={[styles.description, { color: palette.muted }]}>{pkg.description}</ThemedText>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* What's Included */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <SurfaceCard style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>What&apos;s Included</ThemedText>
            <Row justify="between" style={styles.detailsGrid}>
              {[
                { icon: 'calendar-outline' as const, value: String(pkg.sessionCount), label: 'Sessions', bg: palette.tint },
                { icon: 'pricetag-outline' as const, value: packageService.formatPrice(c.pricePerSession, pkg.currency), label: 'Per Session', bg: palette.success },
                { icon: 'time-outline' as const, value: String(pkg.validDays), label: 'Days Valid', bg: palette.warning },
              ].map((d) => (
                <Row key={d.label} align="center" gap="sm" flex style={styles.detailItem}>
                  <View style={[styles.detailIcon, { backgroundColor: withAlpha(d.bg, 0.06) }]}>
                    <Ionicons name={d.icon} size={20} color={d.bg} />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText type="defaultSemiBold" style={styles.detailValue}>{d.value}</ThemedText>
                    <ThemedText style={[styles.detailLabel, { color: palette.muted }]}>{d.label}</ThemedText>
                  </View>
                </Row>
              ))}
            </Row>
          </SurfaceCard>
        </Animated.View>

        {/* Focus Areas */}
        {pkg.focus && pkg.focus.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <SurfaceCard style={styles.sectionCard}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Focus Areas</ThemedText>
              <Row wrap gap="xs">
                {pkg.focus.map((f) => (
                  <Row key={f} align="center" gap="xxs" style={[styles.focusTag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
                    <ThemedText style={[styles.focusText, { color: palette.tint }]}>{f}</ThemedText>
                  </Row>
                ))}
              </Row>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* How It Works */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.sectionCard}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>How It Works</ThemedText>
            <View style={styles.howItWorks}>
              {HOW_IT_WORKS.map((text, i) => (
                <Row key={i} align="center" gap="md">
                  <View style={[styles.stepNumber, { backgroundColor: palette.tint }]}>
                    <ThemedText style={[styles.stepNumberText, { color: palette.onPrimary }]}>{i + 1}</ThemedText>
                  </View>
                  <ThemedText style={styles.stepText}>{text}</ThemedText>
                </Row>
              ))}
            </View>
          </SurfaceCard>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {!c.isCoach && pkg.isActive && (
        <Animated.View entering={FadeInDown.delay(300).springify()} style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <PurchaseButton pkg={pkg} onPurchaseSuccess={c.handlePurchaseSuccess} onPurchaseError={c.handlePurchaseError} />
        </Animated.View>
      )}

      {!pkg.isActive && (
        <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <Row align="center" gap="sm" style={[styles.inactiveBanner, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
            <Ionicons name="alert-circle-outline" size={20} color={palette.error} />
            <ThemedText style={[styles.inactiveText, { color: palette.error }]}>This package is currently unavailable for purchase</ThemedText>
          </Row>
        </View>
      )}
    </SafeAreaView>
  );
}

function Header({ editVisible }: { editVisible?: boolean }) {
  const { colors: palette } = useTheme();
  return (
    <Row align="center" justify="between" style={styles.header}>
      <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
      <ThemedText type="title" style={styles.headerTitleText}>Package Details</ThemedText>
      {editVisible ? (
        <Clickable onPress={() => router.push(Routes.PACKAGES_MANAGE)} hitSlop={8}><Ionicons name="create-outline" size={24} color={palette.tint} /></Clickable>
      ) : <View style={{ width: 24 }} />}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitleText: { ...Typography.heading },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { ...Typography.bodySmall },
  content: { padding: Spacing.lg, paddingTop: 0, gap: Spacing.md },
  mainCard: { padding: 0, overflow: 'hidden', position: 'relative' },
  discountBadge: { position: 'absolute', top: 0, right: 0, paddingHorizontal: Spacing.md, paddingVertical: 8, borderBottomLeftRadius: Radii.md, zIndex: 1 },
  discountText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  mainContent: { padding: Spacing.lg, gap: Spacing.sm },
  packageName: { ...Typography.display, paddingRight: Spacing.xl },
  coachName: { ...Typography.bodySmall },
  priceSection: { marginTop: Spacing.sm },
  priceLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  price: { ...Typography.display },
  sectionCard: { padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  description: { ...Typography.bodySmall },
  detailsGrid: { marginTop: Spacing.xs },
  detailItem: {},
  detailIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  detailContent: { gap: Spacing.micro },
  detailValue: { ...Typography.subheading },
  detailLabel: { ...Typography.caption },
  focusTag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.md },
  focusText: { ...Typography.smallSemiBold },
  howItWorks: { gap: Spacing.md },
  stepNumber: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { ...Typography.bodySmallSemiBold },
  stepText: { flex: 1, ...Typography.bodySmall },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingBottom: Spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'transparent' },
  inactiveBanner: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radii.md },
  inactiveText: { flex: 1, ...Typography.bodySmallSemiBold },
});
