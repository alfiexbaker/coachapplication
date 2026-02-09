import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { VerificationBadge } from '@/components/verification/verification-badge';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { VerificationStatus, VerificationItem } from '@/constants/types';
import { verificationService } from '@/services/verification-service';

const logger = createLogger('VerificationHubScreen');

const COACH_ID = 'coach1'; // Mock current user

type VerificationItemRowProps = {
  icon: string;
  title: string;
  description: string;
  item: VerificationItem;
  onPress: () => void;
};

function VerificationItemRow({ icon, title, description, item, onPress }: VerificationItemRowProps) {
  const { colors: palette } = useTheme();

  const getStatusIcon = () => {
    switch (item.status) {
      case 'VERIFIED':
        return { name: 'checkmark-circle', color: palette.success };
      case 'PENDING':
        return { name: 'time', color: palette.warning };
      case 'FAILED':
        return { name: 'close-circle', color: palette.error };
      case 'EXPIRED':
        return { name: 'alert-circle', color: palette.error };
      default:
        return { name: 'ellipse-outline', color: palette.muted };
    }
  };

  const statusIcon = getStatusIcon();

  return (
    <Clickable onPress={onPress}>
      <View style={styles.itemRow}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.tint} />
        </View>
        <View style={styles.itemContent}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText style={[styles.itemDescription, { color: palette.muted }]}>
            {description}
          </ThemedText>
        </View>
        <View style={styles.itemStatus}>
          <Ionicons name={statusIcon.name as keyof typeof Ionicons.glyphMap} size={22} color={statusIcon.color} />
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        </View>
      </View>
    </Clickable>
  );
}

export default function VerificationHubScreen() {
  const { colors: palette } = useTheme();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
            Loading verification status...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!status) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color={palette.error} />
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.sm }}>
            Failed to load verification status
          </ThemedText>
          <Clickable
            onPress={loadStatus}
            style={[styles.retryButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Retry</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  const progress = verificationService.getProgressPercentage(status);
  const hasCredentials = status.credentials.length > 0;
  const credentialStatus: VerificationItem = hasCredentials
    ? status.credentials.some(c => c.status === 'VERIFIED')
      ? { status: 'VERIFIED' }
      : status.credentials.some(c => c.status === 'PENDING')
        ? { status: 'PENDING' }
        : { status: 'NOT_STARTED' }
    : { status: 'NOT_STARTED' };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title">Verification</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            Complete your verification to build trust with parents
          </ThemedText>
        </View>

        <SurfaceCard style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <ThemedText type="defaultSemiBold">Verification Progress</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{progress}% complete</ThemedText>
            </View>
            <VerificationBadge level={status.overallLevel} size="large" />
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: palette.success,
                  width: `${progress}%` },
              ]}
            />
          </View>
          <ThemedText style={[styles.levelLabel, { color: palette.muted }]}>
            {status.overallLevel === 'PREMIUM'
              ? 'Fully verified - Premium coach status'
              : status.overallLevel === 'VERIFIED'
                ? 'Verified - Add credentials for Premium'
                : status.overallLevel === 'BASIC'
                  ? 'Basic - Complete ID and background check'
                  : 'Get started with verification'}
          </ThemedText>
        </SurfaceCard>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Identity Verification
          </ThemedText>
          <SurfaceCard>
            <VerificationItemRow
              icon="mail"
              title="Email"
              description="Verify your email address"
              item={status.email}
              onPress={() => {
                if (status.email.status === 'VERIFIED') {
                  Alert.alert('Email Verified', 'Your email is already verified.');
                } else {
                  Alert.alert(
                    'Verify Email',
                    'We will send a verification code to your email address.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Send Code', onPress: () => Alert.alert('Code Sent', 'Check your inbox for the verification code.') },
                    ]
                  );
                }
              }}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              icon="call"
              title="Phone"
              description="Verify your phone number"
              item={status.phone}
              onPress={() => {
                if (status.phone.status === 'VERIFIED') {
                  Alert.alert('Phone Verified', 'Your phone number is already verified.');
                } else {
                  Alert.alert(
                    'Verify Phone',
                    'We will send an SMS verification code to your phone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Send SMS', onPress: () => Alert.alert('Code Sent', 'Check your messages for the verification code.') },
                    ]
                  );
                }
              }}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              icon="card"
              title="Photo ID"
              description="Upload a government-issued ID"
              item={status.identity}
              onPress={() => router.push(Routes.VERIFICATION_ID)}
            />
          </SurfaceCard>
        </View>

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Background & Credentials
          </ThemedText>
          <SurfaceCard>
            <VerificationItemRow
              icon="shield-checkmark"
              title="Background Check"
              description="Complete DBS or equivalent check"
              item={status.backgroundCheck}
              onPress={() => router.push(Routes.VERIFICATION_BACKGROUND)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              icon="ribbon"
              title="Coaching Credentials"
              description={
                hasCredentials
                  ? `${status.credentials.length} credential(s) uploaded`
                  : 'Upload coaching certifications'
              }
              item={credentialStatus}
              onPress={() => router.push(Routes.VERIFICATION_CREDENTIALS)}
            />
            <View style={[styles.divider, { backgroundColor: palette.border }]} />
            <VerificationItemRow
              icon="document-text"
              title="Insurance"
              description="Public liability insurance"
              item={status.insurance}
              onPress={() => {
                if (status.insurance.status === 'VERIFIED') {
                  Alert.alert('Insurance Verified', 'Your insurance documents are verified and up to date.');
                } else {
                  Alert.alert(
                    'Upload Insurance',
                    'Upload your public liability insurance certificate to get verified.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Upload', onPress: () => router.push(Routes.VERIFICATION_INSURANCE) },
                    ]
                  );
                }
              }}
            />
          </SurfaceCard>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={palette.tint} />
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Verified coaches appear higher in search results and receive a trust badge on their profile.
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
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button },
  header: {
    gap: Spacing.xs },
  progressCard: {
    gap: Spacing.sm },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  progressBarBg: {
    height: 8,
    borderRadius: Radii.xs,
    overflow: 'hidden' },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.xs },
  levelLabel: {
    ...Typography.small },
  section: {
    gap: Spacing.sm },
  sectionTitle: {
    marginLeft: Spacing.xs },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center' },
  itemContent: {
    flex: 1,
    gap: Spacing.micro },
  itemDescription: {
    ...Typography.small },
  itemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs },
  divider: {
    height: 1,
    marginLeft: 52 },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)' },
  infoText: {
    flex: 1,
    ...Typography.small } });