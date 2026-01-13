import { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export interface JoinClubCardProps {
  isCoach: boolean;
  onJoin: (code: string) => void;
  onCreate?: (name: string) => void;
}

export function JoinClubCard({ isCoach, onJoin, onCreate }: JoinClubCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [joinCode, setJoinCode] = useState('');

  const handleCreateClub = () => {
    router.push('/club/create');
  };

  return (
    <SurfaceCard style={styles.joinCard}>
      <View style={styles.joinHeader}>
        <View style={[styles.clubAvatar, { backgroundColor: `${palette.tint}10` }]}>
          <Ionicons name="people" size={24} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ fontSize: 20 }}>
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
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          onPress={() => onJoin(joinCode)}
        >
          <ThemedText style={styles.primaryButtonText}>Join</ThemedText>
        </TouchableOpacity>
      </View>

      {isCoach && (
        <>
          <View style={[styles.divider, { backgroundColor: palette.border }]}>
            <ThemedText style={[styles.dividerText, { backgroundColor: palette.surface, color: palette.muted }]}>or</ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: `${palette.tint}10`, borderColor: palette.tint }]}
            onPress={handleCreateClub}
          >
            <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>Create New Club</ThemedText>
          </TouchableOpacity>
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
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinForm: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    borderWidth: 1,
  },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    fontWeight: '600',
    color: '#fff',
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
  divider: {
    height: 1,
    position: 'relative',
  },
  dividerText: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -10 }],
    paddingHorizontal: Spacing.sm,
    fontSize: 12,
  },
});
