import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { BrandingPreview } from '@/components/academy/branding-preview';
import { BrandingColorPicker } from '@/components/academy/branding-color-picker';
import { BrandingContactForm } from '@/components/academy/branding-contact-form';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAcademyBranding } from '@/hooks/use-academy-branding';

export default function AcademyBrandingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, scheme } = useTheme();
  const {
    academy, loading, saving, canEdit,
    logoUrl, bannerUrl, primaryColor, secondaryColor,
    email, phone, website, address,
    setLogoUrl, setBannerUrl, setPrimaryColor, setSecondaryColor,
    setEmail, setPhone, setWebsite, setAddress,
    handleSave,
  } = useAcademyBranding(id);

  if (loading || !academy) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title">Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={{ flex: 1 }}>Branding</ThemedText>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BrandingPreview
          colors={colors}
          academyName={academy.name}
          logoUrl={logoUrl}
          bannerUrl={bannerUrl}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
        />

        <BrandingColorPicker
          colors={colors}
          scheme={scheme}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          canEdit={canEdit}
          onPrimaryChange={setPrimaryColor}
          onSecondaryChange={setSecondaryColor}
        />

        <BrandingContactForm
          colors={colors}
          canEdit={canEdit}
          logoUrl={logoUrl}
          bannerUrl={bannerUrl}
          email={email}
          phone={phone}
          website={website}
          address={address}
          onLogoChange={setLogoUrl}
          onBannerChange={setBannerUrl}
          onEmailChange={setEmail}
          onPhoneChange={setPhone}
          onWebsiteChange={setWebsite}
          onAddressChange={setAddress}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {canEdit && (
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <Button onPress={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.md },
  bottomSpacer: { height: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
});
