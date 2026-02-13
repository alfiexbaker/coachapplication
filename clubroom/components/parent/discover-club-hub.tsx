/**
 * DiscoverClubHub — Club hub card with club list and invite code input.
 */
import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import type { Club } from '@/constants/types';

interface DiscoverClubHubProps {
  userClubs: Club[];
}

function DiscoverClubHubInner({ userClubs }: DiscoverClubHubProps) {
  const { colors: palette } = useTheme();
  const [clubInviteCode, setClubInviteCode] = useState('');
  const openClubHub = useCallback(() => {
    router.push(Routes.CLUB_HUB);
  }, []);
  const openClub = useCallback((clubId: string) => {
    router.push(Routes.club(clubId));
  }, []);

  const handleJoinClub = useCallback(() => {
    const trimmedCode = clubInviteCode.trim().toUpperCase();
    if (!trimmedCode) return;
    router.push(Routes.clubHub({ inviteCode: trimmedCode }));
    setClubInviteCode('');
  }, [clubInviteCode]);

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.section}>
      <SurfaceCard style={styles.card}>
        {/* Header */}
        <Row align="center" gap="md">
          <Row
            align="center"
            justify="center"
            style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
          >
            <Ionicons name="shield" size={24} color={palette.tint} />
          </Row>
          <View style={styles.headerInfo}>
            <ThemedText type="defaultSemiBold" style={{ ...Typography.heading }}>
              Club Hub
            </ThemedText>
            <ThemedText style={{ ...Typography.small, color: palette.muted }}>
              {userClubs.length > 0
                ? `${userClubs.length} club${userClubs.length > 1 ? 's' : ''} joined`
                : 'Join your team'}
            </ThemedText>
          </View>
          <Clickable
            onPress={openClubHub}
            accessibilityLabel={userClubs.length > 0 ? 'View all clubs' : 'Browse clubs'}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.viewButton,
              { backgroundColor: palette.tint, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <ThemedText style={{ ...Typography.smallSemiBold, color: palette.surface }}>
              {userClubs.length > 0 ? 'View All' : 'Browse'}
            </ThemedText>
          </Clickable>
        </Row>

        {/* Club list */}
        {userClubs.length > 0 && (
          <View style={styles.clubList}>
            {userClubs.slice(0, 2).map((club) => (
              <Clickable
                key={club.id}
                onPress={() => openClub(club.id)}
                accessibilityLabel={`View ${club.name}`}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.clubItem,
                  {
                    backgroundColor: withAlpha(palette.tint, 0.03),
                    borderColor: withAlpha(palette.tint, 0.12),
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Row align="center" gap="sm">
                  <Row
                    align="center"
                    justify="center"
                    style={[styles.clubBadge, { backgroundColor: palette.tint }]}
                  >
                    <ThemedText style={[styles.clubBadgeText, { color: palette.surface }]}>
                      {club.badge?.slice(0, 2) || club.name.slice(0, 2).toUpperCase()}
                    </ThemedText>
                  </Row>
                  <View style={styles.clubInfo}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={{ ...Typography.bodySmall }}
                      numberOfLines={1}
                    >
                      {club.name}
                    </ThemedText>
                    <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
                      {club.memberCount} members
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={palette.muted} />
                </Row>
              </Clickable>
            ))}
          </View>
        )}

        {/* Join section */}
        <View style={[styles.joinSection, { borderTopColor: palette.border }]}>
          <Row align="center" gap="sm">
            <Row
              align="center"
              gap="sm"
              style={[
                styles.inviteInput,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              <Ionicons name="key-outline" size={16} color={palette.muted} />
              <TextInput
                value={clubInviteCode}
                onChangeText={setClubInviteCode}
                placeholder="Have an invite code?"
                placeholderTextColor={palette.muted}
                autoCapitalize="characters"
                accessibilityLabel="Club invite code"
                style={[styles.inviteText, { color: palette.text }]}
              />
            </Row>
            <Clickable
              onPress={handleJoinClub}
              disabled={!clubInviteCode.trim()}
              accessibilityLabel="Join club"
              accessibilityRole="button"
              accessibilityState={{ disabled: !clubInviteCode.trim() }}
              style={({ pressed }) => [
                styles.joinButton,
                {
                  backgroundColor: clubInviteCode.trim() ? palette.success : palette.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name="arrow-forward"
                size={18}
                color={clubInviteCode.trim() ? palette.surface : palette.muted}
              />
            </Clickable>
          </Row>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export const DiscoverClubHub = memo(DiscoverClubHubInner);

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  card: { gap: Spacing.md },
  iconCircle: { width: 48, height: 48, borderRadius: Radii.xl },
  headerInfo: { flex: 1 },
  viewButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 44,
  },
  clubList: { gap: Spacing.sm },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  clubBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: { ...Typography.caption },
  clubInfo: { flex: 1 },
  joinSection: { borderTopWidth: 1, paddingTop: Spacing.md },
  inviteInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  inviteText: { ...Typography.bodySmall, flex: 1 },
  joinButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
