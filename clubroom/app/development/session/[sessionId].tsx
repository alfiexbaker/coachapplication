import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import { safeJsonParse } from '@/utils/safe-json';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { VideoThumbnail } from '@/components/video/video-thumbnail';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_SESSIONS, getUserById, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { videoService, type LocalVideo } from '@/services/video-service';
import { BadgeAwardModal } from '@/components/badges/badge-award-modal';
import type { Session } from '@/constants/app-types';
import type { BadgeAward } from '@/constants/types';

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

type SkillRating = { skill: string; rating: number; previousRating?: number };

export default function SessionDetailScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [athlete, setAthlete] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [publicNotes, setPublicNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [rating, setRating] = useState(3);
  const [effortRating, setEffortRating] = useState(3);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  const [improvements, setImprovements] = useState('');
  const [homework, setHomework] = useState('');
  const [videoUrls, setVideoUrls] = useState<string[]>([]); // Legacy - still saved to session
  const [sessionVideos, setSessionVideos] = useState<LocalVideo[]>([]); // Real uploaded videos
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Badge state
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [sessionBadges, setSessionBadges] = useState<BadgeAward[]>([]);

  // Visibility
  const [visibility, setVisibility] = useState<'parent' | 'athlete' | 'coach_only'>('parent');

  // Load session from AsyncStorage
  useEffect(() => {
    const loadSession = async () => {
      try {
        // Try AsyncStorage first
        const storedSessions = await AsyncStorage.getItem('coach_sessions');
        let foundSession: Session | undefined;

        if (storedSessions) {
          const sessions = safeJsonParse<any[]>(storedSessions, []);
          foundSession = sessions.find((s: any) => s.id === sessionId);
        }

        // Fallback to mock data if not in AsyncStorage
        if (!foundSession) {
          foundSession = MOCK_SESSIONS.find(s => s.id === sessionId);
        }

        if (foundSession) {
          setSession(foundSession);
          setPublicNotes(foundSession.notes || '');
          setRating(foundSession.performanceRating || 3);
          setSelectedSkills(foundSession.skillsWorkedOn || []);
          setVideoUrls(foundSession.videoUrls || []);
          setImageUrls((foundSession as any).imageUrls || []);

          const athleteData = getUserById(foundSession.athleteId);
          setAthlete(athleteData);

          // Load badges for this session
          const badges = await badgeService.listAwardsForSession(sessionId!);
          setSessionBadges(badges);

          // Load videos for this session
          const videos = await videoService.getVideosBySession(sessionId!);
          setSessionVideos(videos);

          // Load existing skill levels for prefill
          const athleteSkills = await progressService.getAthleteSkillLevels(foundSession.athleteId);
          if (athleteSkills) {
            const existingRatings = (foundSession.skillsWorkedOn || []).map(skill => {
              const existing = athleteSkills.skills[skill];
              return {
                skill,
                rating: existing?.level ?? 5,
                previousRating: existing?.previousLevel,
              };
            });
            setSkillRatings(existingRatings);
          }
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

  if (!session || !athlete || !currentUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ThemedText>Session not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      // Load existing sessions
      const storedSessions = await AsyncStorage.getItem('coach_sessions');
      const sessions = safeJsonParse<any[]>(storedSessions, []);

      // Find and update the session
      const sessionIndex = sessions.findIndex((s: any) => s.id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex] = {
          ...sessions[sessionIndex],
          notes: publicNotes,
          performanceRating: rating,
          skillsWorkedOn: selectedSkills,
          videoUrls,
          imageUrls,
          updatedAt: new Date().toISOString(),
        };

        // Save back to AsyncStorage
        await AsyncStorage.setItem('coach_sessions', JSON.stringify(sessions));
      }

      // Save feedback to progress service
      await progressService.addSessionFeedback({
        sessionId: sessionId!,
        bookingId: session.bookingId,
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        athleteId: athlete.id,
        athleteName: athlete.name,
        publicSummary: publicNotes,
        privateNotes: privateNotes,
        skillsWorkedOn: selectedSkills,
        skillRatings: skillRatings,
        improvements: improvements,
        homework: homework,
        effortRating: effortRating,
        overallPerformance: rating,
        videoClipUrls: videoUrls,
        visibility: visibility,
        badgeAwarded: sessionBadges.length > 0 ? sessionBadges[0].badgeLabel : undefined,
      });

      logger.info('Session feedback saved', {
        sessionId,
        hasNotes: publicNotes.length > 0,
        rating,
        skillCount: selectedSkills.length,
        videoCount: videoUrls.length,
        imageCount: imageUrls.length,
        badgeCount: sessionBadges.length,
      });

      Alert.alert('Success', 'Session notes saved. Parents can now see the feedback.', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      logger.error('Failed to save session', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
      setSkillRatings(prev => prev.filter(sr => sr.skill !== skill));
    } else {
      setSelectedSkills(prev => [...prev, skill]);
      setSkillRatings(prev => [...prev, { skill, rating: 5 }]);
    }
  };

  const updateSkillRating = (skill: string, newRating: number) => {
    setSkillRatings(prev =>
      prev.map(sr => sr.skill === skill ? { ...sr, rating: newRating } : sr)
    );
  };

  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos');
        return;
      }

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

  const handleAddVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // Prompt for video title
        Alert.prompt(
          'Video Title',
          'Enter a title for this video',
          async (title) => {
            if (!title || !currentUser) return;

            try {
              // Save the video locally
              const savedVideo = await videoService.saveLocalVideo(asset.uri, {
                title: title || `Session Video ${sessionVideos.length + 1}`,
                description: `Video from session on ${formatDate(session!.completedAt)}`,
                athleteId: athlete.id,
                athleteName: athlete.name,
                coachId: currentUser.id,
                coachName: currentUser.name || 'Coach',
                sessionId: sessionId,
                bookingId: session!.bookingId,
                duration: asset.duration ? asset.duration / 1000 : undefined,
                fileSize: asset.fileSize,
                tags: selectedSkills.slice(0, 3).map(s => s.toLowerCase()),
              });

              setSessionVideos(prev => [savedVideo, ...prev]);
              // Also keep track of URL for legacy save
              setVideoUrls(prev => [...prev, savedVideo.localUri]);

              logger.info('Video saved', { videoId: savedVideo.id, uri: asset.uri });
              Alert.alert('Success', 'Video saved successfully!');
            } catch (error) {
              logger.error('Failed to save video', error);
              Alert.alert('Error', 'Failed to save video. Please try again.');
            }
          },
          'plain-text',
          `Session Video ${sessionVideos.length + 1}`
        );
      }
    } catch (error) {
      logger.error('Failed to pick video', error);
      Alert.alert('Error', 'Failed to pick video');
    }
  };

  const handleRemoveVideo = async (index: number, videoId?: string) => {
    if (videoId) {
      // Delete from video service
      await videoService.deleteLocalVideo(videoId);
      setSessionVideos(prev => prev.filter(v => v.id !== videoId));
    }
    setVideoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleBadgeAwarded = (award: BadgeAward) => {
    setSessionBadges(prev => [award, ...prev]);
    setShowBadgeModal(false);
  };

  logger.debug('Session detail rendered', {
    sessionId,
    athleteId: athlete.id,
    hasNotes: publicNotes.length > 0,
  });

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Clickable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
            <ThemedText type="title" style={styles.title}>
              Session Feedback
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
              <Clickable
                onPress={() => setShowBadgeModal(true)}
                style={[styles.awardBadgeBtn, { backgroundColor: `${palette.tint}15` }]}
              >
                <Ionicons name="ribbon" size={18} color={palette.tint} />
                <ThemedText style={[styles.awardBadgeBtnText, { color: palette.tint }]}>
                  Award Badge
                </ThemedText>
              </Clickable>
            </View>

            {/* Session Badges */}
            {sessionBadges.length > 0 && (
              <View style={styles.badgesRow}>
                {sessionBadges.map((badge) => (
                  <View key={badge.id} style={[styles.badgeChip, { backgroundColor: `${palette.success}15` }]}>
                    <Ionicons name="ribbon" size={14} color={palette.success} />
                    <ThemedText style={[styles.badgeChipText, { color: palette.success }]}>
                      {badge.badgeLabel}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}
          </SurfaceCard>

          {/* Performance Rating */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Overall Performance
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
                      size={36}
                      color={star <= rating ? '#FFD700' : palette.muted}
                    />
                  </Clickable>
                ))}
              </View>
              <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
                {rating === 5 ? 'Excellent' : rating === 4 ? 'Great' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Needs Work'}
              </ThemedText>
            </SurfaceCard>
          </View>

          {/* Effort Rating */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Effort Level
            </ThemedText>
            <SurfaceCard style={styles.ratingCard}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Clickable
                    key={star}
                    onPress={() => setEffortRating(star)}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={star <= effortRating ? 'flash' : 'flash-outline'}
                      size={32}
                      color={star <= effortRating ? palette.tint : palette.muted}
                    />
                  </Clickable>
                ))}
              </View>
              <ThemedText style={[styles.ratingLabel, { color: palette.muted }]}>
                {effortRating === 5 ? 'Maximum effort' : effortRating === 4 ? 'High effort' : effortRating === 3 ? 'Good effort' : effortRating === 2 ? 'Could try harder' : 'Low effort'}
              </ThemedText>
            </SurfaceCard>
          </View>

          {/* Skills Worked On */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Skills Covered
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
                          { color: isSelected ? '#FFFFFF' : palette.foreground },
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

          {/* Skill Ratings (1-10 scale) */}
          {skillRatings.length > 0 && (
            <View style={styles.section}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Skill Ratings (1-10)
              </ThemedText>
              <SurfaceCard style={styles.skillRatingsCard}>
                {skillRatings.map((sr) => (
                  <View key={sr.skill} style={styles.skillRatingRow}>
                    <ThemedText style={styles.skillRatingName}>{sr.skill}</ThemedText>
                    <View style={styles.skillRatingSlider}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <Clickable
                          key={num}
                          onPress={() => updateSkillRating(sr.skill, num)}
                          style={[
                            styles.skillRatingDot,
                            {
                              backgroundColor: num <= sr.rating ? palette.tint : `${palette.muted}30`,
                            },
                          ]}
                        >
                          {num === sr.rating && (
                            <ThemedText style={styles.skillRatingValue}>{num}</ThemedText>
                          )}
                        </Clickable>
                      ))}
                    </View>
                  </View>
                ))}
              </SurfaceCard>
            </View>
          )}

          {/* Public Notes (for parent/athlete) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Session Summary
              </ThemedText>
              <View style={[styles.visibilityBadge, { backgroundColor: `${palette.success}15` }]}>
                <Ionicons name="eye" size={12} color={palette.success} />
                <ThemedText style={[styles.visibilityText, { color: palette.success }]}>
                  Parents can see
                </ThemedText>
              </View>
            </View>
            <SurfaceCard style={styles.notesCard}>
              <TextInput
                value={publicNotes}
                onChangeText={setPublicNotes}
                placeholder="What did you work on? How did the athlete perform?"
                placeholderTextColor={palette.muted}
                multiline
                style={[
                  styles.notesInput,
                  { color: palette.foreground, backgroundColor: palette.background },
                ]}
                textAlignVertical="top"
              />
            </SurfaceCard>
          </View>

          {/* Improvements */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={18} color={palette.success} />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Improvements Noted
              </ThemedText>
            </View>
            <SurfaceCard style={styles.notesCard}>
              <TextInput
                value={improvements}
                onChangeText={setImprovements}
                placeholder="What improvements did you observe?"
                placeholderTextColor={palette.muted}
                multiline
                style={[
                  styles.notesInputSmall,
                  { color: palette.foreground, backgroundColor: palette.background },
                ]}
                textAlignVertical="top"
              />
            </SurfaceCard>
          </View>

          {/* Homework */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard-outline" size={18} color={palette.tint} />
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Homework / Focus Areas
              </ThemedText>
            </View>
            <SurfaceCard style={styles.notesCard}>
              <TextInput
                value={homework}
                onChangeText={setHomework}
                placeholder="What should the athlete practice before next session?"
                placeholderTextColor={palette.muted}
                multiline
                style={[
                  styles.notesInputSmall,
                  { color: palette.foreground, backgroundColor: palette.background },
                ]}
                textAlignVertical="top"
              />
            </SurfaceCard>
          </View>

          {/* Private Notes (coach only) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Private Notes
              </ThemedText>
              <View style={[styles.visibilityBadge, { backgroundColor: `${palette.muted}15` }]}>
                <Ionicons name="lock-closed" size={12} color={palette.muted} />
                <ThemedText style={[styles.visibilityText, { color: palette.muted }]}>
                  Coach only
                </ThemedText>
              </View>
            </View>
            <SurfaceCard style={styles.notesCard}>
              <TextInput
                value={privateNotes}
                onChangeText={setPrivateNotes}
                placeholder="Internal notes not visible to parents..."
                placeholderTextColor={palette.muted}
                multiline
                style={[
                  styles.notesInputSmall,
                  { color: palette.foreground, backgroundColor: palette.background },
                ]}
                textAlignVertical="top"
              />
            </SurfaceCard>
          </View>

          {/* Videos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                Video Clips
              </ThemedText>
              <Clickable onPress={handleAddVideo} style={styles.addButton}>
                <Ionicons name="add-circle" size={24} color={palette.tint} />
              </Clickable>
            </View>

            {sessionVideos.length > 0 ? (
              <View style={styles.videoGrid}>
                {sessionVideos.map((video, index) => (
                  <View key={video.id} style={styles.videoItemWrapper}>
                    <VideoThumbnail
                      video={video}
                      showTitle
                      onPlaybackError={(error) => {
                        logger.warn('Video playback error', { videoId: video.id, error });
                      }}
                    />
                    <Clickable
                      onPress={() => handleRemoveVideo(index, video.id)}
                      style={styles.videoDeleteButton}
                    >
                      <View style={[styles.deleteButtonInner, { backgroundColor: Colors.light.error }]}>
                        <Ionicons name="trash" size={14} color="#fff" />
                      </View>
                    </Clickable>
                  </View>
                ))}
              </View>
            ) : (
              <SurfaceCard style={styles.emptyMedia}>
                <Ionicons name="videocam-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                  Tap + to add training videos for parent review
                </ThemedText>
              </SurfaceCard>
            )}
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
              </SurfaceCard>
            )}
          </View>

          {/* Visibility Toggle */}
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Who Can See This Feedback?
            </ThemedText>
            <View style={styles.visibilityOptions}>
              {[
                { value: 'parent', label: 'Parents & Athlete', icon: 'people' },
                { value: 'athlete', label: 'Athlete Only', icon: 'person' },
                { value: 'coach_only', label: 'Coach Only', icon: 'lock-closed' },
              ].map((option) => (
                <Clickable
                  key={option.value}
                  onPress={() => setVisibility(option.value as typeof visibility)}
                  style={[
                    styles.visibilityOption,
                    {
                      backgroundColor: visibility === option.value ? `${palette.tint}15` : palette.surface,
                      borderColor: visibility === option.value ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={visibility === option.value ? palette.tint : palette.muted}
                  />
                  <ThemedText
                    style={[
                      styles.visibilityOptionText,
                      { color: visibility === option.value ? palette.tint : palette.foreground },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                </Clickable>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <Clickable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: saving ? palette.muted : palette.tint,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            {saving ? (
              <ThemedText style={styles.saveButtonText}>Saving...</ThemedText>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <ThemedText style={styles.saveButtonText}>Save & Submit</ThemedText>
              </>
            )}
          </Clickable>
        </ScrollView>
      </SafeAreaView>

      <BadgeAwardModal
        visible={showBadgeModal}
        athleteId={athlete.id}
        athleteName={athlete.name}
        coachId={currentUser.id}
        coachName={currentUser.name || 'Coach'}
        sessionId={sessionId}
        sessionLabel={formatDate(session.completedAt)}
        onClose={() => setShowBadgeModal(false)}
        onAwarded={handleBadgeAwarded}
      />
    </>
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
    gap: Spacing.md,
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
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  athleteInfo: {
    flex: 1,
    gap: 2,
  },
  athleteName: {
    fontSize: 16,
  },
  sessionDate: {
    fontSize: 13,
  },
  awardBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  awardBadgeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  badgeChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  visibilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    padding: Spacing.xs,
  },
  ratingCard: {
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillsCard: {
    padding: Spacing.md,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  skillButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  skillButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  skillRatingsCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  skillRatingRow: {
    gap: 6,
  },
  skillRatingName: {
    fontSize: 14,
    fontWeight: '500',
  },
  skillRatingSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillRatingDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillRatingValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notesCard: {
    padding: Spacing.md,
  },
  notesInput: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    padding: 0,
  },
  notesInputSmall: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    padding: 0,
  },
  mediaList: {
    gap: Spacing.xs,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
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
    fontWeight: '500',
  },
  videoGrid: {
    gap: Spacing.md,
  },
  videoItemWrapper: {
    position: 'relative',
  },
  videoDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  deleteButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  videoThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDetails: {
    flex: 1,
    gap: 2,
  },
  videoDuration: {
    fontSize: 12,
  },
  emptyMedia: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  visibilityOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.sm,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
