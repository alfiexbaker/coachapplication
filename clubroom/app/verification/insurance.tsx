import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { VerificationStatusCard } from '@/components/verification/verification-status-card';
import { Spacing, Typography } from '@/constants/theme';
import { useInsuranceVerification } from '@/hooks/use-insurance-verification';
import { useTheme } from '@/hooks/useTheme';

export default function InsuranceVerificationScreen() {
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
    uploaded,
    handleUpload,
    handleSubmit,
    setUploaded,
  } = useInsuranceVerification();
  const header = <PageHeader title="Insurance" showBack onBackPress={() => router.back()} />;
  const item = status?.insurance;
  const isExpired = item?.status === 'EXPIRED';
  const isRejected = item?.status === 'FAILED';

  return (
    <VerificationScreenState
      colors={colors}
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
        <VerificationStatusCard
          colors={colors}
          icon={
            isVerified
              ? 'shield-checkmark'
              : isPending
                ? 'time'
                : isExpired
                  ? 'alert-circle'
                  : isRejected
                    ? 'close-circle'
                    : 'document-text'
          }
          tone={
            isVerified
              ? colors.success
              : isPending
                ? colors.warning
                : isExpired || isRejected
                  ? colors.error
                  : colors.muted
          }
          title={
            isVerified
              ? 'Insurance verified'
              : isPending
                ? 'Under review'
                : isExpired
                  ? 'Insurance expired'
                  : isRejected
                    ? 'Insurance not approved'
                    : 'Not submitted'
          }
          detail={
            isVerified
              ? item?.expiresAt
                ? `Valid until ${new Date(item.expiresAt).toLocaleDateString()}`
                : 'Your public liability insurance is verified.'
              : isPending
                ? 'Your insurance certificate is awaiting review.'
                : isExpired
                  ? 'Submit a current insurance certificate.'
                  : isRejected
                    ? 'Check the certificate and submit it again.'
                    : 'Submit your public liability insurance certificate.'
          }
        />

        {!isVerified && !isPending ? (
          <>
            <ThemedText style={{ color: colors.muted }}>
              Select a PDF, JPG, PNG, WebP or HEIC file up to 20 MB.
            </ThemedText>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Requirements</ThemedText>
              {[
                'At least £5 million public liability cover',
                'Current policy covering coaching with minors',
                'Your name and policy number visible',
              ].map((requirement) => (
                <Row key={requirement} gap="sm" align="flex-start">
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                  <ThemedText style={[styles.small, { color: colors.muted, flex: 1 }]}>
                    {requirement}
                  </ThemedText>
                </Row>
              ))}
            </View>

            {uploaded ? (
              <SurfaceCard>
                <Row gap="sm" align="center">
                  <Ionicons name="document-text" size={22} color={colors.success} />
                  <ThemedText type="defaultSemiBold" style={styles.selectedDocument}>
                    Certificate selected
                  </ThemedText>
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
              variant="outline"
              label={uploaded ? 'Choose different document' : 'Choose document'}
            />
            <Button
              onPress={handleSubmit}
              disabled={!uploaded || submitting}
              label={submitting ? 'Submitting...' : 'Submit for review'}
            />
          </>
        ) : null}
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  small: { ...Typography.small },
  selectedDocument: { flex: 1 },
});
