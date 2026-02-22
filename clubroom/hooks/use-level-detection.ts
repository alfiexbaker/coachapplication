import { useEffect, useRef } from 'react';

import { emitTyped, ServiceEvents } from '@/services/event-bus';

interface UseLevelDetectionInput {
  userId: string | null;
  currentLevel: number;
  levelName: string;
}

export function useLevelDetection({
  userId,
  currentLevel,
  levelName,
}: UseLevelDetectionInput): void {
  const previousLevelRef = useRef<number | null>(null);
  const previousUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }

    if (previousUserRef.current !== userId) {
      previousUserRef.current = userId;
      previousLevelRef.current = currentLevel;
      return;
    }

    if (previousLevelRef.current === null) {
      previousLevelRef.current = currentLevel;
      return;
    }

    if (currentLevel > previousLevelRef.current) {
      emitTyped(ServiceEvents.LEVEL_UP, {
        userId,
        previousLevel: previousLevelRef.current,
        newLevel: currentLevel,
        newLevelName: levelName,
      });
    }

    previousLevelRef.current = currentLevel;
  }, [currentLevel, levelName, userId]);
}
