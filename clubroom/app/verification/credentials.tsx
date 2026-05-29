import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { CredentialCard } from '@/components/verification/credential-card';
import { CredentialForm } from '@/components/verification/credential-form';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCredentials } from '@/hooks/use-credentials';

export default function CredentialsScreen() {
  const { colors } = useTheme();
  const {
    status,
    screenStatus,
    error,
    refreshing,
    onRefresh,
    retry,
    credentials,
    verifiedCount,
    submitting,
    showForm,
    selectedType,
    customName,
    uploaded,
    setShowForm,
    setSelectedType,
    setCustomName,
    setUploaded,
    handleUpload,
    handleSubmit,
    resetForm,
  } = useCredentials();
  const header = (
    <PageHeader
      title="Credentials"
      showBack
      onBackPress={() => router.back()}
      right={
        !showForm ? (
          <Clickable
            accessibilityLabel="Add credential"
            onPress={() => setShowForm(true)}
            style={[styles.addButton, { backgroundColor: colors.tint }]}
          >
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </Clickable>
        ) : undefined
      }
    />
  );

  return (
    <VerificationScreenState
      colors={colors}
      screenStatus={screenStatus}
      error={error}
      retry={retry}
      errorMessage="Failed to load credentials."
      emptyIcon="ribbon-outline"
      emptyTitle="Credentials unavailable"
      emptyMessage="Credential data is currently unavailable."
      isEmpty={!status}
      header={header}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ThemedText style={{ color: colors.muted }}>
          Upload your coaching qualifications and certifications to verify your expertise.
        </ThemedText>

        {credentials.length > 0 && (
          <Row gap="md">
            <View style={[styles.statBox, { backgroundColor: colors.card }]}>
              <ThemedText type="title">{credentials.length}</ThemedText>
              <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                Uploaded
              </ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.card }]}>
              <ThemedText type="title">{verifiedCount}</ThemedText>
              <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                Verified
              </ThemedText>
            </View>
          </Row>
        )}

        {showForm ? (
          <CredentialForm
            colors={colors}
            selectedType={selectedType}
            customName={customName}
            uploaded={uploaded}
            submitting={submitting}
            onSelectType={setSelectedType}
            onCustomNameChange={setCustomName}
            onUpload={handleUpload}
            onRemoveUpload={() => setUploaded(false)}
            onSubmit={handleSubmit}
            onClose={resetForm}
          />
        ) : credentials.length > 0 ? (
          <View style={styles.credentialsList}>
            {credentials.map((credential, index) => (
              <CredentialCard
                key={
                  credential.documentUrl ??
                  credential.notes ??
                  `${credential.status}:${credential.verifiedAt ?? ''}:${credential.expiresAt ?? ''}`
                }
                credential={credential}
                index={index}
                colors={colors}
              />
            ))}
          </View>
        ) : (
          <SurfaceCard style={styles.emptyCard}>
            <Ionicons name="ribbon-outline" size={48} color={colors.muted} />
            <ThemedText type="defaultSemiBold">No credentials yet</ThemedText>
            <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
              Add your coaching qualifications to build trust with parents
            </ThemedText>
            <Clickable
              onPress={() => setShowForm(true)}
              style={[styles.emptyButton, { borderColor: colors.tint }]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="add" size={18} color={colors.tint} />
                <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>
                  Add Credential
                </ThemedText>
              </Row>
            </Clickable>
          </SurfaceCard>
        )}

        <Row gap="sm" style={[styles.infoBox, { backgroundColor: colors.surfaceSecondary }]}>
          <Ionicons name="information-circle" size={20} color={colors.tint} />
          <ThemedText style={[styles.infoText, { color: colors.muted }]}>
            Credentials are reviewed within 1-2 business days. Verified credentials appear on your
            profile.
          </ThemedText>
        </Row>
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBox: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: Radii.md },
  credentialsList: { gap: Spacing.sm },
  emptyCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
  infoBox: { padding: Spacing.md, borderRadius: Radii.md, backgroundColor: 'transparent' },
  infoText: { flex: 1, ...Typography.small },
});
