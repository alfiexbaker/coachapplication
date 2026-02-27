import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useIdVerification, ID_TYPES } from '@/hooks/use-id-verification';

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
    handleMockApprove,
  } = useIdVerification();

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
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Row align="center" gap="sm" style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">ID Verification</ThemedText>
        </Row>

        {isVerified ? (
          <StatusCard
            icon="checkmark-circle"
            iconColor={colors.success}
            title="ID Verified"
            subtitle={`Your identity has been verified on ${status?.identity.verifiedAt ? new Date(status.identity.verifiedAt).toLocaleDateString() : 'N/A'}`}
            colors={colors}
          />
        ) : isPending ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: withAlpha(colors.warning, 0.09) }]}>
              <Ionicons name="time" size={48} color={colors.warning} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>
              Under Review
            </ThemedText>
            <ThemedText style={[styles.statusText, { color: colors.muted }]}>
              Your ID document is being reviewed. This usually takes 1-2 business days.
            </ThemedText>
            {__DEV__ && (
              <Clickable onPress={handleMockApprove} style={[styles.mockButton, { borderColor: colors.success }]}>
                <ThemedText style={{ color: colors.success, fontWeight: '600' }}>
                  Approve Now (DEV ONLY)
                </ThemedText>
              </Clickable>
            )}
          </SurfaceCard>
        ) : (
          <>
            <ThemedText style={{ color: colors.muted }}>
              Upload a clear photo of a government-issued ID to verify your identity.
            </ThemedText>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Select ID Type</ThemedText>
              <Row gap="sm">
                {ID_TYPES.map((type) => (
                  <Clickable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.typeCard,
                      {
                        borderColor: selectedType === type.id ? colors.tint : colors.border,
                        backgroundColor:
                          selectedType === type.id ? withAlpha(colors.tint, 0.03) : colors.card,
                      },
                    ]}
                  >
                    <Ionicons
                      name={type.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={selectedType === type.id ? colors.tint : colors.muted}
                    />
                    <ThemedText
                      style={{
                        ...Typography.small,
                        color: selectedType === type.id ? colors.tint : colors.text,
                        fontWeight: selectedType === type.id ? '600' : '400',
                      }}
                    >
                      {type.label}
                    </ThemedText>
                  </Clickable>
                ))}
              </Row>
            </View>

            {selectedType && (
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold">Upload Document</ThemedText>
                {uploaded ? (
                  <SurfaceCard style={styles.uploadedCard}>
                    <Row align="center" gap="md">
                      <Ionicons name="document" size={32} color={colors.success} />
                      <Column flex>
                        <ThemedText type="defaultSemiBold">Document uploaded</ThemedText>
                        <ThemedText style={{ color: colors.muted, ...Typography.small }}>
                          {ID_TYPES.find((t) => t.id === selectedType)?.label}
                        </ThemedText>
                      </Column>
                      <Clickable accessibilityLabel="Remove uploaded ID" onPress={() => setUploaded(false)}>
                        <Ionicons name="close-circle" size={24} color={colors.muted} />
                      </Clickable>
                    </Row>
                  </SurfaceCard>
                ) : (
                  <Clickable onPress={handleUpload} style={[styles.uploadArea, { borderColor: colors.border }]}>
                    <Ionicons name="cloud-upload" size={40} color={colors.muted} />
                    <ThemedText type="defaultSemiBold">Tap to upload</ThemedText>
                    <ThemedText style={{ color: colors.muted, ...Typography.small }}>
                      Take a photo or choose from gallery
                    </ThemedText>
                  </Clickable>
                )}
              </View>
            )}

            <View style={styles.requirements}>
              <ThemedText type="defaultSemiBold">Requirements</ThemedText>
              {[
                'Document must be valid and not expired',
                'All text must be clearly readable',
                'Photo must show the full document',
                'No glare or shadows obscuring information',
              ].map((req, i) => (
                <Row key={i} align="flex-start" gap="sm">
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                  <ThemedText style={{ color: colors.muted, ...Typography.small, flex: 1 }}>
                    {req}
                  </ThemedText>
                </Row>
              ))}
            </View>

            <Button onPress={handleSubmit} disabled={!selectedType || !uploaded || submitting}>
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </>
        )}
      </ScrollView>
    </VerificationScreenState>
  );
}

function StatusCard({
  icon,
  iconColor,
  title,
  subtitle,
  colors,
}: {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  colors: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];
}) {
  return (
    <SurfaceCard style={styles.statusCard}>
      <View style={[styles.statusIcon, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={48} color={iconColor} />
      </View>
      <ThemedText type="defaultSemiBold" style={styles.statusTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.statusText, { color: colors.muted }]}>{subtitle}</ThemedText>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  header: {},
  backButton: { padding: Spacing.xs, marginLeft: -Spacing.xs },
  statusCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: { ...Typography.heading },
  statusText: { textAlign: 'center', ...Typography.bodySmall },
  mockButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
    borderWidth: 1.5,
  },
  section: { gap: Spacing.sm },
  typeCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  uploadArea: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xl,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  uploadedCard: {},
  requirements: { gap: Spacing.sm },
});
