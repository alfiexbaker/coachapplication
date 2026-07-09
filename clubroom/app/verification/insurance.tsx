import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInsuranceVerification } from '@/hooks/use-insurance-verification';

export default function InsuranceVerificationScreen() {
  const { colors: palette } = useTheme();
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
    uploaded,
    handleUpload,
    handleSubmit,
    setUploaded,
  } = useInsuranceVerification();

  const header = (
    <PageHeader
      title="Insurance"
      showBack
      backIcon="arrow-back"
      onBackPress={() => router.back()}
      centerTitle
    />
  );

  return (
    <VerificationScreenState
      colors={palette}
      screenStatus={screenStatus}
      error={error}
      retry={retry}
      errorMessage="Failed to load insurance status."
      emptyIcon="document-text-outline"
      emptyTitle="Insurance unavailable"
      emptyMessage="Insurance status is currently unavailable."
      header={header}
      isEmpty={!status}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <SurfaceCard style={styles.card}>
          <Row gap="sm" align="center">
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: isVerified
                    ? withAlpha(palette.success, 0.12)
                    : isPending
                      ? withAlpha(palette.warning, 0.12)
                      : withAlpha(palette.muted, 0.12),
                },
              ]}
            >
              <Ionicons
                name={isVerified ? 'shield-checkmark' : isPending ? 'time' : 'document-text'}
                size={28}
                color={isVerified ? palette.success : isPending ? palette.warning : palette.muted}
              />
            </View>
            <View style={styles.statusText}>
              <ThemedText type="defaultSemiBold">
                {isVerified
                  ? 'Insurance Verified'
                  : isPending
                    ? 'Verification Pending'
                    : 'Not Verified'}
              </ThemedText>
              <ThemedText style={{ color: palette.muted }}>
                {isVerified
                  ? 'Your public liability insurance is verified and up to date.'
                  : isPending
                    ? 'Your documents are being reviewed.'
                    : 'Upload your public liability insurance certificate to get verified.'}
              </ThemedText>
            </View>
          </Row>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Requirements</ThemedText>
          <View style={styles.requirements}>
            {[
              'Public liability insurance (minimum £5M cover)',
              'Must be current and not expired',
              'Must cover coaching activities with minors',
              'Certificate must show your name and policy number',
            ].map((req) => (
              <Row key={req} gap="xs" align="flex-start">
                <Ionicons name="checkmark" size={16} color={palette.success} style={styles.reqIcon} />
                <ThemedText style={[styles.reqText, { color: palette.muted }]}>{req}</ThemedText>
              </Row>
            ))}
          </View>
        </SurfaceCard>

        {!isVerified && (
          <View style={styles.actions}>
            {uploaded ? (
              <SurfaceCard style={styles.uploadedCard}>
                <Row gap="sm" align="center">
                  <Ionicons name="document-text" size={24} color={palette.success} />
                  <View style={styles.uploadedText}>
                    <ThemedText type="defaultSemiBold">Certificate selected</ThemedText>
                    <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                      Ready to submit for review
                    </ThemedText>
                  </View>
                  <Button
                    onPress={() => setUploaded(false)}
                    disabled={submitting}
                    variant="outline"
                    label="Remove"
                  />
                </Row>
              </SurfaceCard>
            ) : null}

            <Button
              onPress={handleUpload}
              disabled={submitting}
              variant={uploaded ? 'secondary' : 'primary'}
              label={uploaded ? 'Choose different document' : 'Upload certificate'}
            />
            <Button
              onPress={handleSubmit}
              disabled={!uploaded || submitting}
              variant="primary"
              label={submitting ? 'Submitting...' : 'Submit for review'}
            />
          </View>
        )}

        <SurfaceCard style={styles.card}>
          <Row gap="sm" align="flex-start">
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Verified coaches with insurance appear higher in search results and display a trust
              badge on their profile.
            </ThemedText>
          </Row>
        </SurfaceCard>
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  card: { gap: Spacing.sm },
  actions: { gap: Spacing.sm },
  uploadedCard: { gap: Spacing.sm },
  uploadedText: { flex: 1, gap: Spacing.micro },
  statusBadge: {
    width: 52,
    height: 52,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: { flex: 1, gap: Spacing.micro },
  requirements: { gap: Spacing.xs },
  reqIcon: { marginTop: Spacing.micro },
  reqText: { flex: 1, ...Typography.bodySmall },
  infoText: { flex: 1, ...Typography.small },
});
