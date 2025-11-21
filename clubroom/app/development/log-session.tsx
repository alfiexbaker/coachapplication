import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_SESSIONS, MOCK_USERS } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { Session, User } from '@/constants/app-types';

const logger = createLogger('LogSessionScreen');

const AVAILABLE_SKILLS = [
  'Passing',
  'Shooting',
  'Dribbling',
  'Defending',
  'Positioning',
  'First Touch',
  'Crossing',
  'Heading',
  'Tackling',
  'Ball Control',
  'Finishing',
  'Weak Foot',
  'Speed',
  'Stamina',
];

export default function LogSessionScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { athleteId } = useLocalSearchParams<{ athleteId?: string }>();

  const [selectedAthleteId, setSelectedAthleteId] = useState<string>('');

  // Pre-select athlete if athleteId is provided
  useEffect(() => {
    if (athleteId) {
      setSelectedAthleteId(athleteId);
    }
  }, [athleteId]);
  const [sessionDate, setSessionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(3);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [nextFocusAreas, setNextFocusAreas] = useState('');
  const [showAthleteSelector, setShowAthleteSelector] = useState(false);

  // Get all athletes (users with role USER)
  const athletes = MOCK_USERS.filter(u => u.role === 'USER');

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  const handleSave = () => {
    if (!selectedAthleteId) {
      if (Platform.OS === 'web') {
        window.alert('Please select an athlete');
      } else {
        Alert.alert('Error', 'Please select an athlete');
      }
      return;
    }

    if (!notes.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Please add session notes');
      } else {
        Alert.alert('Error', 'Please add session notes');
      }
      return;
    }

    // Create new session
    const newSession: Session = {
      id: `session_${Date.now()}`,
      bookingId: `booking_${Date.now()}`,
      coachId: currentUser?.id || '',
      athleteId: selectedAthleteId,
      completedAt: sessionDate.toISOString(),
      attendance: 'ATTENDED',
      notes: notes.trim(),
      skillsWorkedOn: selectedSkills,
      performanceRating: rating,
      nextFocusAreas: nextFocusAreas.trim() ? nextFocusAreas.split(',').map(s => s.trim()) : [],
      videoUrls: [],
      coachName: currentUser?.fullName,
      athleteName: selectedAthlete?.name,
    };

    // Add to mock sessions (in a real app, this would call an API)
    MOCK_SESSIONS.push(newSession);

    logger.info('New session logged', {
      sessionId: newSession.id,
      athleteId: selectedAthleteId,
      rating,
      skillCount: selectedSkills.length,
    });

    if (Platform.OS === 'web') {
      window.alert('Session logged successfully!');
    } else {
      Alert.alert('Success', 'Session logged successfully!');
    }

    router.back();
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={palette.foreground} />
        </Clickable>
        <ThemedText type="title">Log Session</ThemedText>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Athlete Selection */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Athlete *</ThemedText>
          <Clickable
            onPress={() => setShowAthleteSelector(!showAthleteSelector)}
            style={[styles.athleteButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            {selectedAthlete ? (
              <View style={styles.athleteInfo}>
                <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                  <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                    {selectedAthlete.avatar || selectedAthlete.name.charAt(0)}
                  </ThemedText>
                </View>
                <ThemedText>{selectedAthlete.name}</ThemedText>
              </View>
            ) : (
              <ThemedText style={{ color: palette.muted }}>Select an athlete</ThemedText>
            )}
            <Ionicons name="chevron-down" size={20} color={palette.icon} />
          </Clickable>

          {/* Athlete Selector Dropdown */}
          {showAthleteSelector && (
            <View style={[styles.athleteList, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <ScrollView style={styles.athleteListScroll} nestedScrollEnabled>
                {athletes.map(athlete => (
                  <Clickable
                    key={athlete.id}
                    onPress={() => {
                      setSelectedAthleteId(athlete.id);
                      setShowAthleteSelector(false);
                    }}
                    style={[
                      styles.athleteItem,
                      selectedAthleteId === athlete.id && { backgroundColor: palette.tint + '10' }
                    ]}
                  >
                    <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {athlete.avatar || athlete.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <ThemedText>{athlete.name}</ThemedText>
                    {selectedAthleteId === athlete.id && (
                      <Ionicons name="checkmark" size={20} color={palette.tint} />
                    )}
                  </Clickable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Session Date & Time</ThemedText>
          <Clickable
            onPress={() => {
              if (Platform.OS === 'android') {
                setShowDatePicker(true);
              } else {
                setShowDatePicker(true);
              }
            }}
            style={[styles.dateButton, { backgroundColor: palette.card, borderColor: palette.border }]}
          >
            <Ionicons name="calendar-outline" size={20} color={palette.icon} />
            <ThemedText>
              {sessionDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              at{' '}
              {sessionDate.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </ThemedText>
          </Clickable>

          {/* Date/Time Pickers */}
          {Platform.OS === 'android' ? (
            <>
              {showDatePicker && (
                <DateTimePicker
                  value={sessionDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date && event.type === 'set') {
                      const updatedDate = new Date(date);
                      updatedDate.setHours(sessionDate.getHours());
                      updatedDate.setMinutes(sessionDate.getMinutes());
                      setSessionDate(updatedDate);
                      setShowTimePicker(true);
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={sessionDate}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    setShowTimePicker(false);
                    if (date && event.type === 'set') {
                      setSessionDate(date);
                    }
                  }}
                />
              )}
            </>
          ) : (
            <>
              {showDatePicker && (
                <DateTimePicker
                  value={sessionDate}
                  mode="datetime"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setSessionDate(date);
                  }}
                />
              )}
            </>
          )}
        </View>

        {/* Performance Rating */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Performance Rating</ThemedText>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map(star => (
              <Clickable
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= rating ? palette.tint : palette.muted}
                />
              </Clickable>
            ))}
          </View>
        </View>

        {/* Skills Worked On */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Skills Worked On</ThemedText>
          <View style={styles.skillsGrid}>
            {AVAILABLE_SKILLS.map(skill => {
              const isSelected = selectedSkills.includes(skill);
              return (
                <Clickable
                  key={skill}
                  onPress={() => toggleSkill(skill)}
                  style={[
                    styles.skillChip,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.card,
                      borderColor: isSelected ? palette.tint : palette.border,
                    }
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.skillText,
                      isSelected && {
                        color: scheme === 'light' ? '#FFFFFF' : '#000000',
                        fontWeight: '600',
                      }
                    ]}
                  >
                    {skill}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        {/* Session Notes */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Session Notes *</ThemedText>
          <TextInput
            style={[
              styles.notesInput,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              }
            ]}
            placeholder="What did you work on? How did the athlete perform?"
            placeholderTextColor={palette.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Next Focus Areas */}
        <View style={styles.section}>
          <ThemedText style={styles.label}>Next Focus Areas (Optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              }
            ]}
            placeholder="e.g., Finishing, Weak foot training"
            placeholderTextColor={palette.muted}
            value={nextFocusAreas}
            onChangeText={setNextFocusAreas}
          />
          <ThemedText style={[styles.hint, { color: palette.muted }]}>
            Separate multiple areas with commas
          </ThemedText>
        </View>

        {/* Save Button */}
        <Clickable
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={scheme === 'light' ? '#FFFFFF' : '#000000'}
          />
          <ThemedText
            style={styles.saveButtonText}
            lightColor="#FFFFFF"
            darkColor="#000000"
          >
            Save Session
          </ThemedText>
        </Clickable>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  athleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  athleteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  athleteList: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    maxHeight: 240,
    overflow: 'hidden',
  },
  athleteListScroll: {
    maxHeight: 240,
  },
  athleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 16,
  },
  starButton: {
    padding: 4,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  skillText: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    marginTop: -4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 18,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 32,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
