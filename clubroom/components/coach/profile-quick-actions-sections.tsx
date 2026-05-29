/**
 * Extracted sub-components for ProfileQuickActions.
 *
 * GoLiveCard — status dot, switch, progress bar, completion checklist.
 * QuickAccessItem — single navigation card.
 * SignOutButton — destructive sign-out action.
 */

import React from 'react';
import { Switch, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './profile-quick-actions-styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileCompletionCheck {
  label: string;
  done: boolean;
  icon: string;
}

// ─── GoLiveCard ───────────────────────────────────────────────────────────────

interface GoLiveCardProps {
  isLive: boolean;
  liveLoading: boolean;
  completionPercentage: number;
  canGoLive: boolean;
  completionChecks: ProfileCompletionCheck[];
  onGoLiveToggle: (value: boolean) => void;
  palette: ThemeColors;
}

export const GoLiveCard = function GoLiveCard({
  isLive,
  liveLoading,
  completionPercentage,
  canGoLive,
  completionChecks,
  onGoLiveToggle,
  palette,
}: GoLiveCardProps) {
  return (
    <View style={styles.goLiveSection}>
      <SurfaceCard style={styles.goLiveCard}>
        <Row style={styles.goLiveHeader}>
          <View style={styles.goLiveInfo}>
            <Row style={styles.goLiveTitleRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isLive ? palette.success : palette.muted },
                ]}
              />
              <ThemedText type="subtitle">{isLive ? "You're Live" : 'Profile Offline'}</ThemedText>
            </Row>
            <ThemedText style={[styles.goLiveSubtitle, { color: palette.muted }]}>
              {isLive ? 'Athletes can find and book you' : 'Go live to start receiving bookings'}
            </ThemedText>
          </View>
          <Switch
            value={isLive}
            onValueChange={onGoLiveToggle}
            trackColor={{ false: palette.border, true: palette.success }}
            thumbColor={palette.surface}
            disabled={liveLoading}
          />
        </Row>

        <View style={styles.progressSection}>
          <Row style={styles.progressHeader}>
            <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
              Profile completion
            </ThemedText>
            <ThemedText
              style={[
                styles.progressPercent,
                { color: canGoLive ? palette.success : palette.warning },
              ]}
            >
              {completionPercentage}%
            </ThemedText>
          </Row>
          <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: canGoLive ? palette.success : palette.warning,
                  width: `${completionPercentage}%`,
                },
              ]}
            />
          </View>
        </View>

        {!canGoLive && (
          <View style={styles.checklistSection}>
            {completionChecks.map((check) => (
              <Row key={check.label} style={styles.checklistItem}>
                <Ionicons
                  name={check.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={check.done ? palette.success : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.checklistLabel,
                    { color: check.done ? palette.foreground : palette.muted },
                  ]}
                >
                  {check.label}
                </ThemedText>
              </Row>
            ))}
          </View>
        )}
      </SurfaceCard>
    </View>
  );
};

// ─── QuickAccessItem ──────────────────────────────────────────────────────────

interface QuickAccessItemProps {
  route: Href;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  palette: ThemeColors;
}

const renderQuickAccessItem = function renderQuickAccessItem({
  route,
  icon,
  iconColor,
  title,
  description,
  palette,
}: QuickAccessItemProps) {
  return (
    <SurfaceCard style={styles.quickAccessCard} onPress={() => router.push(route)}>
      <Row style={styles.quickAccessRow}>
        <View style={[styles.quickAccessIcon, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
          <Ionicons name={icon} size={24} color={iconColor} />
        </View>
        <View style={styles.quickAccessText}>
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
            {description}
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Row>
    </SurfaceCard>
  );
};
export const QuickAccessItem = renderQuickAccessItem;

// ─── SignOutButton ────────────────────────────────────────────────────────────

interface SignOutButtonProps {
  onSignOut: () => void;
  palette: ThemeColors;
}

const renderSignOutButton = function renderSignOutButton({
  onSignOut,
  palette,
}: SignOutButtonProps) {
  return (
    <Clickable style={[styles.signOutButton, { borderColor: palette.error }]} onPress={onSignOut}>
      <Ionicons name="log-out-outline" size={20} color={palette.error} />
      <ThemedText style={[styles.signOutText, { color: palette.error }]}>Sign Out</ThemedText>
    </Clickable>
  );
};
export const SignOutButton = renderSignOutButton;
