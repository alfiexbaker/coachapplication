/**
 * Session Completion Screen
 *
 * Allows coaches to complete a session after it's finished:
 * - Mark attendance for each registered athlete
 * - Add session notes and feedback
 * - Award badges for achievements
 * - Rate athlete effort
 *
 * USER STORY:
 * "As a coach, I want to mark attendance and add notes after a session
 * so I can track athlete progress and provide feedback."
 */

import { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import Slider from '@react-native-community/slider';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Components } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { bookingService } from '@/services/booking-service';
import type { SessionOffering, SessionRegistration, BadgeDefinition } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SessionComplete');

type AttendanceStatus = 'present' | 'absent' | 'late';

interface AthleteAttendance {
  registration: SessionRegistration;
  status: AttendanceStatus;
  effort: number;
  note: string;
  badges: string[]; // Badge IDs to award
}

export default function SessionCompleteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [session, setSession] = useState<SessionOffering | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [attendance, setAttendance] = useState<Record<string, AthleteAttendance>>({});
  const [sessionSummary, setSessionSummary] = useState('');
  const [skillsFocused, setSkillsFocused] = useState<string[]>([]);
  const [overallEffort, setOverallEffort] = useState(3);
  const [homework, setHomework] = useState('');
  const [availableBadges, setAvailableBadges] = useState<BadgeDefinition[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showBadgeSelector, setShowBadgeSelector] = useState<string | null>(null);

  // Step navigation: attendance -> notes -> badges -> summary
  type CompletionStep = 'attendance' | 'notes' | 'badges' | 'summary';
  const STEPS: CompletionStep[] = ['attendance', 'notes', 'badges', 'summary'];
  const [currentStep, setCurrentStep] = useState<CompletionStep>('attendance');
  const currentStepIndex = STEPS.indexOf(currentStep);

  // Sharing toggles for summary step
  const [shareNotesWithParents, setShareNotesWithParents] = useState(true);
  const [shareAttendance, setShareAttendance] = useState(true);

  // Source type: session offering or booking (AWAITING_COMPLETION)
  const [sourceType, setSourceType] = useState<'offering' | 'booking'>('offering');

  const loadSession = useCallback(async () => {
    if (!id) return;

    try {
      // First try session offerings
      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
      if (offerings.length > 0) {
        const found = offerings.find(o => o.id === id);
        if (found) {
          setSession(found);
          setSourceType('offering');

          // Initialize attendance for all confirmed registrations
          const initialAttendance: Record<string, AthleteAttendance> = {};
          found.registrations
            .filter(r => r.status === 'confirmed')
            .forEach(reg => {
              initialAttendance[reg.id] = {
                registration: reg,
                status: 'present',
                effort: 3,
                note: '',
                badges: [],
              };
            });
          setAttendance(initialAttendance);

          // Pre-select session's skill focus if any
          if (found.footballSkill) {
            setSkillsFocused([found.footballSkill]);
          }
          setLoading(false);
          return;
        }
      }

      // Fall back to bookings with AWAITING_COMPLETION status
      const booking = await bookingService.getBooking(id);
      if (booking && (booking.status === 'AWAITING_COMPLETION' || booking.status === 'CONFIRMED')) {
        setSourceType('booking');
        // Create a minimal session offering from the booking
        const syntheticSession: SessionOffering = {
          id: booking.id,
          coachId: booking.coachId,
          title: booking.service || 'Session',
          description: booking.notes || '',
          type: (booking.service as any) || '1:1',
          scheduledAt: booking.scheduledAt,
          duration: booking.duration || 60,
          location: booking.location,
          maxCapacity: 1,
          price: 0,
          status: 'confirmed',
          registrations: [{
            id: `reg-${booking.id}`,
            sessionId: booking.id,
            userId: booking.athleteId || booking.athleteIds?.[0] || '',
            userName: booking.athleteName || 'Athlete',
            status: 'confirmed',
            registeredAt: booking.scheduledAt,
          }],
          createdAt: booking.scheduledAt,
        } as any;
        setSession(syntheticSession);

        const initialAttendance: Record<string, AthleteAttendance> = {};
        syntheticSession.registrations.forEach((reg: any) => {
          initialAttendance[reg.id] = {
            registration: reg,
            status: 'present',
            effort: 3,
            note: '',
            badges: [],
          };
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      logger.error('Failed to load session', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
    loadBadges();
  }, [loadSession]);

  const loadBadges = async () => {
    try {
      const badges = await badgeService.listDefinitions();
      setAvailableBadges(badges);
    } catch (error) {
      logger.error('Failed to load badges', error);
    }
  };

  const updateAttendance = (regId: string, updates: Partial<AthleteAttendance>) => {
    setAttendance(prev => ({
      ...prev,
      [regId]: { ...prev[regId], ...updates },
    }));
  };

  const toggleBadge = (regId: string, badgeId: string) => {
    setAttendance(prev => {
      const current = prev[regId];
      const hasBadge = current.badges.includes(badgeId);
      return {
        ...prev,
        [regId]: {
          ...current,
          badges: hasBadge
            ? current.badges.filter(b => b !== badgeId)
            : [...current.badges, badgeId],
        },
      };
    });
  };

  const handleComplete = async () => {
    if (!session || !currentUser) return;

    setSubmitting(true);

    try {
      // Save session notes
      const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
      const absentCount = Object.values(attendance).filter(a => a.status === 'absent').length;

      await progressService.saveSessionNote(session.id, {
        summary: sessionSummary,
        focus: skillsFocused,
        improvements: '',
        homework,
        effort: overallEffort,
        attendance: `${presentCount} present, ${absentCount} absent`,
      });

      // Award badges
      for (const athleteData of Object.values(attendance)) {
        if (athleteData.badges.length > 0 && athleteData.status === 'present') {
          for (const badgeId of athleteData.badges) {
            const badge = availableBadges.find(b => b.id === badgeId);
            if (badge) {
              await badgeService.awardBadge({
                athleteId: athleteData.registration.userId,
                athleteName: athleteData.registration.userName,
                badgeId: badge.id,
                coachId: currentUser.id,
                coachName: currentUser.fullName || 'Coach',
                sessionId: session.id,
                reason: badge.label,
                note: athleteData.note || undefined,
              });
            }
          }
        }
      }

      // Save sharing preferences
      await apiClient.set(`session_sharing_${session.id}`, {
        shareNotesWithParents,
        shareAttendance,
      });

      // Update session/booking status to completed
      if (sourceType === 'booking') {
        try {
          await bookingService.updateBooking(session.id, { status: 'COMPLETED' } as any);
        } catch (err) {
          logger.error('Failed to update booking status', err);
        }
      } else {
        const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
        if (offerings.length > 0) {
          const updated = offerings.map(o => {
            if (o.id === session.id && !o.isRecurring) {
              return { ...o, status: 'completed' as const };
            }
            return o;
          });
          await apiClient.set('session_offerings', updated);
        }
      }

      logger.success('SessionCompleted', {
        sessionId: session.id,
        presentCount,
        badgesAwarded: Object.values(attendance).reduce((sum, a) => sum + a.badges.length, 0),
        shareNotesWithParents,
        shareAttendance,
      });

      Alert.alert(
        'Session Completed',
        'Attendance recorded and notes saved. Athletes will be notified.',
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Failed to complete session', error);
      Alert.alert('Error', 'Failed to complete session. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getAttendanceIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'present':
        return { name: 'checkmark-circle', color: palette.success };
      case 'absent':
        return { name: 'close-circle', color: palette.error };
      case 'late':
        return { name: 'time', color: palette.warning };
    }
  };

  const SKILL_OPTIONS = [
    'Dribbling', 'Passing', 'Defending', 'Finishing', 'Goalkeeping', 'Conditioning', 'Tactics',
  ];

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <View style={styles.loading}>
          <ThemedText>Loading session...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PageHeader title="Complete Session" showBack onBackPress={() => router.back()} />
        <View style={styles.loading}>
          <ThemedText>Session not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const attendanceList = Object.values(attendance);
  const totalBadgesAwarded = Object.values(attendance).reduce((sum, a) => sum + a.badges.length, 0);
  const presentCount = attendanceList.filter(a => a.status === 'present').length;
  const absentCount = attendanceList.filter(a => a.status === 'absent').length;

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  // Step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.stepDotRow}>
          <View
            style={[
              styles.stepDot,
              {
                backgroundColor: index <= currentStepIndex ? palette.tint : palette.border,
              },
            ]}
          />
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor: index < currentStepIndex ? palette.tint : palette.border,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  // Render Attendance step
  const renderAttendanceStep = () => (
    <>
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Attendance</ThemedText>
        </View>

        {attendanceList.length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No registered athletes for this session
          </ThemedText>
        ) : (
          attendanceList.map(({ registration, status, badges }) => {
            const _icon = getAttendanceIcon(status);
            void _icon;
            return (
              <View key={registration.id} style={[styles.athleteRow, { borderBottomColor: palette.border }]}>
                <View style={styles.athleteInfo}>
                  <View style={[styles.avatar, { backgroundColor: `${palette.tint}20` }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                      {registration.userName.charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={styles.athleteName}>
                    <ThemedText type="defaultSemiBold">{registration.userName}</ThemedText>
                    {badges.length > 0 && (
                      <View style={styles.badgePreview}>
                        <Ionicons name="ribbon" size={12} color={palette.warning} />
                        <ThemedText style={[styles.badgeCount, { color: palette.warning }]}>
                          {badges.length} badge{badges.length !== 1 ? 's' : ''}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.attendanceActions}>
                  {(['present', 'late', 'absent'] as AttendanceStatus[]).map(s => {
                    const btnIcon = getAttendanceIcon(s);
                    const isSelected = status === s;
                    return (
                      <Pressable
                        key={s}
                        style={[
                          styles.attendanceBtn,
                          isSelected ? { backgroundColor: `${btnIcon.color}15` } : undefined,
                        ]}
                        onPress={() => updateAttendance(registration.id, { status: s })}
                      >
                        <Ionicons
                          name={btnIcon.name as any}
                          size={24}
                          color={isSelected ? btnIcon.color : palette.muted}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </SurfaceCard>
    </>
  );

  // Render Notes step (session notes, skills, effort, homework)
  const renderNotesStep = () => (
    <>
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Session Notes</ThemedText>
        </View>
        <TextInput
          style={[styles.textArea, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          placeholder="What did you cover in this session? How did it go?"
          placeholderTextColor={palette.muted}
          value={sessionSummary}
          onChangeText={setSessionSummary}
          multiline
          numberOfLines={4}
        />
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="football" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Skills Worked On</ThemedText>
        </View>
        <View style={styles.skillChips}>
          {SKILL_OPTIONS.map(skill => {
            const isSelected = skillsFocused.includes(skill);
            return (
              <Pressable
                key={skill}
                style={[
                  styles.skillChip,
                  {
                    backgroundColor: isSelected ? palette.tint : 'transparent',
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
                onPress={() =>
                  setSkillsFocused(prev =>
                    isSelected ? prev.filter(s => s !== skill) : [...prev, skill]
                  )
                }
              >
                <ThemedText style={[styles.skillChipText, { color: isSelected ? '#fff' : palette.text }]}>
                  {skill}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="fitness" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Overall Group Effort</ThemedText>
        </View>
        <View style={styles.effortRow}>
          <ThemedText style={[styles.effortLabel, { color: palette.muted }]}>Low</ThemedText>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={overallEffort}
            onValueChange={setOverallEffort}
            minimumTrackTintColor={palette.tint}
            maximumTrackTintColor={palette.border}
            thumbTintColor={palette.tint}
          />
          <ThemedText style={[styles.effortLabel, { color: palette.muted }]}>High</ThemedText>
        </View>
        <ThemedText style={[styles.effortValue, { color: palette.tint }]}>
          {overallEffort}/5
        </ThemedText>
      </SurfaceCard>

      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="clipboard" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Homework / Practice Focus</ThemedText>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text }]}
          placeholder="What should they practice before next session?"
          placeholderTextColor={palette.muted}
          value={homework}
          onChangeText={setHomework}
        />
      </SurfaceCard>
    </>
  );

  // Render Badges step (optional badge awarding)
  const renderBadgesStep = () => (
    <>
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="ribbon" size={20} color={palette.warning} />
          <ThemedText type="subtitle">Award Badges (Optional)</ThemedText>
        </View>
        <ThemedText style={[styles.badgeStepHint, { color: palette.muted }]}>
          Recognise standout performances by awarding badges to athletes who were present.
        </ThemedText>

        {attendanceList.filter(a => a.status === 'present').length === 0 ? (
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            No athletes marked as present
          </ThemedText>
        ) : (
          attendanceList
            .filter(a => a.status === 'present')
            .map(({ registration, badges }) => (
              <View key={registration.id} style={[styles.badgeAthleteRow, { borderBottomColor: palette.border }]}>
                <View style={styles.athleteInfo}>
                  <View style={[styles.avatar, { backgroundColor: `${palette.tint}20` }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                      {registration.userName.charAt(0)}
                    </ThemedText>
                  </View>
                  <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>
                    {registration.userName}
                  </ThemedText>
                  {badges.length > 0 && (
                    <View style={[styles.badgeCountPill, { backgroundColor: `${palette.warning}15` }]}>
                      <Ionicons name="ribbon" size={12} color={palette.warning} />
                      <ThemedText style={[styles.badgeCount, { color: palette.warning }]}>
                        {badges.length}
                      </ThemedText>
                    </View>
                  )}
                </View>

                <View style={styles.badgeGrid}>
                  {availableBadges.slice(0, 8).map(badge => {
                    const isAwarded = badges.includes(badge.id);
                    return (
                      <Pressable
                        key={badge.id}
                        style={[
                          styles.badgeOption,
                          {
                            backgroundColor: isAwarded ? `${palette.warning}15` : 'transparent',
                            borderColor: isAwarded ? palette.warning : palette.border,
                          },
                        ]}
                        onPress={() => toggleBadge(registration.id, badge.id)}
                      >
                        <ThemedText style={[styles.badgeOptionText, { color: isAwarded ? palette.warning : palette.text }]}>
                          {badge.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
        )}
      </SurfaceCard>
    </>
  );

  // Render Summary step (review before submitting)
  const renderSummaryStep = () => (
    <>
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="eye" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Review &amp; Share</ThemedText>
        </View>
        <ThemedText style={[styles.summaryHint, { color: palette.muted }]}>
          Review what will be shared with parents when you complete this session.
        </ThemedText>

        {/* Attendance summary */}
        <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="people-outline" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Attendance</ThemedText>
          </View>
          <ThemedText style={{ color: palette.muted }}>
            {presentCount} present, {absentCount} absent
          </ThemedText>
        </View>

        {/* Notes summary */}
        <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="document-text-outline" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Session Notes</ThemedText>
          </View>
          <ThemedText style={{ color: palette.muted }} numberOfLines={2}>
            {sessionSummary || 'No notes added'}
          </ThemedText>
        </View>

        {/* Skills */}
        {skillsFocused.length > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
            <View style={styles.summaryLabel}>
              <Ionicons name="football-outline" size={18} color={palette.tint} />
              <ThemedText type="defaultSemiBold">Skills</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted }}>
              {skillsFocused.join(', ')}
            </ThemedText>
          </View>
        )}

        {/* Badges */}
        {totalBadgesAwarded > 0 && (
          <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
            <View style={styles.summaryLabel}>
              <Ionicons name="ribbon-outline" size={18} color={palette.warning} />
              <ThemedText type="defaultSemiBold">Badges</ThemedText>
            </View>
            <ThemedText style={{ color: palette.muted }}>
              {totalBadgesAwarded} badge{totalBadgesAwarded !== 1 ? 's' : ''} awarded
            </ThemedText>
          </View>
        )}

        {/* Effort */}
        <View style={[styles.summaryRow, { borderBottomColor: palette.border }]}>
          <View style={styles.summaryLabel}>
            <Ionicons name="fitness-outline" size={18} color={palette.tint} />
            <ThemedText type="defaultSemiBold">Group Effort</ThemedText>
          </View>
          <ThemedText style={{ color: palette.muted }}>{overallEffort}/5</ThemedText>
        </View>
      </SurfaceCard>

      {/* Sharing toggles */}
      <SurfaceCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="share-social" size={20} color={palette.tint} />
          <ThemedText type="subtitle">Sharing Preferences</ThemedText>
        </View>

        <View style={[styles.toggleRow, { borderBottomColor: palette.border }]}>
          <View style={styles.toggleInfo}>
            <ThemedText type="defaultSemiBold">Share notes with parents</ThemedText>
            <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
              Parents will see your session notes and homework
            </ThemedText>
          </View>
          <Switch
            value={shareNotesWithParents}
            onValueChange={setShareNotesWithParents}
            trackColor={{ false: palette.border, true: `${palette.success}60` }}
            thumbColor={shareNotesWithParents ? palette.success : palette.muted}
          />
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <ThemedText type="defaultSemiBold">Share attendance</ThemedText>
            <ThemedText style={[styles.toggleHint, { color: palette.muted }]}>
              Parents will see if their child attended
            </ThemedText>
          </View>
          <Switch
            value={shareAttendance}
            onValueChange={setShareAttendance}
            trackColor={{ false: palette.border, true: `${palette.success}60` }}
            thumbColor={shareAttendance ? palette.success : palette.muted}
          />
        </View>
      </SurfaceCard>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Complete Session"
        subtitle={session.title}
        showBack
        onBackPress={() => {
          if (currentStepIndex > 0) {
            goToPrevStep();
          } else {
            router.back();
          }
        }}
      />

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {renderStepIndicator()}
        <ThemedText style={[styles.stepLabel, { color: palette.muted }]}>
          Step {currentStepIndex + 1} of {STEPS.length}: {currentStep.charAt(0).toUpperCase() + currentStep.slice(1)}
        </ThemedText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 'attendance' && renderAttendanceStep()}
        {currentStep === 'notes' && renderNotesStep()}
        {currentStep === 'badges' && renderBadgesStep()}
        {currentStep === 'summary' && renderSummaryStep()}

        {/* Navigation buttons */}
        <View style={styles.navButtonRow}>
          {currentStepIndex > 0 && (
            <Pressable
              style={[styles.navButtonSecondary, { borderColor: palette.border }]}
              onPress={goToPrevStep}
            >
              <Ionicons name="chevron-back" size={18} color={palette.text} />
              <ThemedText style={[styles.navButtonSecondaryText, { color: palette.text }]}>Back</ThemedText>
            </Pressable>
          )}

          {currentStep !== 'summary' ? (
            <Pressable
              style={[styles.navButtonPrimary, { backgroundColor: palette.tint, flex: currentStepIndex === 0 ? 1 : undefined }]}
              onPress={goToNextStep}
            >
              <ThemedText style={styles.navButtonPrimaryText}>
                {currentStep === 'badges' ? 'Review' : 'Next'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: submitting ? palette.muted : palette.tint },
              ]}
              onPress={handleComplete}
              disabled={submitting}
            >
              {submitting ? (
                <ThemedText style={styles.submitText}>Saving...</ThemedText>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                  <ThemedText style={styles.submitText}>Complete Session</ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  // Step indicator
  stepRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  athleteRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.xs,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  athleteName: {
    flex: 1,
  },
  badgePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  badgeCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  attendanceActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  attendanceBtn: {
    padding: 8,
    borderRadius: Radii.sm,
  },
  // Badge step styles
  badgeStepHint: {
    fontSize: 13,
    lineHeight: 18,
  },
  badgeAthleteRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  badgeCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badgeOption: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  badgeOptionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: 15,
  },
  skillChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  effortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  effortLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  effortValue: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  // Summary step styles
  summaryHint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  summaryRow: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: 4,
  },
  summaryLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  // Sharing toggle styles
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
    marginRight: Spacing.sm,
  },
  toggleHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  // Navigation buttons
  navButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  navButtonPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
  },
  navButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
  },
  navButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
