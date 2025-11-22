import { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageContainer } from '@/components/primitives/page-container';
import { Button } from '@/components/primitives/button';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getDirectoryForCoach, getUserById } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { Session } from '@/constants/app-types';

const logger = createLogger('AddSessionScreen');

// Common football skills for dropdown
const COMMON_SKILLS = [
  'Positioning',
  'Shot Stopping',
  'Distribution',
  'Handling',
  'Diving Technique',
  'Finishing',
  'Passing',
  'Dribbling',
  'First Touch',
  'Ball Control',
  'Movement',
  'Composure',
  'Tactical Awareness',
  'Communication',
  'Footwork',
  'Weak Foot',
];

export default function AddSessionScreen() {
  const { currentUser } = useAuth();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Get athletes from the coach's directory
  const athleteDirectory = currentUser ? getDirectoryForCoach(currentUser.id) : [];
  const athletes = athleteDirectory
    .map((entry) => getUserById(entry.athleteId))
    .filter((a) => a !== undefined);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [performanceRating, setPerformanceRating] = useState<number>(3);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [nextFocusAreas, setNextFocusAreas] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSave = async () => {
    if (!selectedAthleteId) {
      Alert.alert('Error', 'Please select an athlete');
      return;
    }

    if (selectedSkills.length === 0) {
      Alert.alert('Error', 'Please select at least one skill worked on');
      return;
    }

    if (!notes.trim()) {
      Alert.alert('Error', 'Please add session notes');
      return;
    }

    setIsSaving(true);

    try {
      const athlete = getUserById(selectedAthleteId);
      const newSession: Session = {
        id: `sess_${Date.now()}`,
        bookingId: `book_manual_${Date.now()}`,
        coachId: currentUser!.id,
        athleteId: selectedAthleteId,
        completedAt: new Date().toISOString(),
        attendance: 'ATTENDED',
        notes: notes.trim(),
        skillsWorkedOn: selectedSkills,
        performanceRating,
        nextFocusAreas: nextFocusAreas.split(',').map((s) => s.trim()).filter((s) => s),
        coachName: currentUser!.name,
        athleteName: athlete!.name,
      };

      // Store session in AsyncStorage
      const existingSessionsJson = await AsyncStorage.getItem('manual_sessions');
      const existingSessions = existingSessionsJson ? JSON.parse(existingSessionsJson) : [];
      existingSessions.push(newSession);
      await AsyncStorage.setItem('manual_sessions', JSON.stringify(existingSessions));

      logger.info('Session added successfully', { sessionId: newSession.id });

      Alert.alert(
        'Success',
        'Session added successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      logger.error('Failed to save session', { error });
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <PageContainer
      gap={Spacing.md}
      header={
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={palette.foreground} />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.headerTitle}>
            Add Session
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Athlete Selection */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Athlete *
          </ThemedText>
          <View style={styles.athleteList}>
            {athletes.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <ThemedText style={{ color: palette.muted }}>
                  No athletes in your directory yet. Work with athletes first to add sessions.
                </ThemedText>
              </SurfaceCard>
            ) : (
              athletes.map((athlete) => (
                <TouchableOpacity
                  key={athlete.id}
                  onPress={() => setSelectedAthleteId(athlete.id)}
                  style={[
                    styles.athleteCard,
                    {
                      backgroundColor: palette.surface,
                      borderColor:
                        selectedAthleteId === athlete.id ? palette.tint : palette.border,
                      borderWidth: selectedAthleteId === athlete.id ? 2 : 1,
                    },
                  ]}
                >
                  <View style={[styles.athleteAvatar, { backgroundColor: palette.tint + '20' }]}>
                    <ThemedText style={[styles.athleteAvatarText, { color: palette.tint }]}>
                      {athlete.avatar || athlete.name.charAt(0)}
                    </ThemedText>
                  </View>
                  <ThemedText type="defaultSemiBold">{athlete.name}</ThemedText>
                  {selectedAthleteId === athlete.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={palette.tint}
                      style={styles.checkmark}
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Performance Rating */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Performance Rating *
          </ThemedText>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => setPerformanceRating(rating)}
                style={[
                  styles.ratingButton,
                  {
                    backgroundColor:
                      performanceRating >= rating ? palette.tint : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Ionicons
                  name="star"
                  size={24}
                  color={performanceRating >= rating ? '#FFFFFF' : palette.muted}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Skills Worked On */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Skills Worked On *
          </ThemedText>
          <View style={styles.skillsContainer}>
            {COMMON_SKILLS.map((skill) => (
              <TouchableOpacity
                key={skill}
                onPress={() => toggleSkill(skill)}
                style={[
                  styles.skillChip,
                  {
                    backgroundColor: selectedSkills.includes(skill)
                      ? palette.tint
                      : palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.skillChipText,
                    {
                      color: selectedSkills.includes(skill) ? '#FFFFFF' : palette.foreground,
                    },
                  ]}
                >
                  {skill}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Session Notes */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Session Notes *
          </ThemedText>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe what was covered in this session, athlete's progress, and any observations..."
            placeholderTextColor={palette.muted}
            multiline
            numberOfLines={6}
            style={[
              styles.textArea,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.foreground,
              },
            ]}
          />
        </View>

        {/* Next Focus Areas */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.label}>
            Next Focus Areas (Optional)
          </ThemedText>
          <TextInput
            value={nextFocusAreas}
            onChangeText={setNextFocusAreas}
            placeholder="Enter focus areas separated by commas (e.g., Distribution, One-on-one situations)"
            placeholderTextColor={palette.muted}
            multiline
            numberOfLines={3}
            style={[
              styles.textArea,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.foreground,
              },
            ]}
          />
        </View>

        {/* Save Button */}
        <Button
          onPress={handleSave}
          disabled={isSaving}
          style={styles.saveButton}
        >
          {isSaving ? 'Saving...' : 'Add Session'}
        </Button>
      </ScrollView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: 15,
    marginBottom: Spacing.sm,
  },
  athleteList: {
    gap: Spacing.sm,
  },
  emptyCard: {
    padding: Spacing.md,
  },
  athleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  athleteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  athleteAvatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 'auto',
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ratingButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
});
