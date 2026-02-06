import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Alert, Image, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { academyService, UpdateBrandingInput } from '@/services/academy-service';
import type { Academy, AcademyMembership } from '@/constants/types';

const logger = createLogger('AcademyBrandingScreen');

const COLOR_OPTIONS = [
  '#1E40AF', // Blue
  '#7C3AED', // Purple
  '#059669', // Green
  '#DC2626', // Red
  '#EA580C', // Orange
  '#0891B2', // Cyan
  '#4F46E5', // Indigo
  '#0F172A', // Slate
];

export default function AcademyBrandingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  // Form state
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1E40AF');
  const [secondaryColor, setSecondaryColor] = useState('#60A5FA');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');

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
        setLogoUrl(academyData.logoUrl || '');
        setBannerUrl(academyData.bannerUrl || '');
        setPrimaryColor(academyData.primaryColor || '#1E40AF');
        setSecondaryColor(academyData.secondaryColor || '#60A5FA');
        setEmail(academyData.email || '');
        setPhone(academyData.phone || '');
        setWebsite(academyData.website || '');
        setAddress(academyData.address || '');
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
      const branding: UpdateBrandingInput = {
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        primaryColor,
        secondaryColor,
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        address: address || undefined,
      };

      await academyService.updateBranding(academy.id, branding);
      Alert.alert('Success', 'Branding updated successfully');
      router.back();
    } catch (error) {
      logger.error('Failed to save branding:', error);
      Alert.alert('Error', 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  };

  const canEdit = userMembership?.role === 'OWNER' || userMembership?.permissions.includes('MANAGE_SETTINGS');

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
          Branding
        </ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <View style={styles.previewSection}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Preview
          </ThemedText>
          <View style={[styles.previewCard, { backgroundColor: primaryColor }]}>
            <View style={styles.previewBanner}>
              {bannerUrl ? (
                <Image source={{ uri: bannerUrl }} style={styles.previewBannerImage} />
              ) : (
                <View style={[styles.previewBannerPlaceholder, { backgroundColor: primaryColor }]} />
              )}
            </View>
            <View style={styles.previewLogoContainer}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.previewLogo} />
              ) : (
                <View style={[styles.previewLogoPlaceholder, { backgroundColor: secondaryColor }]}>
                  <ThemedText style={styles.previewLogoText}>
                    {academy.name.slice(0, 2).toUpperCase()}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText style={styles.previewName}>{academy.name}</ThemedText>
          </View>
        </View>

        {/* Colors */}
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Brand Colors
          </ThemedText>

          <View style={styles.colorSection}>
            <ThemedText style={styles.colorLabel}>Primary Color</ThemedText>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <Clickable
                  key={color}
                  onPress={() => canEdit && setPrimaryColor(color)}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    primaryColor === color && styles.colorSelected,
                  ].filter(Boolean) as ViewStyle[]}
                >
                  {primaryColor === color && (
                    <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                  )}
                </Clickable>
              ))}
            </View>
          </View>

          <View style={styles.colorSection}>
            <ThemedText style={styles.colorLabel}>Secondary Color</ThemedText>
            <View style={styles.colorGrid}>
              {COLOR_OPTIONS.map((color) => (
                <Clickable
                  key={color}
                  onPress={() => canEdit && setSecondaryColor(color)}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    secondaryColor === color && styles.colorSelected,
                  ].filter(Boolean) as ViewStyle[]}
                >
                  {secondaryColor === color && (
                    <Ionicons name="checkmark" size={18} color={palette.onPrimary} />
                  )}
                </Clickable>
              ))}
            </View>
          </View>
        </SurfaceCard>

        {/* Images */}
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Images
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Logo URL</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              placeholder="https://example.com/logo.png"
              placeholderTextColor={palette.muted}
              value={logoUrl}
              onChangeText={setLogoUrl}
              editable={canEdit}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Banner URL</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              placeholder="https://example.com/banner.png"
              placeholderTextColor={palette.muted}
              value={bannerUrl}
              onChangeText={setBannerUrl}
              editable={canEdit}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.infoBox, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
            <Ionicons name="information-circle" size={18} color={palette.tint} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              In the full app, you would upload images directly. For now, paste image URLs.
            </ThemedText>
          </View>
        </SurfaceCard>

        {/* Contact Info */}
        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Contact Information
          </ThemedText>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Email</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              placeholder="info@academy.com"
              placeholderTextColor={palette.muted}
              value={email}
              onChangeText={setEmail}
              editable={canEdit}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Phone</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              placeholder="+44 20 1234 5678"
              placeholderTextColor={palette.muted}
              value={phone}
              onChangeText={setPhone}
              editable={canEdit}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Website</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              placeholder="https://academy.com"
              placeholderTextColor={palette.muted}
              value={website}
              onChangeText={setWebsite}
              editable={canEdit}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Address</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.surfaceSecondary, color: palette.text }]}
              placeholder="123 Football Lane, London"
              placeholderTextColor={palette.muted}
              value={address}
              onChangeText={setAddress}
              editable={canEdit}
            />
          </View>
        </SurfaceCard>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Save Button */}
      {canEdit && (
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
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  previewSection: {
    marginBottom: Spacing.sm,
  },
  previewCard: {
    borderRadius: Radii.lg,
    overflow: 'hidden',
    paddingBottom: Spacing.lg,
    alignItems: 'center',
  },
  previewBanner: {
    width: '100%',
    height: 80,
  },
  previewBannerImage: {
    width: '100%',
    height: '100%',
  },
  previewBannerPlaceholder: {
    width: '100%',
    height: '100%',
  },
  previewLogoContainer: {
    marginTop: -30,
  },
  previewLogo: {
    width: 60,
    height: 60,
    borderRadius: Radii['2xl'],
    borderWidth: 3,
    borderColor: Colors.light.onPrimary,
  },
  previewLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Radii['2xl'],
    borderWidth: 3,
    borderColor: Colors.light.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLogoText: {
    color: Colors.light.onPrimary,
    ...Typography.heading,
  },
  previewName: {
    color: Colors.light.onPrimary,
    ...Typography.subheading,
    marginTop: Spacing.xs,
  },
  card: {
    gap: Spacing.md,
  },
  colorSection: {
    gap: Spacing.xs,
  },
  colorLabel: {
    ...Typography.smallSemiBold,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: Colors.light.onPrimary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    ...Typography.smallSemiBold,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  infoText: {
    flex: 1,
    ...Typography.caption,
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
