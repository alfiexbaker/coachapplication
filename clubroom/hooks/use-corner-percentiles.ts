import { useEffect, useState } from "react";
import { STORAGE_KEYS } from "@/constants/storage-keys";
import { mapSkillToCorner } from "@/constants/position-skills";
import { apiClient } from "@/services/api-client";
import type { FourCornerKey } from "@/types/progress-types";
import { createLogger } from "@/utils/logger";
const logger = createLogger("useCornerPercentiles");
type CornerScoreMap = Record<FourCornerKey, number>;
interface SkillLevelLike {
  skill: string;
  level: number;
}
interface AthleteSkillLevelsLike {
  skills: Record<string, SkillLevelLike>;
}
interface UseCornerPercentilesInput {
  athleteId: string | null;
  cornerValues: CornerScoreMap;
}
const EMPTY_TOP_PERCENT: Record<FourCornerKey, number | null> = {
  technical: null,
  physical: null,
  psychological: null,
  social: null,
};
function averageCornerScore(levels: number[]): number {
  if (levels.length === 0) {
    return 0;
  }
  const average = levels.reduce((sum, level) => sum + level, 0) / levels.length;
  return Math.round(average * 10);
}
function buildCornerScores(
  skills: Record<string, SkillLevelLike>,
): CornerScoreMap {
  const grouped: Record<FourCornerKey, number[]> = {
    technical: [],
    physical: [],
    psychological: [],
    social: [],
  };
  for (const entry of Object.values(skills)) {
    grouped[mapSkillToCorner(entry.skill)].push(entry.level);
  }
  return {
    technical: averageCornerScore(grouped.technical),
    physical: averageCornerScore(grouped.physical),
    psychological: averageCornerScore(grouped.psychological),
    social: averageCornerScore(grouped.social),
  };
}
export function useCornerPercentiles({
  athleteId,
  cornerValues,
}: UseCornerPercentilesInput): Record<FourCornerKey, number | null> {
  const [topPercentByCorner, setTopPercentByCorner] =
    useState<Record<FourCornerKey, number | null>>(EMPTY_TOP_PERCENT);
  const cornerValuesKey = `${cornerValues.technical}|${cornerValues.physical}|${cornerValues.psychological}|${cornerValues.social}`;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!athleteId) {
        setTopPercentByCorner(EMPTY_TOP_PERCENT);
        return;
      }
      try {
        const allSkillLevels = await apiClient.get<
          Record<string, AthleteSkillLevelsLike>
        >(STORAGE_KEYS.SKILL_LEVELS, {});
        const peerCornerScores = Object.values(allSkillLevels).map((record) =>
          buildCornerScores(record.skills ?? {}),
        );
        const next: Record<FourCornerKey, number | null> = {
          technical: null,
          physical: null,
          psychological: null,
          social: null,
        };
        (Object.keys(next) as FourCornerKey[]).forEach((corner) => {
          const athleteScore = cornerValues[corner];
          if (athleteScore <= 0) {
            next[corner] = null;
            return;
          }
          const pool = peerCornerScores.flatMap((score) => {
            const mapped = score[corner];
            return mapped > 0 ? [mapped] : [];
          });
          pool.push(athleteScore);
          if (pool.length < 3) {
            next[corner] = null;
            return;
          }
          const higherCount = pool.filter(
            (score) => score > athleteScore,
          ).length;
          const rank = higherCount + 1;
          const topPercent = Math.max(
            1,
            Math.min(100, Math.round((rank / pool.length) * 100)),
          );
          next[corner] = topPercent;
        });
        if (!cancelled) {
          setTopPercentByCorner(next);
        }
      } catch (error) {
        logger.error("Failed to compute corner percentiles", {
          athleteId,
          error,
        });
        if (!cancelled) {
          setTopPercentByCorner(EMPTY_TOP_PERCENT);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [athleteId, cornerValuesKey, cornerValues]);
  return topPercentByCorner;
}
