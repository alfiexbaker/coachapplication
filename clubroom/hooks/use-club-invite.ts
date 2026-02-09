import { useState, useMemo, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { bookings, getUserById, getClubById } from '@/constants/mock-data';
import type { ClubRole } from '@/constants/types';
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
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<InviteTab>('past-sessions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<ClubRole>('MEMBER');
  const [manualEmail, setManualEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  const club = clubId ? getClubById(clubId) : null;

  const pastSessionUsers = useMemo(() => {
    if (!currentUser) return [];

    const userMap = new Map<string, PastSessionUser>();
    const coachBookings = bookings.filter(
      (b) => b.coachId === currentUser.id && b.status === 'COMPLETED'
    );

    coachBookings.forEach((booking) => {
      const bookedBy = booking.bookedById || booking.athleteId;
      const isParent = bookedBy !== booking.athleteId;
      const user = getUserById(bookedBy!);
      if (!user) return;

      const existing = userMap.get(bookedBy!);
      if (existing) {
        existing.sessionCount++;
        if (new Date(booking.scheduledAt) > new Date(existing.lastSessionDate)) {
          existing.lastSessionDate = booking.scheduledAt;
        }
      } else {
        const athlete = isParent && booking.athleteId ? getUserById(booking.athleteId) : null;
        userMap.set(bookedBy!, {
          userId: bookedBy!,
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
  }, [currentUser]);

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
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    selectedUsers, selectedRole, setSelectedRole,
    manualEmail, setManualEmail,
    isInviting, club,
    filteredUsers,
    toggleUserSelection, handleSelectAll, handleSendInvites, handleManualInvite,
  };
}
