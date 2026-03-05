/**
 * useDevSession — All state, data loading, and handlers for the Session Detail/Feedback screen.
 * Manages session data, form state (ratings, skills, notes, media, visibility), saving, and badge modal.
 *
 * Position-first flow: loads athlete's primary position, shows 9 relevant skills
 * (4 universal + 5 positional). Save computes fourCorners and records positionPlayed
 * — identical data quality to Quick Rate.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';

import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/services/api-client';
import { getSkillsForPosition, getSkillsForPositions, SKILL_SUB_SKILLS } from '@/constants/football-registry';
import { UNIVERSAL_SKILLS, POSITION_SKILLS, POSITION_LABELS, deriveParentRatingsFromSubSkills } from '@/constants/position-skills';
import type { FootballSkill, PositionRole, SessionSkillRating, SubSkillRating } from '@/types/progress-types';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { progressService } from '@/services/progress-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressPositionService } from '@/services/progress/progress-position-service';
import { childService } from '@/services/child-service';
import { badgeService } from '@/services/badge-service';
import { userService } from '@/services/user-service';
import { mediaService } from '@/services/media-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { buildFeedbackPrefillFromQuickRate } from '@/utils/feedback-prefill';
import type { Session, BadgeAward } from '@/constants/types';
import type { QuickRateInput } from '@/types/progress-types';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('SessionDetailScreen');

type SessionRecord = Session & {
  imageUrls?: string[];
  effortRating?: number;
  sourceSessionId?: string;
  prefillSkillRatings?: SkillRating[];
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

/** All 24 football skills (universal + all positions). Used when athlete position is unknown. */
export const ALL_FOOTBALL_SKILLS: FootballSkill[] = [
  ...new Set(
    (['GK', 'DEF', 'MID', 'ATT'] as PositionRole[]).flatMap(getSkillsForPosition),
  ),
];

export const AVAILABLE_SKILLS = ALL_FOOTBALL_SKILLS;

/** Get sub-skills for a parent skill. */
export function getSubSkillsFor(skill: FootballSkill): string[] {
  return SKILL_SUB_SKILLS[skill] ?? [];
}

export type SkillRating = { skill: string; rating: number; previousRating?: number };
export type FeedbackVisibility = 'parent' | 'athlete' | 'coach_only';

/** Get the 5 positional skills for a given position. */
function getPositionalSkills(position: PositionRole): FootballSkill[] {
  return [...POSITION_SKILLS[position]];
}

/** Get the 4 universal/character skills. */
function getCharacterSkills(): FootballSkill[] {
  return [...UNIVERSAL_SKILLS];
}

interface UseDevSessionParams {
  sessionId: string | undefined;
  prefillFromQuickRate?: boolean;
  athleteId?: string;
}

export function useDevSession({
  sessionId,
  prefillFromQuickRate = false,
  athleteId,
}: UseDevSessionParams) {
  const { currentUser } = useAuth();

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [athlete, setAthlete] = useState<SessionAthlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Position state (multi-position)
  const [positionsPlayed, setPositionsPlayed] = useState<PositionRole[]>(['MID']);
  const [positionLoaded, setPositionLoaded] = useState(false);

  // Form state
  const [publicNotes, setPublicNotes] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');
  const [rating, setRating] = useState(3);
  const [effortRating, setEffortRating] = useState(3);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillRatings, setSkillRatings] = useState<SkillRating[]>([]);
  // Sub-skill ratings (new model): keyed by "parentSkill::subSkill"
  const [subSkillRatings, setSubSkillRatings] = useState<SubSkillRating[]>([]);
  const [improvements, setImprovements] = useState('');
  const [homework, setHomework] = useState('');
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<FeedbackVisibility>('parent');

  // Previous ratings from SKILL_LEVELS (for trend indicators)
  const [previousRatings, setPreviousRatings] = useState<Record<string, number>>({});

  // Badge state
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [sessionBadges, setSessionBadges] = useState<BadgeAward[]>([]);

  // Derived: skills to show based on selected positions (multi-position)
  // Positional skills = merged across all selected positions (deduplicated)
  const positionalSkills = Array.from(
    new Set(positionsPlayed.flatMap((pos) => getPositionalSkills(pos))),
  );
  const characterSkills = getCharacterSkills();
  // For backward compat: positionPlayed = first selected position
  const positionPlayed = positionsPlayed[0] ?? 'MID';
  const positionLabel = positionsPlayed.length === 1
    ? (POSITION_LABELS[positionsPlayed[0]] ?? positionsPlayed[0])
    : positionsPlayed.map((p) => p).join(' + ');

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
        const sessions = await apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS, []);
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
          setEffortRating(foundSession.effortRating || 3);
          setSelectedSkills(foundSession.skillsWorkedOn || []);
          setVideoUrls(foundSession.videoUrls || []);
          setImageUrls(foundSession.imageUrls || []);
        }

        const targetAthleteId = athleteId || foundSession.athleteId;

        // ─── Load athlete position ────────────────────────────────────
        if (targetAthleteId && isMounted) {
          // Priority: latest feedback position > most played position > child profile > MID
          const latestFeedback = await progressFeedbackService.getLatestForAthlete(targetAthleteId);
          let resolvedPosition: PositionRole = 'MID';

          // Multi-position: prefer positionsPlayed from latest feedback
          if (latestFeedback?.positionsPlayed && latestFeedback.positionsPlayed.length > 0) {
            resolvedPosition = latestFeedback.positionsPlayed[0];
          } else if (latestFeedback?.positionPlayed) {
            resolvedPosition = latestFeedback.positionPlayed;
          } else {
            const mostPlayedResult = await progressPositionService.getMostPlayedPosition(targetAthleteId);
            if (mostPlayedResult.success && mostPlayedResult.data) {
              resolvedPosition = mostPlayedResult.data;
            } else {
              const childProfile = await childService.getChild(targetAthleteId);
              if (childProfile?.primaryPosition) {
                resolvedPosition = childProfile.primaryPosition;
              }
            }
          }

          const resolvedPositions: PositionRole[] =
            latestFeedback?.positionsPlayed && latestFeedback.positionsPlayed.length > 0
              ? latestFeedback.positionsPlayed
              : [resolvedPosition];

          if (isMounted) {
            setPositionsPlayed(resolvedPositions);
            setPositionLoaded(true);
          }

          // ─── Load previous skill levels (for trend indicators) ──────
          const athleteSkills = await progressSkillsService.getAthleteSkillLevels(targetAthleteId);
          if (athleteSkills && isMounted) {
            const prev: Record<string, number> = {};
            for (const [skillName, skillData] of Object.entries(athleteSkills.skills)) {
              // Convert stored 1-10 level back to 1-5 rating for display
              prev[skillName] = Math.max(1, Math.min(5, Math.ceil(skillData.level / 2)));
            }
            setPreviousRatings(prev);
          }
        }

        // ─── Quick Rate prefill ───────────────────────────────────────
        const shouldPrefillFromQuickRate = prefillFromQuickRate && Boolean(targetAthleteId);

        if (shouldPrefillFromQuickRate && targetAthleteId) {
          const sourceSessionId = foundSession.sourceSessionId;
          let latestQuickRateFeedback = sourceSessionId
            ? await progressFeedbackService.getLatestForAthlete(targetAthleteId, sourceSessionId)
            : null;
          if (!latestQuickRateFeedback) {
            latestQuickRateFeedback = await progressFeedbackService.getLatestForAthlete(targetAthleteId);
          }

          if (latestQuickRateFeedback?.fourCorners) {
            const quickRateInput: QuickRateInput = {
              athleteId: targetAthleteId,
              athleteName: latestQuickRateFeedback.athleteName,
              sessionId: latestQuickRateFeedback.sessionId,
              coachId: latestQuickRateFeedback.coachId,
              technical: latestQuickRateFeedback.fourCorners.technical,
              physical: latestQuickRateFeedback.fourCorners.physical,
              psychological: latestQuickRateFeedback.fourCorners.psychological,
              social: latestQuickRateFeedback.fourCorners.social,
              effort: latestQuickRateFeedback.effortRating,
              badgeId: latestQuickRateFeedback.badgeAwarded,
            };
            const prefill = buildFeedbackPrefillFromQuickRate(quickRateInput, {
              attendeeCount: 1,
            });

            if (isMounted) {
              setRating(prefill.performanceRating);
              setEffortRating(prefill.effortRating);
              if (!foundSession.notes) {
                setPublicNotes(prefill.sessionSummary);
              }
            }
          }

          const mediaSessionId =
            foundSession.sourceSessionId || latestQuickRateFeedback?.sessionId || foundSession.bookingId;
          if (mediaSessionId) {
            const mediaResult = await mediaService.getSessionMedia(mediaSessionId, targetAthleteId);
            if (mediaResult.success && mediaResult.data && isMounted) {
              setImageUrls(mediaResult.data.photos.map((photo) => photo.uri));
              setVideoUrls(mediaResult.data.video ? [mediaResult.data.video.uri] : []);
            }
          }
        }

        // ─── Resolve athlete profile ──────────────────────────────────
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
  }, [athleteId, prefillFromQuickRate, sessionId]);

  // ─── Position toggle handler (multi-position) ──────────────────────────────
  const handlePositionToggle = useCallback(
    (toggledPosition: PositionRole) => {
      setPositionsPlayed((prev) => {
        const isActive = prev.includes(toggledPosition);
        if (isActive && prev.length === 1) {
          // Min 1 position — can't deselect the last one
          return prev;
        }
        const next = isActive
          ? prev.filter((p) => p !== toggledPosition)
          : [...prev, toggledPosition];

        // Remove sub-skill ratings for positions being deselected
        if (isActive) {
          const removedSkills = getPositionalSkills(toggledPosition);
          const keptPositionalSkills = new Set(
            next.filter((p) => p !== toggledPosition).flatMap(getPositionalSkills),
          );
          const skillsToRemove = removedSkills.filter((s) => !keptPositionalSkills.has(s));

          setSkillRatings((r) =>
            r.filter((rating) => !skillsToRemove.includes(rating.skill as FootballSkill)),
          );
          setSubSkillRatings((r) =>
            r.filter((rating) => !skillsToRemove.includes(rating.parentSkill)),
          );
          setSelectedSkills((s) =>
            s.filter((skill) => !skillsToRemove.includes(skill as FootballSkill)),
          );
        }

        return next;
      });
    },
    [],
  );

  // Legacy compat: single-position change (replaces all)
  const handlePositionChange = useCallback(
    (newPosition: PositionRole) => {
      setPositionsPlayed([newPosition]);
      // Clear positional ratings that don't belong to new position
      const newPositional = getPositionalSkills(newPosition);
      setSkillRatings((prev) =>
        prev.filter(
          (r) =>
            characterSkills.includes(r.skill as FootballSkill) ||
            newPositional.includes(r.skill as FootballSkill),
        ),
      );
      setSubSkillRatings((prev) =>
        prev.filter(
          (r) =>
            characterSkills.includes(r.parentSkill) ||
            newPositional.includes(r.parentSkill),
        ),
      );
    },
    [characterSkills],
  );

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!session || !athlete || !currentUser || !sessionId) return;
    setSaving(true);
    try {
      const sessions = await apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS, []);
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

      await apiClient.set(STORAGE_KEYS.COACH_SESSIONS, sessions);
      setSession(updatedSession);

      // Record positions played (for position history tracking)
      for (const pos of positionsPlayed) {
        await progressPositionService.recordPosition(sessionId, athlete.id, pos);
      }

      // Build SessionSkillRating array for updateFromPositionRate
      const sessionSkillRatings: SessionSkillRating[] = skillRatings.map((r) => ({
        skill: r.skill as FootballSkill,
        rating: (Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5),
        label: 'Very Good' as const, // label is display-only, service recalculates
        trend: 'consistent' as const,
        previousRating: r.previousRating,
      }));

      // Update skill levels and compute four corners (same path as Quick Rate)
      // Prefer sub-skill ratings when available
      let fourCorners = { technical: 0, physical: 0, psychological: 0, social: 0 };
      const hasSubSkillRatings = subSkillRatings.length > 0;

      if (hasSubSkillRatings || sessionSkillRatings.length > 0) {
        const skillResult = await progressSkillsService.updateFromPositionRate(
          athlete.id,
          sessionId,
          currentUser.id,
          positionPlayed,
          sessionSkillRatings,
          hasSubSkillRatings ? subSkillRatings : undefined,
        );
        if (skillResult.success) {
          fourCorners = skillResult.data.fourCorners;
        }
      }

      // Save session feedback with position data and four corners
      await progressService.addSessionFeedback(
        {
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
          positionPlayed,
          positionsPlayed,
          subSkillRatings: hasSubSkillRatings ? subSkillRatings : undefined,
          fourCorners,
        },
        { skipSkillUpdate: true }, // Skills already written by updateFromPositionRate
      );

      logger.info('Session feedback saved', {
        sessionId,
        rating,
        positionsPlayed,
        subSkillCount: subSkillRatings.length,
        skillCount: skillRatings.length,
        fourCorners,
      });
      uiFeedback.alert('Success', 'Session notes saved. Parents can now see the feedback.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      logger.error('Failed to save session', error);
      uiFeedback.alert('Error', 'Failed to save session. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [
    session,
    athlete,
    currentUser,
    sessionId,
    publicNotes,
    rating,
    selectedSkills,
    videoUrls,
    imageUrls,
    privateNotes,
    skillRatings,
    subSkillRatings,
    improvements,
    homework,
    effortRating,
    visibility,
    sessionBadges,
    positionsPlayed,
    positionPlayed,
  ]);

  /** Toggle a sub-skill context tag (no rating). */
  const toggleSubSkill = useCallback((subSkill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(subSkill) ? prev.filter((item) => item !== subSkill) : [...prev, subSkill],
    );
  }, []);

  /** Set a parent skill's rating (1-5). Rating > 0 adds it; called from RatingBar. */
  const updateSkillRating = useCallback(
    (skill: string, newRating: number) => {
      const prev = previousRatings[skill];
      setSkillRatings((current) => {
        const existing = current.find((r) => r.skill === skill);
        if (existing) {
          return current.map((r) =>
            r.skill === skill ? { ...r, rating: newRating, previousRating: prev } : r,
          );
        }
        return [...current, { skill, rating: newRating, previousRating: prev }];
      });
      // Also add to selectedSkills if not already there
      setSelectedSkills((current) => (current.includes(skill) ? current : [...current, skill]));
    },
    [previousRatings],
  );

  /** Remove a parent skill rating entirely. */
  const removeSkillRating = useCallback((skill: string) => {
    setSkillRatings((prev) => prev.filter((r) => r.skill !== skill));
    setSelectedSkills((prev) => prev.filter((item) => item !== skill));
  }, []);

  /** Rate a sub-skill (1-5). Updates subSkillRatings and derives parent rating. */
  const updateSubSkillRating = useCallback(
    (parentSkill: FootballSkill, subSkill: string, newRating: 1 | 2 | 3 | 4 | 5) => {
      setSubSkillRatings((prev) => {
        const withoutThis = prev.filter(
          (r) => !(r.parentSkill === parentSkill && r.subSkill === subSkill),
        );
        return [...withoutThis, { subSkill, parentSkill, rating: newRating }];
      });
      // Also add parent to selectedSkills for tracking
      setSelectedSkills((current) =>
        current.includes(parentSkill) ? current : [...current, parentSkill],
      );
    },
    [],
  );

  /** Remove all sub-skill ratings for a parent skill. */
  const removeParentRatings = useCallback((parentSkill: FootballSkill) => {
    setSubSkillRatings((prev) => prev.filter((r) => r.parentSkill !== parentSkill));
    setSkillRatings((prev) => prev.filter((r) => r.skill !== parentSkill));
    setSelectedSkills((prev) => prev.filter((item) => item !== parentSkill));
  }, []);

  /** Derive parent averages from current sub-skill ratings (for display). */
  const derivedParentAverages = useMemo(
    () => deriveParentRatingsFromSubSkills(subSkillRatings),
    [subSkillRatings],
  );

  const handleAddImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        uiFeedback.alert('Permission needed', 'Please allow access to your photos');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0])
        setImageUrls((prev) => [...prev, result.assets[0].uri]);
    } catch (error) {
      logger.error('Failed to pick image', error);
      uiFeedback.alert('Error', 'Failed to pick image');
    }
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddVideo = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        uiFeedback.alert('Permission needed', 'Please allow access to your videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setVideoUrls((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      logger.error('Failed to pick video', error);
      uiFeedback.alert('Error', 'Failed to pick video');
    }
  }, []);

  const handleRemoveVideo = useCallback((index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const handleBadgeAwarded = useCallback((award: BadgeAward) => {
    setSessionBadges((prev) => [award, ...prev]);
    setShowBadgeModal(false);
  }, []);
  const handleOpenBadgeModal = useCallback(() => setShowBadgeModal(true), []);
  const handleCloseBadgeModal = useCallback(() => setShowBadgeModal(false), []);

  return {
    session,
    athlete,
    currentUser,
    loading,
    saving,
    // Position (multi-position)
    positionPlayed,
    positionsPlayed,
    positionLoaded,
    positionalSkills,
    characterSkills,
    positionLabel,
    handlePositionChange,
    handlePositionToggle,
    previousRatings,
    // Form
    publicNotes,
    setPublicNotes,
    privateNotes,
    setPrivateNotes,
    rating,
    setRating,
    effortRating,
    setEffortRating,
    selectedSkills,
    skillRatings,
    improvements,
    setImprovements,
    homework,
    setHomework,
    videoUrls,
    imageUrls,
    visibility,
    setVisibility,
    showBadgeModal,
    sessionBadges,
    handleSave,
    toggleSubSkill,
    updateSkillRating,
    removeSkillRating,
    // Sub-skill ratings (new)
    subSkillRatings,
    updateSubSkillRating,
    removeParentRatings,
    derivedParentAverages,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
    handleBadgeAwarded,
    handleOpenBadgeModal,
    handleCloseBadgeModal,
    formatDate,
  };
}
