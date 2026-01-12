import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('JoinAcademy');

export default function JoinAcademyScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Missing Code', 'Please enter an invite code');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to join an academy');
      return;
    }

    setLoading(true);
    try {
      const membership = await academyService.joinWithCode(code, currentUser.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info('academy_joined', { academyId: membership.academyId });
      Alert.alert('Welcome!', 'You have successfully joined the academy', [
        { text: 'View Academy', onPress: () => router.replace(`/academy/${membership.academyId}`) },
      ]);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error instanceof Error ? error.message : 'Failed to join academy';
      logger.error('academy_join_failed', { error: message });
      Alert.alert('Unable to Join', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={{ flex: 1 }}>
            Join Academy
          </ThemedText>
        </View>

        <View style={styles.content}>
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={[styles.iconCircle, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="school" size={48} color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Join with Invite Code
            </ThemedText>
            <ThemedText style={[styles.heroDescription, { color: palette.muted }]}>
              Enter the invite code you received from your academy to join their team.
            </ThemedText>
          </View>

          {/* Input Card */}
          <SurfaceCard style={styles.inputCard}>
            <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
              Invite Code
            </ThemedText>
            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: palette.surfaceSecondary,
                  color: palette.text,
                  borderColor: inviteCode ? palette.tint : palette.border,
                },
              ]}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="e.g. ACADEMY123"
              placeholderTextColor={palette.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
            <ThemedText style={[styles.helperText, { color: palette.muted }]}>
              Codes are typically 6-12 characters and case-insensitive
            </ThemedText>
          </SurfaceCard>

          {/* Join Button */}
          <Button onPress={handleJoin} disabled={loading || !inviteCode.trim()}>
            {loading ? 'Joining...' : 'Join Academy'}
          </Button>

          {/* Info */}
          <View style={[styles.infoCard, { backgroundColor: `${palette.info}10` }]}>
            <Ionicons name="information-circle" size={20} color={palette.info} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Don't have a code? Ask your coach or academy administrator for an invite.
            </ThemedText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  inputCard: {
    gap: Spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
  },
  codeInput: {
    height: 56,
    borderRadius: Radii.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
