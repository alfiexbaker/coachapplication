import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { Column } from '@/components/primitives/column';
import { parseClubInviteInput } from '@/services/club-invite-link-service';

export interface JoinClubCardProps {
  isCoach: boolean;
  onJoin: (input: { code: string; role?: string }) => void;
  onCreate?: (name: string) => void;
}

export function JoinClubCard({ isCoach, onJoin, onCreate }: JoinClubCardProps) {
  const { colors: palette } = useTheme();
  const [joinCode, setJoinCode] = useState('');
  const normalizedCode = joinCode.trim().toUpperCase();
  const parsedInput = parseClubInviteInput(joinCode);
  const codeError =
    joinCode.trim().length === 0
      ? null
      : !parsedInput?.code
        ? 'Paste a valid invite code or link'
        : parsedInput.code.length < 4
        ? 'Code is too short'
        : null;
  const canJoin = Boolean(parsedInput?.code && parsedInput.code.length >= 4 && !codeError);

  const handleCreateClub = () => {
    router.push(Routes.CLUB_CREATE);
  };

  const handleCodeChange = (value: string) => {
    if (value.includes('://') || value.includes('inviteCode=')) {
      setJoinCode(value.trim());
      return;
    }
    setJoinCode(value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase());
  };

  return (
    <SurfaceCard style={styles.joinCard}>
      <Row style={styles.joinHeader}>
        <View style={[styles.clubAvatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="people" size={24} color={palette.tint} />
        </View>
        <Column flex>
          <ThemedText type="title" style={{ ...Typography.title }}>
            {isCoach ? 'Join or Create a Club' : 'Join a Club'}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {isCoach
              ? 'Connect with your coaching team'
              : "Join your coach's club for exclusive content"}
          </ThemedText>
        </Column>
      </Row>

      <Row style={styles.joinForm}>
        <TextInput
          placeholder="Paste invite code or link"
          placeholderTextColor={palette.muted}
          value={joinCode}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          maxLength={24}
          style={[
            styles.input,
            {
              backgroundColor: palette.background,
              color: palette.text,
              borderColor: codeError ? palette.error : palette.border,
            },
          ]}
        />
        <Clickable
          style={[styles.primaryButton, { backgroundColor: canJoin ? palette.tint : palette.border }]}
          onPress={() => parsedInput && onJoin(parsedInput)}
          disabled={!canJoin}
        >
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Join
          </ThemedText>
        </Clickable>
      </Row>
      <ThemedText style={[Typography.caption, { color: codeError ? palette.error : palette.muted }]}>
        {codeError ?? 'Ask your club for an invite code or join link'}
      </ThemedText>

      {isCoach && (
        <>
          <View style={styles.dividerWrapper}>
            <Divider />
            <ThemedText
              style={[
                styles.dividerText,
                { backgroundColor: palette.surface, color: palette.muted },
              ]}
            >
              or
            </ThemedText>
          </View>
          <Clickable
            style={[
              styles.createButton,
              { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.tint },
            ]}
            onPress={handleCreateClub}
          >
            <Ionicons name="add-circle-outline" size={20} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
              Create New Club
            </ThemedText>
          </Clickable>
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
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: {
    ...Typography.body,
    flex: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
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
    paddingHorizontal: Spacing.sm,
  },
});
