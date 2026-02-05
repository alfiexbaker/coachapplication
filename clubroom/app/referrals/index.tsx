/**
 * Referrals Dashboard Screen
 *
 * Main screen for the referral system. Shows the user's referral code,
 * statistics, and referral history. Provides quick access to share functionality.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { createLogger } from '@/utils/logger';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import {
  ReferralCodeCard,
  ReferralStats,
  ReferralHistory,
} from '@/components/referrals';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { ReferralCode, Referral, ReferralStats as ReferralStatsType } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('ReferralsDashboardScreen');

/**
 * Referrals dashboard screen showing code, stats, and history.
 */
export default function ReferralsDashboardScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [stats, setStats] = useState<ReferralStatsType | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Get current user info
  const userId = currentUser?.id ?? 'parent1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [codeResult, statsResult, history] = await Promise.all([
        referralService.getUserCode(userId, userName),
        referralService.getReferralStats(userId),
        referralService.getReferralHistory(userId),
      ]);

      if (codeResult.success) {
        setReferralCode(codeResult.data);
      } else {
        logger.error('Failed to load referral code:', codeResult.error);
      }

      if (statsResult.success) {
        setStats(statsResult.data);
      } else {
        logger.error('Failed to load referral stats:', statsResult.error);
      }

      setReferrals(history);
    } catch (error) {
      logger.error('Failed to load referral data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, userName]);

  // Load on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Pull to refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Navigation
  const handleInvitePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/referrals/invite');
  }, []);

  const handleReferralPress = useCallback((referral: Referral) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Could navigate to referral detail screen if needed
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Referrals
          </ThemedText>
        </View>
        <Clickable
          onPress={handleInvitePress}
          style={[styles.inviteButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </Clickable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
          </View>
        ) : (
          <>
            {/* Hero Section */}
            <Animated.View entering={FadeInDown.delay(100).springify()}>
              <View style={[styles.heroSection, { backgroundColor: `${palette.tint}08` }]}>
                <View style={[styles.heroIcon, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="gift" size={32} color={palette.tint} />
                </View>
                <ThemedText type="subtitle" style={styles.heroTitle}>
                  Invite Friends, Earn Rewards
                </ThemedText>
                <ThemedText style={[styles.heroText, { color: palette.muted }]}>
                  Share your unique code and earn{' '}
                  {referralCode && referralService.formatCredit(referralCode.creditAmount)} credit
                  for each friend who joins and completes their first booking.
                </ThemedText>
              </View>
            </Animated.View>

            {/* Referral Code Card */}
            {referralCode && (
              <Animated.View entering={FadeInDown.delay(150).springify()}>
                <ReferralCodeCard
                  referralCode={referralCode}
                  userName={userName}
                />
              </Animated.View>
            )}

            {/* Stats */}
            {stats && (
              <Animated.View entering={FadeInDown.delay(200).springify()}>
                <ReferralStats stats={stats} variant="horizontal" />
              </Animated.View>
            )}

            {/* How It Works */}
            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <SurfaceCard style={styles.howItWorksCard}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  How It Works
                </ThemedText>
                <View style={styles.stepsContainer}>
                  <StepItem
                    number={1}
                    title="Share Your Code"
                    description="Send your unique referral code to friends"
                    palette={palette}
                  />
                  <StepItem
                    number={2}
                    title="Friend Signs Up"
                    description="They create an account using your code"
                    palette={palette}
                  />
                  <StepItem
                    number={3}
                    title="Earn Credits"
                    description="You both get credits after their first booking"
                    palette={palette}
                    isLast
                  />
                </View>
              </SurfaceCard>
            </Animated.View>

            {/* Referral History */}
            <Animated.View entering={FadeInDown.delay(300).springify()}>
              <ReferralHistory
                referrals={referrals}
                maxItems={5}
                onReferralPress={handleReferralPress}
              />
            </Animated.View>

            {/* View All History Link */}
            {referrals.length > 5 && (
              <Animated.View entering={FadeInDown.delay(350).springify()}>
                <Clickable
                  style={styles.viewAllLink}
                  onPress={() => {
                    // Could navigate to full history screen
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                    View All Referrals
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={18} color={palette.tint} />
                </Clickable>
              </Animated.View>
            )}

            {/* CTA Button */}
            <Animated.View entering={FadeInDown.delay(400).springify()}>
              <Button onPress={handleInvitePress} style={styles.ctaButton}>
                <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
                Invite Friends
              </Button>
            </Animated.View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// STEP ITEM COMPONENT
// ============================================================================

interface StepItemProps {
  number: number;
  title: string;
  description: string;
  palette: (typeof Colors)['light'];
  isLast?: boolean;
}

function StepItem({ number, title, description, palette, isLast }: StepItemProps) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepLeft}>
        <View style={[styles.stepNumber, { backgroundColor: `${palette.tint}15` }]}>
          <ThemedText style={[styles.stepNumberText, { color: palette.tint }]}>
            {number}
          </ThemedText>
        </View>
        {!isLast && <View style={[styles.stepLine, { backgroundColor: palette.border }]} />}
      </View>
      <View style={styles.stepContent}>
        <ThemedText type="defaultSemiBold" style={styles.stepTitle}>
          {title}
        </ThemedText>
        <ThemedText style={[styles.stepDescription, { color: palette.muted }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: scaleFont(24),
  },
  inviteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },

  // Hero section
  heroSection: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: scaleFont(20),
    textAlign: 'center',
  },
  heroText: {
    fontSize: scaleFont(14),
    textAlign: 'center',
    lineHeight: scaleFont(20),
    maxWidth: 300,
  },

  // How it works
  howItWorksCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  stepsContainer: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepLeft: {
    alignItems: 'center',
    width: 32,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: scaleFont(14),
    fontWeight: '700',
  },
  stepLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: 2,
  },
  stepTitle: {
    fontSize: scaleFont(15),
  },
  stepDescription: {
    fontSize: scaleFont(13),
  },

  // View all link
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  viewAllText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },

  // CTA
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
