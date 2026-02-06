import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { InviteAthleteModal, Athlete } from './invite-athlete-modal';
import { createLogger } from '@/utils/logger';

const logger = createLogger('InviteSessionFlow');

type FlowStep = 'choice' | 'select-session' | 'select-athletes' | 'confirm';

interface UpcomingSession {
  id: string;
  title: string;
  scheduledAt: string;
  location?: string;
  duration?: number;
  maxAthletes?: number;
  currentAthletes?: number;
  athleteIds?: string[];
  coachId?: string;
}

interface InviteSessionFlowProps {
  visible: boolean;
  onClose: () => void;
  athletes: Athlete[];
  coachId: string;
  onComplete?: (result: { sessionId: string; athleteIds: string[]; isNew: boolean }) => void;
}

export function InviteSessionFlow({
  visible,
  onClose,
  athletes,
  coachId,
  onComplete,
}: InviteSessionFlowProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [step, setStep] = useState<FlowStep>('choice');
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<UpcomingSession | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<Athlete[]>([]);
  const [isNewSession, setIsNewSession] = useState(false);
  const [, setLoading] = useState(false);

  const loadUpcomingSessions = useCallback(async () => {
    setLoading(true);
    try {
      // Load from storage (bookings/sessions)
      const bookings = await apiClient.get<UpcomingSession[]>('coach_bookings', []);

      // Filter to upcoming sessions only
      const now = new Date();
      const upcoming = bookings
        .filter((b) => {
          const sessionDate = new Date(b.scheduledAt);
          return sessionDate > now && b.coachId === coachId;
        })
        .sort((a, b) => {
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        })
        .slice(0, 10);

      setUpcomingSessions(upcoming);
    } catch (error) {
      logger.error('Failed to load upcoming sessions', error);
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  // Load upcoming sessions
  useEffect(() => {
    if (visible) {
      loadUpcomingSessions();
    }
  }, [visible, loadUpcomingSessions]);

  const handleChoiceSelect = (choice: 'existing' | 'new') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    logger.action('InviteChoiceSelected', { choice });

    if (choice === 'new') {
      setIsNewSession(true);
      setStep('select-athletes');
    } else {
      setIsNewSession(false);
      if (upcomingSessions.length === 0) {
        Alert.alert(
          'No Upcoming Sessions',
          'You don\'t have any upcoming sessions. Would you like to create a new one?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Create New',
              onPress: () => {
                setIsNewSession(true);
                setStep('select-athletes');
              },
            },
          ]
        );
      } else {
        setStep('select-session');
      }
    }
  };

  const handleSessionSelect = (session: UpcomingSession) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSession(session);
    setStep('select-athletes');
    logger.action('SessionSelected', { sessionId: session.id });
  };

  const handleAthletesSelected = (selected: Athlete[]) => {
    setSelectedAthletes(selected);

    if (isNewSession) {
      // Navigate to create session flow with preselected athletes
      onClose();
      router.push(Routes.sessionsCreateWith({
        athleteIds: selected.map((a) => a.id).join(','),
        athleteNames: selected.map((a) => a.name).join(','),
      }));

      logger.action('NavigateToCreateSession', { athleteCount: selected.length });
    } else if (selectedSession) {
      setStep('confirm');
    }
  };

  const handleConfirm = async () => {
    if (!selectedSession || selectedAthletes.length === 0) return;

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    logger.action('InviteConfirmed', {
      sessionId: selectedSession.id,
      athleteCount: selectedAthletes.length,
    });

    try {
      // Update the session with new athletes
      const bookings = await apiClient.get<UpcomingSession[]>('coach_bookings', []);

      const updatedBookings = bookings.map((b) => {
        if (b.id === selectedSession.id) {
          const existingAthleteIds = b.athleteIds || [];
          const newAthleteIds = selectedAthletes.map((a) => a.id);
          return {
            ...b,
            athleteIds: [...new Set([...existingAthleteIds, ...newAthleteIds])],
            currentAthletes: (b.currentAthletes || 0) + selectedAthletes.length,
          };
        }
        return b;
      });

      await apiClient.set('coach_bookings', updatedBookings);

      // Callback
      onComplete?.({
        sessionId: selectedSession.id,
        athleteIds: selectedAthletes.map((a) => a.id),
        isNew: false,
      });

      // Show success
      Alert.alert(
        'Athletes Invited',
        `${selectedAthletes.length} athlete${selectedAthletes.length !== 1 ? 's' : ''} added to ${selectedSession.title || 'session'}.`
      );

      handleClose();
    } catch (error) {
      logger.error('Failed to add athletes to session', error);
      Alert.alert('Error', 'Failed to add athletes. Please try again.');
    }
  };

  const handleClose = () => {
    setStep('choice');
    setSelectedSession(null);
    setSelectedAthletes([]);
    setIsNewSession(false);
    onClose();
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('select-athletes');
    } else if (step === 'select-athletes') {
      if (isNewSession) {
        setStep('choice');
      } else {
        setStep('select-session');
      }
    } else if (step === 'select-session') {
      setStep('choice');
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dateFormatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { dayName, date: dateFormatted, time };
  };

  // If we're selecting athletes, use the full-screen modal
  if (step === 'select-athletes') {
    return (
      <InviteAthleteModal
        visible={visible}
        onClose={handleClose}
        onSelect={handleAthletesSelected}
        athletes={athletes.filter((a) => {
          // Filter out athletes already in the session
          if (selectedSession?.athleteIds) {
            return !selectedSession.athleteIds.includes(a.id);
          }
          return true;
        })}
        title={isNewSession ? 'Select Athletes for New Session' : `Add to: ${selectedSession?.title || 'Session'}`}
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: palette.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            {step !== 'choice' && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={palette.text} />
              </TouchableOpacity>
            )}
            <ThemedText type="subtitle" style={styles.headerTitle}>
              {step === 'choice' && 'Invite Athletes'}
              {step === 'select-session' && 'Select Session'}
              {step === 'confirm' && 'Confirm Invitation'}
            </ThemedText>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Step 1: Choice */}
            {step === 'choice' && (
              <View style={styles.choiceContainer}>
                <ThemedText style={[styles.choiceSubtitle, { color: palette.muted }]}>
                  How would you like to invite athletes?
                </ThemedText>

                <TouchableOpacity
                  style={[styles.choiceCard, { backgroundColor: palette.background, borderColor: palette.tint }]}
                  onPress={() => handleChoiceSelect('existing')}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                    <Ionicons name="calendar" size={28} color={palette.tint} />
                  </View>
                  <View style={styles.choiceInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.choiceTitle}>
                      Add to Existing Session
                    </ThemedText>
                    <ThemedText style={[styles.choiceDesc, { color: palette.muted }]}>
                      Invite athletes to a session you&apos;ve already scheduled
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.choiceCard, { backgroundColor: palette.background, borderColor: palette.success }]}
                  onPress={() => handleChoiceSelect('new')}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
                    <Ionicons name="add-circle" size={28} color={palette.success} />
                  </View>
                  <View style={styles.choiceInfo}>
                    <ThemedText type="defaultSemiBold" style={styles.choiceTitle}>
                      Create New Session
                    </ThemedText>
                    <ThemedText style={[styles.choiceDesc, { color: palette.muted }]}>
                      Start fresh with a new session and invite athletes
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Select Session */}
            {step === 'select-session' && (
              <View style={styles.sessionList}>
                <ThemedText style={[styles.sectionSubtitle, { color: palette.muted }]}>
                  Select an upcoming session to add athletes to
                </ThemedText>

                {upcomingSessions.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color={palette.muted} />
                    <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                      No upcoming sessions found
                    </ThemedText>
                    <TouchableOpacity
                      style={[styles.createButton, { backgroundColor: palette.tint }]}
                      onPress={() => {
                        setIsNewSession(true);
                        setStep('select-athletes');
                      }}
                    >
                      <Ionicons name="add" size={18} color={palette.onPrimary} />
                      <ThemedText style={styles.createButtonText}>Create New Session</ThemedText>
                    </TouchableOpacity>
                  </View>
                ) : (
                  upcomingSessions.map((session) => {
                    const { dayName, date, time } = formatDateTime(session.scheduledAt);
                    const spotsLeft = session.maxAthletes
                      ? session.maxAthletes - (session.currentAthletes || 0)
                      : null;

                    return (
                      <TouchableOpacity
                        key={session.id}
                        style={[styles.sessionCard, { backgroundColor: palette.background, borderColor: palette.border }]}
                        onPress={() => handleSessionSelect(session)}
                      >
                        <View style={[styles.sessionDate, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                          <ThemedText style={[styles.sessionDayName, { color: palette.tint }]}>
                            {dayName}
                          </ThemedText>
                          <ThemedText style={[styles.sessionDateStr, { color: palette.tint }]}>
                            {date}
                          </ThemedText>
                        </View>

                        <View style={styles.sessionInfo}>
                          <ThemedText type="defaultSemiBold" numberOfLines={1}>
                            {session.title || 'Coaching Session'}
                          </ThemedText>
                          <View style={styles.sessionMeta}>
                            <Ionicons name="time-outline" size={14} color={palette.muted} />
                            <ThemedText style={[styles.sessionMetaText, { color: palette.muted }]}>
                              {time}
                            </ThemedText>
                            {session.location && (
                              <>
                                <Ionicons name="location-outline" size={14} color={palette.muted} style={{ marginLeft: 8 }} />
                                <ThemedText style={[styles.sessionMetaText, { color: palette.muted }]} numberOfLines={1}>
                                  {session.location}
                                </ThemedText>
                              </>
                            )}
                          </View>
                          {spotsLeft !== null && (
                            <View style={[styles.spotsBadge, { backgroundColor: spotsLeft > 0 ? withAlpha(palette.success, 0.09) : withAlpha(palette.error, 0.09) }]}>
                              <ThemedText style={{ ...Typography.caption, color: spotsLeft > 0 ? palette.success : palette.error, fontWeight: '600' }}>
                                {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available` : 'Full'}
                              </ThemedText>
                            </View>
                          )}
                        </View>

                        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* Step 3: Confirm */}
            {step === 'confirm' && selectedSession && (
              <View style={styles.confirmContainer}>
                <SurfaceCard style={styles.confirmCard}>
                  <View style={styles.confirmHeader}>
                    <Ionicons name="checkmark-circle" size={48} color={palette.success} />
                    <ThemedText type="subtitle" style={{ marginTop: Spacing.sm }}>
                      Ready to Invite
                    </ThemedText>
                  </View>

                  <Divider spacing={Spacing.sm} />

                  <View style={styles.confirmDetail}>
                    <ThemedText style={[styles.confirmLabel, { color: palette.muted }]}>Session</ThemedText>
                    <ThemedText type="defaultSemiBold">{selectedSession.title || 'Coaching Session'}</ThemedText>
                    <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                      {formatDateTime(selectedSession.scheduledAt).date} at {formatDateTime(selectedSession.scheduledAt).time}
                    </ThemedText>
                  </View>

                  <View style={styles.confirmDetail}>
                    <ThemedText style={[styles.confirmLabel, { color: palette.muted }]}>Athletes</ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {selectedAthletes.length} athlete{selectedAthletes.length !== 1 ? 's' : ''}
                    </ThemedText>
                    <ThemedText style={{ ...Typography.small, color: palette.muted }} numberOfLines={2}>
                      {selectedAthletes.map((a) => a.name).join(', ')}
                    </ThemedText>
                  </View>
                </SurfaceCard>

                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: palette.success }]}
                  onPress={handleConfirm}
                >
                  <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
                  <ThemedText style={styles.confirmButtonText}>Send Invitations</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.changeButton, { borderColor: palette.border }]}
                  onPress={() => setStep('select-athletes')}
                >
                  <ThemedText style={{ color: palette.tint }}>Change Athletes</ThemedText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '90%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },

  // Choice Step
  choiceContainer: {
    gap: Spacing.md,
  },
  choiceSubtitle: { ...Typography.body, marginBottom: Spacing.sm },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 2,
    gap: Spacing.md,
  },
  choiceIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  choiceTitle: { ...Typography.subheading },
  choiceDesc: { ...Typography.small, lineHeight: 18 },

  // Session List
  sessionList: {
    gap: Spacing.sm,
  },
  sectionSubtitle: { ...Typography.bodySmall, marginBottom: Spacing.sm },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  sessionDate: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    minWidth: 50,
  },
  sessionDayName: { ...Typography.micro, textTransform: 'uppercase' },
  sessionDateStr: { ...Typography.caption },
  sessionInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  sessionMetaText: { ...Typography.caption },
  spotsBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  emptyText: { ...Typography.body },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  createButtonText: {
    color: Colors.light.onPrimary,
    fontWeight: '600',
  },

  // Confirm Step
  confirmContainer: {
    gap: Spacing.md,
  },
  confirmCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  confirmHeader: {
    alignItems: 'center',
  },
  confirmDetail: {
    gap: Spacing.xxs,
  },
  confirmLabel: { ...Typography.caption, textTransform: 'uppercase',
    fontWeight: '600' },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  confirmButtonText: { ...Typography.subheading, color: Colors.light.onPrimary },
  changeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
