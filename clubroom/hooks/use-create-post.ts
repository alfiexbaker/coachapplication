/**
 * Hook for the Create Post screen.
 * Manages routing logic, personal post form state, and submission.
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

export function useCreatePost() {
  const { currentUser } = useAuth();

  const clubs = useMemo(() => (currentUser ? clubFeedService.getUserClubs(currentUser.id) : []), [currentUser]);
  const membership = useMemo<ClubMembership | undefined>(() => {
    if (!currentUser || clubs.length === 0) return undefined;
    const role = currentUser.role === 'ADMIN'
      ? 'ADMIN'
      : currentUser.role === 'COACH'
        ? 'COACH'
        : 'MEMBER';
    return {
      clubId: clubs[0].id,
      userId: currentUser.id,
      role,
      status: 'active',
      joinSource: 'invite',
    };
  }, [clubs, currentUser]);
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (membership?.clubId) {
      router.replace(Routes.MODAL_CREATE_CLUB_POST);
    }
  }, [membership?.clubId]);

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
    if ((!body.trim() && !imageUri) || !currentUser) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsPosting(true);
    try {
      const result = await clubFeedService.createCoachPost({
        coachId: currentUser.id,
        coachName: currentUser.fullName || currentUser.username || 'Unknown',
        title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
        body: body.trim(),
        postType,
        feedType: 'PERSONAL',
        imageUrl: imageUri || undefined,
        eventDate: eventDate?.toISOString(),
        eventLocation: eventLocation.trim() || undefined,
        clubId: clubs[0]?.id,
      });
      if (result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } finally {
      setIsPosting(false);
    }
  }, [body, imageUri, currentUser, title, postType, eventDate, eventLocation, clubs]);

  const canPost = (body.trim().length > 0 || imageUri !== null) && !isPosting;

  return {
    membership, isCoach,
    title, setTitle, body, setBody, postType, imageUri,
    eventDate, setEventDate, eventLocation, setEventLocation,
    showDatePicker, setShowDatePicker, isPosting, canPost,
    pickImage, removeImage, handlePostTypeChange, handlePersonalPost,
  };
}
