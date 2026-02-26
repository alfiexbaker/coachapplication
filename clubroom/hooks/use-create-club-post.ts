/**
 * Hook for the Create Club Post modal screen.
 * Manages form state, image picking, audience targeting, and post submission.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { clubFeedService } from '@/services/social-feed-service';
import { squadService } from '@/services/squad-service';
import { eventService } from '@/services/event';
import type { ClubPostType, FeedType, ClubMembership, ClubSquad, ClubEvent } from '@/constants/types';

export type PostTypeOption = {
  key: ClubPostType;
  label: string;
  icon: string;
  description: string;
};

export const POST_TYPES: PostTypeOption[] = [
  {
    key: 'general',
    label: 'Update',
    icon: 'create-outline',
    description: 'Share a general update',
  },
  {
    key: 'announcement',
    label: 'Announcement',
    icon: 'megaphone-outline',
    description: 'Important club news',
  },
  {
    key: 'photo',
    label: 'Photo',
    icon: 'images-outline',
    description: 'Share photos with the club',
  },
  {
    key: 'event',
    label: 'Event',
    icon: 'calendar-outline',
    description: 'Announce an upcoming event',
  },
];

const CLUB_POSTING_ROLES: ClubMembership['role'][] = ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH'];

export function useCreateClubPost(clubId: string | undefined) {
  const { currentUser } = useAuth();

  const userClubs = useMemo(
    () => (currentUser?.id ? clubFeedService.getUserClubs(currentUser.id) : []),
    [currentUser?.id],
  );
  const resolvedClubId = clubId || userClubs[0]?.id;
  const club = useMemo(
    () => userClubs.find((candidate) => candidate.id === resolvedClubId),
    [userClubs, resolvedClubId],
  );
  const membership = useMemo<ClubMembership | undefined>(() => {
    if (!currentUser?.id || !resolvedClubId) return undefined;
    return clubFeedService.getMembership(currentUser.id, resolvedClubId);
  }, [resolvedClubId, currentUser?.id]);
  const canPostAsClub = Boolean(
    membership &&
      (membership.canPostAsClub === true || CLUB_POSTING_ROLES.includes(membership.role)),
  );
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const personalAudienceEstimate = Math.max(
    0,
    Math.round((club?.memberCount ?? 0) * 0.35),
  );

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [postAs, setPostAs] = useState<'self' | 'club'>('self');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [eventLocation, setEventLocation] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [feedType, setFeedType] = useState<FeedType>('CLUB');
  const [audienceType, setAudienceType] = useState<'club' | 'squad'>('club');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [availableSquads, setAvailableSquads] = useState<ClubSquad[]>([]);
  const [availableEvents, setAvailableEvents] = useState<ClubEvent[]>([]);

  useEffect(() => {
    let active = true;

    const loadSquads = async () => {
      if (!resolvedClubId) {
        if (active) {
          setAvailableSquads([]);
        }
        return;
      }

      try {
        const squads = await squadService.getSquads(resolvedClubId);
        if (active) {
          setAvailableSquads(squads);
        }
      } catch {
        if (active) {
          setAvailableSquads([]);
        }
      }
    };

    void loadSquads();

    return () => {
      active = false;
    };
  }, [resolvedClubId]);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      if (!resolvedClubId) {
        if (active) {
          setAvailableEvents([]);
        }
        return;
      }

      try {
        const clubEvents = await eventService.getAllClubEvents(resolvedClubId);
        if (active) {
          const upcoming = clubEvents
            .filter((event) => event.status !== 'CANCELLED')
            .sort((a, b) => a.date.localeCompare(b.date));
          setAvailableEvents(upcoming);
        }
      } catch {
        if (active) {
          setAvailableEvents([]);
        }
      }
    };

    void loadEvents();

    return () => {
      active = false;
    };
  }, [resolvedClubId]);

  const selectedSquad = availableSquads.find((s) => s.id === selectedSquadId);
  const selectedEvent = availableEvents.find((event) => event.id === selectedEventId) ?? null;
  const audienceLabel =
    audienceType === 'club' ? 'Club-wide' : selectedSquad?.name || 'Select a group';

  useEffect(() => {
    if (postAs === 'club' && feedType !== 'CLUB') {
      setFeedType('CLUB');
    }
  }, [postAs, feedType]);
  useEffect(() => {
    if (feedType !== 'CLUB' && audienceType !== 'club') {
      setAudienceType('club');
      setSelectedSquadId(null);
    }
  }, [feedType, audienceType]);

  const handleSelectEvent = useCallback(
    (eventId: string) => {
      const event = availableEvents.find((candidate) => candidate.id === eventId);
      if (!event) return;

      setSelectedEventId(event.id);
      setPostType('event');
      setEventDate(new Date(`${event.date}T12:00:00`));
      setEventLocation(event.venue || event.location || '');
      if (!title.trim()) {
        setTitle(event.title);
      }
      if (!body.trim()) {
        setBody(event.description);
      }
    },
    [availableEvents, body, title],
  );

  const clearSelectedEvent = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setPostType((prev) => (prev !== 'photo' ? 'photo' : prev));
    }
  }, []);

  const removeImage = useCallback(() => setImageUri(null), []);

  const handleSetPostAs = useCallback(
    (value: 'self' | 'club') => {
      if (value === 'club' && !canPostAsClub) {
        setPostAs('self');
        return;
      }
      setPostAs(value);
      if (value === 'club') {
        setFeedType('CLUB');
      }
    },
    [canPostAsClub],
  );

  const handleSetFeedType = useCallback(
    (value: FeedType) => {
      if (postAs === 'club') {
        setFeedType('CLUB');
        return;
      }
      if (value === 'BOTH' || value === 'PERSONAL' || value === 'CLUB') {
        setFeedType(value);
      }
    },
    [postAs],
  );

  const handlePost = useCallback(async () => {
    if (!body.trim() && !imageUri) return;
    if (!currentUser || !resolvedClubId || !membership) return;
    if (feedType === 'CLUB' && audienceType === 'squad' && !selectedSquadId) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setIsPosting(true);
    try {
      let posted = false;
      if (isCoach && (feedType === 'PERSONAL' || feedType === 'BOTH')) {
        const result = await clubFeedService.createCoachPost({
          coachId: currentUser.id,
          coachName: currentUser.fullName || currentUser.username || 'Unknown',
          title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
          body: body.trim(),
          postType,
          feedType,
          imageUrl: imageUri || undefined,
          eventId: postType === 'event' ? selectedEventId || undefined : undefined,
          eventDate: eventDate?.toISOString(),
          eventLocation: eventLocation.trim() || undefined,
          clubId: resolvedClubId,
          clubName: club?.name,
        });
        posted = result.success;
      } else {
        const audience = audienceType === 'squad' && selectedSquadId ? 'squad' : 'club';
        const finalAudienceLabel =
          audienceType === 'squad' && selectedSquad ? selectedSquad.name : 'Club-wide';
        const result = clubFeedService.createPost({
          clubId: resolvedClubId,
          authorId: currentUser.id,
          authorName:
            postAs === 'club' && club
              ? club.name
              : currentUser.fullName || currentUser.username || 'Unknown',
          title: title.trim() || (postType === 'photo' ? 'Photo' : 'Update'),
          body: body.trim(),
          postType,
          postAs,
          feedType,
          audience,
          audienceLabel: finalAudienceLabel,
          squadId: audienceType === 'squad' ? selectedSquadId || undefined : undefined,
          imageUrl: imageUri || undefined,
          eventId: postType === 'event' ? selectedEventId || undefined : undefined,
          eventDate: eventDate?.toISOString(),
          eventLocation: eventLocation.trim() || undefined,
        });
        posted = result.success;
      }

      if (posted) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        router.back();
      }
    } finally {
      setIsPosting(false);
    }
  }, [
    body,
    imageUri,
    currentUser,
    resolvedClubId,
    membership,
    isCoach,
    feedType,
    title,
    postType,
    selectedEventId,
    eventDate,
    eventLocation,
    club,
    audienceType,
    selectedSquadId,
    selectedSquad,
    postAs,
  ]);

  const hasAudienceTarget =
    feedType !== 'CLUB' || audienceType !== 'squad' || Boolean(selectedSquadId);
  const canPost =
    (body.trim().length > 0 || imageUri !== null) &&
    !!resolvedClubId &&
    !!membership &&
    hasAudienceTarget &&
    !isPosting;

  const handleSelectAudienceClub = useCallback(() => {
    setAudienceType('club');
    setSelectedSquadId(null);
  }, []);
  const handleSelectAudienceSquad = useCallback(() => {
    if (availableSquads.length === 0) return;
    setAudienceType('squad');
  }, [availableSquads.length]);
  const openDatePicker = useCallback(() => setShowDatePicker(true), []);
  const closeDatePicker = useCallback(() => setShowDatePicker(false), []);

  return {
    club,
    canPostAsClub,
    isCoach,
    personalAudienceEstimate,
    title,
    setTitle,
    body,
    setBody,
    postType,
    setPostType,
    postAs,
    setPostAs: handleSetPostAs,
    imageUri,
    pickImage,
    removeImage,
    eventDate,
    setEventDate,
    eventLocation,
    setEventLocation,
    showDatePicker,
    openDatePicker,
    closeDatePicker,
    feedType,
    setFeedType: handleSetFeedType,
    audienceType,
    handleSelectAudienceClub,
    handleSelectAudienceSquad,
    selectedSquadId,
    setSelectedSquadId,
    availableSquads,
    selectedSquad,
    availableEvents,
    selectedEventId,
    selectedEvent,
    handleSelectEvent,
    clearSelectedEvent,
    audienceLabel,
    isPosting,
    canPost,
    handlePost,
  };
}
