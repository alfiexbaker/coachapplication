import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { BrandingEditor } from '@/components/club/branding-editor';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { clubService, type ClubBranding } from '@/services/club-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BrandingScreen');

export default function BrandingScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const router = useRouter();

  const [, setBranding] = useState<ClubBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track the working copy separately from the saved state
  const [draft, setDraft] = useState<ClubBranding | null>(null);

  useEffect(() => {
    if (!clubId) return;
    (async () => {
      try {
        const data = await clubService.getBranding(clubId);
        setBranding(data);
        setDraft(data);
      } catch {
        // fallback handled by service
      } finally {
        setLoading(false);
      }
    })();
  }, [clubId]);

  const handleChange = useCallback((updates: Partial<ClubBranding>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!clubId || !draft) return;
    setSaving(true);
    try {
      const result = await clubService.updateBranding(clubId, draft);
      if (!result.success) {
        logger.error('Failed to save branding', result.error);
        return;
      }
      setBranding(result.data);
      setDraft(result.data);
      router.back();
    } catch {
      // Error handled by service logger
    } finally {
      setSaving(false);
    }
  }, [clubId, draft, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (loading) {
    return (
      <PageContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader
          title="Club Branding"
          showBack
          subtitle="Customise your club's look and feel"
        />
      }
    >
      {draft && <BrandingEditor branding={draft} onChange={handleChange} />}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Clickable
          onPress={handleCancel}
          accessibilityLabel="Cancel"
          style={{
            flex: 1,
            height: Components.button.height,
            borderRadius: Radii.button,
            borderWidth: 1,
            borderColor: palette.border,
            backgroundColor: palette.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText style={{ color: palette.foreground, ...Typography.bodySemiBold }}>
            Cancel
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={handleSave}
          disabled={saving}
          accessibilityLabel="Save branding"
          style={{
            flex: 1,
            height: Components.button.height,
            borderRadius: Radii.button,
            backgroundColor: palette.tint,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText style={{ color: '#FFFFFF', ...Typography.bodySemiBold }}>
              Save Changes
            </ThemedText>
          )}
        </Clickable>
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
});
