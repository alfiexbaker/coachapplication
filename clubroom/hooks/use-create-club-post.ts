/**
 * Backend-authoritative composer for club-wide updates.
 */

import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { api } from '@/constants/config';
import type { Club, ClubMembership, ClubPostType } from '@/constants/types';
import { useAuth } from '@/hooks/use-auth';
import { clubAuthorityService } from '@/services/club-authority-service';
import { clubFeedService } from '@/services/social-feed-service';
import { canCreateClubPost } from '@/utils/club-ui-permissions';
import { runAsyncFinally } from '@/utils/async-control';

const CLUB_CONTEXT_ERROR_MESSAGE = 'Could not load your club access.';
const CLUB_ACCESS_MESSAGE = 'You do not have permission to publish updates for this club.';

export type PostTypeOption = {
  key: ClubPostType;
  label: string;
};

export const POST_TYPES: PostTypeOption[] = [
  { key: 'general', label: 'Update' },
  { key: 'announcement', label: 'Announcement' },
];

type ClubContextStatus = 'loading' | 'ready' | 'error' | 'denied' | 'empty';

type ClubContext = {
  status: ClubContextStatus;
  club?: Club;
  membership?: ClubMembership;
  message?: string;
};

function isMembershipForUser(membership: ClubMembership, userId: string): boolean {
  const normalizedUserId = userId.replace(/^usr_/, '');
  return membership.userId === userId || membership.userId === normalizedUserId;
}

function actorName(user: { fullName?: string; username?: string }): string | null {
  return user.fullName?.trim() || user.username?.trim() || null;
}

export function useCreateClubPost(clubId: string | undefined) {
  const { currentUser, isLoading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<ClubPostType>('general');
  const [postAs, setPostAs] = useState<'self' | 'club'>('club');
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [contextRequest, setContextRequest] = useState(0);
  const [clubContext, setClubContext] = useState<ClubContext>({ status: 'loading' });
  const submissionInFlight = useRef(false);

  useEffect(() => {
    let active = true;

    const setResolvedContext = (clubs: Club[], memberships: ClubMembership[], userId: string) => {
      const membershipForClub = (candidateClubId: string) =>
        memberships.find(
          (candidate) =>
            candidate.clubId === candidateClubId && isMembershipForUser(candidate, userId),
        );

      if (clubId) {
        const requestedClub = clubs.find((candidate) => candidate.id === clubId);
        const requestedMembership = membershipForClub(clubId);

        if (!requestedClub || !requestedMembership || !canCreateClubPost(requestedMembership)) {
          setClubContext({ status: 'denied', message: CLUB_ACCESS_MESSAGE });
          return;
        }

        setClubContext({
          status: 'ready',
          club: requestedClub,
          membership: requestedMembership,
        });
        return;
      }

      const eligibleClub = clubs.find((candidate) => {
        const membership = membershipForClub(candidate.id);
        return canCreateClubPost(membership);
      });

      if (!eligibleClub) {
        setClubContext({
          status: clubs.length === 0 ? 'empty' : 'denied',
          message:
            clubs.length === 0 ? 'Join a club before publishing an update.' : CLUB_ACCESS_MESSAGE,
        });
        return;
      }

      setClubContext({
        status: 'ready',
        club: eligibleClub,
        membership: membershipForClub(eligibleClub.id),
      });
    };

    const loadClubContext = async () => {
      if (authLoading) {
        if (active) setClubContext({ status: 'loading' });
        return;
      }

      if (!currentUser?.id) {
        if (active) {
          setClubContext({ status: 'denied', message: 'Sign in to publish club updates.' });
        }
        return;
      }

      if (active) {
        setClubContext({ status: 'loading' });
        setPostError(null);
      }

      if (api.useMock) {
        const clubs = clubFeedService.getUserClubs(currentUser.id);
        const memberships = clubs.flatMap((club) => {
          const membership = clubFeedService.getMembership(currentUser.id, club.id);
          return membership ? [membership] : [];
        });
        if (active) setResolvedContext(clubs, memberships, currentUser.id);
        return;
      }

      try {
        const result = await clubAuthorityService.listClubs();
        if (!active) return;
        if (!result.success) {
          setClubContext({ status: 'error', message: result.error.message });
          return;
        }
        setResolvedContext(result.data.clubs, result.data.memberships, currentUser.id);
      } catch {
        if (active) {
          setClubContext({ status: 'error', message: CLUB_CONTEXT_ERROR_MESSAGE });
        }
      }
    };

    void loadClubContext();

    return () => {
      active = false;
    };
  }, [authLoading, clubId, contextRequest, currentUser?.id]);

  const canPostAsClub = canCreateClubPost(clubContext.membership);
  const canPost =
    clubContext.status === 'ready' && body.trim().length > 0 && canPostAsClub && !isPosting;

  const handlePost = async () => {
    if (submissionInFlight.current || !canPost || !currentUser || !clubContext.club) return;

    const resolvedActorName = actorName(currentUser);
    if (api.useMock && !resolvedActorName) {
      setPostError('Add your name to your profile before publishing.');
      return;
    }

    submissionInFlight.current = true;
    setIsPosting(true);
    setPostError(null);
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await runAsyncFinally(
      async () => {
        try {
          const result = await clubFeedService.createPostAuthority({
            clubId: clubContext.club!.id,
            clubName: clubContext.club!.name,
            authorId: currentUser.id,
            authorName: postAs === 'club' ? clubContext.club!.name : (resolvedActorName ?? ''),
            title: title.trim() || (postType === 'announcement' ? 'Announcement' : 'Update'),
            body: body.trim(),
            postType,
            postAs,
            feedType: 'CLUB',
            audience: 'club',
            audienceLabel: 'Club-wide',
          });

          if (!result.success) {
            setPostError(result.error.message);
            return;
          }

          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          router.back();
        } catch {
          setPostError('Could not publish this update. Try again.');
        }
      },
      () => {
        submissionInFlight.current = false;
        setIsPosting(false);
      },
    );
  };

  const retryClubContext = () => setContextRequest((request) => request + 1);
  const handleSetPostAs = (value: 'self' | 'club') => {
    if (value === 'club' && !canPostAsClub) return;
    setPostAs(value);
  };

  return {
    club: clubContext.club,
    contextStatus: clubContext.status,
    contextMessage: clubContext.message,
    retryClubContext,
    canPostAsClub,
    title,
    setTitle,
    body,
    setBody,
    postType,
    setPostType,
    postAs,
    setPostAs: handleSetPostAs,
    isPosting,
    postError,
    canPost,
    handlePost,
  };
}
