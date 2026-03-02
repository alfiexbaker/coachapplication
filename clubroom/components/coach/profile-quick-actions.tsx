import React from 'react';
import { View } from 'react-native';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

import {
  GoLiveCard,
  QuickAccessItem,
  SignOutButton,
  styles,
} from './profile-quick-actions-sections';

// ─── Types ──────────────────────────────────────────────────────

interface ProfileCompletionCheck {
  label: string;
  done: boolean;
  icon: string;
}

export interface ProfileQuickActionsProps {
  isLive: boolean;
  liveLoading: boolean;
  completionPercentage: number;
  canGoLive: boolean;
  completionChecks: ProfileCompletionCheck[];
  onGoLiveToggle: (value: boolean) => void;
  onSignOut: () => void;
}

// ─── Component ──────────────────────────────────────────────────

function ProfileQuickActionsInner({
  isLive,
  liveLoading,
  completionPercentage,
  canGoLive,
  completionChecks,
  onGoLiveToggle,
  onSignOut,
}: ProfileQuickActionsProps) {
  const { colors: palette } = useTheme();

  return (
    <>
      <GoLiveCard
        isLive={isLive}
        liveLoading={liveLoading}
        completionPercentage={completionPercentage}
        canGoLive={canGoLive}
        completionChecks={completionChecks}
        onGoLiveToggle={onGoLiveToggle}
        palette={palette}
      />

      <View style={styles.quickAccessSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Access
        </ThemedText>

        <QuickAccessItem
          route={Routes.ANALYTICS_DASHBOARD}
          icon="analytics"
          iconColor={palette.success}
          title="Analytics & Development"
          description="View athlete progress and session data"
          palette={palette}
        />

        <QuickAccessItem
          route={Routes.AVAILABILITY}
          icon="calendar"
          iconColor={palette.tint}
          title="Set Availability"
          description="Manage your coaching schedule"
          palette={palette}
        />

        <QuickAccessItem
          route={Routes.SETTINGS_INDEX}
          icon="settings"
          iconColor={palette.accent}
          title="Settings & Preferences"
          description="Manage account, privacy, notifications & more"
          palette={palette}
        />

        <SignOutButton onSignOut={onSignOut} palette={palette} />
      </View>
    </>
  );
}

// ─── Exports ────────────────────────────────────────────────────

export const ProfileQuickActions = React.memo(ProfileQuickActionsInner);
export default ProfileQuickActions;
