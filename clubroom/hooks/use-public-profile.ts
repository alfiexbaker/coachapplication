/**
 * Hook for the Public Coach Profile screen.
 * Manages coach data loading, reviews, tab state, and navigation handlers.
 */

import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { Components } from '@/constants/theme';
import type { Ionicons } from '@expo/vector-icons';

export type ProfileTabId = 'about' | 'specialties' | 'qualifications' | 'reviews';

export interface ProfileTabDef {
  id: ProfileTabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const PROFILE_TABS: ProfileTabDef[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'specialties', label: 'Specialties', icon: 'football-outline' },
  { id: 'qualifications', label: 'Qualifications', icon: 'ribbon-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
];

export interface SessionType {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  isTrialAvailable?: boolean;
  trialPrice?: number;
}

export const MOCK_SESSION_TYPES: SessionType[] = [
  { id: 'st-1', name: '1-on-1 Session', duration: 60, price: 45, description: "Personalised coaching tailored to your child's needs" },
  { id: 'st-2', name: 'Small Group (2-4)', duration: 60, price: 30, description: 'Train with peers in a small focused group', isTrialAvailable: true, trialPrice: 15 },
  { id: 'st-3', name: 'Assessment Session', duration: 45, price: 35, description: 'Full skills assessment with written report' },
];

export function renderStars(rating: number, starColor: string) {
  const stars: { name: 'star' | 'star-half' | 'star-outline'; color: string }[] = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push({ name: 'star', color: starColor });
    } else if (i === fullStars && hasHalf) {
      stars.push({ name: 'star-half', color: starColor });
    } else {
      stars.push({ name: 'star-outline', color: starColor });
    }
  }
  return stars;
}

export const COVER_HEIGHT = 200;
export const AVATAR_SIZE = Components.avatar.xl + 16; // 96

export function usePublicProfile(coachId: string) {
  const [coach, setCoach] = useState<Coach | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('about');
  const [showShareSheet, setShowShareSheet] = useState(false);

  const loadCoach = useCallback(async () => {
    if (!coachId) return;
    try {
      const data = await coachService.getCoach(coachId);
      if (data.success) setCoach(data.data);
      const reviewData = await coachService.getCoachReviews(coachId);
      if (reviewData.success) setReviews(reviewData.data);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coachId]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCoach();
  }, [loadCoach]);

  const handleBook = useCallback(() => {
    router.push(Routes.bookCoach(coachId));
  }, [coachId]);

  const handleMessage = useCallback(() => {
    router.push(Routes.chat(`coach-${coachId}`));
  }, [coachId]);

  const openShareSheet = useCallback(() => setShowShareSheet(true), []);
  const closeShareSheet = useCallback(() => setShowShareSheet(false), []);

  const profileUrl = `https://clubroom.app/coach/${coachId}`;

  return {
    coach,
    reviews,
    loading,
    refreshing,
    activeTab,
    setActiveTab,
    showShareSheet,
    openShareSheet,
    closeShareSheet,
    handleRefresh,
    handleBook,
    handleMessage,
    profileUrl,
  };
}
