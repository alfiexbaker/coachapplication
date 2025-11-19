import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';

export default function LoginScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { login, error, availableUsers } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (!username || !password) {
      return;
    }

    login(username, password);
  };

  const disabled = !username || !password;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}>
        <SurfaceCard style={styles.loginCard}>
          <ThemedText type="eyebrow" style={styles.eyebrow}>
            Demo build · Auth gate
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            Sign in to Clubroom
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Use one of the preloaded accounts below to explore every screen from a specific
            perspective.
          </ThemedText>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Username</ThemedText>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. coach"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              returnKeyType="next"
              onSubmitEditing={() => handleSubmit()}
            />
          </View>
          <View style={styles.fieldGroup}>
            <ThemedText style={styles.label}>Password</ThemedText>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {error ? (
            <ThemedText style={[styles.helper, { color: Colors[scheme].error }]}>{error}</ThemedText>
          ) : (
            <ThemedText style={styles.helper}>Credentials are case-insensitive.</ThemedText>
          )}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: disabled
                  ? palette.border
                  : pressed
                    ? palette.tintPressed
                    : palette.tint,
                opacity: pressed || disabled ? 0.9 : 1,
              },
            ]}
            disabled={disabled}
            onPress={handleSubmit}>
            <ThemedText style={styles.buttonLabel} lightColor="#FFFFFF" darkColor="#FFFFFF">
              Continue
            </ThemedText>
          </Pressable>
        </SurfaceCard>

        <SurfaceCard style={styles.credentialsCard}>
          <ThemedText type="subtitle" style={styles.credentialsTitle}>
            Preloaded accounts
          </ThemedText>
          {availableUsers.map((user) => (
            <View key={user.username} style={styles.credentialsRow}>
              <View style={styles.roleBadge}>
                <ThemedText style={styles.roleBadgeText}>{user.role}</ThemedText>
              </View>
              <ThemedText style={styles.credentialValue}>
                {user.username} / {user.password}
              </ThemedText>
            </View>
          ))}
        </SurfaceCard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    justifyContent: 'center',
  },
  loginCard: {
    gap: Spacing.md,
  },
  eyebrow: {
    opacity: 0.7,
  },
  title: {
    textAlign: 'left',
  },
  subtitle: {
    opacity: 0.8,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  helper: {
    fontSize: 14,
    opacity: 0.9,
  },
  button: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  buttonLabel: {
    fontWeight: '600',
  },
  credentialsCard: {
    gap: Spacing.sm,
  },
  credentialsTitle: {
    textAlign: 'left',
  },
  credentialsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  roleBadgeText: {
    fontWeight: '600',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  credentialValue: {
    fontFamily: 'monospace',
  },
});
