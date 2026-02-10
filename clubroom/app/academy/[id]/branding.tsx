import { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok, err, notFound, serviceError } from '@/types/result';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { BrandingPreview } from '@/components/academy/branding-preview';
import { BrandingColorPicker } from '@/components/academy/branding-color-picker';
import { BrandingContactForm } from '@/components/academy/branding-contact-form';
import { Spacing } from '@/constants/theme';
import { academyService } from '@/services/academy-service';
import type { Academy } from '@/constants/types';

export default function AcademyBrandingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: academy, status, error: loadError, refreshing, onRefresh, retry, colors, scheme } = useScreen<Academy>({
    load: async () => {
      if (!id) return err(serviceError('VALIDATION', 'No academy ID'));
      try {
        const result = await academyService.getAcademy(id);
        if (!result) return err(notFound('Academy', id));
        return ok(result);
      } catch (e) {
        return err(serviceError('UNKNOWN', e instanceof Error ? e.message : 'Failed to load'));
      }
    },
    deps: [id],
  });

  // Form state
  const [logoUrl, setLogoUrl] = useState(academy?.logoUrl ?? '');
  const [bannerUrl, setBannerUrl] = useState(academy?.bannerUrl ?? '');
  const [primaryColor, setPrimaryColor] = useState(academy?.primaryColor ?? '');
  const [secondaryColor, setSecondaryColor] = useState(academy?.secondaryColor ?? '');
  const [email, setEmail] = useState(academy?.email ?? '');
  const [phone, setPhone] = useState(academy?.phone ?? '');
  const [website, setWebsite] = useState(academy?.website ?? '');
  const [address, setAddress] = useState(academy?.address ?? '');
  const [saving, setSaving] = useState(false);

  const canEdit = true; // TODO: check permissions

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await academyService.updateBranding(id, { logoUrl, bannerUrl, primaryColor, secondaryColor, email, phone, website, address });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <LoadingState variant="detail" />;
  if (status === 'error') return <ErrorState message={loadError!.message} onRetry={retry} />;
  if (status === 'empty') return <EmptyState icon="business-outline" title="Academy not found" message="This academy may have been removed" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title" style={{ flex: 1 }}>Branding</ThemedText>
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <BrandingPreview
          colors={colors}
          academyName={academy!.name}
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
  header: { alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.md },
  bottomSpacer: { height: 100 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, borderTopWidth: 1 },
});
