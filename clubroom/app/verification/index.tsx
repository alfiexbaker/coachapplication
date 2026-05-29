import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';

import { VerificationBadge } from '@/components/verification/verification-badge';
import { VerificationItemRow } from '@/components/verification/verification-item-row';
import { Row } from '@/components/primitives/row';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVerificationHub } from '@/hooks/use-verification-hub';

const VERIFICATION_HEADER = <PageHeader title="Verification" subtitle="Build trust with parents" />;

export default function VerificationHubScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    progress,
    hasCredentials,
    credentialStatus,
  } = useVerificationHub();

  if (!status) {
    return (
      <VerificationScreenState
        colors={palette}
        screenStatus={screenStatus}
        error={error}
        retry={retry}
        errorMessage="Failed to load verification status."
        emptyIcon="shield-checkmark-outline"
        emptyTitle="Verification unavailable"
        emptyMessage="Verification status is currently unavailable."
        isEmpty
        header={VERIFICATION_HEADER}
      >
        <></>
      </VerificationScreenState>
    );
  }

  const levelLabel =
    status.overallLevel === 'PREMIUM'
      ? 'Fully verified - Premium coach status'
      : status.overallLevel === 'VERIFIED'
        ? 'Verified - Add credentials for Premium'
        : status.overallLevel === 'BASIC'
          ? 'Basic - Complete ID and background check'
          : 'Get started with verification';

  return (
    <VerificationScreenState
      colors={palette}
      screenStatus={screenStatus}
      error={error}
      retry={retry}
      errorMessage="Failed to load verification status."
      emptyIcon="shield-checkmark-outline"
      emptyTitle="Verification unavailable"
      emptyMessage="Verification status is currently unavailable."
      header={VERIFICATION_HEADER}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SurfaceCard style={styles.progressCard}>
          <Row justify="space-between" align="center">
            <View>
              <ThemedText type="defaultSemiBold">Verification Progress</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{progress}% complete</ThemedText>
            </View>
            <VerificationBadge level={status.overallLevel} size="large" />
          </Row>
          <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: palette.success, width: `${progress}%` },
              ]}
            />
          </View>
          <ThemedText style={[styles.levelLabel, { color: palette.muted }]}>
            {levelLabel}
          </ThemedText>
        </SurfaceCard>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Identity Verification
          </ThemedText>
          <SurfaceCard>
            <VerificationItemRow
              colors={palette}
              icon="mail"
              title="Email"
              description={
                status.email.status === 'VERIFIED'
                  ? 'Verified on your current sign-in email'
                  : 'Email verification is not available in-app yet'
              }
              item={status.email}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="call"
              title="Phone"
              description={
                status.phone.status === 'VERIFIED'
                  ? 'Verified phone number on file'
                  : 'Phone verification is managed outside the app in this build'
              }
              item={status.phone}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="card"
              title="Photo ID"
              description="Upload a government-issued ID"
              item={status.identity}
              onPress={() => router.push(Routes.VERIFICATION_ID)}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Background & Credentials
          </ThemedText>
          <SurfaceCard>
            <VerificationItemRow
              colors={palette}
              icon="shield-checkmark"
              title="Background Check"
              description="Complete DBS or equivalent check"
              item={status.backgroundCheck}
              onPress={() => router.push(Routes.VERIFICATION_BACKGROUND)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="ribbon"
              title="Coaching Credentials"
              description={
                hasCredentials
                  ? `${status.credentials.length} credential(s) uploaded`
                  : 'Upload coaching certifications'
              }
              item={credentialStatus}
              onPress={() => router.push(Routes.VERIFICATION_CREDENTIALS)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="document-text"
              title="Insurance"
              description="Public liability insurance"
              item={status.insurance}
              onPress={() => router.push(Routes.VERIFICATION_INSURANCE)}
            />
          </SurfaceCard>
        </View>

        <Row gap="sm" style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={palette.tint} />
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Verified coaches appear higher in search results and receive a trust badge on their
            profile.
          </ThemedText>
        </Row>
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  progressCard: { gap: Spacing.sm },
  progressBarBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: Radii.xs },
  levelLabel: { ...Typography.small },
  section: { gap: Spacing.sm },
  sectionTitle: { marginLeft: Spacing.xs },
  divider: { height: 1, marginLeft: 52 },
  infoBox: { padding: Spacing.md, borderRadius: Radii.md },
  infoText: { flex: 1, ...Typography.small },
});
