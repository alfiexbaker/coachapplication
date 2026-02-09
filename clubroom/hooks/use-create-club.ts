import { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { apiClient } from '@/services/api-client';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { Club, ClubMembership } from '@/constants/types';

const logger = createLogger('CreateClub');

function generateInviteCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
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

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('UK');
  const [badge, setBadge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length >= 3 && city.trim().length >= 2;

  const handleBadgeChange = useCallback((t: string) => {
    setBadge(t.toUpperCase().slice(0, 4));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!isValid || !currentUser) return;

    setIsSubmitting(true);
    logger.action('CreateClub', { name, city });

    try {
      const clubId = `club_${Date.now()}`;
      const inviteCode = generateInviteCode(name);

      const newClub: Club = {
        id: clubId,
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        city: city.trim(),
        country: country.trim(),
        badge: badge.trim() || name.slice(0, 3).toUpperCase(),
        memberCount: 1,
        coachCount: 1,
        squadCount: 0,
        ownerId: currentUser.id,
        ownerName: currentUser.fullName || currentUser.username || 'Coach',
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
  }, [isValid, currentUser, name, tagline, city, country, badge]);

  const previewBadge = badge || name.slice(0, 3).toUpperCase() || 'ABC';
  const previewName = name || 'Your Club Name';
  const previewLocation = `${city || 'City'}, ${country || 'UK'}`;

  return {
    name, setName,
    tagline, setTagline,
    city, setCity,
    country, setCountry,
    badge, handleBadgeChange,
    isSubmitting, isValid,
    handleCreate,
    previewBadge, previewName, previewLocation,
  };
}
