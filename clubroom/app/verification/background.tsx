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
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { VerificationStatus } from '@/constants/types';
import { verificationService } from '@/services/verification-service';

const logger = createLogger('BackgroundCheckScreen');

const COACH_ID = 'coach1'; // Mock current user

const STEPS = [
  {
    id: 1,
    title: 'Provide Details',
    description: 'Enter your personal information for the background check',
  },
  {
    id: 2,
    title: 'Consent & ID Verification',
    description: 'Confirm your identity and provide consent for the check',
  },
  {
    id: 3,
    title: 'Review & Submit',
    description: 'The check is processed by our trusted partner',
  },
  {
    id: 4,
    title: 'Receive Results',
    description: 'Certificate issued upon successful completion',
  },
];

export default function BackgroundCheckScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleStartCheck = async () => {
    setSubmitting(true);
    try {
      await verificationService.startBackgroundCheck(COACH_ID);
      await loadStatus();
    } catch (error) {
      logger.error('Failed to start background check:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMockApprove = async () => {
    setSubmitting(true);
    try {
      await verificationService.mockApproveVerification(COACH_ID, 'backgroundCheck');
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

  const isVerified = status?.backgroundCheck.status === 'VERIFIED';
  const isPending = status?.backgroundCheck.status === 'PENDING';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Background Check</ThemedText>
        </View>

        {isVerified ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="shield-checkmark" size={48} color={palette.success} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>
              Background Check Complete
            </ThemedText>
            <ThemedText style={[styles.statusText, { color: palette.muted }]}>
              Your enhanced DBS check was completed on{' '}
              {status?.backgroundCheck.verifiedAt
                ? new Date(status.backgroundCheck.verifiedAt).toLocaleDateString()
                : 'N/A'}
            </ThemedText>
            {status?.backgroundCheck.expiresAt && (
              <View style={[styles.expiryBadge, { backgroundColor: `${palette.success}10` }]}>
                <Ionicons name="calendar" size={16} color={palette.success} />
                <ThemedText style={{ color: palette.success, fontSize: 13 }}>
                  Valid until {new Date(status.backgroundCheck.expiresAt).toLocaleDateString()}
                </ThemedText>
              </View>
            )}
          </SurfaceCard>
        ) : isPending ? (
          <SurfaceCard style={styles.statusCard}>
            <View style={[styles.statusIcon, { backgroundColor: `${palette.warning}15` }]}>
              <Ionicons name="hourglass" size={48} color={palette.warning} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.statusTitle}>
              Check In Progress
            </ThemedText>
            <ThemedText style={[styles.statusText, { color: palette.muted }]}>
              Your background check is being processed. This typically takes 2-5 business days.
            </ThemedText>
            <Clickable
              onPress={handleMockApprove}
              style={[styles.mockButton, { borderColor: palette.success }]}
            >
              <ThemedText style={{ color: palette.success, fontWeight: '600' }}>
                Mock: Complete Now
              </ThemedText>
            </Clickable>
          </SurfaceCard>
        ) : (
          <>
            <ThemedText style={{ color: palette.muted }}>
              Complete an enhanced DBS (Disclosure and Barring Service) check to verify your
              suitability to work with children and young people.
            </ThemedText>

            <SurfaceCard style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="shield" size={24} color={palette.tint} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Enhanced DBS Check</ThemedText>
                  <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                    Required for working with children
                  </ThemedText>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={24} color={palette.tint} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Processing Time</ThemedText>
                  <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                    2-5 business days on average
                  </ThemedText>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="card" size={24} color={palette.tint} />
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">Cost</ThemedText>
                  <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                    Free for Clubroom coaches (Mock)
                  </ThemedText>
                </View>
              </View>
            </SurfaceCard>

            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">How it works</ThemedText>
              <View style={styles.stepsContainer}>
                {STEPS.map((step, index) => (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={styles.stepIndicator}>
                      <View style={[styles.stepNumber, { backgroundColor: palette.tint }]}>
                        <ThemedText style={styles.stepNumberText}>{step.id}</ThemedText>
                      </View>
                      {index < STEPS.length - 1 && (
                        <View style={[styles.stepLine, { backgroundColor: palette.border }]} />
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <ThemedText type="defaultSemiBold">{step.title}</ThemedText>
                      <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                        {step.description}
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.requirements}>
              <ThemedText type="defaultSemiBold">You will need</ThemedText>
              <View style={styles.requirementsList}>
                {[
                  'Valid government-issued ID',
                  'Proof of address (utility bill, bank statement)',
                  'National Insurance number',
                  '5 years of address history',
                ].map((req, index) => (
                  <View key={index} style={styles.requirementRow}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.success} />
                    <ThemedText style={{ color: palette.muted, fontSize: 14, flex: 1 }}>
                      {req}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>

            <Button onPress={handleStartCheck} disabled={submitting}>
              {submitting ? 'Starting...' : 'Start Background Check'}
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
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 14,
    paddingHorizontal: Spacing.md,
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    marginTop: Spacing.xs,
  },
  mockButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
    borderWidth: 1.5,
  },
  infoCard: {
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stepIndicator: {
    alignItems: 'center',
    width: 32,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingBottom: Spacing.md,
    gap: 2,
  },
  requirements: {
    gap: Spacing.sm,
  },
  requirementsList: {
    gap: Spacing.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
