import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeInRight,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import { progressService } from '@/services/progress-service';
import type { GroupSession, GroupRegistration, GroupFeedback, FootballObjective } from '@/constants/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FOOTBALL_SKILLS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

interface AthleteWithFeedback {
  registration: GroupRegistration;
  feedback: Partial<GroupFeedback> | null;
  hasFeedback: boolean;
}

export default function GroupSessionFeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [session, setSession] = useState<GroupSession | null>(null);
  const [athletes, setAthletes] = useState<AthleteWithFeedback[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Current athlete's feedback state
  const [overallRating, setOverallRating] = useState(3);
  const [effortRating, setEffortRating] = useState(3);
  const [selectedSkills, setSelectedSkills] = useState<FootballObjective[]>([]);
  const [publicNotes, setPublicNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  const currentAthlete = athletes[currentIndex];
  const completedCount = athletes.filter(a => a.hasFeedback).length;

  useEffect(() => {
    loadData();
  }, [id]);

  // Load existing feedback when switching athletes
  useEffect(() => {
    if (currentAthlete) {
      loadExistingFeedback(currentAthlete);
    }
  }, [currentIndex, athletes]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [sessionData, status] = await Promise.all([
        groupSessionService.getSession(id),
        groupSessionService.getFeedbackCompletionStatus(id),
      ]);
      setSession(sessionData);

      // Build athlete list with feedback status
      const roster = await groupSessionService.getSessionRoster(id);
      const attendedRoster = roster.filter(r => r.status === 'ATTENDED');

      const athletesWithFeedback: AthleteWithFeedback[] = attendedRoster.map(reg => ({
        registration: reg,
        feedback: null,
        hasFeedback: status.athletes.find(a => a.athleteId === reg.athleteId)?.hasFeedback ?? false,
      }));

      setAthletes(athletesWithFeedback);

      // Start with first athlete that doesn't have feedback
      const firstPendingIndex = athletesWithFeedback.findIndex(a => !a.hasFeedback);
      if (firstPendingIndex >= 0) {
        setCurrentIndex(firstPendingIndex);
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
      Alert.alert('Error', 'Failed to load session data.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingFeedback = async (athlete: AthleteWithFeedback) => {
    if (!id) return;

    try {
      const existing = await groupSessionService.getAthleteFeedbackForSession(
        id,
        athlete.registration.athleteId
      );

      if (existing) {
        setOverallRating(existing.overallRating);
        setEffortRating(existing.effortRating);
        setSelectedSkills(existing.skillsWorkedOn);
        setPublicNotes(existing.publicNotes);
        setPrivateNotes(existing.privateNotes);
      } else {
        // Reset to defaults, pre-select session focus skills
        setOverallRating(3);
        setEffortRating(3);
        setSelectedSkills(session?.focus || []);
        setPublicNotes('');
        setPrivateNotes('');
      }
    } catch (error) {
      console.error('Failed to load existing feedback:', error);
    }
  };

  const handleSaveAndNext = async () => {
    if (!session || !currentAthlete || !currentUser) return;

    setSaving(true);
    try {
      const feedback: Omit<GroupFeedback, 'id' | 'createdAt'> = {
        sessionId: session.id,
        sessionName: session.title,
        sessionDate: session.schedule[0]?.date || new Date().toISOString().split('T')[0],
        athleteId: currentAthlete.registration.athleteId,
        athleteName: currentAthlete.registration.athleteName,
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        overallRating,
        effortRating,
        skillsWorkedOn: selectedSkills,
        publicNotes,
        privateNotes,
      };

      // Save feedback
      const savedFeedback = await groupSessionService.saveGroupSessionFeedback(
        session.id,
        currentAthlete.registration.athleteId,
        feedback
      );

      // Update skill levels via progress service
      await progressService.addGroupSessionFeedback(savedFeedback);

      // Update local state
      const updatedAthletes = [...athletes];
      updatedAthletes[currentIndex] = {
        ...updatedAthletes[currentIndex],
        hasFeedback: true,
        feedback: savedFeedback,
      };
      setAthletes(updatedAthletes);

      // Move to next athlete if available
      if (currentIndex < athletes.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // All done - prompt to complete session
        Alert.alert(
          'All Feedback Submitted',
          'You have provided feedback for all athletes. Mark session as complete?',
          [
            { text: 'Not Yet', style: 'cancel' },
            {
              text: 'Complete Session',
              onPress: handleCompleteSession,
            },
          ]
        );
      }
    } catch (error) {
      console.error('Failed to save feedback:', error);
      Alert.alert('Error', 'Failed to save feedback. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < athletes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      Alert.alert(
        'End of List',
        'You have reached the last athlete. Would you like to complete the session or go back to review?',
        [
          { text: 'Review', onPress: () => setCurrentIndex(0) },
          {
            text: 'Complete Session',
            onPress: handleCompleteSession,
          },
        ]
      );
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;

    try {
      await groupSessionService.completeGroupSession(session.id);
      Alert.alert('Success', 'Session marked as complete!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to complete session:', error);
      Alert.alert('Error', 'Failed to complete session.');
    }
  };

  const toggleSkill = (skill: FootballObjective) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || athletes.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Session Feedback</ThemedText>
        </View>
        <EmptyState
          icon="people-outline"
          title="No Attended Athletes"
          message="No athletes have been marked as attended for this session. Mark attendance first before providing feedback."
          actionLabel="Go to Roster"
          onPressAction={() => router.replace(`/group-sessions/${id}/roster`)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={styles.headerTitle}>
            <ThemedText type="title">Session Feedback</ThemedText>
            <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
              {session.title}
            </ThemedText>
          </View>
        </View>

        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={styles.progressInfo}>
            <ThemedText type="defaultSemiBold">
              {currentIndex + 1} of {athletes.length} athletes
            </ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              {completedCount} reviewed
            </ThemedText>
          </View>
          <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: palette.tint,
                  width: `${((currentIndex + 1) / athletes.length) * 100}%`,
                },
              ]}
            />
          </View>
          {/* Dot indicators */}
          <View style={styles.dotsContainer}>
            {athletes.map((athlete, idx) => (
              <Clickable
                key={athlete.registration.id}
                onPress={() => setCurrentIndex(idx)}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      idx === currentIndex
                        ? palette.tint
                        : athlete.hasFeedback
                        ? palette.success
                        : palette.border,
                  },
                ]}
              >
                <View />
              </Clickable>
            ))}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Athlete Card */}
          <Animated.View entering={SlideInRight.springify()}>
            <SurfaceCard style={styles.athleteCard}>
              <View style={styles.athleteHeader}>
                <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.avatarText}>
                    {currentAthlete.registration.athleteName.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
                <View style={styles.athleteInfo}>
                  <ThemedText type="title">{currentAthlete.registration.athleteName}</ThemedText>
                  {currentAthlete.hasFeedback && (
                    <View style={[styles.feedbackBadge, { backgroundColor: `${palette.success}15` }]}>
                      <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                      <ThemedText style={{ color: palette.success, fontSize: 12 }}>
                        Feedback saved
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </SurfaceCard>
          </Animated.View>

          {/* Overall Rating */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SurfaceCard style={styles.section}>
              <ThemedText type="defaultSemiBold">Overall Performance</ThemedText>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <Clickable
                    key={rating}
                    onPress={() => setOverallRating(rating)}
                    style={[
                      styles.ratingButton,
                      {
                        backgroundColor:
                          rating <= overallRating ? palette.tint : palette.surface,
                        borderColor: rating <= overallRating ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={rating <= overallRating ? 'star' : 'star-outline'}
                      size={24}
                      color={rating <= overallRating ? '#fff' : palette.muted}
                    />
                  </Clickable>
                ))}
              </View>
              <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
                {overallRating === 1 && 'Needs Improvement'}
                {overallRating === 2 && 'Fair'}
                {overallRating === 3 && 'Good'}
                {overallRating === 4 && 'Great'}
                {overallRating === 5 && 'Excellent'}
              </ThemedText>
            </SurfaceCard>
          </Animated.View>

          {/* Effort Rating */}
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <SurfaceCard style={styles.section}>
              <ThemedText type="defaultSemiBold">Effort Level</ThemedText>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map(rating => (
                  <Clickable
                    key={rating}
                    onPress={() => setEffortRating(rating)}
                    style={[
                      styles.ratingButton,
                      {
                        backgroundColor:
                          rating <= effortRating ? '#F59E0B' : palette.surface,
                        borderColor: rating <= effortRating ? '#F59E0B' : palette.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={rating <= effortRating ? 'flame' : 'flame-outline'}
                      size={24}
                      color={rating <= effortRating ? '#fff' : palette.muted}
                    />
                  </Clickable>
                ))}
              </View>
              <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
                {effortRating === 1 && 'Low Effort'}
                {effortRating === 2 && 'Below Average'}
                {effortRating === 3 && 'Good Effort'}
                {effortRating === 4 && 'High Effort'}
                {effortRating === 5 && 'Maximum Effort'}
              </ThemedText>
            </SurfaceCard>
          </Animated.View>

          {/* Skills Worked On */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <SurfaceCard style={styles.section}>
              <ThemedText type="defaultSemiBold">Skills Practiced</ThemedText>
              <View style={styles.skillsGrid}>
                {FOOTBALL_SKILLS.map(skill => {
                  const isSelected = selectedSkills.includes(skill);
                  return (
                    <Clickable
                      key={skill}
                      onPress={() => toggleSkill(skill)}
                      style={[
                        styles.skillChip,
                        {
                          backgroundColor: isSelected ? `${palette.tint}15` : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
                      )}
                      <ThemedText
                        style={{
                          color: isSelected ? palette.tint : palette.text,
                          fontWeight: isSelected ? '600' : '400',
                        }}
                      >
                        {skill}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
            </SurfaceCard>
          </Animated.View>

          {/* Public Notes */}
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold">Notes for Parent</ThemedText>
                <View style={[styles.visibilityBadge, { backgroundColor: `${palette.success}15` }]}>
                  <Ionicons name="eye" size={12} color={palette.success} />
                  <ThemedText style={{ color: palette.success, fontSize: 11 }}>Visible</ThemedText>
                </View>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="Quick notes the parent will see..."
                placeholderTextColor={palette.muted}
                value={publicNotes}
                onChangeText={setPublicNotes}
                multiline
                numberOfLines={3}
              />
            </SurfaceCard>
          </Animated.View>

          {/* Private Notes */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <SurfaceCard style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText type="defaultSemiBold">Private Notes</ThemedText>
                <View style={[styles.visibilityBadge, { backgroundColor: `${palette.muted}15` }]}>
                  <Ionicons name="eye-off" size={12} color={palette.muted} />
                  <ThemedText style={{ color: palette.muted, fontSize: 11 }}>Coach Only</ThemedText>
                </View>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="Notes only you can see..."
                placeholderTextColor={palette.muted}
                value={privateNotes}
                onChangeText={setPrivateNotes}
                multiline
                numberOfLines={3}
              />
            </SurfaceCard>
          </Animated.View>

          {/* Badge Award Option */}
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <Clickable
              style={[styles.badgeButton, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}
              onPress={() => {
                // TODO: Open badge modal
                Alert.alert('Coming Soon', 'Badge awarding will be available in a future update.');
              }}
            >
              <Ionicons name="ribbon-outline" size={24} color={palette.tint} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                  Award Badge
                </ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                  Recognize exceptional performance
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Clickable>
          </Animated.View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Action Footer */}
        <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <View style={styles.footerNav}>
            <Clickable
              onPress={handlePrevious}
              disabled={currentIndex === 0}
              style={[
                styles.navButton,
                { opacity: currentIndex === 0 ? 0.3 : 1 },
              ]}
            >
              <Ionicons name="chevron-back" size={20} color={palette.text} />
              <ThemedText>Previous</ThemedText>
            </Clickable>

            <Clickable
              onPress={handleSkip}
              style={styles.navButton}
            >
              <ThemedText style={{ color: palette.muted }}>Skip</ThemedText>
              <Ionicons name="chevron-forward" size={20} color={palette.muted} />
            </Clickable>
          </View>

          <Button
            onPress={handleSaveAndNext}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? 'Saving...' : currentIndex < athletes.length - 1 ? 'Save & Next' : 'Save & Finish'}
          </Button>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  athleteCard: {
    padding: Spacing.md,
  },
  athleteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  athleteInfo: {
    flex: 1,
    gap: 4,
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  ratingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 13,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  badgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  bottomSpacer: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  footerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: Spacing.xs,
  },
  saveButton: {
    width: '100%',
  },
});
