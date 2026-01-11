import { useState, useCallback } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { clubService } from '@/services/club-service';
import type { Club, ClubInvite } from '@/constants/types';

export interface JoinClubCardProps {
  isCoach: boolean;
  onJoin: (code: string) => void;
  onCreate: (name: string) => void;
}

type ValidationState = {
  status: 'idle' | 'validating' | 'valid' | 'invalid' | 'joining';
  club?: Club;
  invite?: ClubInvite;
  error?: string;
};

export function JoinClubCard({ isCoach, onJoin, onCreate }: JoinClubCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [joinCode, setJoinCode] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [validation, setValidation] = useState<ValidationState>({ status: 'idle' });

  // Validate invite code when user finishes typing
  const handleValidateCode = useCallback(async () => {
    const trimmedCode = joinCode.trim();
    if (!trimmedCode) {
      setValidation({ status: 'idle' });
      return;
    }

    setValidation({ status: 'validating' });

    try {
      const result = await clubService.validateInviteCode(trimmedCode);

      if (result.valid && result.club) {
        setValidation({
          status: 'valid',
          club: result.club,
          invite: result.invite,
        });
      } else {
        setValidation({
          status: 'invalid',
          error: result.error || 'Invalid invite code',
        });
      }
    } catch (error) {
      console.error('Code validation error:', error);
      setValidation({
        status: 'invalid',
        error: 'Failed to validate code. Please try again.',
      });
    }
  }, [joinCode]);

  // Handle join with validated code
  const handleJoinClub = useCallback(async () => {
    if (validation.status !== 'valid' || !validation.club || !validation.invite) {
      return;
    }

    if (!currentUser?.id) {
      setValidation({
        ...validation,
        status: 'invalid',
        error: 'Please log in to join a club',
      });
      return;
    }

    setValidation((prev) => ({ ...prev, status: 'joining' }));

    try {
      const result = await clubService.joinClub(
        currentUser.id,
        validation.club.id,
        validation.invite.code,
        currentUser.fullName || currentUser.username
      );

      if (result.success) {
        // Notify parent component
        onJoin(validation.invite.code);
      } else {
        setValidation({
          status: 'invalid',
          error: result.error || 'Failed to join club',
        });
      }
    } catch (error) {
      console.error('Join club error:', error);
      setValidation({
        status: 'invalid',
        error: 'Failed to join club. Please try again.',
      });
    }
  }, [validation, currentUser, onJoin]);

  // Reset validation when code changes
  const handleCodeChange = (text: string) => {
    setJoinCode(text);
    if (validation.status !== 'idle') {
      setValidation({ status: 'idle' });
    }
  };

  // Get role label
  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      OWNER: 'Owner',
      ADMIN: 'Admin',
      HEAD_COACH: 'Head Coach',
      COACH: 'Coach',
      MEMBER: 'Member',
    };
    return labels[role || 'MEMBER'] || 'Member';
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

      {/* Join form */}
      <View style={styles.joinForm}>
        <TextInput
          placeholder="Enter invite code"
          placeholderTextColor={palette.muted}
          value={joinCode}
          onChangeText={handleCodeChange}
          onBlur={handleValidateCode}
          autoCapitalize="characters"
          style={[
            styles.input,
            {
              backgroundColor: palette.background,
              color: palette.text,
              borderColor: validation.status === 'invalid' ? '#DC2626' : (validation.status === 'valid' || validation.status === 'joining') ? '#16A34A' : palette.border,
            },
          ]}
        />
        {validation.status === 'validating' ? (
          <View style={[styles.statusButton, { backgroundColor: palette.background, borderColor: palette.border }]}>
            <ActivityIndicator size="small" color={palette.tint} />
          </View>
        ) : validation.status === 'joining' ? (
          <View style={[styles.primaryButton, { backgroundColor: '#16A34A' }]}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        ) : validation.status === 'valid' ? (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#16A34A' }]}
            onPress={handleJoinClub}
          >
            <ThemedText style={styles.primaryButtonText}>Join</ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            onPress={handleValidateCode}
          >
            <ThemedText style={styles.primaryButtonText}>Verify</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Error message */}
      {validation.status === 'invalid' && validation.error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <ThemedText style={styles.errorText}>{validation.error}</ThemedText>
        </View>
      )}

      {/* Club preview */}
      {validation.status === 'valid' && validation.club && (
        <View style={[styles.clubPreview, { backgroundColor: `${palette.tint}08`, borderColor: palette.tint }]}>
          <View style={styles.clubPreviewHeader}>
            <View style={[styles.clubBadge, { backgroundColor: `${palette.tint}15` }]}>
              <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>
                {validation.club.badge || validation.club.name?.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">{validation.club.name}</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
                {validation.club.city}{validation.club.country ? `, ${validation.club.country}` : ''}
              </ThemedText>
            </View>
            <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
          </View>

          <View style={styles.clubPreviewStats}>
            <View style={styles.clubPreviewStat}>
              <Ionicons name="people-outline" size={14} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                {validation.club.memberCount} members
              </ThemedText>
            </View>
            <View style={styles.clubPreviewStat}>
              <Ionicons name="shield-outline" size={14} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                Joining as {getRoleLabel(validation.invite?.role)}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={{ fontSize: 12, color: palette.tint, marginTop: Spacing.xs }}>
            Tap "Join" to become a member
          </ThemedText>
        </View>
      )}

      {isCoach && (
        <>
          <View style={[styles.divider, { backgroundColor: palette.border }]}>
            <ThemedText style={[styles.dividerText, { backgroundColor: palette.surface, color: palette.muted }]}>or</ThemedText>
          </View>
          <View style={styles.joinForm}>
            <TextInput
              placeholder="New club name"
              placeholderTextColor={palette.muted}
              value={newClubName}
              onChangeText={setNewClubName}
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
            />
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: palette.border }]}
              onPress={() => onCreate(newClubName)}
            >
              <ThemedText style={{ color: palette.text, fontWeight: '600' }}>Create</ThemedText>
            </TouchableOpacity>
          </View>
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
    minWidth: 70,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontWeight: '600',
    color: '#fff',
  },
  statusButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
  },
  clubPreview: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  clubPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  clubBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  clubPreviewStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  clubPreviewStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
