/**
 * Hook for the Create Post screen.
 * Manages role-aware routing, personal post form state, and submission.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { clubFeedService } from '@/services/social-feed-service';
import type { ClubPostType, ClubMembership } from '@/constants/types';
import type { Ionicons } from '@expo/vector-icons';

export type PostTypeOption = {
  key: ClubPostType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const POST_TYPES: PostTypeOption[] = [
  { key: 'general', label: 'Update', icon: 'create-outline' },
  { key: 'photo', label: 'Photo', icon: 'images-outline' },
  { key: 'announcement', label: 'Announcement', icon: 'megaphone-outline' },
  { key: 'event', label: 'Event', icon: 'calendar-outline' },
];

const STAFF_POSTING_ROLES: ClubMembership['role'][] = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'];

export function useCreatePost() {
  const { currentUser } = useAuth();

  const memberships = useMemo(
    () => (currentUser ? clubFeedService.getUserMemberships(currentUser.id) : []),
    [currentUser],
  );
  const clubs = useMemo(
    () => (currentUser ? clubFeedService.getUserClubs(currentUser.id) : []),
    [currentUser],
  );
  const membership = useMemo<ClubMembership | undefined>(() => {
    if (memberships.length === 0) return undefined;
    return memberships[0];
  }, [memberships]);
  const redirectMembership = useMemo<ClubMembership | undefined>(
    () => memberships.find((candidate) => STAFF_POSTING_ROLES.includes(candidate.role)),
    [memberships],
  );
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const shouldRedirectToClubPost = Boolean(redirectMembership?.clubId);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const trimmedBody = body.trim();

  useEffect(() => {
    if (redirectMembership?.clubId) {
      router.replace(
        Routes.modalCreateClubPost({ clubId: redirectMembership.clubId, audience: 'club' }),
      );
    }
  }, [redirectMembership?.clubId]);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      if (postType !== 'photo') setPostType('photo');
    }
  }, [postType]);

  const removeImage = useCallback(() => setImageUri(null), []);

  const handlePostTypeChange = useCallback((type: ClubPostType) => {
    setPostType(type);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handlePersonalPost = useCallback(async () => {
    if ((!trimmedBody && !imageUri) || !currentUser) return;
    if (trimmedBody && trimmedBody.length < 10) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsPosting(true);
    try {
      const result = await clubFeedService.createCoachPost({
        coachId: currentUser.id,
        coachName: currentUser.fullName || currentUser.username || 'Unknown',
        title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
        body: trimmedBody,
        postType,
        feedType: 'PERSONAL',
        imageUrl: imageUri || undefined,
        eventDate: eventDate?.toISOString(),
        eventLocation: eventLocation.trim() || undefined,
        clubId: clubs[0]?.id,
      });
      if (result.success) {
        if (Platform.OS !== 'web')
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } finally {
      setIsPosting(false);
    }
  }, [trimmedBody, body, imageUri, currentUser, title, postType, eventDate, eventLocation, clubs]);

  const canPost = ((trimmedBody.length >= 10) || imageUri !== null) && !isPosting;

  return {
    shouldRedirectToClubPost,
    membership,
    isCoach,
    title,
    setTitle,
    body,
    setBody,
    postType,
    imageUri,
    eventDate,
    setEventDate,
    eventLocation,
    setEventLocation,
    showDatePicker,
    setShowDatePicker,
    isPosting,
    canPost,
    pickImage,
    removeImage,
    handlePostTypeChange,
    handlePersonalPost,
  };
}
