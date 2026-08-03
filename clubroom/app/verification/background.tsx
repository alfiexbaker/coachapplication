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
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useBackgroundCheck } from '@/hooks/use-background-check';
import { useTheme } from '@/hooks/useTheme';

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
    uploaded,
    isVerified,
    isPending,
    handleUpload,
    handleSubmit,
    setUploaded,
  } = useBackgroundCheck();
  const header = <PageHeader title="DBS certificate" showBack onBackPress={() => router.back()} />;
  const item = status?.backgroundCheck;
  const verifiedAt = item?.verifiedAt;

  return (
    <VerificationScreenState
      colors={colors}
      screenStatus={screenStatus}
      error={error}
      retry={retry}
      errorMessage="Failed to load background check status."
      emptyIcon="shield-outline"
      emptyTitle="Verification unavailable"
      emptyMessage="Background check data is currently unavailable."
      isEmpty={!status}
      header={header}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isVerified ? (
          <VerificationStatusCard
            colors={colors}
            icon="shield-checkmark"
            tone={colors.success}
            title="DBS verified"
            detail={
              verifiedAt
                ? `Verified on ${new Date(verifiedAt).toLocaleDateString()}`
                : 'Your enhanced DBS status is verified.'
            }
            footer={
              item?.expiresAt ? (
                <Row
                  align="center"
                  gap="xs"
                  style={[styles.expiry, { backgroundColor: withAlpha(colors.success, 0.07) }]}
                >
                  <Ionicons name="calendar-outline" size={15} color={colors.success} />
                  <ThemedText style={[styles.small, { color: colors.success }]}>
                    Valid until {new Date(item.expiresAt).toLocaleDateString()}
                  </ThemedText>
                </Row>
              ) : undefined
            }
          />
        ) : isPending ? (
          <VerificationStatusCard
            colors={colors}
            icon="time"
            tone={colors.warning}
            title="Under review"
            detail="Your DBS certificate is awaiting review."
          />
        ) : (
          <>
            {item?.status === 'EXPIRED' ? (
              <VerificationStatusCard
                colors={colors}
                icon="alert-circle"
                tone={colors.error}
                title="DBS expired"
                detail="Submit a current certificate."
              />
            ) : item?.status === 'FAILED' ? (
              <VerificationStatusCard
                colors={colors}
                icon="close-circle"
                tone={colors.error}
                title="DBS not approved"
                detail="Check the document and submit it again."
              />
            ) : null}

            <ThemedText style={{ color: colors.muted }}>
              Select a PDF, JPG, PNG, WebP or HEIC file up to 20 MB.
            </ThemedText>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Requirements</ThemedText>
              {[
                'Enhanced DBS certificate',
                'Name and certificate number visible',
                'Issue date visible',
                'All text clearly readable',
              ].map((requirement) => (
                <Row key={requirement} align="flex-start" gap="sm">
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                  <ThemedText style={[styles.small, { color: colors.muted, flex: 1 }]}>
                    {requirement}
                  </ThemedText>
                </Row>
              ))}
            </View>

            {uploaded ? (
              <SurfaceCard>
                <Row align="center" gap="sm">
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
        )}
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  small: { ...Typography.small },
  expiry: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  selectedDocument: { flex: 1 },
});
