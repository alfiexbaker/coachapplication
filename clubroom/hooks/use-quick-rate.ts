import { useEffect, useState, startTransition } from 'react';

import {
  POSITION_SKILLS,
  RATING_LABELS,
  UNIVERSAL_SKILLS,
  SKILL_SUB_SKILLS,
  computeFourCorners,
  deriveParentRatingsFromSubSkills,
} from '@/constants/position-skills';
import { childService } from '@/services/child-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { progressPositionService } from '@/services/progress/progress-position-service';
import { createLogger } from '@/utils/logger';
import type {
  FootballSkill,
  PositionRole,
  QuickRateInput,
  SessionSkillRating,
  SkillTrendDirection,
  SubSkillRating,
} from '@/types/progress-types';

const logger = createLogger('UseQuickRate');

const DEFAULT_RATING = 3;
const DEFAULT_POSITION: PositionRole = 'MID';

export interface QuickRateAthlete {
  athleteId: string;
  athleteName: string;
}

interface UseQuickRateParams {
  athletes: QuickRateAthlete[];
  sessionId: string;
  coachId: string;
  effortByAthleteId?: Record<string, number>;
}

function clampOneToFive(value: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(value))) as 1 | 2 | 3 | 4 | 5;
}

function toFivePointRating(value: number | undefined): 1 | 2 | 3 | 4 | 5 {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_RATING as 1 | 2 | 3 | 4 | 5;
  }
  if (value <= 5) {
    return clampOneToFive(value);
  }
  return clampOneToFive(Math.round(value / 2));
}

function buildTrend(current: number, previous?: number): SkillTrendDirection {
  if (typeof previous !== 'number') {
    return 'consistent';
  }
  if (current > previous) {
    return 'improving';
  }
  if (current < previous) {
    return 'declining';
  }
  return 'consistent';
}

function buildSkillRating(
  skill: FootballSkill,
  rating: number,
  previousRating?: number,
): SessionSkillRating {
  const clamped = clampOneToFive(rating);
  return {
    skill,
    rating: clamped,
    label: RATING_LABELS[clamped],
    trend: buildTrend(clamped, previousRating),
    previousRating,
  };
}

function getSkillsForPosition(position: PositionRole): FootballSkill[] {
  return [...UNIVERSAL_SKILLS, ...POSITION_SKILLS[position]];
}

function buildSkillRatingsForPosition(
  position: PositionRole,
  options?: {
    currentBySkill?: Partial<Record<FootballSkill, number>>;
    previousBySkill?: Partial<Record<FootballSkill, number>>;
  },
): SessionSkillRating[] {
  const skills = getSkillsForPosition(position);
  return skills.map((skill) => {
    const current = options?.currentBySkill?.[skill] ?? DEFAULT_RATING;
    const previous = options?.previousBySkill?.[skill];
    return buildSkillRating(skill, current, previous);
  });
}

function buildQuickRateInput(
  athlete: QuickRateAthlete,
  sessionId: string,
  coachId: string,
  effort: number,
  positionPlayed: PositionRole,
  positionSkillRatings: SessionSkillRating[],
): QuickRateInput {
  const fourCorners = computeFourCorners(positionSkillRatings);
  return {
    athleteId: athlete.athleteId,
    athleteName: athlete.athleteName,
    sessionId,
    coachId,
    effort: clampOneToFive(effort),
    positionPlayed,
    positionSkillRatings,
    technical: fourCorners.technical,
    physical: fourCorners.physical,
    psychological: fourCorners.psychological,
    social: fourCorners.social,
  };
}

function buildSkillLookup(
  ratings: SessionSkillRating[] | undefined,
): Partial<Record<FootballSkill, number>> {
  const lookup: Partial<Record<FootballSkill, number>> = {};
  for (const rating of ratings ?? []) {
    lookup[rating.skill] = toFivePointRating(rating.rating);
  }
  return lookup;
}

function createDefaultRating(
  athlete: QuickRateAthlete,
  sessionId: string,
  coachId: string,
  positionPlayed: PositionRole,
  effortByAthleteId?: Record<string, number>,
  previousBySkill?: Partial<Record<FootballSkill, number>>,
): QuickRateInput {
  const positionSkillRatings = buildSkillRatingsForPosition(positionPlayed, {
    previousBySkill,
  });
  return buildQuickRateInput(
    athlete,
    sessionId,
    coachId,
    effortByAthleteId?.[athlete.athleteId] ?? DEFAULT_RATING,
    positionPlayed,
    positionSkillRatings,
  );
}

export function useQuickRate({
  athletes,
  sessionId,
  coachId,
  effortByAthleteId,
}: UseQuickRateParams) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratingsByAthleteId, setRatingsByAthleteId] = useState<Record<string, QuickRateInput>>({});
  const [positionByAthleteId, setPositionByAthleteId] = useState<Record<string, PositionRole>>({});
  /** Multi-position selections per athlete */
  const [positionsByAthleteId, setPositionsByAthleteId] = useState<Record<string, PositionRole[]>>(
    {},
  );
  /** Sub-skill ratings per athlete */
  const [subSkillsByAthleteId, setSubSkillsByAthleteId] = useState<
    Record<string, SubSkillRating[]>
  >({});
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSkippedAll, setIsSkippedAll] = useState(false);

  const athleteKey = athletes.map((athlete) => athlete.athleteId).join('|');

  useEffect(() => {
    const controller = new AbortController();

    if (athletes.length === 0) {
      startTransition(() => {
        setRatingsByAthleteId({});
      });
      startTransition(() => {
        setPositionByAthleteId({});
      });
      startTransition(() => {
        setPositionsByAthleteId({});
      });
      startTransition(() => {
        setSubSkillsByAthleteId({});
      });
      startTransition(() => {
        setCurrentIndex(0);
      });
      startTransition(() => {
        setIsPrefilling(false);
      });
      startTransition(() => {
        setIsSkippedAll(false);
      });
      return () => {
        controller.abort();
      };
    }

    const prefillFromPrevious = async () => {
      setIsPrefilling(true);

      const nextRatings: Record<string, QuickRateInput> = {};
      const nextPositions: Record<string, PositionRole> = {};
      const nextPositionsMulti: Record<string, PositionRole[]> = {};

      await Promise.all(
        athletes.map(async (athlete) => {
          try {
            const [positionResult, latestFeedback, childProfile] = await Promise.all([
              progressPositionService.getMostPlayedPosition(athlete.athleteId),
              progressFeedbackService.getLatestForAthlete(athlete.athleteId),
              childService.getChild(athlete.athleteId),
            ]);

            const previousBySkill = buildSkillLookup(
              latestFeedback?.skillRatings as SessionSkillRating[] | undefined,
            );
            const inferredPosition =
              latestFeedback?.positionPlayed ??
              childProfile?.primaryPosition ??
              (positionResult.success ? positionResult.data : null) ??
              DEFAULT_POSITION;

            nextPositions[athlete.athleteId] = inferredPosition;
            nextPositionsMulti[athlete.athleteId] =
              latestFeedback?.positionsPlayed && latestFeedback.positionsPlayed.length > 0
                ? latestFeedback.positionsPlayed
                : [inferredPosition];
            const base = createDefaultRating(
              athlete,
              sessionId,
              coachId,
              inferredPosition,
              effortByAthleteId,
              previousBySkill,
            );

            if (latestFeedback) {
              const previousRatings = buildSkillLookup(
                latestFeedback.skillRatings as SessionSkillRating[] | undefined,
              );
              const hydratedSkillRatings = buildSkillRatingsForPosition(inferredPosition, {
                currentBySkill: previousRatings,
                previousBySkill,
              });

              nextRatings[athlete.athleteId] = {
                ...base,
                effort: clampOneToFive(latestFeedback.effortRating || base.effort),
                badgeId: latestFeedback.badgeAwarded,
                positionSkillRatings: hydratedSkillRatings,
                sessionTemplateId: latestFeedback.sessionTemplateId,
                sessionTemplateName: latestFeedback.sessionTemplateName,
                sessionTitle: latestFeedback.sessionTitle,
                positionPlayed: inferredPosition,
                ...computeFourCorners(hydratedSkillRatings),
              };
              return;
            }

            nextRatings[athlete.athleteId] = base;
          } catch (error) {
            logger.error('Failed to prefill quick rate position ratings', {
              athleteId: athlete.athleteId,
              error,
            });
            nextPositions[athlete.athleteId] = DEFAULT_POSITION;
            nextPositionsMulti[athlete.athleteId] = [DEFAULT_POSITION];
            nextRatings[athlete.athleteId] = createDefaultRating(
              athlete,
              sessionId,
              coachId,
              DEFAULT_POSITION,
              effortByAthleteId,
            );
          }
        }),
      );

      if (!controller.signal.aborted) {
        setRatingsByAthleteId(nextRatings);
        setPositionByAthleteId(nextPositions);
        setPositionsByAthleteId(nextPositionsMulti);
      }
      setCurrentIndex((prev) => Math.max(0, Math.min(prev, athletes.length - 1)));
      setIsPrefilling(false);
      setIsSkippedAll(false);
    };

    void prefillFromPrevious();

    return () => {
      controller.abort();
    };
  }, [athleteKey, athletes, coachId, effortByAthleteId, sessionId]);

  const setIndex = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, Math.max(athletes.length - 1, 0))));
  };

  const updatePosition = (athleteId: string, position: PositionRole) => {
    setIsSkippedAll(false);
    setPositionByAthleteId((prev) => ({ ...prev, [athleteId]: position }));
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) {
        // Create a default entry if prefill hasn't populated this athlete yet
        const athlete = athletes.find((a) => a.athleteId === athleteId);
        if (!athlete) return prev;
        const defaultEntry = createDefaultRating(
          athlete,
          sessionId,
          coachId,
          position,
          effortByAthleteId,
        );
        return { ...prev, [athleteId]: defaultEntry };
      }

      const existingLookup = buildSkillLookup(existing.positionSkillRatings);
      const nextRatings = buildSkillRatingsForPosition(position, {
        currentBySkill: {
          'Work Rate': existingLookup['Work Rate'],
          Attitude: existingLookup.Attitude,
          Communication: existingLookup.Communication,
          Coachability: existingLookup.Coachability,
        },
        previousBySkill: existingLookup,
      });

      const fourCorners = computeFourCorners(nextRatings);
      return {
        ...prev,
        [athleteId]: {
          ...existing,
          positionPlayed: position,
          positionSkillRatings: nextRatings,
          ...fourCorners,
        },
      };
    });
  };

  const updateSkillRating = (athleteId: string, skill: FootballSkill, value: number) => {
    setIsSkippedAll(false);
    setRatingsByAthleteId((prev) => {
      let existing = prev[athleteId];
      if (!existing) {
        // Create a default entry if prefill hasn't populated this athlete yet
        const athlete = athletes.find((a) => a.athleteId === athleteId);
        if (!athlete) return prev;
        const position = positionByAthleteId[athleteId] ?? DEFAULT_POSITION;
        existing = createDefaultRating(athlete, sessionId, coachId, position, effortByAthleteId);
      }

      const previousLookup = buildSkillLookup(existing.positionSkillRatings);
      const updatedSkillRatings = (existing.positionSkillRatings ?? []).map((entry) => {
        if (entry.skill !== skill) {
          return entry;
        }
        const nextRating = clampOneToFive(value);
        return {
          ...entry,
          rating: nextRating,
          label: RATING_LABELS[nextRating],
          trend: buildTrend(nextRating, entry.previousRating),
          previousRating: entry.previousRating ?? previousLookup[entry.skill],
        };
      });

      const fourCorners = computeFourCorners(updatedSkillRatings);

      return {
        ...prev,
        [athleteId]: {
          ...existing,
          positionSkillRatings: updatedSkillRatings,
          ...fourCorners,
        },
      };
    });
  };

  const updateEffort = (athleteId: string, value: number) => {
    setIsSkippedAll(false);
    setRatingsByAthleteId((prev) => {
      let existing = prev[athleteId];
      if (!existing) {
        const athlete = athletes.find((a) => a.athleteId === athleteId);
        if (!athlete) return prev;
        const position = positionByAthleteId[athleteId] ?? DEFAULT_POSITION;
        existing = createDefaultRating(athlete, sessionId, coachId, position, effortByAthleteId);
      }
      return {
        ...prev,
        [athleteId]: {
          ...existing,
          effort: clampOneToFive(value),
        },
      };
    });
  };

  const setBadge = (athleteId: string, badgeId?: string) => {
    setIsSkippedAll(false);
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) {
        return prev;
      }
      return {
        ...prev,
        [athleteId]: {
          ...existing,
          badgeId,
        },
      };
    });
  };

  const setMediaIds = (athleteId: string, mediaIds: string[]) => {
    setIsSkippedAll(false);
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) {
        return prev;
      }
      return {
        ...prev,
        [athleteId]: {
          ...existing,
          mediaIds,
        },
      };
    });
  };

  /** Toggle a position for an athlete (multi-select, min 1). */
  const togglePosition = (athleteId: string, position: PositionRole) => {
    setIsSkippedAll(false);
    setPositionsByAthleteId((prev) => {
      const current = prev[athleteId] ?? [DEFAULT_POSITION];
      const isActive = current.includes(position);
      if (isActive && current.length === 1) return prev; // min 1
      const next = isActive ? current.filter((p) => p !== position) : [...current, position];
      return { ...prev, [athleteId]: next };
    });
    // Also update legacy single position to first in list
    setPositionByAthleteId((prev) => {
      const current = positionsByAthleteId[athleteId] ?? [DEFAULT_POSITION];
      const isActive = current.includes(position);
      const next = isActive ? current.filter((p) => p !== position) : [...current, position];
      return { ...prev, [athleteId]: next[0] ?? DEFAULT_POSITION };
    });
    // Rebuild skill ratings for new position set
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) return prev;
      const currentPositions = positionsByAthleteId[athleteId] ?? [DEFAULT_POSITION];
      const isActive = currentPositions.includes(position);
      const nextPositions = isActive
        ? currentPositions.filter((p) => p !== position)
        : [...currentPositions, position];
      const primaryPosition = nextPositions[0] ?? DEFAULT_POSITION;

      const existingLookup = buildSkillLookup(existing.positionSkillRatings);
      // Build ratings merging all positions' skills
      const allSkills = new Set<FootballSkill>(UNIVERSAL_SKILLS);
      for (const pos of nextPositions) {
        for (const skill of POSITION_SKILLS[pos]) {
          allSkills.add(skill);
        }
      }
      const nextRatings = Array.from(allSkills).map((skill) => {
        const current = existingLookup[skill] ?? DEFAULT_RATING;
        const previous = existingLookup[skill];
        return buildSkillRating(skill, current, previous);
      });

      const fourCorners = computeFourCorners(nextRatings);
      return {
        ...prev,
        [athleteId]: {
          ...existing,
          positionPlayed: primaryPosition,
          positionsPlayed: nextPositions,
          positionSkillRatings: nextRatings,
          ...fourCorners,
        },
      };
    });
  };

  /** Rate a sub-skill for an athlete (optional in quick rate). */
  const updateSubSkillRating = (
    athleteId: string,
    parentSkill: FootballSkill,
    subSkill: string,
    value: number,
  ) => {
    setIsSkippedAll(false);
    const rating = clampOneToFive(value);
    setSubSkillsByAthleteId((prev) => {
      const current = prev[athleteId] ?? [];
      const withoutThis = current.filter(
        (r) => !(r.parentSkill === parentSkill && r.subSkill === subSkill),
      );
      return {
        ...prev,
        [athleteId]: [...withoutThis, { subSkill, parentSkill, rating }],
      };
    });
    // Also update the parent skill rating from sub-skill averages
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) return prev;
      // Get all sub-skill ratings for this parent (including the new one)
      const currentSubs = subSkillsByAthleteId[athleteId] ?? [];
      const allSubs = [
        ...currentSubs.filter((r) => !(r.parentSkill === parentSkill && r.subSkill === subSkill)),
        { subSkill, parentSkill, rating },
      ];
      const parentAvgs = deriveParentRatingsFromSubSkills(allSubs);
      const derivedRating = parentAvgs[parentSkill];
      if (derivedRating === undefined) return prev;

      const updatedSkillRatings = (existing.positionSkillRatings ?? []).map((entry) => {
        if (entry.skill !== parentSkill) return entry;
        const nextRating = clampOneToFive(Math.round(derivedRating));
        return {
          ...entry,
          rating: nextRating,
          label: RATING_LABELS[nextRating],
          trend: buildTrend(nextRating, entry.previousRating),
        };
      });
      const fourCorners = computeFourCorners(updatedSkillRatings);
      return {
        ...prev,
        [athleteId]: {
          ...existing,
          positionSkillRatings: updatedSkillRatings,
          subSkillRatings: allSubs,
          ...fourCorners,
        },
      };
    });
  };

  const clearAllRatings = () => {
    setIsSkippedAll(true);
    setCurrentIndex(0);
  };

  return {
    currentIndex,
    ratingsByAthleteId,
    positionByAthleteId,
    positionsByAthleteId,
    subSkillsByAthleteId,
    isPrefilling,
    isSkippedAll,
    setIndex,
    updatePosition,
    togglePosition,
    updateSkillRating,
    updateSubSkillRating,
    updateEffort,
    setBadge,
    setMediaIds,
    clearAllRatings,
  } as const;
}
