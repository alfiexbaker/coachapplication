/**
 * useSquadLeaderboard — Rankings from squad members or seeded demo data.
 * Privacy-first: initials only, no full names shown.
 */
import { useEffect, useMemo, useState } from 'react';

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { badgeService } from '@/services/badge-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useSquadLeaderboard');

export interface LeaderboardEntry {
  athleteId: string;
  initials: string;
  streakWeeks: number;
  totalSessions: number;
  badgeCount: number;
}

type LeaderboardCategory = 'streak' | 'sessions' | 'badges';

interface UseSquadLeaderboardInput {
  athleteId: string | null;
  athleteName: string;
}

interface UseSquadLeaderboardResult {
  entries: LeaderboardEntry[];
  myRank: Record<LeaderboardCategory, number>;
  loading: boolean;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const DEMO_NAMES = [
  'Alex Turner', 'Jamie Bell', 'Sam Wright', 'Jordan Lee',
  'Riley Chen', 'Morgan Park', 'Casey Dunn', 'Taylor Kim',
];

function buildDemoEntries(athleteId: string, athleteName: string): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = DEMO_NAMES.map((name, i) => ({
    athleteId: `demo-athlete-${i}`,
    initials: getInitials(name),
    streakWeeks: Math.floor(Math.random() * 12) + 1,
    totalSessions: Math.floor(Math.random() * 30) + 5,
    badgeCount: Math.floor(Math.random() * 15) + 1,
  }));

  entries.push({
    athleteId,
    initials: getInitials(athleteName),
    streakWeeks: 0,
    totalSessions: 0,
    badgeCount: 0,
  });

  return entries;
}

function computeRank(entries: LeaderboardEntry[], athleteId: string, key: keyof LeaderboardEntry): number {
  const sorted = [...entries].sort((a, b) => (b[key] as number) - (a[key] as number));
  const index = sorted.findIndex((e) => e.athleteId === athleteId);
  return index >= 0 ? index + 1 : entries.length;
}

export function useSquadLeaderboard({ athleteId, athleteName }: UseSquadLeaderboardInput): UseSquadLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!athleteId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const cached = await apiClient.get<LeaderboardEntry[] | null>(STORAGE_KEYS.SQUAD_LEADERBOARD, null);

        if (cached && cached.length > 0) {
          if (!cancelled) setEntries(cached);
        } else {
          const demo = buildDemoEntries(athleteId, athleteName);

          const streakInfo = await badgeService.getStreakInfo(athleteId);
          const myEntry = demo.find((e) => e.athleteId === athleteId);
          if (myEntry) {
            myEntry.streakWeeks = streakInfo.currentStreak;
          }

          if (!cancelled) {
            setEntries(demo);
            await apiClient.set(STORAGE_KEYS.SQUAD_LEADERBOARD, demo);
          }
        }
      } catch (error) {
        logger.error('Failed to load leaderboard', error);
        if (!cancelled) setEntries(buildDemoEntries(athleteId, athleteName));
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [athleteId, athleteName]);

  const myRank = useMemo<Record<LeaderboardCategory, number>>(() => {
    if (!athleteId || entries.length === 0) {
      return { streak: 0, sessions: 0, badges: 0 };
    }
    return {
      streak: computeRank(entries, athleteId, 'streakWeeks'),
      sessions: computeRank(entries, athleteId, 'totalSessions'),
      badges: computeRank(entries, athleteId, 'badgeCount'),
    };
  }, [athleteId, entries]);

  return useMemo(
    () => ({ entries, myRank, loading }),
    [entries, myRank, loading],
  );
}
