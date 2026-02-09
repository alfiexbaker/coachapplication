/**
 * useDevSession — All state, data loading, and handlers for the Session Detail/Feedback screen.
 * Manages session data, form state (ratings, skills, notes, media, visibility), saving, and badge modal.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_SESSIONS, getUserById, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import type { Session, BadgeAward } from '@/constants/types';

const logger = createLogger('SessionDetailScreen');

export const AVAILABLE_SKILLS = [
  'Passing', 'Shooting', 'Dribbling', 'Defending', 'Positioning', 'First Touch',
  'Crossing', 'Heading', 'Tackling', 'Ball Control', 'Finishing', 'Weak Foot', 'Speed', 'Stamina',
];

export type SkillRating = { skill: string; rating: number; previousRating?: number };
export type FeedbackVisibility = 'parent' | 'athlete' | 'coach_only';

export function useDevSession(sessionId: string | undefined) {
  const { currentUser } = useAuth();

  const [session, setSession] = useState<Session | null>(null);
  const [athlete, setAthlete] = useState<ReturnType<typeof getUserById>>(undefined);
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
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<FeedbackVisibility>('parent');

  // Badge state
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [sessionBadges, setSessionBadges] = useState<BadgeAward[]>([]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessions = await apiClient.get<(Session & Record<string, unknown>)[]>('coach_sessions', []);
        let foundSession: Session | undefined;
        if (sessions.length > 0) foundSession = sessions.find((s) => s.id === sessionId);
        if (!foundSession) foundSession = MOCK_SESSIONS.find(s => s.id === sessionId);

        if (foundSession) {
          setSession(foundSession);
          setPublicNotes(foundSession.notes || '');
          setRating(foundSession.performanceRating || 3);
          setSelectedSkills(foundSession.skillsWorkedOn || []);
          setVideoUrls(foundSession.videoUrls || []);
          setImageUrls((foundSession as Session & Record<string, unknown>).imageUrls as string[] | undefined || []);
          setAthlete(getUserById(foundSession.athleteId));

          const badges = await badgeService.listAwardsForSession(sessionId!);
          setSessionBadges(badges);

          const athleteSkills = await progressService.getAthleteSkillLevels(foundSession.athleteId);
          if (athleteSkills) {
            const existingRatings = (foundSession.skillsWorkedOn || []).map(skill => {
              const existing = athleteSkills.skills[skill];
              return { skill, rating: existing?.level ?? 5, previousRating: existing?.previousLevel };
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

  const handleSave = useCallback(async () => {
    if (!session || !athlete || !currentUser) return;
    setSaving(true);
    try {
      const sessions = await apiClient.get<(Session & Record<string, unknown>)[]>('coach_sessions', []);
      const idx = sessions.findIndex((s) => s.id === sessionId);
      if (idx !== -1) {
        sessions[idx] = { ...sessions[idx], notes: publicNotes, performanceRating: rating, skillsWorkedOn: selectedSkills, videoUrls, imageUrls, updatedAt: new Date().toISOString() };
        await apiClient.set('coach_sessions', sessions);
      }
      await progressService.addSessionFeedback({
        sessionId: sessionId!, bookingId: session.bookingId, coachId: currentUser.id,
        coachName: currentUser.name || 'Coach', athleteId: athlete.id, athleteName: athlete.name,
        publicSummary: publicNotes, privateNotes, skillsWorkedOn: selectedSkills, skillRatings,
        improvements, homework, effortRating, overallPerformance: rating, videoClipUrls: videoUrls,
        visibility, badgeAwarded: sessionBadges.length > 0 ? sessionBadges[0].badgeLabel : undefined,
      });
      logger.info('Session feedback saved', { sessionId, rating, skillCount: selectedSkills.length });
      Alert.alert('Success', 'Session notes saved. Parents can now see the feedback.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      logger.error('Failed to save session', error);
      Alert.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [session, athlete, currentUser, sessionId, publicNotes, rating, selectedSkills, videoUrls, imageUrls, privateNotes, skillRatings, improvements, homework, effortRating, visibility, sessionBadges]);

  const toggleSkill = useCallback((skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
    setSkillRatings(prev => prev.find(sr => sr.skill === skill) ? prev.filter(sr => sr.skill !== skill) : [...prev, { skill, rating: 5 }]);
  }, []);

  const updateSkillRating = useCallback((skill: string, newRating: number) => {
    setSkillRatings(prev => prev.map(sr => sr.skill === skill ? { ...sr, rating: newRating } : sr));
  }, []);

  const handleAddImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photos'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 0.8 });
      if (!result.canceled && result.assets[0]) setImageUrls(prev => [...prev, result.assets[0].uri]);
    } catch (error) {
      logger.error('Failed to pick image', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => { setImageUrls(prev => prev.filter((_, i) => i !== index)); }, []);
  const handleAddVideo = useCallback(() => { setVideoUrls(prev => [...prev, `https://example.com/video_${Date.now()}.mp4`]); }, []);
  const handleRemoveVideo = useCallback((index: number) => { setVideoUrls(prev => prev.filter((_, i) => i !== index)); }, []);
  const handleBadgeAwarded = useCallback((award: BadgeAward) => { setSessionBadges(prev => [award, ...prev]); setShowBadgeModal(false); }, []);
  const handleOpenBadgeModal = useCallback(() => setShowBadgeModal(true), []);
  const handleCloseBadgeModal = useCallback(() => setShowBadgeModal(false), []);

  return {
    session, athlete, currentUser, loading, saving,
    publicNotes, setPublicNotes, privateNotes, setPrivateNotes,
    rating, setRating, effortRating, setEffortRating,
    selectedSkills, skillRatings, improvements, setImprovements,
    homework, setHomework, videoUrls, imageUrls, visibility, setVisibility,
    showBadgeModal, sessionBadges,
    handleSave, toggleSkill, updateSkillRating,
    handleAddImage, handleRemoveImage, handleAddVideo, handleRemoveVideo,
    handleBadgeAwarded, handleOpenBadgeModal, handleCloseBadgeModal,
    formatDate,
  };
}
