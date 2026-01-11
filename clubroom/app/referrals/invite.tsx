/**
 * Referral Invite Screen
 *
 * Dedicated screen for sharing referral codes. Provides multiple
 * sharing options and shows what friends will receive.
 */

import { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ShareButton } from '@/components/referrals';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { ReferralCode } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';

/**
 * Screen for sharing referral codes with multiple options.
 */
export default function ReferralInviteScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  // State
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Get current user info
  const userId = currentUser?.id ?? 'parent1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  // Load referral code
  useEffect(() => {
    async function loadCode() {
      try {
        const code = await referralService.getUserCode(userId, userName);
        setReferralCode(code);
      } catch (error) {
        console.error('Failed to load referral code:', error);
        Alert.alert('Error', 'Failed to load your referral code');
      } finally {
        setLoading(false);
      }
    }

    loadCode();
  }, [userId, userName]);

  // Copy code to clipboard
  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;

    try {
      await Clipboard.setStringAsync(referralCode.code);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy code');
    }
  }, [referralCode]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!referralCode) return;

    try {
      const url = referralService.getShareUrl(referralCode.code);
      await Clipboard.setStringAsync(url);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy link');
    }
  }, [referralCode]);

  const creditAmount = referralCode?.creditAmount ?? 10;
  const creditText = referralService.formatCredit(creditAmount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="close" size={28} color={palette.text} />
        </Clickable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Invite Friends
        </ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
          </View>
        ) : referralCode ? (
          <>
            {/* Illustration / Icon */}
            <Animated.View
              entering={FadeInDown.delay(100).springify()}
              style={styles.illustrationContainer}
            >
              <View style={[styles.illustrationCircle, { backgroundColor: `${palette.tint}10` }]}>
                <View style={[styles.illustrationInner, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="gift" size={48} color={palette.tint} />
                </View>
              </View>
            </Animated.View>

            {/* Headline */}
            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <ThemedText type="title" style={styles.headline}>
                Give {creditText}, Get {creditText}
              </ThemedText>
              <ThemedText style={[styles.subheadline, { color: palette.muted }]}>
                Share your code with friends. When they sign up and complete their first booking, you both earn wallet credits!
              </ThemedText>
            </Animated.View>

            {/* Code Display */}
            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <SurfaceCard style={styles.codeCard}>
                <ThemedText style={[styles.codeLabel, { color: palette.muted }]}>
                  Your Referral Code
                </ThemedText>
                <ThemedText type="title" style={styles.codeValue}>
                  {referralCode.code}
                </ThemedText>
                <View style={styles.codeActions}>
                  <Clickable
                    onPress={handleCopyCode}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: copied ? `${palette.success}15` : palette.background,
                        borderColor: copied ? palette.success : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={18}
                      color={copied ? palette.success : palette.icon}
                    />
                    <ThemedText
                      style={[
                        styles.actionButtonText,
                        { color: copied ? palette.success : palette.text },
                      ]}
                    >
                      {copied ? 'Copied!' : 'Copy Code'}
                    </ThemedText>
                  </Clickable>
                  <Clickable
                    onPress={handleCopyLink}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: linkCopied ? `${palette.success}15` : palette.background,
                        borderColor: linkCopied ? palette.success : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={linkCopied ? 'checkmark' : 'link-outline'}
                      size={18}
                      color={linkCopied ? palette.success : palette.icon}
                    />
                    <ThemedText
                      style={[
                        styles.actionButtonText,
                        { color: linkCopied ? palette.success : palette.text },
                      ]}
                    >
                      {linkCopied ? 'Copied!' : 'Copy Link'}
                    </ThemedText>
                  </Clickable>
                </View>
              </SurfaceCard>
            </Animated.View>

            {/* Share Options */}
            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
                Share via
              </ThemedText>
              <View style={styles.shareOptions}>
                <ShareOption
                  icon="share-social"
                  label="Share"
                  color={palette.tint}
                  code={referralCode.code}
                  userName={userName}
                  creditAmount={creditAmount}
                />
                <ShareOption
                  icon="chatbubble"
                  label="Message"
                  color="#34C759"
                  code={referralCode.code}
                  userName={userName}
                  creditAmount={creditAmount}
                />
                <ShareOption
                  icon="mail"
                  label="Email"
                  color="#FF9500"
                  code={referralCode.code}
                  userName={userName}
                  creditAmount={creditAmount}
                />
                <ShareOption
                  icon="ellipsis-horizontal"
                  label="More"
                  color={palette.muted}
                  code={referralCode.code}
                  userName={userName}
                  creditAmount={creditAmount}
                />
              </View>
            </Animated.View>

            {/* Main Share Button */}
            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <ShareButton
                code={referralCode.code}
                userName={userName}
                creditAmount={creditAmount}
                size="large"
                label="Share Your Referral Link"
              />
            </Animated.View>

            {/* Terms */}
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <View style={styles.termsContainer}>
                <ThemedText style={[styles.termsText, { color: palette.muted }]}>
                  Credits are awarded after your friend completes their first booking.
                  Credits expire 12 months from the date they're earned.
                </ThemedText>
              </View>
            </Animated.View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color={palette.warning} />
            <ThemedText style={[styles.errorText, { color: palette.muted }]}>
              Unable to load your referral code. Please try again.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================================
// SHARE OPTION COMPONENT
// ============================================================================

interface ShareOptionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  code: string;
  userName: string;
  creditAmount: number;
}

function ShareOption({ icon, label, color, code, userName, creditAmount }: ShareOptionProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // All options trigger the native share sheet for now
  // Could be customized to open specific apps if needed
  return (
    <ShareButton
      code={code}
      userName={userName}
      creditAmount={creditAmount}
      variant="icon"
      onShare={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
    />
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
  headerTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
  },
  headerSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  loadingContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
  },

  // Illustration
  illustrationContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  illustrationCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Headline
  headline: {
    fontSize: scaleFont(28),
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subheadline: {
    fontSize: scaleFont(15),
    textAlign: 'center',
    lineHeight: scaleFont(22),
    maxWidth: 320,
    alignSelf: 'center',
  },

  // Code card
  codeCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  codeLabel: {
    fontSize: scaleFont(12),
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '500',
  },
  codeValue: {
    fontSize: scaleFont(32),
    fontWeight: '700',
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  codeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },

  // Share options
  sectionLabel: {
    fontSize: scaleFont(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '500',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  shareOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  shareOption: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shareIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },

  // Terms
  termsContainer: {
    paddingHorizontal: Spacing.md,
  },
  termsText: {
    fontSize: scaleFont(12),
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },

  // Error state
  errorContainer: {
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: scaleFont(15),
    textAlign: 'center',
  },
});
