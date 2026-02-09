/**
 * Hook for the Create Club Post modal screen.
 * Manages form state, image picking, audience targeting, and post submission.
 */

import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { clubFeedService } from '@/services/social-feed-service';
import { getClubById, getClubMembershipForUser, clubSquads } from '@/constants/mock-data';
import type { ClubPostType, FeedType } from '@/constants/types';

export type PostTypeOption = {
  key: ClubPostType;
  label: string;
  icon: string;
  description: string;
};

export const POST_TYPES: PostTypeOption[] = [
  { key: 'general', label: 'Update', icon: 'create-outline', description: 'Share a general update' },
  { key: 'announcement', label: 'Announcement', icon: 'megaphone-outline', description: 'Important club news' },
  { key: 'photo', label: 'Photo', icon: 'images-outline', description: 'Share photos with the club' },
  { key: 'event', label: 'Event', icon: 'calendar-outline', description: 'Announce an upcoming event' },
];

export function useCreateClubPost(clubId: string | undefined) {
  const { currentUser } = useAuth();

  const club = clubId ? getClubById(clubId) : undefined;
  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const canPostAsClub = membership?.canPostAsClub || ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(membership?.role || '');
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [postAs, setPostAs] = useState<'self' | 'club'>('self');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>(isCoach ? 'PERSONAL' : 'CLUB');
  const [audienceType, setAudienceType] = useState<'club' | 'squad'>('club');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const availableSquads = clubId ? clubSquads.filter((s) => s.clubId === clubId) : [];
  const selectedSquad = availableSquads.find((s) => s.id === selectedSquadId);
  const audienceLabel = audienceType === 'club' ? 'Club-wide' : selectedSquad?.name || 'Select a group';

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setPostType((prev) => prev !== 'photo' ? 'photo' : prev);
    }
  }, []);

  const removeImage = useCallback(() => setImageUri(null), []);

  const handlePost = useCallback(async () => {
    if (!body.trim() && !imageUri) return;
    if (!currentUser || !clubId) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsPosting(true);
    try {
      if (isCoach && (feedType === 'PERSONAL' || feedType === 'BOTH')) {
        const result = await clubFeedService.createCoachPost({
          coachId: currentUser.id,
          coachName: currentUser.fullName || currentUser.username || 'Unknown',
          title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
          body: body.trim(),
          postType, feedType,
          imageUrl: imageUri || undefined,
          eventDate: eventDate?.toISOString(),
          eventLocation: eventLocation.trim() || undefined,
          clubId, clubName: club?.name,
        });
        if (result.success && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        const audience = audienceType === 'squad' && selectedSquadId ? 'squad' : 'club';
        const finalAudienceLabel = audienceType === 'squad' && selectedSquad ? selectedSquad.name : 'Club-wide';
        await clubFeedService.createPost({
          clubId, authorId: currentUser.id,
          authorName: postAs === 'club' && club ? club.name : (currentUser.fullName || currentUser.username || 'Unknown'),
          title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
          body: body.trim(), postType, postAs, feedType,
          audience, audienceLabel: finalAudienceLabel,
          squadId: audienceType === 'squad' ? selectedSquadId || undefined : undefined,
          imageUrl: imageUri || undefined,
          eventDate: eventDate?.toISOString(),
          eventLocation: eventLocation.trim() || undefined,
        });
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.back();
    } finally {
      setIsPosting(false);
    }
  }, [body, imageUri, currentUser, clubId, isCoach, feedType, title, postType, eventDate, eventLocation, club, audienceType, selectedSquadId, selectedSquad, postAs]);

  const canPost = (body.trim().length > 0 || imageUri !== null) && !!clubId && !isPosting;

  const handleSelectAudienceClub = useCallback(() => { setAudienceType('club'); setSelectedSquadId(null); }, []);
  const handleSelectAudienceSquad = useCallback(() => setAudienceType('squad'), []);
  const openDatePicker = useCallback(() => setShowDatePicker(true), []);
  const closeDatePicker = useCallback(() => setShowDatePicker(false), []);

  return {
    club, canPostAsClub, isCoach,
    title, setTitle, body, setBody,
    postType, setPostType, postAs, setPostAs,
    imageUri, pickImage, removeImage,
    eventDate, setEventDate, eventLocation, setEventLocation,
    showDatePicker, openDatePicker, closeDatePicker,
    feedType, setFeedType,
    audienceType, handleSelectAudienceClub, handleSelectAudienceSquad,
    selectedSquadId, setSelectedSquadId, availableSquads, selectedSquad, audienceLabel,
    isPosting, canPost, handlePost,
  };
}
