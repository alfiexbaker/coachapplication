import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_SESSIONS, getUserById, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { Session } from '@/constants/types';

const logger = createLogger('SessionDetailScreen');

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

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [session, setSession] = useState<Session | null>(null);
  const [athlete, setAthlete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(3);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Load session from AsyncStorage
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Try AsyncStorage first
        const storedSessions = await AsyncStorage.getItem('coach_sessions');
        let foundSession: Session | undefined;

        if (storedSessions) {
          const sessions = JSON.parse(storedSessions);
          foundSession = sessions.find((s: any) => s.id === sessionId);
        }

        // Fallback to mock data if not in AsyncStorage
        if (!foundSession) {
          foundSession = MOCK_SESSIONS.find(s => s.id === sessionId);
        }

        if (foundSession) {
          setSession(foundSession);
          setNotes(foundSession.notes || '');
          setRating(foundSession.performanceRating || 3);
          setSelectedSkills(foundSession.skillsWorkedOn || []);
          setVideoUrls(foundSession.videoUrls || []);
          setImageUrls((foundSession as any).imageUrls || []);

          const athleteData = getUserById(foundSession.athleteId);
          setAthlete(athleteData);
        }
      } catch (error) {
        logger.error('Failed to load session', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading session...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !athlete) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Session not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    try {
      // Load existing sessions
      const storedSessions = await AsyncStorage.getItem('coach_sessions');
      const sessions = storedSessions ? JSON.parse(storedSessions) : [];

      // Find and update the session
      const sessionIndex = sessions.findIndex((s: any) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex] = {
          ...sessions[sessionIndex],
          notes,
          performanceRating: rating,
          skillsWorkedOn: selectedSkills,
          videoUrls,
          imageUrls,
          updatedAt: new Date().toISOString(),
        };

        // Save back to AsyncStorage
        await AsyncStorage.setItem('coach_sessions', JSON.stringify(sessions));

        logger.info('Session updated', {
          sessionId,
          hasNotes: notes.length > 0,
          rating,
          skillCount: selectedSkills.length,
          videoCount: videoUrls.length,
          imageCount: imageUrls.length,
        });

        Alert.alert('Success', 'Session updated successfully!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        logger.error('Session not found in AsyncStorage', { sessionId });
        Alert.alert('Error', 'Failed to save session. Please try again.');
      }
    } catch (error) {
      logger.error('Failed to save session', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleAddImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setImageUrls(prev => [...prev, imageUri]);
        logger.info('Image added', { imageUri });
      }
    } catch (error) {
      logger.error('Failed to pick image', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddVideo = () => {
    // Mock video URL for demonstration
    const mockVideoUrl = `https://example.com/video_${Date.now()}.mp4`;
    setVideoUrls(prev => [...prev, mockVideoUrl]);

    logger.info('Video added', { videoUrl: mockVideoUrl });
  };

  const handleRemoveVideo = (index: number) => {
    setVideoUrls(prev => prev.filter((_, i) => i !== index));
  };

  logger.debug('Session detail rendered', {
    sessionId,
    athleteId: athlete.id,
    hasNotes: notes.length > 0,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
          <ThemedText type="title" style={styles.title}>
            Session Details
          </ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Session Info */}
        <SurfaceCard style={styles.infoCard}>
          <View style={styles.athleteRow}>
            <View style={[styles.avatar, { backgroundColor: palette.tint + '20' }]}>
              <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                {athlete.avatar || athlete.name.charAt(0)}
              </ThemedText>
            </View>
            <View style={styles.athleteInfo}>
              <ThemedText type="defaultSemiBold" style={styles.athleteName}>
                {athlete.name}
              </ThemedText>
              <ThemedText style={[styles.sessionDate, { color: palette.muted }]}>
                {formatDate(session.completedAt)}
              </ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Performance Rating */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Performance Rating
          </ThemedText>
          <SurfaceCard style={styles.ratingCard}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Clickable
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= rating ? '#FFD700' : palette.muted}
                  />
                </Clickable>
              ))}
            </View>
            <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
              {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Needs Work' : 'Poor'}
            </ThemedText>
          </SurfaceCard>
        </View>

        {/* Skills Worked On */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Skills Worked On
          </ThemedText>
          <SurfaceCard style={styles.skillsCard}>
            <View style={styles.skillsGrid}>
              {AVAILABLE_SKILLS.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                return (
                  <Clickable
                    key={skill}
                    onPress={() => toggleSkill(skill)}
                    style={({ pressed }) => [
                      styles.skillButton,
                      {
                        backgroundColor: isSelected ? palette.tint : palette.surface,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.skillButtonText,
                        { color: isSelected ? (scheme === 'dark' ? '#000000' : '#FFFFFF') : palette.foreground },
                      ]}
                    >
                      {skill}
                    </ThemedText>
                  </Clickable>
                );
              })}
            </View>
          </SurfaceCard>
        </View>

        {/* Session Notes */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Session Notes
          </ThemedText>
          <SurfaceCard style={styles.notesCard}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add your observations about this session..."
              placeholderTextColor={palette.muted}
              multiline
              style={[
                styles.notesInput,
                {
                  color: palette.foreground,
                  backgroundColor: palette.background,
                },
              ]}
              textAlignVertical="top"
            />
          </SurfaceCard>
        </View>

        {/* Images */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Session Photos
            </ThemedText>
            <Clickable onPress={handleAddImage} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color={palette.tint} />
            </Clickable>
          </View>

          {imageUrls.length > 0 ? (
            <View style={styles.mediaList}>
              {imageUrls.map((url, index) => (
                <SurfaceCard key={index} style={styles.mediaCard}>
                  <View style={styles.mediaInfo}>
                    <Ionicons name="image" size={20} color={palette.tint} />
                    <ThemedText style={styles.mediaName} numberOfLines={1}>
                      Photo {index + 1}
                    </ThemedText>
                  </View>
                  <Clickable onPress={() => handleRemoveImage(index)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                  </Clickable>
                </SurfaceCard>
              ))}
            </View>
          ) : (
            <SurfaceCard style={styles.emptyMedia}>
              <Ionicons name="image-outline" size={32} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No photos uploaded yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                Tap the + to add session photos
              </ThemedText>
            </SurfaceCard>
          )}
        </View>

        {/* Videos */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Session Videos
            </ThemedText>
            <Clickable onPress={handleAddVideo} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color={palette.tint} />
            </Clickable>
          </View>

          {videoUrls.length > 0 ? (
            <View style={styles.mediaList}>
              {videoUrls.map((url, index) => (
                <SurfaceCard key={index} style={styles.mediaCard}>
                  <View style={styles.mediaInfo}>
                    <Ionicons name="videocam" size={20} color={palette.tint} />
                    <ThemedText style={styles.mediaName} numberOfLines={1}>
                      Video {index + 1}
                    </ThemedText>
                  </View>
                  <Clickable onPress={() => handleRemoveVideo(index)}>
                    <Ionicons name="trash-outline" size={20} color={Colors.light.error} />
                  </Clickable>
                </SurfaceCard>
              ))}
            </View>
          ) : (
            <SurfaceCard style={styles.emptyMedia}>
              <Ionicons name="videocam-outline" size={32} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No videos uploaded yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                Tap the + to add session videos
              </ThemedText>
            </SurfaceCard>
          )}
        </View>

        {/* Save Button */}
        <Clickable
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: palette.tint,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.saveButtonText,
              { color: scheme === 'dark' ? '#000000' : '#FFFFFF' },
            ]}
          >
            Save Changes
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
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  infoCard: {
    padding: Spacing.lg,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  athleteInfo: {
    gap: Spacing.xs / 2,
  },
  athleteName: {
    fontSize: 16,
  },
  sessionDate: {
    fontSize: 13,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  addButton: {
    padding: Spacing.xs,
  },
  ratingCard: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.md,
  },
  stars: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  starButton: {
    padding: Spacing.xs,
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  skillsCard: {
    padding: Spacing.lg,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  skillButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  skillButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  notesCard: {
    padding: Spacing.lg,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    padding: 0,
  },
  mediaList: {
    gap: Spacing.sm,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  mediaName: {
    fontSize: 14,
    flex: 1,
  },
  emptyMedia: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
