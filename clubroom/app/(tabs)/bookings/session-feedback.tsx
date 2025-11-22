import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { FootballObjective } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

const FOOTBALL_SKILLS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

export default function SessionFeedbackScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const params = useLocalSearchParams();

  // Get athlete's objectives from params (what they wanted to work on)
  const athleteObjectivesParam = params.athleteObjectives as string;
  const athleteObjectives: FootballObjective[] = athleteObjectivesParam
    ? JSON.parse(athleteObjectivesParam)
    : [];
  const athleteName = (params.athleteName as string) || 'the athlete';

  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<FootballObjective[]>(
    // Pre-select athlete's objectives
    athleteObjectives.length > 0 ? athleteObjectives : []
  );

  const toggleSkill = (skill: FootballObjective) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const submitFeedback = () => {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please rate the session');
      return;
    }
    if (!notes.trim()) {
      Alert.alert('Notes required', 'Please add session notes');
      return;
    }

    Alert.alert('Feedback submitted', 'Session feedback saved successfully');
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={palette.foreground} />
        </Pressable>
        <ThemedText type="subtitle">Session Feedback</ThemedText>
        <Pressable onPress={submitFeedback}>
          <ThemedText style={[styles.submitButton, { color: palette.tint }]}>Submit</ThemedText>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Athlete's Objectives */}
          {athleteObjectives.length > 0 && (
            <SurfaceCard style={styles.section}>
              <View style={styles.objectivesHeader}>
                <Ionicons name="flag-outline" size={20} color={palette.tint} />
                <ThemedText type="defaultSemiBold">
                  What {athleteName} wanted to work on
                </ThemedText>
              </View>
              <View style={styles.objectivesRow}>
                {athleteObjectives.map((objective, index) => (
                  <View
                    key={index}
                    style={[
                      styles.objectiveChip,
                      { backgroundColor: palette.tint + '15', borderColor: palette.tint },
                    ]}
                  >
                    <Ionicons name="football" size={14} color={palette.tint} />
                    <ThemedText style={[styles.objectiveChipText, { color: palette.tint }]}>
                      {objective}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          )}

          {/* Rating */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="defaultSemiBold">Session Rating</ThemedText>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)} hitSlop={8}>
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color="#F59E0B"
                  />
                </Pressable>
              ))}
            </View>
          </SurfaceCard>

          {/* Skills Worked */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="defaultSemiBold">Skills Worked</ThemedText>
            <View style={styles.skillGrid}>
              {FOOTBALL_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Pressable
                    key={skill}
                    onPress={() => toggleSkill(skill)}
                    style={[
                      styles.skillChip,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.card,
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}>
                    <ThemedText
                      style={styles.skillText}
                      lightColor={isSelected ? '#FFFFFF' : undefined}
                      darkColor={isSelected ? '#000000' : undefined}>
                      {skill}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </SurfaceCard>

          {/* Session Notes */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="defaultSemiBold">Session Notes</ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="How did the athlete perform? What improved?"
              placeholderTextColor={palette.muted}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={[
                styles.textArea,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.card,
                  color: palette.foreground,
                },
              ]}
            />
          </SurfaceCard>

          {/* Quick Highlights */}
          <SurfaceCard style={styles.section}>
            <ThemedText type="defaultSemiBold">Highlights</ThemedText>
            <ThemedText style={[styles.helperText, { color: palette.muted }]}>
              What went well today?
            </ThemedText>
            <View style={styles.highlightButtons}>
              {[
                'Great focus',
                'Quick learner',
                'Strong technique',
                'Excellent effort',
                'Leadership',
              ].map((highlight) => (
                <Pressable
                  key={highlight}
                  style={[
                    styles.highlightChip,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                    },
                  ]}>
                  <Ionicons name="add-circle-outline" size={16} color={palette.muted} />
                  <ThemedText style={styles.highlightText}>{highlight}</ThemedText>
                </Pressable>
              ))}
            </View>
          </SurfaceCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  submitButton: {
    fontWeight: '700',
    fontSize: 16,
  },
  wrapper: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  objectivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  objectivesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  objectiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  objectiveChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  skillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  skillText: {
    fontWeight: '600',
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    minHeight: 120,
    paddingTop: Spacing.sm,
  },
  helperText: {
    fontSize: 13,
  },
  highlightButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  highlightChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  highlightText: {
    fontSize: 13,
  },
});
