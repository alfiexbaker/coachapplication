/**
 * Referrals Dashboard Screen
 *
 * Shows referral code, stats, history, and how-it-works guide.
 * All state/logic in useReferrals hook.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ReferralCodeCard, ReferralStats, ReferralHistory } from '@/components/referrals';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useReferrals } from '@/hooks/use-referrals';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';

const STEPS = [
  { number: 1, title: 'Share Your Code', description: 'Send your unique referral code to friends' },
  { number: 2, title: 'Friend Signs Up', description: 'They create an account using your code' },
  { number: 3, title: 'Earn Credits', description: 'You both get credits after their first booking' },
] as const;

export default function ReferralsDashboardScreen() {
  const { colors: palette } = useTheme();
  const c = useReferrals();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Referrals</ThemedText>
        </View>
        <Clickable onPress={c.handleInvitePress} style={[styles.inviteButton, { backgroundColor: palette.tint }]}>
          <Ionicons name="share-social-outline" size={20} color={palette.onPrimary} />
        </Clickable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.handleRefresh} />}>
        {c.loading ? (
          <View style={styles.loadingContainer}><ThemedText style={{ color: palette.muted }}>Loading...</ThemedText></View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={[styles.heroSection, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
                <View style={[styles.heroIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <Ionicons name="gift" size={32} color={palette.tint} />
                </View>
                <ThemedText type="subtitle" style={styles.heroTitle}>Invite Friends, Earn Rewards</ThemedText>
                <ThemedText style={[styles.heroText, { color: palette.muted }]}>
                  Share your unique code and earn {c.referralCode && referralService.formatCredit(c.referralCode.creditAmount)} credit
                  for each friend who joins and completes their first booking.
                </ThemedText>
              </View>
            </Animated.View>

            {c.referralCode && (
              <Animated.View entering={FadeInDown.delay(150).springify()}>
                <ReferralCodeCard referralCode={c.referralCode} userName={c.userName} />
              </Animated.View>
            )}

            {c.stats && (
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <ReferralStats stats={c.stats} variant="horizontal" />
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <SurfaceCard style={styles.howItWorksCard}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>How It Works</ThemedText>
                <View style={styles.stepsContainer}>
                  {STEPS.map((step, i) => (
                    <View key={step.number} style={styles.stepItem}>
                      <View style={styles.stepLeft}>
                        <View style={[styles.stepNumber, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                          <ThemedText style={[styles.stepNumberText, { color: palette.tint }]}>{step.number}</ThemedText>
                        </View>
                        {i < STEPS.length - 1 && <View style={[styles.stepLine, { backgroundColor: palette.border }]} />}
                      </View>
                      <View style={styles.stepContent}>
                        <ThemedText type="defaultSemiBold" style={styles.stepTitle}>{step.title}</ThemedText>
                        <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>{step.description}</ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <ReferralHistory referrals={c.referrals} maxItems={5} onReferralPress={c.handleReferralPress} />
            </Animated.View>

            {c.referrals.length > 5 && (
              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <Clickable style={styles.viewAllLink} onPress={c.handleViewAll}>
                  <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>View All Referrals</ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={palette.tint} />
                </Clickable>
              </Animated.View>
            )}

            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Button onPress={c.handleInvitePress} style={styles.ctaButton}>
                <Ionicons name="share-social-outline" size={20} color={palette.onPrimary} />
                Invite Friends
              </Button>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  inviteButton: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  loadingContainer: { padding: Spacing.xl, alignItems: 'center' },
  heroSection: { padding: Spacing.lg, borderRadius: Radii.lg, alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  heroIcon: { width: 64, height: 64, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize), textAlign: 'center' },
  heroText: { ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize), textAlign: 'center', lineHeight: scaleFont(20), maxWidth: 300 },
  howItWorksCard: { padding: Spacing.lg, gap: Spacing.md },
  sectionTitle: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  stepsContainer: { gap: 0 },
  stepItem: { flexDirection: 'row', gap: Spacing.md },
  stepLeft: { alignItems: 'center', width: 32 },
  stepNumber: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  stepLine: { width: 2, flex: 1, marginVertical: Spacing.xxs },
  stepContent: { flex: 1, paddingBottom: Spacing.md, gap: Spacing.micro },
  stepTitle: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  stepDescription: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  viewAllLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, paddingVertical: Spacing.sm },
  viewAllText: { ...Typography.bodySemiBold, fontSize: scaleFont(Typography.bodySemiBold.fontSize) },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.sm },
});
