import React from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// ─── Types ──────────────────────────────────────────────────────

interface ProfileCompletionCheck {
  label: string;
  done: boolean;
  icon: string;
}

export interface ProfileQuickActionsProps {
  /** Whether the coach's profile is currently live */
  isLive: boolean;
  /** Whether the go-live toggle request is in flight */
  liveLoading: boolean;
  /** Profile completion percentage (0-100) */
  completionPercentage: number;
  /** Whether the coach can go live (>= 80% completion) */
  canGoLive: boolean;
  /** Completion checklist items */
  completionChecks: ProfileCompletionCheck[];
  /** Called when the live toggle changes */
  onGoLiveToggle: (value: boolean) => void;
  /** Called when sign out is pressed */
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
      {/* Go-Live Card */}
      <View style={styles.goLiveSection}>
        <SurfaceCard style={styles.goLiveCard}>
          <View style={styles.goLiveHeader}>
            <View style={styles.goLiveInfo}>
              <View style={styles.goLiveTitleRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: isLive ? palette.success : palette.muted },
                  ]}
                />
                <ThemedText type="subtitle">
                  {isLive ? "You're Live" : 'Profile Offline'}
                </ThemedText>
              </View>
              <ThemedText style={[styles.goLiveSubtitle, { color: palette.muted }]}>
                {isLive
                  ? 'Athletes can find and book you'
                  : 'Go live to start receiving bookings'}
              </ThemedText>
            </View>
            <Switch
              value={isLive}
              onValueChange={onGoLiveToggle}
              trackColor={{ false: palette.border, true: palette.success }}
              thumbColor={palette.surface}
              disabled={liveLoading}
            />
          </View>

          {/* Progress bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
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
            </View>
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

          {/* Checklist */}
          {!canGoLive && (
            <View style={styles.checklistSection}>
              {completionChecks.map((check, index) => (
                <View key={index} style={styles.checklistItem}>
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
                </View>
              ))}
            </View>
          )}
        </SurfaceCard>
      </View>

      {/* Quick Access Section */}
      <View style={styles.quickAccessSection}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Quick Access
        </ThemedText>

        <SurfaceCard
          style={styles.quickAccessCard}
          onPress={() => router.push(Routes.MORE)}
        >
          <View style={styles.quickAccessRow}>
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: withAlpha(palette.success, 0.09) },
              ]}
            >
              <Ionicons name="analytics" size={24} color={palette.success} />
            </View>
            <View style={styles.quickAccessText}>
              <ThemedText type="defaultSemiBold">Analytics &amp; Development</ThemedText>
              <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
                View athlete progress and session data
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
        </SurfaceCard>

        <SurfaceCard
          style={styles.quickAccessCard}
          onPress={() => router.push(Routes.AVAILABILITY)}
        >
          <View style={styles.quickAccessRow}>
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: withAlpha(palette.tint, 0.09) },
              ]}
            >
              <Ionicons name="calendar" size={24} color={palette.tint} />
            </View>
            <View style={styles.quickAccessText}>
              <ThemedText type="defaultSemiBold">Set Availability</ThemedText>
              <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
                Manage your coaching schedule
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
        </SurfaceCard>

        <SurfaceCard
          style={styles.quickAccessCard}
          onPress={() => router.push(Routes.SETTINGS)}
        >
          <View style={styles.quickAccessRow}>
            <View
              style={[
                styles.quickAccessIcon,
                { backgroundColor: withAlpha(palette.accent, 0.09) },
              ]}
            >
              <Ionicons name="settings" size={24} color={palette.accent} />
            </View>
            <View style={styles.quickAccessText}>
              <ThemedText type="defaultSemiBold">Settings &amp; Preferences</ThemedText>
              <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
                Manage account, privacy, notifications &amp; more
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </View>
        </SurfaceCard>

        {/* Sign Out */}
        <Clickable
          style={[styles.signOutButton, { borderColor: palette.error }]}
          onPress={onSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color={palette.error} />
          <ThemedText style={[styles.signOutText, { color: palette.error }]}>
            Sign Out
          </ThemedText>
        </Clickable>
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  goLiveSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  goLiveCard: {
    gap: Spacing.md,
  },
  goLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goLiveInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  goLiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.full,
  },
  goLiveSubtitle: {
    ...Typography.small,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    ...Typography.caption,
  },
  progressPercent: {
    ...Typography.caption,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  checklistSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checklistLabel: {
    ...Typography.small,
  },
  quickAccessSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.title,
    marginBottom: Spacing.xs,
  },
  quickAccessCard: {
    padding: 0,
  },
  quickAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessText: {
    flex: 1,
    gap: Spacing.xxs,
  },
  quickAccessDesc: {
    ...Typography.small,
    lineHeight: 18,
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
  signOutText: {
    ...Typography.subheading,
    fontWeight: '600',
  },
});

// ─── Exports ────────────────────────────────────────────────────

export const ProfileQuickActions = React.memo(ProfileQuickActionsInner);
export default ProfileQuickActions;
