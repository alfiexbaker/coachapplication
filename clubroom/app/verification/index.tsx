import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';

import { VerificationBadge } from '@/components/verification/verification-badge';
import { VerificationItemRow } from '@/components/verification/verification-item-row';
import { Row } from '@/components/primitives/row';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useVerificationHub } from '@/hooks/use-verification-hub';

const VERIFICATION_HEADER = <PageHeader title="Verification" />;

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
        <SurfaceCard style={styles.statusCard}>
          <Row justify="space-between" align="center">
            <View>
              <ThemedText type="defaultSemiBold">Profile status</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{progress}% complete</ThemedText>
            </View>
            <VerificationBadge level={status.overallLevel} />
          </Row>
          <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: palette.success, width: `${progress}%` },
              ]}
            />
          </View>
        </SurfaceCard>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Account
          </ThemedText>
          <SurfaceCard>
            <VerificationItemRow
              colors={palette}
              icon="mail"
              title="Email"
              description={
                status.email.status === 'VERIFIED' ? 'Sign-in email verified' : 'Email not verified'
              }
              item={status.email}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="call"
              title="Phone"
              description={
                status.phone.status === 'VERIFIED' ? 'Phone number verified' : 'Phone not verified'
              }
              item={status.phone}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Documents
          </ThemedText>
          <SurfaceCard>
            <VerificationItemRow
              colors={palette}
              icon="card"
              title="Photo ID"
              description="Passport, driving licence or national ID"
              item={status.identity}
              onPress={() => router.push(Routes.VERIFICATION_ID)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="shield-checkmark"
              title="DBS certificate"
              description="Enhanced DBS evidence"
              item={status.backgroundCheck}
              onPress={() => router.push(Routes.VERIFICATION_BACKGROUND)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="ribbon"
              title="Coaching credentials"
              description={
                hasCredentials
                  ? `${status.credentials.length} submitted`
                  : 'Coaching qualifications'
              }
              item={credentialStatus}
              onPress={() => router.push(Routes.VERIFICATION_CREDENTIALS)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              colors={palette}
              icon="document-text"
              title="Insurance certificate"
              description="Public liability cover"
              item={status.insurance}
              onPress={() => router.push(Routes.VERIFICATION_INSURANCE)}
            />
          </SurfaceCard>
        </View>
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  statusCard: { gap: Spacing.sm },
  progressBarBg: { height: 8, borderRadius: Radii.xs, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: Radii.xs },
  section: { gap: Spacing.sm },
  sectionTitle: { marginLeft: Spacing.xs },
  divider: { height: 1, marginLeft: 52 },
});
