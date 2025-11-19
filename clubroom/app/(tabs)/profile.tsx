import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ACTIONS = [
  {
    title: 'Verification badges',
    description: 'Background check, pro experience, credential uploads.',
    cta: 'In progress',
  },
  {
    title: 'Messaging & notifications',
    description: 'Placeholder toggles until the real-time messaging stack lands in S2.',
    cta: 'Coming soon',
  },
  {
    title: 'Payments & payouts',
    description: 'Stripe onboarding is staged for S3; keep UI hooks discoverable.',
    cta: 'Waiting on Trust sprint',
  },
];

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionHeader
          eyebrow="Sprint 1 · Trust"
          title="Profile & settings"
          subtitle="This tab keeps trust signals surfaced while gating not-yet-built flows behind informative placeholders."
        />
        {ACTIONS.map((action) => (
          <SurfaceCard key={action.title}>
            <ThemedText type="defaultSemiBold">{action.title}</ThemedText>
            <ThemedText style={styles.description}>{action.description}</ThemedText>
            <View
              style={[
                styles.ctaPill,
                {
                  backgroundColor:
                    scheme === 'dark' ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.15)',
                },
              ]}>
              <ThemedText style={styles.ctaLabel}>{action.cta}</ThemedText>
            </View>
          </SurfaceCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.md,
  },
  description: {
    marginTop: Spacing.xs,
    opacity: 0.85,
  },
  ctaPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    marginTop: Spacing.sm,
  },
  ctaLabel: {
    fontWeight: '600',
  },
});
