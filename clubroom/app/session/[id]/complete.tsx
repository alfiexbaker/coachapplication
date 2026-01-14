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

import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
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
  const [showBadgeSelector, setShowBadgeSelector] = useState<string | null>(null);

  useEffect(() => {
    loadSession();
    loadBadges();
  }, [id]);

  const loadSession = async () => {
    if (!id) return;

    try {
      const stored = await AsyncStorage.getItem('session_offerings');
      if (stored) {
        const offerings: SessionOffering[] = JSON.parse(stored);
        const found = offerings.find(o => o.id === id);
        if (found) {
          setSession(found);

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
        }
      }
    } catch (error) {
      logger.error('Failed to load session', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBadges = async () => {
    try {
      const badges = await badgeService.listBadges();
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
      for (const [regId, athleteData] of Object.entries(attendance)) {
        if (athleteData.badges.length > 0 && athleteData.status === 'present') {
          for (const badgeId of athleteData.badges) {
            const badge = availableBadges.find(b => b.id === badgeId);
            if (badge) {
              await badgeService.awardBadge({
                recipientId: athleteData.registration.userId,
                recipientName: athleteData.registration.userName,
                recipientType: 'athlete',
                badgeId: badge.id,
                badgeLabel: badge.label,
                badgeCategory: badge.category,
                badgeTier: badge.tier,
                coachId: currentUser.id,
                coachName: currentUser.fullName || 'Coach',
                sessionId: session.id,
                note: athleteData.note || undefined,
              });
            }
          }
        }
      }

      // Update session status to completed
      const stored = await AsyncStorage.getItem('session_offerings');
      if (stored) {
        const offerings: SessionOffering[] = JSON.parse(stored);
        const updated = offerings.map(o => {
          if (o.id === session.id && !o.isRecurring) {
            return { ...o, status: 'completed' as const };
          }
          return o;
        });
        await AsyncStorage.setItem('session_offerings', JSON.stringify(updated));
      }

      logger.success('SessionCompleted', {
        sessionId: session.id,
        presentCount,
        badgesAwarded: Object.values(attendance).reduce((sum, a) => sum + a.badges.length, 0),
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader
        title="Complete Session"
        subtitle={session.title}
        showBack
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* Attendance Section */}
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
              const icon = getAttendanceIcon(status);
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
                            isSelected && { backgroundColor: `${btnIcon.color}15` },
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

                  {/* Badge Award Button */}
                  <Pressable
                    style={[styles.badgeBtn, { borderColor: palette.border }]}
                    onPress={() => setShowBadgeSelector(
                      showBadgeSelector === registration.id ? null : registration.id
                    )}
                  >
                    <Ionicons name="ribbon-outline" size={18} color={palette.tint} />
                  </Pressable>

                  {/* Badge Selector Dropdown */}
                  {showBadgeSelector === registration.id && (
                    <View style={[styles.badgeDropdown, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                      <ThemedText style={[styles.badgeDropdownTitle, { color: palette.muted }]}>
                        Award badges:
                      </ThemedText>
                      <View style={styles.badgeGrid}>
                        {availableBadges.slice(0, 6).map(badge => {
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
                  )}
                </View>
              );
            })
          )}
        </SurfaceCard>

        {/* Session Summary */}
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

        {/* Skills Focused */}
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
                  <ThemedText
                    style={[styles.skillChipText, { color: isSelected ? '#fff' : palette.text }]}
                  >
                    {skill}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </SurfaceCard>

        {/* Overall Effort */}
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

        {/* Homework */}
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

        {/* Submit Button */}
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
  badgeBtn: {
    position: 'absolute',
    right: 0,
    top: Spacing.sm,
    padding: 8,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  badgeDropdown: {
    marginTop: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  badgeDropdownTitle: {
    fontSize: 12,
    marginBottom: Spacing.xs,
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: Spacing.md,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
