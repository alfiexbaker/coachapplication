import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';

import { VerificationBadge } from '@/components/verification/verification-badge';
import { VerificationItemRow } from '@/components/verification/verification-item-row';
import { Row } from '@/components/primitives/row';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVerificationHub } from '@/hooks/use-verification-hub';
import { uiFeedback } from '@/services/ui-feedback';

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
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <ThemedText type="title">Verification</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            Complete your verification to build trust with parents
          </ThemedText>
        </View>

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
              description="Verify your email address"
              item={status.email}
              onPress={() =>
                status.email.status === 'VERIFIED'
                  ? uiFeedback.showToast('Your email is already verified.', 'success')
                  : uiFeedback.alert('Verify Email', 'We will send a verification code to your email address.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Send Code',
                        onPress: () => uiFeedback.showToast('Check your inbox for the verification code.', 'success'),
                      },
                    ])
              }
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="call"
              title="Phone"
              description="Verify your phone number"
              item={status.phone}
              onPress={() =>
                status.phone.status === 'VERIFIED'
                  ? uiFeedback.showToast('Your phone number is already verified.', 'success')
                  : uiFeedback.alert('Verify Phone', 'We will send an SMS verification code to your phone.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Send SMS',
                        onPress: () => uiFeedback.showToast('Check your messages for the verification code.', 'success'),
                      },
                    ])
              }
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
              onPress={() =>
                status.insurance.status === 'VERIFIED'
                  ? uiFeedback.showToast('Your insurance documents are verified and up to date.', 'success')
                  : uiFeedback.alert(
                      'Upload Insurance',
                      'Upload your public liability insurance certificate to get verified.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Upload',
                          onPress: () => router.push(Routes.VERIFICATION_INSURANCE),
                        },
                      ],
                    )
              }
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
  header: { gap: Spacing.xs },
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
