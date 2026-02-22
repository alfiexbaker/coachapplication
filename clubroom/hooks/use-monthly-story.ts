/**
 * useMonthlyStory — Story state, auto-advance timer, page index.
 * Instagram stories-style auto-play with tap-to-advance.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

export function useMonthlyStory({
  pages,
  autoAdvanceMs = 5000,
}: UseMonthlyStoryInput): UseMonthlyStoryResult {
  const [pageIndex, setPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  const totalPages = pages.length;
  const currentPage = pages[pageIndex] ?? null;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
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
            return prev + 1;
          }
          clearTimer();
          setIsPlaying(false);
          return prev;
        });
      }
    }, 50);
  }, [autoAdvanceMs, clearTimer, totalPages]);

  useEffect(() => {
    if (isPlaying && totalPages > 0) {
      startTimer();
    }
    return clearTimer;
  }, [clearTimer, isPlaying, startTimer, totalPages]);

  // Restart timer when page changes
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Date.now();
      setProgress(0);
    }
  }, [isPlaying, pageIndex]);

  const advance = useCallback(() => {
    void HapticPatterns.storyPageAdvance();
    if (pageIndex < totalPages - 1) {
      setPageIndex((prev) => prev + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [pageIndex, totalPages]);

  const goBack = useCallback(() => {
    void HapticPatterns.tap();
    if (pageIndex > 0) {
      setPageIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  }, [pageIndex]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    clearTimer();
  }, [clearTimer]);

  const resume = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setIsPlaying(false);
    setPageIndex(0);
    setProgress(0);
    return true;
  }, [clearTimer]);

  return useMemo(
    () => ({
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
    }),
    [advance, close, currentPage, goBack, isPlaying, pageIndex, pause, progress, resume, totalPages],
  );
}
