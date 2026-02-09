import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface JoinClubCardProps {
  isCoach: boolean;
  onJoin: (code: string) => void;
  onCreate?: (name: string) => void;
}

export function JoinClubCard({ isCoach, onJoin, onCreate }: JoinClubCardProps) {
  const { colors: palette } = useTheme();
  const [joinCode, setJoinCode] = useState('');

  const handleCreateClub = () => {
    router.push(Routes.CLUB_CREATE);
  };

  return (
    <SurfaceCard style={styles.joinCard}>
      <View style={styles.joinHeader}>
        <View style={[styles.clubAvatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="people" size={24} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ ...Typography.title }}>
            {isCoach ? 'Join or Create a Club' : 'Join a Club'}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {isCoach
              ? 'Connect with your coaching team'
              : 'Join your coach\'s club for exclusive content'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.joinForm}>
        <TextInput
          placeholder="Enter invite code"
          placeholderTextColor={palette.muted}
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
        />
        <Pressable
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          onPress={() => onJoin(joinCode)}
        >
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>Join</ThemedText>
        </Pressable>
      </View>

      {isCoach && (
        <>
          <View style={styles.dividerWrapper}>
            <Divider />
            <ThemedText style={[styles.dividerText, { backgroundColor: palette.surface, color: palette.muted }]}>or</ThemedText>
          </View>
          <Pressable
            style={[styles.createButton, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.tint }]}
            onPress={handleCreateClub}
          >
            <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Create New Club</ThemedText>
          </Pressable>
        </>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  joinCard: {
    gap: Spacing.md,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubAvatar: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinForm: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: { ...Typography.body, flex: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1 },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  dividerWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  dividerText: {
    ...Typography.caption,
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -10 }],
    paddingHorizontal: Spacing.sm
  },
});
