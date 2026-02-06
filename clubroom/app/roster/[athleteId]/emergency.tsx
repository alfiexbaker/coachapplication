import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { EmergencyQuickCard } from '@/components/safety/EmergencyQuickCard';
import { EmergencyContactCard } from '@/components/safety/EmergencyContactCard';
import { MedicalAlertBadge } from '@/components/safety/MedicalAlertBadge';
import { SafetyChecklist } from '@/components/safety/SafetyChecklist';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { safetyService, AthleteEmergencyQuickView } from '@/services/safety-service';
import { rosterService } from '@/services/roster-service';
import type { RosterEntry } from '@/constants/types';

const logger = createLogger('EmergencyQuickAccessScreen');

export default function EmergencyQuickAccessScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [emergencyData, setEmergencyData] = useState<AthleteEmergencyQuickView | null>(null);
  const [, setRosterEntry] = useState<RosterEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coachId = currentUser?.id || 'coach_1';

  const loadData = useCallback(async () => {
    if (!athleteId) return;

    try {
      setError(null);

      // Load roster entry first to get athlete name
      const entry = await rosterService.getRosterEntry(coachId, athleteId);
      setRosterEntry(entry);

      // Load emergency data
      const data = await safetyService.getAthleteEmergency(
        athleteId,
        entry?.athleteName
      );
      setEmergencyData(data);
    } catch (err) {
      logger.error('Failed to load emergency data:', err);
      setError('Failed to load emergency information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [athleteId, coachId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleCallContact = useCallback(async (phone: string, name: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Call Emergency Contact',
      `Call ${name} at ${phone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              const url = `tel:${phone.replace(/\s+/g, '')}`;
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) {
                await Linking.openURL(url);
              } else {
                Alert.alert('Error', 'Unable to make phone calls on this device');
              }
            } catch {
              Alert.alert('Error', 'Failed to initiate call');
            }
          },
        },
      ]
    );
  }, []);

  const handleCallDoctor = useCallback(async () => {
    if (!emergencyData?.doctorPhone) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Call Doctor',
      `Call ${emergencyData.doctorName || 'Doctor'} at ${emergencyData.doctorPhone}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Call',
          onPress: async () => {
            try {
              const url = `tel:${emergencyData.doctorPhone!.replace(/\s+/g, '')}`;
              const canOpen = await Linking.canOpenURL(url);
              if (canOpen) {
                await Linking.openURL(url);
              }
            } catch {
              Alert.alert('Error', 'Failed to initiate call');
            }
          },
        },
      ]
    );
  }, [emergencyData]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Emergency Info</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading emergency information...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !emergencyData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Emergency Info</ThemedText>
          <View style={{ width: 24 }} />
        </View>
        <EmptyState
          icon="medical-outline"
          title="Unable to Load"
          message={error || 'Could not load emergency information for this athlete.'}
          actionLabel="Try Again"
          onPressAction={loadData}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerCenter}>
          <ThemedText type="title">Emergency Info</ThemedText>
          {emergencyData.isCached && (
            <View style={[styles.cachedBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
              <Ionicons name="cloud-offline" size={12} color={palette.warning} />
              <ThemedText style={[styles.cachedText, { color: palette.warning }]}>
                Cached
              </ThemedText>
            </View>
          )}
        </View>
        <Clickable
          onPress={handleRefresh}
          hitSlop={8}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh"
            size={22}
            color={refreshing ? palette.muted : palette.tint}
          />
        </Clickable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {/* Quick Overview Card */}
        <Animated.View entering={FadeInDown.springify()}>
          <EmergencyQuickCard
            athleteName={emergencyData.athleteName}
            alertLevel={emergencyData.alertLevel}
            allergies={emergencyData.allergies}
            conditions={emergencyData.conditions}
            medications={emergencyData.medications}
            primaryContact={emergencyData.primaryContact}
            onCallPrimary={
              emergencyData.primaryContact
                ? () => handleCallContact(
                    emergencyData.primaryContact!.phone,
                    emergencyData.primaryContact!.name
                  )
                : undefined
            }
          />
        </Animated.View>

        {/* Medical Alerts Section */}
        {emergencyData.hasAlerts && (
          <Animated.View entering={FadeInDown.delay(50).springify()}>
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                  <Ionicons name="alert-circle" size={20} color={palette.error} />
                </View>
                <ThemedText type="defaultSemiBold">Medical Alerts</ThemedText>
              </View>

              <View style={styles.alertsGrid}>
                {emergencyData.allergies.map((allergy, index) => (
                  <MedicalAlertBadge
                    key={`allergy-${index}`}
                    type="allergy"
                    label={allergy}
                  />
                ))}
                {emergencyData.conditions.map((condition, index) => (
                  <MedicalAlertBadge
                    key={`condition-${index}`}
                    type="condition"
                    label={condition}
                  />
                ))}
                {emergencyData.medications.map((medication, index) => (
                  <MedicalAlertBadge
                    key={`medication-${index}`}
                    type="medication"
                    label={medication}
                  />
                ))}
              </View>

              {emergencyData.restrictions.length > 0 && (
                <View style={[styles.restrictionsBox, { backgroundColor: withAlpha(palette.warning, 0.03) }]}>
                  <Ionicons name="ban" size={16} color={palette.warning} />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.restrictionsLabel, { color: palette.warning }]}>
                      Restrictions
                    </ThemedText>
                    <ThemedText style={styles.restrictionsText}>
                      {emergencyData.restrictions.join('; ')}
                    </ThemedText>
                  </View>
                </View>
              )}

              {emergencyData.medicalNotes && (
                <View style={[styles.notesBox, { backgroundColor: palette.surfaceSecondary }]}>
                  <Ionicons name="document-text" size={14} color={palette.muted} />
                  <ThemedText style={[styles.notesText, { color: palette.muted }]}>
                    {emergencyData.medicalNotes}
                  </ThemedText>
                </View>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Emergency Contacts Section */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                <Ionicons name="call" size={20} color={palette.success} />
              </View>
              <ThemedText type="defaultSemiBold">Emergency Contacts</ThemedText>
              <ThemedText style={[styles.contactCount, { color: palette.muted }]}>
                {emergencyData.allContacts.length}
              </ThemedText>
            </View>

            {emergencyData.allContacts.length > 0 ? (
              <View style={styles.contactsList}>
                {emergencyData.allContacts.map((contact) => (
                  <EmergencyContactCard
                    key={contact.id}
                    contact={contact}
                    onCall={() => handleCallContact(contact.phone, contact.name)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.noContactsBox}>
                <Ionicons name="warning" size={24} color={palette.warning} />
                <ThemedText style={{ color: palette.warning, fontWeight: '600' }}>
                  No emergency contacts on file
                </ThemedText>
                <ThemedText style={[styles.noContactsSubtext, { color: palette.muted }]}>
                  Request parent to add emergency contact information
                </ThemedText>
              </View>
            )}
          </SurfaceCard>
        </Animated.View>

        {/* Doctor Information */}
        {(emergencyData.doctorName || emergencyData.doctorPhone) && (
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <Ionicons name="medkit" size={20} color={palette.tint} />
                </View>
                <ThemedText type="defaultSemiBold">Doctor Information</ThemedText>
              </View>

              <View style={styles.doctorInfo}>
                <View style={{ flex: 1 }}>
                  {emergencyData.doctorName && (
                    <ThemedText type="defaultSemiBold">{emergencyData.doctorName}</ThemedText>
                  )}
                  {emergencyData.doctorPhone && (
                    <ThemedText style={{ color: palette.muted }}>
                      {emergencyData.doctorPhone}
                    </ThemedText>
                  )}
                </View>
                {emergencyData.doctorPhone && (
                  <Clickable
                    onPress={handleCallDoctor}
                    style={[styles.callButton, { backgroundColor: palette.tint }]}
                  >
                    <Ionicons name="call" size={18} color={Colors.light.onPrimary} />
                  </Clickable>
                )}
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Consent Status */}
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <SurfaceCard style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: withAlpha(palette.muted, 0.06) }]}>
                <Ionicons name="shield-checkmark" size={20} color={palette.muted} />
              </View>
              <ThemedText type="defaultSemiBold">Consent Status</ThemedText>
            </View>

            <View style={styles.consentRow}>
              <ThemedText>Emergency Treatment Consent</ThemedText>
              {emergencyData.emergencyTreatmentConsent ? (
                <View style={[styles.consentBadge, { backgroundColor: withAlpha(palette.success, 0.06) }]}>
                  <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                  <ThemedText style={[styles.consentText, { color: palette.success }]}>
                    Granted
                  </ThemedText>
                </View>
              ) : (
                <View style={[styles.consentBadge, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
                  <Ionicons name="close-circle" size={16} color={palette.error} />
                  <ThemedText style={[styles.consentText, { color: palette.error }]}>
                    Not Granted
                  </ThemedText>
                </View>
              )}
            </View>
          </SurfaceCard>
        </Animated.View>

        {/* Safety Checklist */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SafetyChecklist
            hasEmergencyContact={emergencyData.allContacts.length > 0}
            hasEmergencyConsent={emergencyData.emergencyTreatmentConsent}
            hasMedicalInfo={emergencyData.hasAlerts}
          />
        </Animated.View>

        {/* Last Updated */}
        <ThemedText style={[styles.lastUpdated, { color: palette.muted }]}>
          Last updated: {new Date(emergencyData.lastUpdated).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </ThemedText>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  cachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  cachedText: {
    ...Typography.micro,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodySmall,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactCount: {
    marginLeft: 'auto',
    ...Typography.bodySmallSemiBold,
  },
  alertsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  restrictionsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
  },
  restrictionsLabel: {
    ...Typography.caption,
    marginBottom: Spacing.micro,
  },
  restrictionsText: {
    ...Typography.bodySmall,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  notesText: {
    flex: 1,
    ...Typography.small,
  },
  contactsList: {
    gap: Spacing.sm,
  },
  noContactsBox: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.lg,
  },
  noContactsSubtext: {
    ...Typography.small,
    textAlign: 'center',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  consentText: {
    ...Typography.caption,
  },
  lastUpdated: {
    textAlign: 'center',
    ...Typography.caption,
    marginTop: Spacing.sm,
  },
  bottomSpacer: {
    height: 40,
  },
});
