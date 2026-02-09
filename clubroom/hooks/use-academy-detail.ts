/**
 * Hook: useAcademyDetail
 *
 * Manages academy detail screen state: load academy + staff, check permissions.
 * Used by app/academy/[id].tsx
 */

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import type { Academy, AcademyMembership } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAcademyDetail');

export function useAcademyDetail(id: string | undefined) {
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [staff, setStaff] = useState<AcademyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyData, staffData] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      setAcademy(academyData);
      setStaff(staffData);

      if (currentUser?.id) {
        const membership = staffData.find((m) => m.userId === currentUser.id);
        setUserMembership(membership || null);
      }
    } catch (error) {
      logger.error('Failed to load academy:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = userMembership?.role === 'OWNER';
  const canManage = isOwner || userMembership?.permissions.includes('MANAGE_STAFF');
  const primaryColor = academy?.primaryColor || undefined;

  return {
    academy,
    staff,
    loading,
    userMembership,
    isOwner,
    canManage,
    primaryColor,
  };
}
