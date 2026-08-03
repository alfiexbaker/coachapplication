import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { CredentialCard } from '@/components/verification/credential-card';
import { CredentialForm } from '@/components/verification/credential-form';
import { VerificationScreenState } from '@/components/verification/verification-screen-state';
import { Spacing } from '@/constants/theme';
import { useCredentials } from '@/hooks/use-credentials';
import { useTheme } from '@/hooks/useTheme';

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
      action={!showForm && credentials.length > 0 ? 'Add' : undefined}
      actionIcon={!showForm && credentials.length > 0 ? 'add' : undefined}
      onActionPress={() => setShowForm(true)}
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
          <View style={styles.list}>
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
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={32} color={colors.muted} />
            <ThemedText type="defaultSemiBold">No credentials submitted</ThemedText>
            <ThemedText style={{ color: colors.muted }}>
              Add a coaching qualification or certificate.
            </ThemedText>
            <Button onPress={() => setShowForm(true)} label="Add credential" />
          </View>
        )}
      </ScrollView>
    </VerificationScreenState>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.lg },
  list: { gap: Spacing.sm },
  emptyState: { gap: Spacing.sm },
});
