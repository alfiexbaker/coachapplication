import { useState, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

import { useToast } from '@/components/ui/toast';
import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { bookingService } from '@/services/booking-service';
import { clubAuthorityService } from '@/services/club-authority-service';
import { socialFeedService } from '@/services/social-feed-service';
import { userService } from '@/services/user-service';
import type { Club, ClubRole } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('InviteMembers');

export interface PastSessionUser {
  userId: string;
  userName: string;
  userAvatar?: string;
  sessionCount: number;
  lastSessionDate: string;
  isParent: boolean;
  childName?: string;
}

export type InviteTab = 'past-sessions' | 'manual';

export const ROLE_OPTIONS: { role: ClubRole; label: string; description: string }[] = [
  { role: 'MEMBER', label: 'Member', description: 'Can view posts and RSVP to events' },
  { role: 'COACH', label: 'Coach', description: 'Can post and manage squads' },
  { role: 'ADMIN', label: 'Admin', description: 'Full management access' },
];

export function useClubInvite() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { currentUser, availableUsers } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<InviteTab>('past-sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<ClubRole>('MEMBER');
  const [manualEmail, setManualEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState<Club | null>(null);

  useEffect(() => {
    let active = true;

    const loadCompletedBookings = async () => {
      setLoading(true);
      if (!currentUser?.id) {
        if (active) {
          setCompletedBookings([]);
          setLoading(false);
        }
        return;
      }

      return await runAsyncTryCatchFinally(async () => {
        const [allBookings, authorityResult] = await Promise.all([
          bookingService.list(),
          api.useMock ? Promise.resolve(null) : clubAuthorityService.listClubs(),
        ]);
        if (!active) {
          return;
        }
        if (api.useMock) {
          setClub(
            clubId
              ? socialFeedService
                  .getUserClubs(currentUser.id)
                  .find((candidate) => candidate.id === clubId) ?? null
              : null,
          );
        } else if (authorityResult?.success) {
          setClub(authorityResult.data.clubs.find((candidate) => candidate.id === clubId) ?? null);
        } else {
          setClub(null);
        }

        setCompletedBookings(
          allBookings.filter(
            (booking) => booking.coachId === currentUser.id && booking.status === 'COMPLETED',
          ),
        );
      }, async loadError => {
        logger.error('Failed to load completed bookings for invites', loadError);
        if (active) {
          setCompletedBookings([]);
        }
      }, () => {
        if (active) {
          setLoading(false);
        }
      });
    };

    void loadCompletedBookings();

    return () => {
      active = false;
    };
  }, [clubId, currentUser?.id]);

  const pastSessionUsers = (() => {
    if (!currentUser) return [];

    const userMap = new Map<string, PastSessionUser>();
    const usersById = new Map(availableUsers.map((user) => [user.id, user]));

    completedBookings.forEach((booking) => {
      const bookedBy = booking.bookedById || booking.athleteId;
      if (!bookedBy) {
        return;
      }

      const isParent = bookedBy !== booking.athleteId;
      const user = usersById.get(bookedBy);
      if (!user) return;

      const existing = userMap.get(bookedBy);
      if (existing) {
        existing.sessionCount++;
        if (new Date(booking.scheduledAt) > new Date(existing.lastSessionDate)) {
          existing.lastSessionDate = booking.scheduledAt;
        }
      } else {
        const athlete = isParent && booking.athleteId ? usersById.get(booking.athleteId) : null;
        userMap.set(bookedBy, {
          userId: bookedBy,
          userName: user.name || 'Unknown',
          userAvatar: user.avatar,
          sessionCount: 1,
          lastSessionDate: booking.scheduledAt,
          isParent,
          childName: athlete?.name,
        });
      }
    });

    return Array.from(userMap.values()).sort((a, b) => b.sessionCount - a.sessionCount);
  })();

  const filteredUsers = (() => {
    if (!searchQuery) return pastSessionUsers;
    const query = searchQuery.toLowerCase();
    return pastSessionUsers.filter(
      (u) => u.userName.toLowerCase().includes(query) || u.childName?.toLowerCase().includes(query),
    );
  })();

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.userId)));
    }
  };

  const handleSendInvites = async () => {
    if (selectedUsers.size === 0) {
      showToast('Select at least one user', 'warning');
      return;
    }
    const targetUserIds = Array.from(selectedUsers);
    if (!api.useMock) {
      if (!clubId) {
        showToast('Club invite context is unavailable', 'error');
        return;
      }
      if (selectedRole !== 'MEMBER' && selectedRole !== 'COACH' && selectedRole !== 'ADMIN') {
        showToast(
          'Direct invites for that role need backend support. Share a role invite code for now.',
          'error',
        );
        return;
      }
      setIsInviting(true);
      try {
        logger.action('SendClubInvites', {
          clubId,
          userCount: selectedUsers.size,
          role: selectedRole,
        });
        const result = await clubAuthorityService.inviteExistingUsers(
          clubId,
          targetUserIds,
          selectedRole,
        );
        if (!result.success) {
          showToast(result.error.message, 'error');
          return;
        }
        showToast(`Invited ${result.data.length} users to ${club?.name ?? 'club'}`, 'success');
        setSelectedUsers(new Set());
        router.back();
      } finally {
        setIsInviting(false);
      }
      return;
    }

    setIsInviting(true);
    logger.action('SendClubInvites', { clubId, userCount: selectedUsers.size, role: selectedRole });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    showToast(`Invited ${selectedUsers.size} users to ${club?.name}`, 'success');
    setIsInviting(false);
    router.back();
  };

  const handleManualInvite = async () => {
    const normalizedEmail = manualEmail.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      showToast('Enter a valid email', 'warning');
      return;
    }
    if (!api.useMock) {
      if (!clubId) {
        showToast('Club invite context is unavailable', 'error');
        return;
      }
      setIsInviting(true);
      try {
        const lookup = await userService.searchUsers(normalizedEmail);
        if (!lookup.success) {
          showToast(lookup.error.message, 'error');
          return;
        }
        const targetUser = lookup.data.find(
          (user) => user.email.trim().toLowerCase() === normalizedEmail,
        );
        const emailDomain = normalizedEmail.split('@')[1] ?? 'unknown';
        logger.action('ManualInvite', { emailDomain, role: selectedRole, source: 'api' });
        if (targetUser) {
          const result = await clubAuthorityService.inviteExistingUsers(
            clubId,
            [targetUser.id],
            selectedRole,
          );
          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }
          showToast(
            `Invited ${targetUser.name || normalizedEmail} to ${club?.name ?? 'club'}`,
            'success',
          );
          setManualEmail('');
          router.back();
          return;
        }

        const result = await clubAuthorityService.inviteEmailTargets(
          clubId,
          [normalizedEmail],
          selectedRole,
        );
        if (!result.success) {
          showToast(result.error.message, 'error');
          return;
        }
        const delivery = result.data.emailDelivery;
        showToast(
          delivery && delivery.sent > 0
            ? `Invite email sent to ${normalizedEmail}`
            : `Invite recorded for ${normalizedEmail}`,
          'success',
        );
        setManualEmail('');
        router.back();
      } finally {
        setIsInviting(false);
      }
      return;
    }

    logger.action('ManualInvite', { email: normalizedEmail, role: selectedRole });
    showToast(`Invite sent to ${normalizedEmail}`, 'success');
    setManualEmail('');
  };

  return {
    loading,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    selectedUsers,
    selectedRole,
    setSelectedRole,
    manualEmail,
    setManualEmail,
    isInviting,
    club,
    filteredUsers,
    toggleUserSelection,
    handleSelectAll,
    handleSendInvites,
    handleManualInvite,
  };
}
