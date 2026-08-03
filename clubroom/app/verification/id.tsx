import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { VerificationStatusCard } from '@/components/verification/verification-status-card';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useIdVerification, ID_TYPES } from '@/hooks/use-id-verification';
import { useTheme } from '@/hooks/useTheme';

export default function IdUploadScreen() {
  const { colors } = useTheme();
  const {
    status,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    submitting,
    selectedType,
    uploaded,
    isVerified,
    isPending,
    setSelectedType,
    setUploaded,
    handleUpload,
    handleSubmit,
  } = useIdVerification();
  const header = <PageHeader title="Photo ID" showBack onBackPress={() => router.back()} />;
  const verifiedAt = status?.identity.verifiedAt;

  return (
    <VerificationScreenState
      colors={colors}
      screenStatus={screenStatus}
      error={error}
      retry={retry}
      errorMessage="Failed to load ID verification status."
      emptyIcon="card-outline"
      emptyTitle="Verification unavailable"
      emptyMessage="ID verification data is currently unavailable."
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
            icon="checkmark-circle"
            tone={colors.success}
            title="ID verified"
            detail={
              verifiedAt
                ? `Verified on ${new Date(verifiedAt).toLocaleDateString()}`
                : 'Your identity is verified.'
            }
          />
        ) : isPending ? (
          <VerificationStatusCard
            colors={colors}
            icon="time"
            tone={colors.warning}
            title="Under review"
            detail="Your ID document is awaiting review."
          />
        ) : (
          <>
            <ThemedText style={{ color: colors.muted }}>
              Choose an ID type, then select a PDF, JPG, PNG, WebP or HEIC file up to 20 MB.
            </ThemedText>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">ID type</ThemedText>
              <SurfaceCard style={styles.typeList}>
                {ID_TYPES.map((type, index) => {
                  const selected = selectedType === type.id;
                  return (
                    <View key={type.id}>
                      <Clickable
                        accessibilityLabel={type.label}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        disabled={submitting}
                        onPress={() => setSelectedType(type.id)}
                        style={[
                          styles.typeRow,
                          selected ? { backgroundColor: withAlpha(colors.tint, 0.06) } : undefined,
                        ]}
                      >
                        <ThemedText
                          type="defaultSemiBold"
                          style={[
                            styles.typeLabel,
                            { color: selected ? colors.tint : colors.text },
                          ]}
                        >
                          {type.label}
                        </ThemedText>
                        <Ionicons
                          name={selected ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={selected ? colors.tint : colors.muted}
                        />
                      </Clickable>
                      {index < ID_TYPES.length - 1 ? (
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                      ) : null}
                    </View>
                  );
                })}
              </SurfaceCard>
            </View>

            {selectedType ? (
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold">Document</ThemedText>
                {uploaded ? (
                  <SurfaceCard>
                    <Row align="center" gap="md">
                      <Ionicons name="document" size={24} color={colors.success} />
                      <Column flex>
                        <ThemedText type="defaultSemiBold">Document selected</ThemedText>
                        <ThemedText style={[styles.small, { color: colors.muted }]}>
                          {ID_TYPES.find((type) => type.id === selectedType)?.label}
                        </ThemedText>
                      </Column>
                      <Clickable
                        accessibilityLabel="Remove selected ID document"
                        disabled={submitting}
                        onPress={() => setUploaded(false)}
                      >
                        <Ionicons name="close" size={22} color={colors.muted} />
                      </Clickable>
                    </Row>
                  </SurfaceCard>
                ) : (
                  <Button onPress={handleUpload} variant="outline" label="Choose document" />
                )}
              </View>
            ) : null}

            <View style={styles.requirements}>
              <ThemedText type="defaultSemiBold">Requirements</ThemedText>
              {[
                'Valid and not expired',
                'Full document visible',
                'Text clearly readable',
                'No glare or shadows',
              ].map((requirement) => (
                <Row key={requirement} align="flex-start" gap="sm">
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                  <ThemedText style={[styles.small, { color: colors.muted, flex: 1 }]}>
                    {requirement}
                  </ThemedText>
                </Row>
              ))}
            </View>

            <Button
              onPress={handleSubmit}
              disabled={!selectedType || !uploaded || submitting}
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
  typeList: { paddingVertical: Spacing.xs },
  typeRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.sm,
  },
  typeLabel: { flex: 1, minWidth: 0 },
  divider: { height: 1, marginHorizontal: Spacing.md },
  requirements: { gap: Spacing.sm },
  small: { ...Typography.small },
});
