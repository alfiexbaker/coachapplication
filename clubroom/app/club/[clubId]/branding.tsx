import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { BrandingEditor } from '@/components/club/branding-editor';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { clubService, type ClubBranding } from '@/services/club-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BrandingScreen');

export default function BrandingScreen() {
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const { colors: palette } = useTheme();
  const router = useRouter();

  const [saving, setSaving] = useState(false);

  // Track the working copy separately from the saved state
  const [draft, setDraft] = useState<ClubBranding | null>(null);

  const loadBranding = useCallback(async () => {
    if (!clubId) {
      return ok<ClubBranding | null>(null);
    }

    try {
      const data = await clubService.getBranding(clubId);
      return ok(data);
    } catch (loadError) {
      logger.error('Failed to load branding', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load club branding. Pull down to refresh.', loadError),
      );
    }
  }, [clubId]);

  const { data, status, error, onRefresh, retry } = useScreen<ClubBranding | null>({
    load: loadBranding,
    deps: [clubId],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

  useEffect(() => {
    setDraft(data ?? null);
  }, [data]);

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
      setDraft(result.data);
      onRefresh();
      router.back();
    } catch {
      // Error handled by service logger
    } finally {
      setSaving(false);
    }
  }, [clubId, draft, onRefresh, router]);

  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  if (status === 'loading') {
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
        <LoadingState variant="form" />
      </PageContainer>
    );
  }

  if (status === 'error') {
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
        <ErrorState message={error?.message || 'Failed to load club branding.'} onRetry={retry} />
      </PageContainer>
    );
  }

  if (status === 'empty' || !draft) {
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
        <EmptyState
          icon="color-palette-outline"
          title="Branding unavailable"
          message="No branding profile was found for this club."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={
        <PageHeader title="Club Branding" showBack subtitle="Customise your club's look and feel" />
      }
    >
      <BrandingEditor branding={draft} onChange={handleChange} />

      {/* Action buttons */}
      <Row style={styles.actions}>
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
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <ThemedText style={{ color: palette.onPrimary, ...Typography.bodySemiBold }}>
              Save Changes
            </ThemedText>
          )}
        </Clickable>
      </Row>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
});
