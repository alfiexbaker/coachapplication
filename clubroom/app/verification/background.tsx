import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBackgroundCheck, BG_CHECK_STEPS } from '@/hooks/use-background-check';

export default function BackgroundCheckScreen() {
  const { colors } = useTheme();
  const {
    status,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    isVerified,
    isPending,
    handleStartCheck,
    handleMockApprove,
  } = useBackgroundCheck();

  if (screenStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (screenStatus === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to load background check status.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (screenStatus === 'empty' || !status) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
        <EmptyState
          icon="shield-outline"
          title="Verification unavailable"
          message="Background check data is currently unavailable."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Row align="center" gap="sm">
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Background Check</ThemedText>
        </Row>

        {isVerified ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
              <Ionicons name="shield-checkmark" size={48} color={colors.success} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>Background Check Complete</ThemedText>
            <ThemedText style={[styles.statusText, { color: colors.muted }]}>
              Your enhanced DBS check was completed on {status?.backgroundCheck.verifiedAt ? new Date(status.backgroundCheck.verifiedAt).toLocaleDateString() : 'N/A'}
            </ThemedText>
            {status?.backgroundCheck.expiresAt && (
              <Row align="center" gap="xs" style={[styles.expiryBadge, { backgroundColor: withAlpha(colors.success, 0.06) }]}>
                <Ionicons name="calendar" size={16} color={colors.success} />
                <ThemedText style={{ color: colors.success, ...Typography.small }}>Valid until {new Date(status.backgroundCheck.expiresAt).toLocaleDateString()}</ThemedText>
              </Row>
            )}
          </SurfaceCard>
        ) : isPending ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
              <Ionicons name="hourglass" size={48} color={colors.warning} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>Check In Progress</ThemedText>
            <ThemedText style={[styles.statusText, { color: colors.muted }]}>Your background check is being processed. This typically takes 2-5 business days.</ThemedText>
            <Clickable onPress={handleMockApprove} style={[styles.mockButton, { borderColor: colors.success }]}>
              <ThemedText style={{ color: colors.success, fontWeight: '600' }}>Mock: Complete Now</ThemedText>
            </Clickable>
          </SurfaceCard>
        ) : (
          <>
            <ThemedText style={{ color: colors.muted }}>Complete an enhanced DBS (Disclosure and Barring Service) check to verify your suitability to work with children and young people.</ThemedText>

            <SurfaceCard style={styles.infoCard}>
              <InfoRow icon="shield" title="Enhanced DBS Check" subtitle="Required for working with children" colors={colors} />
              <InfoRow icon="time" title="Processing Time" subtitle="2-5 business days on average" colors={colors} />
              <InfoRow icon="card" title="Cost" subtitle="Free for Clubroom coaches (Mock)" colors={colors} />
            </SurfaceCard>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">How it works</ThemedText>
              <View style={styles.stepsContainer}>
                {BG_CHECK_STEPS.map((step, index) => (
                  <Row key={step.id} gap="md" style={styles.stepRow}>
                    <View style={styles.stepIndicator}>
                      <View style={[styles.stepNumber, { backgroundColor: colors.tint }]}>
                        <ThemedText style={[styles.stepNumberText, { color: colors.onPrimary }]}>{step.id}</ThemedText>
                      </View>
                      {index < BG_CHECK_STEPS.length - 1 && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                    </View>
                    <View style={styles.stepContent}>
                      <ThemedText type="defaultSemiBold">{step.title}</ThemedText>
                      <ThemedText style={{ color: colors.muted, ...Typography.small }}>{step.description}</ThemedText>
                    </View>
                  </Row>
                ))}
              </View>
            </View>

            <View style={styles.requirements}>
              <ThemedText type="defaultSemiBold">You will need</ThemedText>
              {['Valid government-issued ID', 'Proof of address (utility bill, bank statement)', 'National Insurance number', '5 years of address history'].map((req, i) => (
                <Row key={i} align="center" gap="sm">
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <ThemedText style={{ color: colors.muted, ...Typography.bodySmall, flex: 1 }}>{req}</ThemedText>
                </Row>
              ))}
            </View>

            <Button onPress={handleStartCheck} disabled={submitting}>{submitting ? 'Starting...' : 'Start Background Check'}</Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, title, subtitle, colors }: { icon: string; title: string; subtitle: string; colors: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'] }) {
  return (
    <Row align="center" gap="md">
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={24} color={colors.tint} />
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={{ color: colors.muted, ...Typography.small }}>{subtitle}</ThemedText>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { padding: Spacing.xs, marginLeft: -Spacing.xs },
  statusCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  statusIcon: { width: 80, height: 80, borderRadius: Radii['3xl'], justifyContent: 'center', alignItems: 'center' },
  statusTitle: { ...Typography.heading },
  statusText: { textAlign: 'center', ...Typography.bodySmall, paddingHorizontal: Spacing.md },
  expiryBadge: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md, borderRadius: Radii.pill, marginTop: Spacing.xs },
  mockButton: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radii.button, borderWidth: 1.5 },
  infoCard: { gap: Spacing.md },
  section: { gap: Spacing.sm },
  stepsContainer: { gap: 0 },
  stepRow: {},
  stepIndicator: { alignItems: 'center', width: 32 },
  stepNumber: { width: 28, height: 28, borderRadius: Radii.lg, justifyContent: 'center', alignItems: 'center' },
  stepNumberText: { ...Typography.bodySmallSemiBold },
  stepLine: { width: 2, flex: 1, minHeight: 24, marginVertical: Spacing.xxs },
  stepContent: { flex: 1, paddingBottom: Spacing.md, gap: Spacing.micro },
  requirements: { gap: Spacing.sm },
});
