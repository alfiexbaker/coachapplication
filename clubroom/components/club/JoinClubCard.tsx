import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { parseClubInviteInput } from '@/services/club-invite-link-service';

export interface JoinClubCardProps {
  isCoach: boolean;
  initialCode?: string;
  onJoin: (input: { code: string; role?: string }) => void;
}

function handleCreateClub() {
  router.push(Routes.CLUB_CREATE);
}

export function JoinClubCard({ isCoach, initialCode = '', onJoin }: JoinClubCardProps) {
  const { colors: palette } = useTheme();
  const [joinCode, setJoinCode] = useState(initialCode);
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

  const handleCodeChange = (value: string) => {
    if (value.includes('://') || value.includes('inviteCode=')) {
      setJoinCode(value.trim());
      return;
    }
    setJoinCode(value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase());
  };

  return (
    <SurfaceCard style={styles.joinCard}>
      <ThemedText type="defaultSemiBold">Join a club</ThemedText>

      <Row style={styles.joinForm}>
        <TextInput
          accessibilityLabel="Invite code or link"
          placeholder="Invite code or link"
          placeholderTextColor={palette.muted}
          value={joinCode}
          onChangeText={handleCodeChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={512}
          returnKeyType="go"
          onSubmitEditing={() => {
            if (canJoin && parsedInput) {
              onJoin(parsedInput);
            }
          }}
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
          accessibilityLabel="Join club"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canJoin }}
        >
          <ThemedText style={[styles.primaryButtonText, { color: palette.onPrimary }]}>
            Join
          </ThemedText>
        </Clickable>
      </Row>
      {codeError ? (
        <ThemedText style={[Typography.caption, { color: palette.error }]}>{codeError}</ThemedText>
      ) : null}

      {isCoach ? (
        <Clickable
          style={[styles.createButton, { borderColor: palette.border }]}
          onPress={handleCreateClub}
          accessibilityLabel="Create club"
        >
          <ThemedText style={{ color: palette.text, fontWeight: '600' }}>Create club</ThemedText>
        </Clickable>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  joinCard: {
    gap: Spacing.sm,
  },
  joinForm: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: {
    ...Typography.body,
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  primaryButton: {
    minHeight: 44,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
  },
  createButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
