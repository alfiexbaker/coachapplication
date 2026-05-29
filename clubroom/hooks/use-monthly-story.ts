/**
 * useMonthlyStory — Story state, auto-advance timer, page index.
 * Instagram stories-style auto-play with tap-to-advance.
 */
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { HapticPatterns } from '@/utils/haptics';

export interface StoryPage {
  id: string;
  type: 'intro' | 'stat' | 'coach_quote' | 'badges' | 'next_focus';
  title: string;
  body: string;
  accent?: string;
  stat?: { value: string; label: string };
  photo?: string;
}

interface UseMonthlyStoryInput {
  pages: StoryPage[];
  autoAdvanceMs?: number;
}

interface UseMonthlyStoryResult {
  currentPage: StoryPage | null;
  pageIndex: number;
  totalPages: number;
  progress: number; // 0-1 per page
  isPlaying: boolean;
  advance: () => void;
  goBack: () => void;
  pause: () => void;
  resume: () => void;
  close: () => boolean; // returns true if closed
}

interface MonthlyStoryTimerConfig {
  timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>;
  startTimeRef: MutableRefObject<number>;
  setProgress: Dispatch<SetStateAction<number>>;
  setPageIndex: Dispatch<SetStateAction<number>>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  autoAdvanceMs: number;
  totalPages: number;
}

function clearMonthlyStoryTimer(timerRef: MutableRefObject<ReturnType<typeof setInterval> | null>) {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
}

function startMonthlyStoryTimer({
  timerRef,
  startTimeRef,
  setProgress,
  setPageIndex,
  setIsPlaying,
  autoAdvanceMs,
  totalPages,
}: MonthlyStoryTimerConfig) {
  clearMonthlyStoryTimer(timerRef);
  startTimeRef.current = Date.now();
  setProgress(0);

  timerRef.current = setInterval(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const pct = Math.min(elapsed / autoAdvanceMs, 1);
    setProgress(pct);

    if (pct >= 1) {
      setPageIndex((prev) => {
        if (prev < totalPages - 1) {
          startTimeRef.current = Date.now();
          setProgress(0);
          return prev + 1;
        }
        clearMonthlyStoryTimer(timerRef);
        setIsPlaying(false);
        return prev;
      });
    }
  }, 50);
}

export function useMonthlyStory({
  pages,
  autoAdvanceMs = 5000,
}: UseMonthlyStoryInput): UseMonthlyStoryResult {
  const [pageIndex, setPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [initialStartTime] = useState(() => Date.now());
  const startTimeRef = useRef(initialStartTime);

  const totalPages = pages.length;
  const currentPage = pages[pageIndex] ?? null;

  const clearTimer = () => {
    clearMonthlyStoryTimer(timerRef);
  };

  const startTimer = () => {
    startMonthlyStoryTimer({
      timerRef,
      startTimeRef,
      setProgress,
      setPageIndex,
      setIsPlaying,
      autoAdvanceMs,
      totalPages,
    });
  };

  useEffect(() => {
    if (isPlaying && totalPages > 0) {
      startMonthlyStoryTimer({
        timerRef,
        startTimeRef,
        setProgress,
        setPageIndex,
        setIsPlaying,
        autoAdvanceMs,
        totalPages,
      });
    }
    return () => {
      clearMonthlyStoryTimer(timerRef);
    };
  }, [autoAdvanceMs, isPlaying, totalPages]);

  const advance = () => {
    void HapticPatterns.storyPageAdvance();
    if (pageIndex < totalPages - 1) {
      startTimeRef.current = Date.now();
      setProgress(0);
      setPageIndex((prev) => prev + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const goBack = () => {
    void HapticPatterns.tap();
    if (pageIndex > 0) {
      startTimeRef.current = Date.now();
      setProgress(0);
      setPageIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  };

  const pause = () => {
    setIsPlaying(false);
    clearTimer();
  };

  const resume = () => {
    setIsPlaying(true);
  };

  const close = () => {
    clearTimer();
    setIsPlaying(false);
    setPageIndex(0);
    setProgress(0);
    return true;
  };

  return {
    currentPage,
    pageIndex,
    totalPages,
    progress,
    isPlaying,
    advance,
    goBack,
    pause,
    resume,
    close,
  };
}
