import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { MOCK_SESSIONS, getUserById, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

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

  const session = MOCK_SESSIONS.find(s => s.id === sessionId);
  const athlete = session ? getUserById(session.athleteId) : null;

  const [notes, setNotes] = useState(session?.notes || '');
  const [rating, setRating] = useState(session?.performanceRating || 3);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(session?.skillsWorkedOn || []);
  const [videoUrls, setVideoUrls] = useState<string[]>(session?.videoUrls || []);

  if (!session || !athlete) {
    return null;
  }

  const handleSave = () => {
    // Update session in mock data (in a real app, this would call an API)
    const sessionIndex = MOCK_SESSIONS.findIndex(s => s.id === sessionId);
    if (sessionIndex !== -1) {
      MOCK_SESSIONS[sessionIndex] = {
        ...MOCK_SESSIONS[sessionIndex],
        notes,
        performanceRating: rating,
        skillsWorkedOn: selectedSkills,
        videoUrls,
      };
    }

    logger.info('Session updated', {
      sessionId,
      hasNotes: notes.length > 0,
      rating,
      skillCount: selectedSkills.length,
      videoCount: videoUrls.length,
    });

    if (Platform.OS === 'web') {
      window.alert('Session updated successfully!');
    } else {
      Alert.alert('Success', 'Session updated successfully!');
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
            <View style={styles.videoList}>
              {videoUrls.map((url, index) => (
                <SurfaceCard key={index} style={styles.videoCard}>
                  <View style={styles.videoInfo}>
                    <Ionicons name="videocam" size={20} color={palette.tint} />
                    <ThemedText style={styles.videoName} numberOfLines={1}>
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
            <SurfaceCard style={styles.emptyVideos}>
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
  videoList: {
    gap: Spacing.sm,
  },
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  videoName: {
    fontSize: 14,
    flex: 1,
  },
  emptyVideos: {
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
