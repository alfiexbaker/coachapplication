import React, { memo, useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { SettingsRow } from '@/components/settings/settings-row';
import { useAuth } from '@/hooks/use-auth';
import { childService } from '@/services/child-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsAccountSection');

interface SettingsAccountSectionProps {
  role: string | undefined;
}

export const SettingsAccountSection = memo(function SettingsAccountSection({
  role,
}: SettingsAccountSectionProps) {
  const { currentUser } = useAuth();
  const [childCount, setChildCount] = useState(0);
  const [activeChildName, setActiveChildName] = useState<string | null>(null);

  const isCoach = role === 'COACH';

  // Load child count + active child name from childService storage
  useEffect(() => {
    if (!currentUser?.id || isCoach) return;
    (async () => {
      const children = await childService.getChildren(currentUser.id);
      setChildCount(children.length);
      const activeId = await childService.getActiveChildId();
      if (activeId) {
        const active = children.find((c) => c.id === activeId);
        if (active) {
          setActiveChildName(active.nickname || active.firstName);
        }
      }
    })();
  }, [currentUser?.id, isCoach]);

  const handleEditProfile = useCallback(() => {
    logger.press('EditProfile');
    router.push(Routes.EDIT_PROFILE);
  }, []);

  const handleCoachProfile = useCallback(() => {
    logger.press('EditCoachProfile');
    router.push(Routes.COACH_PROFILE);
  }, []);

  const handleVerification = useCallback(() => {
    logger.press('Verification');
    Alert.alert('Coming Soon', 'Verification badges coming in Sprint 2');
  }, []);

  const handleMyChildren = useCallback(() => {
    logger.press('MyChildren');
    router.push(Routes.CHILDREN);
  }, []);

  // Build smart subtitle for parents
  const childSubtitle = childCount > 0
    ? activeChildName
      ? `${childCount} ${childCount === 1 ? 'child' : 'children'} \u00B7 ${activeChildName} active`
      : `${childCount} ${childCount === 1 ? 'child' : 'children'}`
    : 'Add and manage your children';

  return (
    <Column gap="sm">
      <SectionHeader title="Account" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <SettingsRow
          icon="person"
          title="Edit profile"
          subtitle="Update your personal information"
          onPress={handleEditProfile}
        />
        {isCoach && (
          <>
            <SettingsRow
              icon="briefcase"
              title="Coach profile"
              subtitle="Services, identity, and badges"
              onPress={handleCoachProfile}
            />
            <SettingsRow
              icon="shield-checkmark"
              title="Verification"
              subtitle="Background checks and credentials"
              onPress={handleVerification}
            />
          </>
        )}
        {/* Non-coaches always see "My Children" — works for 0 or N children */}
        {!isCoach && (
          <SettingsRow
            icon="people"
            title="My Children"
            subtitle={childSubtitle}
            onPress={handleMyChildren}
          />
        )}
      </SurfaceCard>
    </Column>
  );
});
