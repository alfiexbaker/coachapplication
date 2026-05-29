/**
 * useDevSession — All state, data loading, and handlers for the Session Detail/Feedback screen.
 * Manages session data, form state (ratings, skills, notes, media, visibility), saving, and badge modal.
 *
 * Position-first flow: loads athlete's primary position, shows 9 relevant skills
 * (4 universal + 5 positional). Save computes fourCorners and records positionPlayed
 * — identical data quality to Quick Rate.
 */
import { useState, useEffect, useRef, startTransition } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiClient } from '@/services/api-client';
import {
  getSkillsForPosition,
  getSkillsForPositions,
  SKILL_SUB_SKILLS,
} from '@/constants/football-registry';
import {
  UNIVERSAL_SKILLS,
  POSITION_SKILLS,
  POSITION_LABELS,
  deriveParentRatingsFromSubSkills,
} from '@/constants/position-skills';
import type {
  FootballSkill,
  PositionRole,
  SessionSkillRating,
  SubSkillRating,
} from '@/types/progress-types';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
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
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
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
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** All 24 football skills (universal + all positions). Used when athlete position is unknown. */
export const ALL_FOOTBALL_SKILLS: FootballSkill[] = [
  ...new Set((['GK', 'DEF', 'MID', 'ATT'] as PositionRole[]).flatMap(getSkillsForPosition)),
];
export const AVAILABLE_SKILLS = ALL_FOOTBALL_SKILLS;

/** Get sub-skills for a parent skill. */
export function getSubSkillsFor(skill: FootballSkill): string[] {
  return SKILL_SUB_SKILLS[skill] ?? [];
}
export type SkillRating = {
  skill: string;
  rating: number;
  previousRating?: number;
};
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
interface DevSessionFormDefaults {
  publicNotes: string;
  rating: number;
  effortRating: number;
  selectedSkills: string[];
  videoUrls: string[];
  imageUrls: string[];
}
interface DevSessionData {
  session: SessionRecord | null;
  athlete: SessionAthlete | null;
  positionsPlayed: PositionRole[];
  positionLoaded: boolean;
  previousRatings: Record<string, number>;
  sessionBadges: BadgeAward[];
  formDefaults: DevSessionFormDefaults;
}
function emptyDevSessionData(): DevSessionData {
  return {
    session: null,
    athlete: null,
    positionsPlayed: ['MID'],
    positionLoaded: false,
    previousRatings: {},
    sessionBadges: [],
    formDefaults: {
      publicNotes: '',
      rating: 3,
      effortRating: 3,
      selectedSkills: [],
      videoUrls: [],
      imageUrls: [],
    },
  };
}
export function useDevSession({
  sessionId,
  prefillFromQuickRate = false,
  athleteId,
}: UseDevSessionParams) {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const hydratedFormKeyRef = useRef<string | null>(null);

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
  const [mediaPermissionMessage, setMediaPermissionMessage] = useState<string | null>(null);
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
  const positionLabel =
    positionsPlayed.length === 1
      ? (POSITION_LABELS[positionsPlayed[0]] ?? positionsPlayed[0])
      : positionsPlayed.map((p) => p).join(' + ');
  const loadSessionData = async () => {
    if (!sessionId) {
      return ok<DevSessionData>(emptyDevSessionData());
    }
    try {
      const sessions = await apiClient.get<SessionRecord[]>(STORAGE_KEYS.COACH_SESSIONS, []);
      const foundSession = sessions.find((candidate) => candidate.id === sessionId) ?? null;
      if (!foundSession) {
        logger.warn('Session not found', {
          sessionId,
        });
        return ok<DevSessionData>(emptyDevSessionData());
      }
      const targetAthleteId = athleteId || foundSession.athleteId;
      let latestFeedback: Awaited<
        ReturnType<typeof progressFeedbackService.getLatestForAthlete>
      > | null = null;
      let resolvedPositions: PositionRole[] = ['MID'];
      let positionIsLoaded = false;
      let resolvedPreviousRatings: Record<string, number> = {};
      const formDefaults: DevSessionFormDefaults = {
        publicNotes: foundSession.notes || '',
        rating: foundSession.performanceRating || 3,
        effortRating: foundSession.effortRating || 3,
        selectedSkills: foundSession.skillsWorkedOn || [],
        videoUrls: foundSession.videoUrls || [],
        imageUrls: foundSession.imageUrls || [],
      };
      if (targetAthleteId) {
        latestFeedback = await progressFeedbackService.getLatestForAthlete(targetAthleteId);
        let resolvedPosition: PositionRole = 'MID';
        if (latestFeedback?.positionsPlayed && latestFeedback.positionsPlayed.length > 0) {
          resolvedPosition = latestFeedback.positionsPlayed[0];
        } else if (latestFeedback?.positionPlayed) {
          resolvedPosition = latestFeedback.positionPlayed;
        } else {
          const mostPlayedResult =
            await progressPositionService.getMostPlayedPosition(targetAthleteId);
          if (mostPlayedResult.success && mostPlayedResult.data) {
            resolvedPosition = mostPlayedResult.data;
          } else {
            const childProfile = await childService.getChild(targetAthleteId);
            if (childProfile?.primaryPosition) {
              resolvedPosition = childProfile.primaryPosition;
            }
          }
        }
        resolvedPositions =
          latestFeedback?.positionsPlayed && latestFeedback.positionsPlayed.length > 0
            ? latestFeedback.positionsPlayed
            : [resolvedPosition];
        positionIsLoaded = true;
        const athleteSkills = await progressSkillsService.getAthleteSkillLevels(targetAthleteId);
        if (athleteSkills) {
          for (const [skillName, skillData] of Object.entries(athleteSkills.skills)) {
            resolvedPreviousRatings[skillName] = Math.max(
              1,
              Math.min(5, Math.ceil(skillData.level / 2)),
            );
          }
        }
      }
      if (prefillFromQuickRate && targetAthleteId) {
        const sourceSessionId = foundSession.sourceSessionId;
        let latestQuickRateFeedback = sourceSessionId
          ? await progressFeedbackService.getLatestForAthlete(targetAthleteId, sourceSessionId)
          : null;
        if (!latestQuickRateFeedback) {
          latestQuickRateFeedback =
            latestFeedback ?? (await progressFeedbackService.getLatestForAthlete(targetAthleteId));
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
          formDefaults.rating = prefill.performanceRating;
          formDefaults.effortRating = prefill.effortRating;
          if (!foundSession.notes) {
            formDefaults.publicNotes = prefill.sessionSummary;
          }
        }
        const mediaSessionId =
          foundSession.sourceSessionId ||
          latestQuickRateFeedback?.sessionId ||
          foundSession.bookingId;
        if (mediaSessionId) {
          const mediaResult = await mediaService.getSessionMedia(mediaSessionId, targetAthleteId);
          if (mediaResult.success && mediaResult.data) {
            formDefaults.imageUrls = mediaResult.data.photos.map((photo) => photo.uri);
            formDefaults.videoUrls = mediaResult.data.video ? [mediaResult.data.video.uri] : [];
          }
        }
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
      const badges = await badgeService.listAwardsForSession(sessionId);
      return ok<DevSessionData>({
        session: foundSession,
        athlete: resolvedAthlete,
        positionsPlayed: resolvedPositions,
        positionLoaded: positionIsLoaded,
        previousRatings: resolvedPreviousRatings,
        sessionBadges: badges,
        formDefaults,
      });
    } catch (error) {
      logger.error('Failed to load session', error);
      return err(serviceError('UNKNOWN', 'Failed to load session feedback.', error));
    }
  };
  const { data, status, error, retry } = useScreen<DevSessionData>({
    load: loadSessionData,
    deps: [athleteId, prefillFromQuickRate, sessionId],
    isEmpty: (value) => !value.session || !value.athlete,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: sessionId ? `dev-session:${sessionId}` : 'dev-session:missing',
  });
  const session = data?.session ?? null;
  const athlete = data?.athlete ?? null;
  useEffect(() => {
    if (!data?.session) {
      return;
    }
    startTransition(() => {
      setPositionLoaded(data.positionLoaded);
    });
    startTransition(() => {
      setPreviousRatings(data.previousRatings);
    });
    startTransition(() => {
      setSessionBadges(data.sessionBadges);
    });
    const hydrationKey = `${data.session.id}:${prefillFromQuickRate ? 'prefill' : 'plain'}:${athleteId ?? ''}`;
    if (hydratedFormKeyRef.current === hydrationKey) {
      return;
    }
    hydratedFormKeyRef.current = hydrationKey;
    startTransition(() => {
      setPositionsPlayed(data.positionsPlayed);
    });
    startTransition(() => {
      setPublicNotes(data.formDefaults.publicNotes);
    });
    startTransition(() => {
      setRating(data.formDefaults.rating);
    });
    startTransition(() => {
      setEffortRating(data.formDefaults.effortRating);
    });
    startTransition(() => {
      setSelectedSkills(data.formDefaults.selectedSkills);
    });
    startTransition(() => {
      setVideoUrls(data.formDefaults.videoUrls);
    });
    startTransition(() => {
      setImageUrls(data.formDefaults.imageUrls);
    });
    startTransition(() => {
      setSkillRatings([]);
    });
    startTransition(() => {
      setSubSkillRatings([]);
    });
    startTransition(() => {
      setImprovements('');
    });
    startTransition(() => {
      setHomework('');
    });
    startTransition(() => {
      setPrivateNotes('');
    });
    startTransition(() => {
      setVisibility('parent');
    });
  }, [athleteId, data, prefillFromQuickRate]);

  // ─── Position toggle handler (multi-position) ──────────────────────────────
  const handlePositionToggle = (toggledPosition: PositionRole) => {
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
          next.flatMap((p) => (p !== toggledPosition ? getPositionalSkills(p) : [])),
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
  };

  // Legacy compat: single-position change (replaces all)
  const handlePositionChange = (newPosition: PositionRole) => {
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
        (r) => characterSkills.includes(r.parentSkill) || newPositional.includes(r.parentSkill),
      ),
    );
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!session || !athlete || !currentUser || !sessionId) return;
    setSaving(true);
    await runAsyncTryCatchFinally(
      async () => {
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
          logger.warn('Session missing during save; record re-created', {
            sessionId,
          });
        }
        await apiClient.set(STORAGE_KEYS.COACH_SESSIONS, sessions);

        // Record positions played (for position history tracking)
        await Promise.all(
          positionsPlayed.map((pos) =>
            progressPositionService.recordPosition(sessionId, athlete.id, pos),
          ),
        );

        // Build SessionSkillRating array for updateFromPositionRate
        const sessionSkillRatings: SessionSkillRating[] = skillRatings.map((r) => ({
          skill: r.skill as FootballSkill,
          rating: Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5,
          label: 'Very Good' as const,
          // label is display-only, service recalculates
          trend: 'consistent' as const,
          previousRating: r.previousRating,
        }));

        // Update skill levels and compute four corners (same path as Quick Rate)
        // Prefer sub-skill ratings when available
        let fourCorners = {
          technical: 0,
          physical: 0,
          psychological: 0,
          social: 0,
        };
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
          {
            skipSkillUpdate: true,
          }, // Skills already written by updateFromPositionRate
        );
        logger.info('Session feedback saved', {
          sessionId,
          rating,
          positionsPlayed,
          subSkillCount: subSkillRatings.length,
          skillCount: skillRatings.length,
          fourCorners,
        });
        uiFeedback.showToast('Session notes saved. Parents can now see the feedback.', 'success');
        router.back();
      },
      async (error) => {
        logger.error('Failed to save session', error);
        uiFeedback.showToast('Failed to save session. Please try again.', 'error');
      },
      () => {
        setSaving(false);
      },
    );
  };

  /** Toggle a sub-skill context tag (no rating). */
  const toggleSubSkill = (subSkill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(subSkill) ? prev.filter((item) => item !== subSkill) : [...prev, subSkill],
    );
  };

  /** Set a parent skill's rating (1-5). Rating > 0 adds it; called from RatingBar. */
  const updateSkillRating = (skill: string, newRating: number) => {
    const prev = previousRatings[skill];
    setSkillRatings((current) => {
      const existing = current.find((r) => r.skill === skill);
      if (existing) {
        return current.map((r) =>
          r.skill === skill
            ? {
                ...r,
                rating: newRating,
                previousRating: prev,
              }
            : r,
        );
      }
      return [
        ...current,
        {
          skill,
          rating: newRating,
          previousRating: prev,
        },
      ];
    });
    // Also add to selectedSkills if not already there
    setSelectedSkills((current) => (current.includes(skill) ? current : [...current, skill]));
  };

  /** Remove a parent skill rating entirely. */
  const removeSkillRating = (skill: string) => {
    setSkillRatings((prev) => prev.filter((r) => r.skill !== skill));
    setSelectedSkills((prev) => prev.filter((item) => item !== skill));
  };

  /** Rate a sub-skill (1-5). Updates subSkillRatings and derives parent rating. */
  const updateSubSkillRating = (
    parentSkill: FootballSkill,
    subSkill: string,
    newRating: 1 | 2 | 3 | 4 | 5,
  ) => {
    setSubSkillRatings((prev) => {
      const withoutThis = prev.filter(
        (r) => !(r.parentSkill === parentSkill && r.subSkill === subSkill),
      );
      return [
        ...withoutThis,
        {
          subSkill,
          parentSkill,
          rating: newRating,
        },
      ];
    });
    // Also add parent to selectedSkills for tracking
    setSelectedSkills((current) =>
      current.includes(parentSkill) ? current : [...current, parentSkill],
    );
  };

  /** Remove all sub-skill ratings for a parent skill. */
  const removeParentRatings = (parentSkill: FootballSkill) => {
    setSubSkillRatings((prev) => prev.filter((r) => r.parentSkill !== parentSkill));
    setSkillRatings((prev) => prev.filter((r) => r.skill !== parentSkill));
    setSelectedSkills((prev) => prev.filter((item) => item !== parentSkill));
  };

  /** Derive parent averages from current sub-skill ratings (for display). */
  const derivedParentAverages = deriveParentRatingsFromSubSkills(subSkillRatings);
  const handleAddImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setMediaPermissionMessage(
          'Photo and video library access is required to attach media. Enable it in Settings.',
        );
        uiFeedback.showToast('Please allow access to your photos', 'warning');
        return;
      }
      setMediaPermissionMessage(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0])
        setImageUrls((prev) => [...prev, result.assets[0].uri]);
    } catch (error) {
      logger.error('Failed to pick image', error);
      uiFeedback.showToast('Failed to pick image', 'error');
    }
  };
  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const handleAddVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setMediaPermissionMessage(
          'Photo and video library access is required to attach media. Enable it in Settings.',
        );
        uiFeedback.showToast('Please allow access to your videos', 'warning');
        return;
      }
      setMediaPermissionMessage(null);
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
      uiFeedback.showToast('Failed to pick video', 'error');
    }
  };
  const handleRemoveVideo = (index: number) => {
    setVideoUrls((prev) => prev.filter((_, i) => i !== index));
  };
  const openMediaSettings = () => {
    void Linking.openSettings();
  };
  const clearMediaPermissionMessage = () => {
    setMediaPermissionMessage(null);
  };
  const handleBadgeAwarded = (award: BadgeAward) => {
    setSessionBadges((prev) => [award, ...prev]);
    setShowBadgeModal(false);
  };
  const handleOpenBadgeModal = () => setShowBadgeModal(true);
  const handleCloseBadgeModal = () => setShowBadgeModal(false);
  return {
    session,
    athlete,
    currentUser,
    loading: status === 'loading',
    status: status as ScreenStatus,
    error: status === 'error' ? (error as ServiceError | null) : null,
    retry,
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
    mediaPermissionMessage,
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
    openMediaSettings,
    clearMediaPermissionMessage,
    handleBadgeAwarded,
    handleOpenBadgeModal,
    handleCloseBadgeModal,
    formatDate,
  };
}
