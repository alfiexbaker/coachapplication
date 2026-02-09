import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { VerificationStatus } from '@/constants/types';
import { verificationService } from '@/services/verification-service';

const logger = createLogger('IdUploadScreen');

const COACH_ID = 'coach1'; // Mock current user

const ID_TYPES = [
  { id: 'passport', label: 'Passport', icon: 'book' },
  { id: 'driving-license', label: 'Driving License', icon: 'car' },
  { id: 'national-id', label: 'National ID Card', icon: 'id-card' },
];

export default function IdUploadScreen() {
  const { colors: palette } = useTheme();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
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
    if (!selectedType) return;

    // Mock file upload
    setUploaded(true);
  };

  const handleSubmit = async () => {
    if (!selectedType || !uploaded) return;

    setSubmitting(true);
    try {
      await verificationService.submitIdVerification(
        COACH_ID,
        `mock://id-document-${selectedType}.jpg`
      );
      router.back();
    } catch (error) {
      logger.error('Failed to submit ID:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockApprove = async () => {
    setSubmitting(true);
    try {
      await verificationService.mockApproveVerification(COACH_ID, 'identity');
      router.back();
    } catch (error) {
      logger.error('Failed to approve:', error);
    } finally {
      setSubmitting(false);
    }
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

  const isVerified = status?.identity.status === 'VERIFIED';
  const isPending = status?.identity.status === 'PENDING';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">ID Verification</ThemedText>
        </View>

        {isVerified ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="checkmark-circle" size={48} color={palette.success} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>
              ID Verified
            </ThemedText>
            <ThemedText style={[styles.statusText, { color: palette.muted }]}>
              Your identity has been verified on{' '}
              {status?.identity.verifiedAt
                ? new Date(status.identity.verifiedAt).toLocaleDateString()
                : 'N/A'}
            </ThemedText>
          </SurfaceCard>
        ) : isPending ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="time" size={48} color={palette.warning} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>
              Under Review
            </ThemedText>
            <ThemedText style={[styles.statusText, { color: palette.muted }]}>
              Your ID document is being reviewed. This usually takes 1-2 business days.
            </ThemedText>
            <Clickable
              onPress={handleMockApprove}
              style={[styles.mockButton, { borderColor: palette.success }]}
            >
              <ThemedText style={{ color: palette.success, fontWeight: '600' }}>
                Mock: Approve Now
              </ThemedText>
            </Clickable>
          </SurfaceCard>
        ) : (
          <>
            <ThemedText style={{ color: palette.muted }}>
              Upload a clear photo of a government-issued ID to verify your identity.
            </ThemedText>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Select ID Type</ThemedText>
              <View style={styles.typeGrid}>
                {ID_TYPES.map((type) => (
                  <Clickable
                    key={type.id}
                    onPress={() => setSelectedType(type.id)}
                    style={[
                      styles.typeCard,
                      {
                        borderColor:
                          selectedType === type.id ? palette.tint : palette.border,
                        backgroundColor:
                          selectedType === type.id ? withAlpha(palette.tint, 0.03) : palette.card,
                      },
                    ]}
                  >
                    <Ionicons
                      name={type.icon as keyof typeof Ionicons.glyphMap}
                      size={28}
                      color={selectedType === type.id ? palette.tint : palette.muted}
                    />
                    <ThemedText
                      style={{
                        ...Typography.small,
                        color: selectedType === type.id ? palette.tint : palette.text,
                        fontWeight: selectedType === type.id ? '600' : '400',
                      }}
                    >
                      {type.label}
                    </ThemedText>
                  </Clickable>
                ))}
              </View>
            </View>

            {selectedType && (
              <View style={styles.section}>
                <ThemedText type="defaultSemiBold">Upload Document</ThemedText>
                {uploaded ? (
                  <SurfaceCard style={styles.uploadedCard}>
                    <Ionicons name="document" size={32} color={palette.success} />
                    <View style={{ flex: 1 }}>
                      <ThemedText type="defaultSemiBold">Document uploaded</ThemedText>
                      <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                        {ID_TYPES.find((t) => t.id === selectedType)?.label}
                      </ThemedText>
                    </View>
                    <Clickable onPress={() => setUploaded(false)}>
                      <Ionicons name="close-circle" size={24} color={palette.muted} />
                    </Clickable>
                  </SurfaceCard>
                ) : (
                  <Clickable
                    onPress={handleUpload}
                    style={[styles.uploadArea, { borderColor: palette.border }]}
                  >
                    <Ionicons name="cloud-upload" size={40} color={palette.muted} />
                    <ThemedText type="defaultSemiBold">Tap to upload</ThemedText>
                    <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                      Take a photo or choose from gallery
                    </ThemedText>
                  </Clickable>
                )}
              </View>
            )}

            <View style={styles.requirements}>
              <ThemedText type="defaultSemiBold">Requirements</ThemedText>
              <View style={styles.requirementsList}>
                {[
                  'Document must be valid and not expired',
                  'All text must be clearly readable',
                  'Photo must show the full document',
                  'No glare or shadows obscuring information',
                ].map((req, index) => (
                  <View key={index} style={styles.requirementRow}>
                    <Ionicons name="checkmark" size={16} color={palette.success} />
                    <ThemedText style={{ color: palette.muted, ...Typography.small, flex: 1 }}>
                      {req}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <Button
              onPress={handleSubmit}
              disabled={!selectedType || !uploaded || submitting}
            >
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  statusCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    ...Typography.heading,
  },
  statusText: {
    textAlign: 'center',
    ...Typography.bodySmall,
  },
  mockButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
    borderWidth: 1.5,
  },
  section: {
    gap: Spacing.sm,
  },
  typeGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
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
  uploadedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  requirements: {
    gap: Spacing.sm,
  },
  requirementsList: {
    gap: Spacing.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
});
