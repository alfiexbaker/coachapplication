import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Badge } from '@/components/primitives/badge';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { VerificationStatus, VerificationItem } from '@/constants/types';
import { verificationService } from '@/services/verification-service';

const logger = createLogger('CredentialsScreen');

const COACH_ID = 'coach1'; // Mock current user

const CREDENTIAL_TYPES = [
  { id: 'fa-level1', label: 'FA Level 1', category: 'Coaching Badge' },
  { id: 'fa-level2', label: 'FA Level 2', category: 'Coaching Badge' },
  { id: 'fa-level3', label: 'FA Level 3 (UEFA B)', category: 'Coaching Badge' },
  { id: 'first-aid', label: 'Emergency First Aid', category: 'First Aid' },
  { id: 'safeguarding', label: 'Safeguarding Certificate', category: 'Child Safety' },
  { id: 'other', label: 'Other Qualification', category: 'Other' },
];

type CredentialCardProps = {
  credential: VerificationItem;
  index: number;
};

function CredentialCard({ credential, index }: CredentialCardProps) {
  const { colors: palette } = useTheme();

  const getStatusTone = () => {
    switch (credential.status) {
      case 'VERIFIED':
        return 'success';
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = () => {
    switch (credential.status) {
      case 'VERIFIED':
        return 'Verified';
      case 'PENDING':
        return 'Under Review';
      case 'EXPIRED':
        return 'Expired';
      case 'FAILED':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  };

  return (
    <SurfaceCard style={styles.credentialCard}>
      <View style={styles.credentialHeader}>
        <View style={[styles.credentialIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="ribbon" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{credential.notes || `Credential ${index + 1}`}</ThemedText>
          {credential.verifiedAt && (
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
              Verified: {new Date(credential.verifiedAt).toLocaleDateString()}
            </ThemedText>
          )}
        </View>
        <Badge label={getStatusLabel()} tone={getStatusTone()} />
      </View>
      {credential.expiresAt && (
        <View style={styles.expiryRow}>
          <Ionicons name="calendar-outline" size={14} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
            Expires: {new Date(credential.expiresAt).toLocaleDateString()}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

export default function CredentialsScreen() {
  const { colors: palette } = useTheme();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const data = await verificationService.getStatus(COACH_ID);
      setStatus(data);
    } catch (error) {
      logger.error('Failed to load verification status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleUpload = async () => {
    setUploaded(true);
  };

  const handleSubmit = async () => {
    if (!selectedType || !uploaded) return;

    const credentialLabel =
      selectedType === 'other'
        ? customName || 'Other Qualification'
        : CREDENTIAL_TYPES.find((t) => t.id === selectedType)?.label || 'Credential';

    setSubmitting(true);
    try {
      await verificationService.submitCredential(
        COACH_ID,
        `mock://credential-${selectedType}.pdf`,
        credentialLabel
      );
      await loadStatus();
      setShowForm(false);
      setSelectedType(null);
      setCustomName('');
      setUploaded(false);
    } catch (error) {
      logger.error('Failed to submit credential:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedType(null);
    setCustomName('');
    setUploaded(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const credentials = status?.credentials ?? [];
  const verifiedCount = credentials.filter((c) => c.status === 'VERIFIED').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Credentials</ThemedText>
          </View>
          {!showForm && (
            <Clickable
              onPress={() => setShowForm(true)}
              style={[styles.addButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="add" size={20} color={palette.onPrimary} />
            </Clickable>
          )}
        </View>

        <ThemedText style={{ color: palette.muted }}>
          Upload your coaching qualifications and certifications to verify your expertise.
        </ThemedText>

        {credentials.length > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: palette.card }]}>
              <ThemedText type="title">{credentials.length}</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Uploaded</ThemedText>
            </View>
            <View style={[styles.statBox, { backgroundColor: palette.card }]}>
              <ThemedText type="title">{verifiedCount}</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Verified</ThemedText>
            </View>
          </View>
        )}

        {showForm ? (
          <SurfaceCard style={styles.formCard}>
            <View style={styles.formHeader}>
              <ThemedText type="defaultSemiBold">Add Credential</ThemedText>
              <Clickable onPress={resetForm}>
                <Ionicons name="close" size={24} color={palette.muted} />
              </Clickable>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.label}>Credential Type</ThemedText>
              <View style={styles.typeList}>
                {CREDENTIAL_TYPES.map((type) => (
                  <Clickable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.typeItem,
                      {
                        borderColor:
                          selectedType === type.id ? palette.tint : palette.border,
                        backgroundColor:
                          selectedType === type.id ? withAlpha(palette.tint, 0.03) : palette.card },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={{
                          fontWeight: selectedType === type.id ? '600' : '400',
                          color: selectedType === type.id ? palette.tint : palette.text }}
                      >
                        {type.label}
                      </ThemedText>
                      <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                        {type.category}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name={selectedType === type.id ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={selectedType === type.id ? palette.tint : palette.muted}
                    />
                  </Clickable>
                ))}
              </View>
            </View>

            {selectedType === 'other' && (
              <View style={styles.section}>
                <ThemedText style={styles.label}>Qualification Name</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="Enter qualification name"
                  placeholderTextColor={palette.muted}
                  value={customName}
                  onChangeText={setCustomName}
                />
              </View>
            )}

            {selectedType && (
              <View style={styles.section}>
                <ThemedText style={styles.label}>Upload Document</ThemedText>
                {uploaded ? (
                  <View
                    style={[
                      styles.uploadedRow,
                      { borderColor: palette.success, backgroundColor: withAlpha(palette.success, 0.03) },
                    ]}
                  >
                    <Ionicons name="document-text" size={24} color={palette.success} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">Document uploaded</ThemedText>
                      <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                        credential.pdf
                      </ThemedText>
                    </View>
                    <Clickable onPress={() => setUploaded(false)}>
                      <Ionicons name="trash-outline" size={20} color={palette.error} />
                    </Clickable>
                  </View>
                ) : (
                  <Clickable
                    onPress={handleUpload}
                    style={[styles.uploadArea, { borderColor: palette.border }]}
                  >
                    <Ionicons name="cloud-upload-outline" size={32} color={palette.muted} />
                    <ThemedText style={{ color: palette.muted }}>
                      Tap to upload certificate
                    </ThemedText>
                  </Clickable>
                )}
              </View>
            )}

            <Button
              onPress={handleSubmit}
              disabled={!selectedType || !uploaded || submitting || (selectedType === 'other' && !customName)}
            >
              {submitting ? 'Submitting...' : 'Submit Credential'}
            </Button>
          </SurfaceCard>
        ) : (
          <>
            {credentials.length > 0 ? (
              <View style={styles.credentialsList}>
                {credentials.map((credential, index) => (
                  <CredentialCard key={index} credential={credential} index={index} />
                ))}
              </View>
            ) : (
              <SurfaceCard style={styles.emptyCard}>
                <Ionicons name="ribbon-outline" size={48} color={palette.muted} />
                <ThemedText type="defaultSemiBold">No credentials yet</ThemedText>
                <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                  Add your coaching qualifications to build trust with parents
                </ThemedText>
                <Clickable
                  onPress={() => setShowForm(true)}
                  style={[styles.emptyButton, { borderColor: palette.tint }]}
                >
                  <Ionicons name="add" size={18} color={palette.tint} />
                  <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                    Add Credential
                  </ThemedText>
                </Clickable>
              </SurfaceCard>
            )}
          </>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={palette.tint} />
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Credentials are reviewed within 1-2 business days. Verified credentials appear on
            your profile.
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1 },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md },
  formCard: {
    gap: Spacing.md },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  section: {
    gap: Spacing.sm },
  label: {
    ...Typography.bodySmallSemiBold },
  typeList: {
    gap: Spacing.xs },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    ...Typography.body },
  uploadArea: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderStyle: 'dashed' },
  uploadedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5 },
  credentialsList: {
    gap: Spacing.sm },
  credentialCard: {
    gap: Spacing.sm },
  credentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm },
  credentialIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center' },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: 52 },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)' },
  infoText: {
    flex: 1,
    ...Typography.small } });