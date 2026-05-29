import { useState } from 'react';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import type { ClubRole, OrganizationCommercialMode } from '@/constants/types';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';
import { socialFeedService } from '@/services/social-feed-service';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('CreateClub');

export type FirstStaffRoleOption = Exclude<ClubRole, 'OWNER' | 'MEMBER'> | 'NONE';

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
  const [commercialMode, setCommercialMode] =
    useState<OrganizationCommercialMode>('COACH_OWNED');
  const [firstStaffRole, setFirstStaffRole] = useState<FirstStaffRoleOption>('COACH');
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
    badge.trim().length > 0 ||
    commercialMode !== 'COACH_OWNED' ||
    firstStaffRole !== 'COACH';
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const setName = (value: string) => {
    setNameState(value);
  };
  const handleNameBlur = () => {
    setNameTouched(true);
    setNameState((prev) => prev.trim());
  };

  const handleBadgeChange = (t: string) => {
    setBadge(t.toUpperCase().slice(0, 4));
  };

  const handleCreate = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!isValid || !currentUser) {
      setIsSubmitting(false);
      return;
    }
    logger.action('CreateClub', { name, city });

    return await runAsyncTryCatchFinally(async () => {
      const result = await socialFeedService.createClub({
        ownerId: currentUser.id,
        name: trimmedName,
        tagline: tagline.trim() || undefined,
        city: city.trim(),
        country: country.trim(),
        badge: badge.trim() || trimmedName.slice(0, 3).toUpperCase(),
        commercialMode,
        firstStaffRole: firstStaffRole === 'NONE' ? null : firstStaffRole,
      });
      if (!result.success) {
        logger.warn('CreateClubRejected', { message: result.error.message });
        uiFeedback.showToast(result.error.message, 'error');
        return;
      }

      logger.success('ClubCreated', {
        clubId: result.data.club.id,
        inviteCode: result.data.primaryInvite.code,
        firstStaffInvite: result.data.firstStaffInvite?.code,
      });
      router.replace(
        Routes.clubSetupComplete({
          clubId: result.data.club.id,
          inviteCode: result.data.firstStaffInvite?.code,
          inviteRole: result.data.firstStaffInvite?.role,
        }),
      );
    }, async error => {
      logger.error('CreateClubFailed', error);
      uiFeedback.showToast('Failed to create club. Please try again.', 'error');
    }, () => {
      setIsSubmitting(false);
    });
  };

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
    commercialMode,
    setCommercialMode,
    firstStaffRole,
    setFirstStaffRole,
    isSubmitting,
    isValid,
    handleCreate,
    previewBadge,
    previewName,
    previewLocation,
  };
}
