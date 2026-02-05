import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import type { Academy, AcademyMembership } from '@/constants/types';

const logger = createLogger('AcademySettingsScreen');

export default function AcademySettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyData, staffData] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      setAcademy(academyData);
      if (academyData) {
        setName(academyData.name);
        setDescription(academyData.description);
        setIsPublic(academyData.isPublic);
        setRequiresApproval(academyData.requiresApproval);
      }

      if (currentUser?.id) {
        const membership = staffData.find((m) => m.userId === currentUser.id);
        setUserMembership(membership || null);
      }
    } catch (error) {
      logger.error('Failed to load academy:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!academy) return;

    setSaving(true);
    try {
      await academyService.updateSettings(academy.id, {
        name,
        description,
        isPublic,
        requiresApproval,
      });
      Alert.alert('Success', 'Settings saved successfully');
      router.back();
    } catch (error) {
      logger.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isOwner = userMembership?.role === 'OWNER';

  if (loading || !academy) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={{ flex: 1 }}>
          Academy Settings
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Academy Name</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              value={name}
              onChangeText={setName}
              editable={isOwner}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Description</ThemedText>
            <TextInput
              style={[styles.textArea, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={isOwner}
            />
          </View>
        </SurfaceCard>

        {/* Quick Links */}
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>

          <Clickable
            onPress={() => router.push(`/academy/${id}/branding`)}
            style={styles.linkRow}
          >
            <View style={[styles.linkIcon, { backgroundColor: `${palette.tint}15` }]}>
              <Ionicons name="color-palette" size={20} color={palette.tint} />
            </View>
            <View style={styles.linkContent}>
              <ThemedText type="defaultSemiBold">Branding</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: palette.muted }]}>
                Logo, colors, and banner
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>

          <Clickable
            onPress={() => router.push(`/academy/${id}/staff`)}
            style={styles.linkRow}
          >
            <View style={[styles.linkIcon, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="people" size={20} color={palette.success} />
            </View>
            <View style={styles.linkContent}>
              <ThemedText type="defaultSemiBold">Staff Management</ThemedText>
              <ThemedText style={[styles.linkDescription, { color: palette.muted }]}>
                Invite and manage coaches
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={palette.muted} />
          </Clickable>
        </SurfaceCard>

        {/* Privacy Settings */}
        {isOwner && (
          <SurfaceCard style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Privacy
            </ThemedText>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <ThemedText type="defaultSemiBold">Public Academy</ThemedText>
                <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>
                  Allow anyone to discover your academy
                </ThemedText>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ true: palette.tint, false: palette.border }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <ThemedText type="defaultSemiBold">Require Approval</ThemedText>
                <ThemedText style={[styles.toggleDescription, { color: palette.muted }]}>
                  Review membership requests before approving
                </ThemedText>
              </View>
              <Switch
                value={requiresApproval}
                onValueChange={setRequiresApproval}
                trackColor={{ true: palette.tint, false: palette.border }}
              />
            </View>
          </SurfaceCard>
        )}

        {/* Danger Zone */}
        {isOwner && (
          <SurfaceCard style={[styles.card, { borderColor: palette.error }]}>
            <ThemedText type="defaultSemiBold" style={{ color: palette.error }}>
              Danger Zone
            </ThemedText>
            <ThemedText style={[styles.dangerText, { color: palette.muted }]}>
              These actions cannot be undone.
            </ThemedText>
            <Clickable
              onPress={() => Alert.alert('Coming Soon', 'This feature is not yet available')}
              style={[styles.dangerButton, { borderColor: palette.error }]}
            >
              <ThemedText style={{ color: palette.error, fontWeight: '600' }}>
                Delete Academy
              </ThemedText>
            </Clickable>
          </SurfaceCard>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      {isOwner && (
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Button onPress={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContent: {
    flex: 1,
  },
  linkDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  toggleDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  dangerText: {
    fontSize: 13,
  },
  dangerButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
});
