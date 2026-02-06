import { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { Club, ClubMembership } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CreateClub');

function generateInviteCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 5).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export default function CreateClubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('UK');
  const [badge, setBadge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = name.trim().length >= 3 && city.trim().length >= 2;

  const handleCreate = async () => {
    if (!isValid || !currentUser) return;

    setIsSubmitting(true);
    logger.action('CreateClub', { name, city });

    try {
      const clubId = `club_${Date.now()}`;
      const inviteCode = generateInviteCode(name);

      const newClub: Club = {
        id: clubId,
        name: name.trim(),
        tagline: tagline.trim() || undefined,
        city: city.trim(),
        country: country.trim(),
        badge: badge.trim() || name.slice(0, 3).toUpperCase(),
        memberCount: 1,
        coachCount: 1,
        squadCount: 0,
        ownerId: currentUser.id,
        ownerName: currentUser.fullName || currentUser.username || 'Coach',
        inviteCode,
      };

      const membership: ClubMembership = {
        clubId,
        userId: currentUser.id,
        role: 'OWNER',
        status: 'active',
        joinSource: 'created',
        inviteCode,
        canPostAsClub: true,
      };

      // Store club and membership
      const clubs = await apiClient.get<Club[]>('user_clubs', []);
      clubs.push(newClub);
      await apiClient.set('user_clubs', clubs);

      const memberships = await apiClient.get<ClubMembership[]>('club_memberships', []);
      memberships.push(membership);
      await apiClient.set('club_memberships', memberships);

      logger.success('ClubCreated', { clubId, inviteCode });

      // Navigate to the new club
      router.replace(Routes.club(clubId));
    } catch (error) {
      logger.error('CreateClubFailed', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Create Club</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <SurfaceCard style={styles.infoCard}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="people" size={32} color={palette.tint} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.infoTitle}>
              Start Your Club Community
            </ThemedText>
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Create a space for your athletes and parents. Share updates, manage squads, and track progress all in one place.
            </ThemedText>
          </SurfaceCard>

          <View style={styles.formSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
              Club Details
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                Club Name *
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                placeholder="e.g., Lions FC Academy"
                placeholderTextColor={palette.muted}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                Tagline (optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                ]}
                placeholder="e.g., Developing champions since 2015"
                placeholderTextColor={palette.muted}
                value={tagline}
                onChangeText={setTagline}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  City *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="e.g., London"
                  placeholderTextColor={palette.muted}
                  value={city}
                  onChangeText={setCity}
                  autoCapitalize="words"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                  Country
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="UK"
                  placeholderTextColor={palette.muted}
                  value={country}
                  onChangeText={setCountry}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: palette.muted }]}>
                Badge/Abbreviation (3-4 letters)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  { width: 120 },
                ]}
                placeholder="LFC"
                placeholderTextColor={palette.muted}
                value={badge}
                onChangeText={(t) => setBadge(t.toUpperCase().slice(0, 4))}
                autoCapitalize="characters"
                maxLength={4}
              />
            </View>
          </View>

          <SurfaceCard style={styles.previewCard}>
            <ThemedText type="defaultSemiBold" style={styles.previewLabel}>
              Preview
            </ThemedText>
            <View style={styles.previewContent}>
              <View style={[styles.previewBadge, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <ThemedText style={[styles.previewBadgeText, { color: palette.tint }]}>
                  {badge || name.slice(0, 3).toUpperCase() || 'ABC'}
                </ThemedText>
              </View>
              <View style={styles.previewDetails}>
                <ThemedText type="defaultSemiBold" style={styles.previewName}>
                  {name || 'Your Club Name'}
                </ThemedText>
                {tagline ? (
                  <ThemedText style={[styles.previewTagline, { color: palette.muted }]}>
                    {tagline}
                  </ThemedText>
                ) : null}
                <ThemedText style={[styles.previewLocation, { color: palette.muted }]}>
                  {city || 'City'}, {country || 'UK'}
                </ThemedText>
              </View>
            </View>
          </SurfaceCard>

          <View style={styles.features}>
            <ThemedText type="defaultSemiBold" style={styles.featuresTitle}>
              What you&apos;ll get
            </ThemedText>
            {[
              { icon: 'people-outline', text: 'Invite athletes and parents with a code' },
              { icon: 'layers-outline', text: 'Create squads and age groups' },
              { icon: 'megaphone-outline', text: 'Post updates and announcements' },
              { icon: 'calendar-outline', text: 'Schedule training and events' },
              { icon: 'ribbon-outline', text: 'Award badges and track progress' },
            ].map((item, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.tint} />
                <ThemedText style={styles.featureText}>{item.text}</ThemedText>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Clickable
            style={[
              styles.createButton,
              { backgroundColor: isValid ? palette.tint : palette.border },
            ]}
            onPress={handleCreate}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? (
              <ThemedText style={styles.createButtonText}>Creating...</ThemedText>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color={Colors.light.onPrimary} />
                <ThemedText style={styles.createButtonText}>Create Club</ThemedText>
              </>
            )}
          </Clickable>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: 100,
  },
  infoCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  infoText: {
    textAlign: 'center',
    ...Typography.bodySmall,
  },
  formSection: {
    gap: Spacing.md,
  },
  sectionLabel: {
    ...Typography.subheading,
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewLabel: {
    ...Typography.small,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  previewBadge: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBadgeText: {
    ...Typography.subheading,
  },
  previewDetails: {
    flex: 1,
    gap: Spacing.micro,
  },
  previewName: {
    ...Typography.subheading,
  },
  previewTagline: {
    ...Typography.small,
  },
  previewLocation: {
    ...Typography.caption,
  },
  features: {
    gap: Spacing.sm,
  },
  featuresTitle: {
    ...Typography.body,
    marginBottom: Spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    ...Typography.bodySmall,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
  },
  createButtonText: {
    color: Colors.light.onPrimary,
    ...Typography.subheading,
  },
});
