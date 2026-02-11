/**
 * Referral Invite Screen
 *
 * Share referral codes via multiple channels. Shows code + link copy,
 * share buttons, and terms. All state/logic in useReferralInvite hook.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ShareButton } from '@/components/referrals';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useReferralInvite } from '@/hooks/use-referral-invite';
import { scaleFont } from '@/utils/scale';

export default function ReferralInviteScreen() {
  const { colors: palette } = useTheme();
  const c = useReferralInvite();

  if (c.status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="close" size={28} color={palette.text} /></Clickable>
          <ThemedText type="subtitle" style={styles.headerTitle}>Invite Friends</ThemedText>
          <View style={styles.headerSpacer} />
        </Row>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (c.status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="close" size={28} color={palette.text} /></Clickable>
          <ThemedText type="subtitle" style={styles.headerTitle}>Invite Friends</ThemedText>
          <View style={styles.headerSpacer} />
        </Row>
        <ErrorState message={c.error?.message || 'Unable to load your referral code.'} onRetry={c.retry} />
      </SafeAreaView>
    );
  }

  if (c.status === 'empty' || !c.referralCode) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="close" size={28} color={palette.text} /></Clickable>
          <ThemedText type="subtitle" style={styles.headerTitle}>Invite Friends</ThemedText>
          <View style={styles.headerSpacer} />
        </Row>
        <EmptyState
          icon="gift-outline"
          title="Referral code unavailable"
          message="We could not find your referral code yet. Pull to refresh and try again."
          actionLabel="Retry"
          onPressAction={c.retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Row align="center" justify="between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="close" size={28} color={palette.text} /></Clickable>
        <ThemedText type="subtitle" style={styles.headerTitle}>Invite Friends</ThemedText>
        <View style={styles.headerSpacer} />
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} />}
      >
          <>
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.illustrationContainer}>
              <View style={[styles.illustrationCircle, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                <View style={[styles.illustrationInner, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <Ionicons name="gift" size={48} color={palette.tint} />
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(150).springify()}>
              <ThemedText type="title" style={styles.headline}>Give {c.creditText}, Get {c.creditText}</ThemedText>
              <ThemedText style={[styles.subheadline, { color: palette.muted }]}>
                Share your code with friends. When they sign up and complete their first booking, you both earn wallet credits!
              </ThemedText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).springify()}>
              <SurfaceCard style={styles.codeCard}>
                <ThemedText style={[styles.codeLabel, { color: palette.muted }]}>Your Referral Code</ThemedText>
                <ThemedText type="title" style={styles.codeValue}>{c.referralCode.code}</ThemedText>
                <Row gap="sm" style={styles.codeActions}>
                  <Clickable onPress={c.handleCopyCode} style={[styles.actionButton, {
                    backgroundColor: c.copied ? withAlpha(palette.success, 0.09) : palette.background,
                    borderColor: c.copied ? palette.success : palette.border,
                  }]}>
                    <Row align="center" gap="xxs">
                      <Ionicons name={c.copied ? 'checkmark' : 'copy-outline'} size={18} color={c.copied ? palette.success : palette.icon} />
                      <ThemedText style={[styles.actionButtonText, { color: c.copied ? palette.success : palette.text }]}>
                        {c.copied ? 'Copied!' : 'Copy Code'}
                      </ThemedText>
                    </Row>
                  </Clickable>
                  <Clickable onPress={c.handleCopyLink} style={[styles.actionButton, {
                    backgroundColor: c.linkCopied ? withAlpha(palette.success, 0.09) : palette.background,
                    borderColor: c.linkCopied ? palette.success : palette.border,
                  }]}>
                    <Row align="center" gap="xxs">
                      <Ionicons name={c.linkCopied ? 'checkmark' : 'link-outline'} size={18} color={c.linkCopied ? palette.success : palette.icon} />
                      <ThemedText style={[styles.actionButtonText, { color: c.linkCopied ? palette.success : palette.text }]}>
                        {c.linkCopied ? 'Copied!' : 'Copy Link'}
                      </ThemedText>
                    </Row>
                  </Clickable>
                </Row>
              </SurfaceCard>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(250).springify()}>
              <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Share via</ThemedText>
              <Row justify="center" gap="md" style={styles.shareOptions}>
                {(['share-social', 'chatbubble', 'mail', 'ellipsis-horizontal'] as const).map((icon) => (
                  <ShareButton key={icon} code={c.referralCode!.code} userName={c.userName} creditAmount={c.creditAmount}
                    variant="icon" onShare={() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
                ))}
              </Row>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300).springify()}>
              <ShareButton code={c.referralCode.code} userName={c.userName} creditAmount={c.creditAmount} size="large" label="Share Your Referral Link" />
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <View style={styles.termsContainer}>
                <ThemedText style={[styles.termsText, { color: palette.muted }]}>
                  Credits are awarded after your friend completes their first booking. Credits expire 12 months from the date they&apos;re earned.
                </ThemedText>
              </View>
            </Animated.View>
          </>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.heading, fontSize: scaleFont(Typography.heading.fontSize) },
  headerSpacer: { width: 28 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.lg },
  illustrationContainer: { alignItems: 'center', paddingVertical: Spacing.md },
  illustrationCircle: { width: 140, height: 140, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  illustrationInner: { width: 100, height: 100, borderRadius: Radii.pill, alignItems: 'center', justifyContent: 'center' },
  headline: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize), textAlign: 'center', marginBottom: Spacing.xs },
  subheadline: { ...Typography.body, fontSize: scaleFont(Typography.body.fontSize), textAlign: 'center', lineHeight: scaleFont(22), maxWidth: 320, alignSelf: 'center' },
  codeCard: { padding: Spacing.lg, alignItems: 'center', gap: Spacing.md },
  codeLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), textTransform: 'uppercase', letterSpacing: 1, fontWeight: '500' },
  codeValue: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize), letterSpacing: 3, fontVariant: ['tabular-nums'] },
  codeActions: {},
  actionButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  actionButtonText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  sectionLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '500', marginBottom: Spacing.xs, textAlign: 'center' },
  shareOptions: {},
  termsContainer: { paddingHorizontal: Spacing.md },
  termsText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), textAlign: 'center', lineHeight: scaleFont(18) },
});
