import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { bookingService } from '@/services/booking-service';
import { socialFeedService } from '@/services/social-feed-service';
import type { ClubRole } from '@/constants/types';
import type { Booking } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';

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

  const club = useMemo(() => {
    if (!clubId || !currentUser?.id) return null;
    return socialFeedService.getUserClubs(currentUser.id).find((candidate) => candidate.id === clubId) || null;
  }, [clubId, currentUser?.id]);

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

      try {
        const allBookings = await bookingService.list();
        if (!active) {
          return;
        }

        setCompletedBookings(
          allBookings.filter((booking) => booking.coachId === currentUser.id && booking.status === 'COMPLETED'),
        );
      } catch (loadError) {
        logger.error('Failed to load completed bookings for invites', loadError);
        if (active) {
          setCompletedBookings([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCompletedBookings();

    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  const pastSessionUsers = useMemo(() => {
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
  }, [currentUser, completedBookings, availableUsers]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return pastSessionUsers;
    const query = searchQuery.toLowerCase();
    return pastSessionUsers.filter(
      (u) => u.userName.toLowerCase().includes(query) || u.childName?.toLowerCase().includes(query)
    );
  }, [pastSessionUsers, searchQuery]);

  const toggleUserSelection = useCallback((userId: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map((u) => u.userId)));
    }
  }, [selectedUsers.size, filteredUsers]);

  const handleSendInvites = useCallback(async () => {
    if (selectedUsers.size === 0) {
      showToast('Select at least one user', 'warning');
      return;
    }

    setIsInviting(true);
    logger.action('SendClubInvites', { clubId, userCount: selectedUsers.size, role: selectedRole });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    showToast(`Invited ${selectedUsers.size} users to ${club?.name}`, 'success');
    setIsInviting(false);
    router.back();
  }, [selectedUsers.size, clubId, selectedRole, club?.name, showToast]);

  const handleManualInvite = useCallback(() => {
    if (!manualEmail.trim() || !manualEmail.includes('@')) {
      showToast('Enter a valid email', 'warning');
      return;
    }

    logger.action('ManualInvite', { email: manualEmail, role: selectedRole });
    showToast(`Invite sent to ${manualEmail}`, 'success');
    setManualEmail('');
  }, [manualEmail, selectedRole, showToast]);

  return {
    loading,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    selectedUsers, selectedRole, setSelectedRole,
    manualEmail, setManualEmail,
    isInviting, club,
    filteredUsers,
    toggleUserSelection, handleSelectAll, handleSendInvites, handleManualInvite,
  };
}
