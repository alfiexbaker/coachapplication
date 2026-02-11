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
import { createLogger } from '@/utils/logger';
import { progressService } from '@/services/progress-service';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import type { Session, BadgeAward } from '@/constants/types';

const logger = createLogger('SessionDetailScreen');

type SessionRecord = Session & {
  imageUrls?: string[];
  updatedAt?: string;
};

export type SessionAthlete = {
  id: string;
  name: string;
  avatar?: string;
};

function fallbackAthleteFromSession(session: SessionRecord): SessionAthlete {
  const athleteName = session.athleteId?.trim() || 'Athlete';
  return {
    id: session.athleteId,
    name: athleteName,
    avatar: athleteName.charAt(0).toUpperCase(),
  };
}

export function formatDate(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) {
    return 'Unknown date';
  }
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const AVAILABLE_SKILLS = [
  'Passing', 'Shooting', 'Dribbling', 'Defending', 'Positioning', 'First Touch',
  'Crossing', 'Heading', 'Tackling', 'Ball Control', 'Finishing', 'Weak Foot', 'Speed', 'Stamina',
];

export type SkillRating = { skill: string; rating: number; previousRating?: number };
export type FeedbackVisibility = 'parent' | 'athlete' | 'coach_only';

export function useDevSession(sessionId: string | undefined) {
  const { currentUser } = useAuth();

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [athlete, setAthlete] = useState<SessionAthlete | null>(null);
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
    let isMounted = true;

    const loadSession = async () => {
      if (!sessionId) {
        if (isMounted) {
          setSession(null);
          setAthlete(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const sessions = await apiClient.get<SessionRecord[]>('coach_sessions', []);
        const foundSession = sessions.find((candidate) => candidate.id === sessionId);

        if (!foundSession) {
          logger.warn('Session not found', { sessionId });
          if (isMounted) {
            setSession(null);
            setAthlete(null);
          }
          return;
        }

        if (isMounted) {
          setSession(foundSession);
          setPublicNotes(foundSession.notes || '');
          setRating(foundSession.performanceRating || 3);
          setSelectedSkills(foundSession.skillsWorkedOn || []);
          setVideoUrls(foundSession.videoUrls || []);
          setImageUrls(foundSession.imageUrls || []);
        }

        const athleteResult = await userService.getUserById(foundSession.athleteId);
        const resolvedAthlete = athleteResult.success
          ? {
              id: athleteResult.data.id,
              name: athleteResult.data.name,
              avatar: athleteResult.data.avatar,
            }
          : fallbackAthleteFromSession(foundSession);
        if (!athleteResult.success) {
          logger.error('Failed to resolve athlete profile for session', {
            sessionId,
            athleteId: foundSession.athleteId,
            error: athleteResult.error,
          });
        }

        if (isMounted) {
          setAthlete(resolvedAthlete);
        }

        const badges = await badgeService.listAwardsForSession(sessionId);
        if (isMounted) {
          setSessionBadges(badges);
        }

        const athleteSkills = await progressService.getAthleteSkillLevels(foundSession.athleteId);
        if (athleteSkills && isMounted) {
          const existingRatings = (foundSession.skillsWorkedOn || []).map((skill) => {
            const existing = athleteSkills.skills[skill];
            return { skill, rating: existing?.level ?? 5, previousRating: existing?.previousLevel };
          });
          setSkillRatings(existingRatings);
        }
      } catch (error) {
        logger.error('Failed to load session', error);
        if (isMounted) {
          setSession(null);
          setAthlete(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const handleSave = useCallback(async () => {
    if (!session || !athlete || !currentUser || !sessionId) return;
    setSaving(true);
    try {
      const sessions = await apiClient.get<SessionRecord[]>('coach_sessions', []);
      const idx = sessions.findIndex((candidate) => candidate.id === sessionId);
      const updatedSession: SessionRecord = {
        ...(idx >= 0 ? sessions[idx] : session),
        notes: publicNotes,
        performanceRating: rating,
        skillsWorkedOn: selectedSkills,
        videoUrls,
        imageUrls,
        updatedAt: new Date().toISOString(),
      };

      if (idx >= 0) {
        sessions[idx] = updatedSession;
      } else {
        sessions.push(updatedSession);
        logger.warn('Session missing during save; record re-created', { sessionId });
      }

      await apiClient.set('coach_sessions', sessions);
      setSession(updatedSession);

      await progressService.addSessionFeedback({
        sessionId,
        bookingId: session.bookingId,
        coachId: currentUser.id,
        coachName: currentUser.name || 'Coach',
        athleteId: athlete.id,
        athleteName: athlete.name,
        publicSummary: publicNotes,
        privateNotes,
        skillsWorkedOn: selectedSkills,
        skillRatings,
        improvements,
        homework,
        effortRating,
        overallPerformance: rating,
        videoClipUrls: videoUrls,
        visibility,
        badgeAwarded: sessionBadges.length > 0 ? sessionBadges[0].badgeLabel : undefined,
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
    setSelectedSkills((prev) => (prev.includes(skill) ? prev.filter((item) => item !== skill) : [...prev, skill]));
    setSkillRatings((prev) => (prev.find((ratingItem) => ratingItem.skill === skill)
      ? prev.filter((ratingItem) => ratingItem.skill !== skill)
      : [...prev, { skill, rating: 5 }]));
  }, []);

  const updateSkillRating = useCallback((skill: string, newRating: number) => {
    setSkillRatings((prev) => prev.map((ratingItem) => (ratingItem.skill === skill ? { ...ratingItem, rating: newRating } : ratingItem)));
  }, []);

  const handleAddImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: false, quality: 0.8 });
      if (!result.canceled && result.assets[0]) setImageUrls((prev) => [...prev, result.assets[0].uri]);
    } catch (error) {
      logger.error('Failed to pick image', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => { setImageUrls((prev) => prev.filter((_, i) => i !== index)); }, []);
  const handleAddVideo = useCallback(() => { setVideoUrls((prev) => [...prev, `https://example.com/video_${Date.now()}.mp4`]); }, []);
  const handleRemoveVideo = useCallback((index: number) => { setVideoUrls((prev) => prev.filter((_, i) => i !== index)); }, []);
  const handleBadgeAwarded = useCallback((award: BadgeAward) => { setSessionBadges((prev) => [award, ...prev]); setShowBadgeModal(false); }, []);
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
