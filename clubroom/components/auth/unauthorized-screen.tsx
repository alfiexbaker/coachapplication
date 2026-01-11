import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { UserRole } from '@/hooks/use-auth';

const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Athlete',
  PARENT: 'Parent',
  COACH: 'Coach',
  ADMIN: 'Administrator',
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  USER: 'athletes and players',
  PARENT: 'parents and guardians',
  COACH: 'coaches and trainers',
  ADMIN: 'platform administrators',
};

interface UnauthorizedScreenProps {
  currentRole: UserRole;
  requiredRoles: UserRole[];
  screenName?: string;
}

export function UnauthorizedScreen({
  currentRole,
  requiredRoles,
  screenName,
}: UnauthorizedScreenProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const currentRoleLabel = ROLE_LABELS[currentRole] || currentRole;
  const requiredRoleLabels = requiredRoles.map(role => ROLE_LABELS[role] || role);
  const requiredRoleDescriptions = requiredRoles.map(role => ROLE_DESCRIPTIONS[role] || role);

  const formatRoleList = (roles: string[]): string => {
    if (roles.length === 1) return roles[0];
    if (roles.length === 2) return `${roles[0]} or ${roles[1]}`;
    return `${roles.slice(0, -1).join(', ')}, or ${roles[roles.length - 1]}`;
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${palette.error}15` }]}>
          <Ionicons name="lock-closed" size={48} color={palette.error} />
        </View>

        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          Access Denied
        </ThemedText>

        {/* Description Card */}
        <SurfaceCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-outline" size={20} color={palette.muted} />
            <ThemedText type="defaultSemiBold">Why am I seeing this?</ThemedText>
          </View>

          <ThemedText style={[styles.description, { color: palette.muted }]}>
            This area is restricted to {formatRoleList(requiredRoleDescriptions)}.
          </ThemedText>

          <View style={styles.roleComparison}>
            <View style={[styles.roleBox, { backgroundColor: `${palette.error}10`, borderColor: `${palette.error}30` }]}>
              <ThemedText style={[styles.roleBoxLabel, { color: palette.error }]}>Your role</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
                {currentRoleLabel}
              </ThemedText>
            </View>

            <Ionicons name="arrow-forward" size={16} color={palette.muted} />

            <View style={[styles.roleBox, { backgroundColor: `${palette.tint}10`, borderColor: `${palette.tint}30` }]}>
              <ThemedText style={[styles.roleBoxLabel, { color: palette.tint }]}>Required</ThemedText>
              <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                {formatRoleList(requiredRoleLabels)}
              </ThemedText>
            </View>
          </View>

          {screenName && (
            <View style={[styles.screenInfo, { backgroundColor: palette.surface }]}>
              <Ionicons name="document-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.screenInfoText, { color: palette.muted }]}>
                Attempted to access: {screenName}
              </ThemedText>
            </View>
          )}
        </SurfaceCard>

        {/* Help Text */}
        <ThemedText style={[styles.helpText, { color: palette.muted }]}>
          If you believe this is an error, please contact your administrator or log in with a different account.
        </ThemedText>

        {/* Actions */}
        <View style={styles.actions}>
          <Button onPress={handleGoBack} variant="outline" style={styles.button}>
            Go Back
          </Button>
          <Button onPress={handleGoHome} style={styles.button}>
            Go Home
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  card: {
    width: '100%',
    gap: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  roleComparison: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  roleBox: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  roleBoxLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  screenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  screenInfoText: {
    fontSize: 12,
    flex: 1,
  },
  helpText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  button: {
    flex: 1,
    minWidth: 120,
  },
});
