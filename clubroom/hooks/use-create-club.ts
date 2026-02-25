import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { Club, ClubMembership } from '@/constants/types';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

const logger = createLogger('CreateClub');

function generateInviteCode(name: string): string {
  const prefix = name
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 5)
    .toUpperCase();
  const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
  return `${prefix}-${suffix}`;
}

export const CLUB_FEATURES = [
  { icon: 'people-outline', text: 'Invite athletes and parents with a code' },
  { icon: 'layers-outline', text: 'Create squads and age groups' },
  { icon: 'megaphone-outline', text: 'Post updates and announcements' },
  { icon: 'calendar-outline', text: 'Schedule training and events' },
  { icon: 'ribbon-outline', text: 'Award badges and track progress' },
] as const;

export function useCreateClub() {
  const { currentUser } = useAuth();

  const [name, setNameState] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('UK');
  const [badge, setBadge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);

  const trimmedName = name.trim();
  const nameError =
    nameTouched && trimmedName.length < 3
      ? 'Club name cannot be empty or spaces only'
      : null;
  const isValid = trimmedName.length >= 3 && city.trim().length >= 2 && !nameError;
  const isDirty =
    trimmedName.length > 0 ||
    tagline.trim().length > 0 ||
    city.trim().length > 0 ||
    country.trim() !== 'UK' ||
    badge.trim().length > 0;
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const setName = useCallback((value: string) => {
    setNameState(value);
  }, []);
  const handleNameBlur = useCallback(() => {
    setNameTouched(true);
    setNameState((prev) => prev.trim());
  }, []);

  const handleBadgeChange = useCallback((t: string) => {
    setBadge(t.toUpperCase().slice(0, 4));
  }, []);

  const handleCreate = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!isValid || !currentUser) {
      setIsSubmitting(false);
      return;
    }
    logger.action('CreateClub', { name, city });

    try {
      const clubId = `club_${Date.now()}`;
      const inviteCode = generateInviteCode(trimmedName);

      const newClub: Club = {
        id: clubId,
        name: trimmedName,
        tagline: tagline.trim() || undefined,
        city: city.trim(),
        country: country.trim(),
        badge: badge.trim() || trimmedName.slice(0, 3).toUpperCase(),
        memberCount: 1,
        coachCount: 1,
        squadCount: 0,
        ownerId: currentUser.id,
        inviteCode,
      };

      const membership: ClubMembership = {
        clubId,
        userId: currentUser.id,
        role: 'OWNER',
        status: 'active',
        joinSource: 'created',
        inviteCode,
        canPostAsClub: true,
      };

      const clubs = await apiClient.get<Club[]>('user_clubs', []);
      clubs.push(newClub);
      await apiClient.set('user_clubs', clubs);

      const memberships = await apiClient.get<ClubMembership[]>('club_memberships', []);
      memberships.push(membership);
      await apiClient.set('club_memberships', memberships);

      logger.success('ClubCreated', { clubId, inviteCode });
      router.replace(Routes.club(clubId));
    } catch (error) {
      logger.error('CreateClubFailed', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isValid, currentUser, trimmedName, tagline, city, country, badge, name]);

  const previewBadge = badge || name.slice(0, 3).toUpperCase() || 'ABC';
  const previewName = name || 'Your Club Name';
  const previewLocation = `${city || 'City'}, ${country || 'UK'}`;

  return {
    name,
    setName,
    handleNameBlur,
    nameError,
    tagline,
    setTagline,
    city,
    setCity,
    country,
    setCountry,
    badge,
    handleBadgeChange,
    isSubmitting,
    isValid,
    handleCreate,
    previewBadge,
    previewName,
    previewLocation,
  };
}
