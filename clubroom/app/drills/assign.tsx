/**
 * Assign Drill Screen
 *
 * Screen for coaches to assign a drill to an athlete.
 * Allows setting due date, notes, repetitions, and priority.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { DifficultyBadge } from '@/components/drills';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { Drill, RosterEntry } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import { rosterService } from '@/services/roster-service';
import { createLogger } from '@/utils/logger';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('AssignDrillScreen');

interface Athlete {
  id: string;
  name: string;
  age?: number;
}

/**
 * Screen for assigning a drill to an athlete.
 */
export default function AssignDrillScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { drillId } = useLocalSearchParams<{ drillId?: string }>();

  // State
  const [drill, setDrill] = useState<Drill | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [dueDate, setDueDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7); // Default: 1 week from now
    return date;
  });
  const [notes, setNotes] = useState('');
  const [repetitions, setRepetitions] = useState('1');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);

  // Get coach info
  const coachId = currentUser?.id ?? 'coach1';
  const coachName = currentUser?.name ?? 'Coach';

  /**
   * Load drill and roster data
   */
  useEffect(() => {
    async function loadData() {
      try {
        // Load drill if ID provided
        if (drillId) {
          const drillData = await drillService.getDrillById(drillId);
          setDrill(drillData);
        }

        // Load roster (athletes from coach's roster)
        if (coachId) {
          const roster = await rosterService.getRoster(coachId, { status: 'ACTIVE' });
          const athleteList = roster.map((entry: RosterEntry) => ({
            id: entry.athleteId,
            name: entry.athleteName,
            age: entry.athleteAge,
          }));
          setAthletes(athleteList);
        }
      } catch (error) {
        logger.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [drillId, coachId]);

  /**
   * Handle date selection
   */
  const handleDateSelect = useCallback((daysFromNow: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    setDueDate(date);
  }, []);

  /**
   * Handle priority selection
   */
  const handlePrioritySelect = useCallback((p: 1 | 2 | 3) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPriority(p);
  }, []);

  /**
   * Handle athlete selection
   */
  const handleAthleteSelect = useCallback((athlete: Athlete) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAthlete(selectedAthlete?.id === athlete.id ? null : athlete);
  }, [selectedAthlete]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!drill || !selectedAthlete) {
      Alert.alert('Missing Information', 'Please select a drill and athlete.');
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);

    try {
      await drillService.assignDrill(
        drill.id,
        selectedAthlete.id,
        selectedAthlete.name,
        coachId,
        coachName,
        {
          dueDate: dueDate.toISOString(),
          notes: notes.trim() || undefined,
          repetitions: parseInt(repetitions, 10) || 1,
          priority,
        }
      );

      Alert.alert(
        'Drill Assigned!',
        `"${drill.title}" has been assigned to ${selectedAthlete.name}.`,
        [
          {
            text: 'Assign Another',
            onPress: () => {
              setSelectedAthlete(null);
              setNotes('');
              setRepetitions('1');
              setPriority(2);
            },
          },
          {
            text: 'Done',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to assign drill', error);
      Alert.alert('Error', 'Failed to assign drill. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [drill, selectedAthlete, coachId, coachName, dueDate, notes, repetitions, priority]);

  /**
   * Format date for display
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  /**
   * Get days from now for a date
   */
  const getDaysFromNow = (date: Date): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // No drill selected
  if (!drill) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
        </View>
        <View style={styles.noDrillContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={palette.muted} />
          <ThemedText type="subtitle" style={{ marginTop: Spacing.md }}>
            No Drill Selected
          </ThemedText>
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.xs }}>
            Please select a drill from your library first.
          </ThemedText>
          <Button onPress={() => router.push('/drills/library')} style={{ marginTop: Spacing.lg }}>
            Go to Library
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const categoryInfo = drillService.getCategoryInfo(drill.category);
  const daysFromNow = getDaysFromNow(dueDate);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          Assign Drill
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Drill Preview */}
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <SurfaceCard style={styles.drillPreview}>
              <View style={styles.drillHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: `${categoryInfo.color}20` }]}>
                  <Ionicons
                    name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={categoryInfo.color}
                  />
                  <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
                    {categoryInfo.label}
                  </ThemedText>
                </View>
                <DifficultyBadge difficulty={drill.difficulty} size="small" />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.drillTitle}>
                {drill.title}
              </ThemedText>
              <View style={styles.drillMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={palette.muted} />
                  <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                    {drillService.formatDuration(drill.duration)}
                  </ThemedText>
                </View>
                {drill.videoUrl && (
                  <View style={styles.metaItem}>
                    <Ionicons name="videocam" size={14} color={palette.muted} />
                    <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                      Video included
                    </ThemedText>
                  </View>
                )}
              </View>
            </SurfaceCard>
          </Animated.View>

          {/* Select Athlete */}
          <Animated.View entering={FadeInDown.delay(150).springify()}>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Select Athlete *
              </ThemedText>
              <View style={styles.athleteGrid}>
                {athletes.map((athlete) => {
                  const isSelected = selectedAthlete?.id === athlete.id;
                  return (
                    <Clickable
                      key={athlete.id}
                      onPress={() => handleAthleteSelect(athlete)}
                      style={[
                        styles.athleteCard,
                        {
                          backgroundColor: isSelected ? `${palette.tint}15` : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <View style={[styles.athleteAvatar, { backgroundColor: palette.surfaceSecondary }]}>
                        <ThemedText style={styles.avatarText}>
                          {athlete.name.charAt(0)}
                        </ThemedText>
                      </View>
                      <ThemedText
                        style={[styles.athleteName, { color: isSelected ? palette.tint : palette.text }]}
                        numberOfLines={1}
                      >
                        {athlete.name}
                      </ThemedText>
                      {athlete.age && (
                        <ThemedText style={[styles.athleteAge, { color: palette.muted }]}>
                          Age {athlete.age}
                        </ThemedText>
                      )}
                      {isSelected && (
                        <View style={[styles.selectedCheck, { backgroundColor: palette.tint }]}>
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </Clickable>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Due Date */}
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Due Date
              </ThemedText>
              <View style={styles.dueDateOptions}>
                {[
                  { days: 1, label: 'Tomorrow' },
                  { days: 3, label: '3 Days' },
                  { days: 7, label: '1 Week' },
                  { days: 14, label: '2 Weeks' },
                ].map((option) => {
                  const isSelected = daysFromNow === option.days;
                  return (
                    <Clickable
                      key={option.days}
                      onPress={() => handleDateSelect(option.days)}
                      style={[
                        styles.dueDateOption,
                        {
                          backgroundColor: isSelected ? palette.tint : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.dueDateOptionText,
                          { color: isSelected ? '#FFFFFF' : palette.text },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
              <View style={styles.selectedDateRow}>
                <Ionicons name="calendar-outline" size={18} color={palette.tint} />
                <ThemedText style={[styles.selectedDateText, { color: palette.tint }]}>
                  {formatDate(dueDate)}
                </ThemedText>
              </View>
            </View>
          </Animated.View>

          {/* Priority */}
          <Animated.View entering={FadeInDown.delay(250).springify()}>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Priority
              </ThemedText>
              <View style={styles.priorityOptions}>
                {[
                  { value: 1, label: 'High', color: palette.error },
                  { value: 2, label: 'Normal', color: palette.tint },
                  { value: 3, label: 'Low', color: palette.muted },
                ].map((option) => {
                  const isSelected = priority === option.value;
                  return (
                    <Clickable
                      key={option.value}
                      onPress={() => handlePrioritySelect(option.value as 1 | 2 | 3)}
                      style={[
                        styles.priorityOption,
                        {
                          backgroundColor: isSelected ? `${option.color}15` : palette.surface,
                          borderColor: isSelected ? option.color : palette.border,
                        },
                      ]}
                    >
                      {option.value === 1 && (
                        <Ionicons name="alert-circle" size={16} color={option.color} />
                      )}
                      <ThemedText
                        style={[
                          styles.priorityOptionText,
                          { color: isSelected ? option.color : palette.text },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Clickable>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Repetitions */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Sets / Repetitions
              </ThemedText>
              <View style={styles.repsOptions}>
                {['1', '2', '3', '5'].map((reps) => {
                  const isSelected = repetitions === reps;
                  return (
                    <Clickable
                      key={reps}
                      onPress={() => setRepetitions(reps)}
                      style={[
                        styles.repsOption,
                        {
                          backgroundColor: isSelected ? palette.tint : palette.surface,
                          borderColor: isSelected ? palette.tint : palette.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.repsOptionText,
                          { color: isSelected ? '#FFFFFF' : palette.text },
                        ]}
                      >
                        {reps}
                      </ThemedText>
                    </Clickable>
                  );
                })}
                <TextInput
                  style={[
                    styles.customRepsInput,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="Custom"
                  placeholderTextColor={palette.muted}
                  value={!['1', '2', '3', '5'].includes(repetitions) ? repetitions : ''}
                  onChangeText={setRepetitions}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          </Animated.View>

          {/* Notes */}
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Notes for Athlete (optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.notesInput,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                placeholder="Add specific instructions or encouragement..."
                placeholderTextColor={palette.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
          </Animated.View>

          {/* Submit Button */}
          <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.submitSection}>
            <Button
              onPress={handleSubmit}
              disabled={submitting || !selectedAthlete}
              style={styles.submitButton}
            >
              {submitting
                ? 'Assigning...'
                : selectedAthlete
                  ? `Assign to ${selectedAthlete.name.split(' ')[0]}`
                  : 'Select an Athlete'}
            </Button>
          </Animated.View>
        </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: scaleFont(18),
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDrillContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  drillPreview: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  categoryText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  drillTitle: {
    fontSize: scaleFont(17),
    marginBottom: Spacing.xs,
  },
  drillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: scaleFont(13),
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: scaleFont(14),
    marginBottom: Spacing.sm,
  },
  athleteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  athleteCard: {
    width: '47%',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    position: 'relative',
  },
  athleteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  athleteName: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  athleteAge: {
    fontSize: scaleFont(12),
    marginTop: 2,
  },
  selectedCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dueDateOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dueDateOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  dueDateOptionText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  selectedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.xs,
  },
  selectedDateText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  priorityOptionText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
  },
  repsOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  repsOption: {
    width: 48,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  repsOptionText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  customRepsInput: {
    width: 72,
    height: 44,
    borderWidth: 1,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
  notesInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: scaleFont(15),
  },
  submitSection: {
    marginTop: Spacing.md,
  },
  submitButton: {
    // Full width by default
  },
});
