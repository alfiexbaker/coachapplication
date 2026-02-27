import { Alert, ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
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
                    ? Alert.alert('Email Verified', 'Your email is already verified.')
                    : Alert.alert(
                        'Verify Email',
                        'We will send a verification code to your email address.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Send Code',
                            onPress: () =>
                              Alert.alert(
                                'Code Sent',
                                'Check your inbox for the verification code.',
                              ),
                          },
                        ],
                      )
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
                    ? Alert.alert('Phone Verified', 'Your phone number is already verified.')
                    : Alert.alert(
                        'Verify Phone',
                        'We will send an SMS verification code to your phone.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Send SMS',
                            onPress: () =>
                              Alert.alert(
                                'Code Sent',
                                'Check your messages for the verification code.',
                              ),
                          },
                        ],
                      )
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
                    ? Alert.alert(
                        'Insurance Verified',
                        'Your insurance documents are verified and up to date.',
                      )
                    : Alert.alert(
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
      </SafeAreaView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
  },
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
