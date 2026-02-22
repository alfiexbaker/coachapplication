import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  POSITION_SKILLS,
  RATING_LABELS,
  UNIVERSAL_SKILLS,
  computeFourCorners,
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

function buildSkillRating(skill: FootballSkill, rating: number, previousRating?: number): SessionSkillRating {
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

function buildSkillLookup(ratings: SessionSkillRating[] | undefined): Partial<Record<FootballSkill, number>> {
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

export function useQuickRate({ athletes, sessionId, coachId, effortByAthleteId }: UseQuickRateParams) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratingsByAthleteId, setRatingsByAthleteId] = useState<Record<string, QuickRateInput>>({});
  const [positionByAthleteId, setPositionByAthleteId] = useState<Record<string, PositionRole>>({});
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSkippedAll, setIsSkippedAll] = useState(false);

  const athleteKey = useMemo(() => athletes.map((athlete) => athlete.athleteId).join('|'), [athletes]);

  useEffect(() => {
    let isMounted = true;

    if (athletes.length === 0) {
      setRatingsByAthleteId({});
      setPositionByAthleteId({});
      setCurrentIndex(0);
      setIsPrefilling(false);
      setIsSkippedAll(false);
      return () => {
        isMounted = false;
      };
    }

    const prefillFromPrevious = async () => {
      setIsPrefilling(true);

      const nextRatings: Record<string, QuickRateInput> = {};
      const nextPositions: Record<string, PositionRole> = {};

      await Promise.all(
        athletes.map(async (athlete) => {
          try {
            const [positionResult, latestFeedback, childProfile] = await Promise.all([
              progressPositionService.getMostPlayedPosition(athlete.athleteId),
              progressFeedbackService.getLatestForAthlete(athlete.athleteId),
              childService.getChild(athlete.athleteId),
            ]);

            const previousBySkill = buildSkillLookup(latestFeedback?.skillRatings as SessionSkillRating[] | undefined);
            const inferredPosition =
              latestFeedback?.positionPlayed ??
              childProfile?.primaryPosition ??
              (positionResult.success ? positionResult.data : null) ??
              DEFAULT_POSITION;

            nextPositions[athlete.athleteId] = inferredPosition;
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

      if (!isMounted) {
        return;
      }

      setRatingsByAthleteId(nextRatings);
      setPositionByAthleteId(nextPositions);
      setCurrentIndex((prev) => Math.max(0, Math.min(prev, athletes.length - 1)));
      setIsPrefilling(false);
      setIsSkippedAll(false);
    };

    void prefillFromPrevious();

    return () => {
      isMounted = false;
    };
  }, [athleteKey, athletes, coachId, effortByAthleteId, sessionId]);

  const setIndex = useCallback(
    (index: number) => {
      setCurrentIndex(Math.max(0, Math.min(index, Math.max(athletes.length - 1, 0))));
    },
    [athletes.length],
  );

  const updatePosition = useCallback((athleteId: string, position: PositionRole) => {
    setIsSkippedAll(false);
    setPositionByAthleteId((prev) => ({ ...prev, [athleteId]: position }));
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) {
        return prev;
      }

      const existingLookup = buildSkillLookup(existing.positionSkillRatings);
      const previousLookup = buildSkillLookup(existing.positionSkillRatings);
      const nextRatings = buildSkillRatingsForPosition(position, {
        currentBySkill: {
          'Work Rate': existingLookup['Work Rate'],
          Attitude: existingLookup.Attitude,
          Communication: existingLookup.Communication,
          Coachability: existingLookup.Coachability,
        },
        previousBySkill: previousLookup,
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
  }, []);

  const updateSkillRating = useCallback((athleteId: string, skill: FootballSkill, value: number) => {
    setIsSkippedAll(false);
    setRatingsByAthleteId((prev) => {
      const existing = prev[athleteId];
      if (!existing) {
        return prev;
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
  }, []);

  const updateEffort = useCallback((athleteId: string, value: number) => {
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
          effort: clampOneToFive(value),
        },
      };
    });
  }, []);

  const setBadge = useCallback((athleteId: string, badgeId?: string) => {
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
  }, []);

  const setMediaIds = useCallback((athleteId: string, mediaIds: string[]) => {
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
  }, []);

  const clearAllRatings = useCallback(() => {
    setIsSkippedAll(true);
    setCurrentIndex(0);
  }, []);

  return {
    currentIndex,
    ratingsByAthleteId,
    positionByAthleteId,
    isPrefilling,
    isSkippedAll,
    setIndex,
    updatePosition,
    updateSkillRating,
    updateEffort,
    setBadge,
    setMediaIds,
    clearAllRatings,
  } as const;
}
