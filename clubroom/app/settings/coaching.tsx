import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { SettingsScreenState } from '@/components/settings';
import {
  Stepper,
  ToggleRow,
  NavigationRow,
  SectionHeader,
  Separator,
} from '@/components/settings/coaching-rows';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { Spacing, Radii, Shadows, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCoachingSettings } from '@/hooks/use-coaching-settings';

export default function CoachingSettingsScreen() {
  const { colors, scheme } = useTheme();
  const {
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    rules,
    travelSettings,
    blockedDateCount,
    policySummary,
    saving,
    showSaved,
    toastOpacity,
    update,
    currentUser,
  } = useCoachingSettings();

  const header = (
    <PageHeader
      title="Coaching Settings"
      showBack
      backIcon="arrow-back"
      onBackPress={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace(Routes.SETTINGS);
      }}
      centerTitle
    />
  );

  if (loading || !rules) {
    return (
      <SettingsScreenState
        colors={colors}
        header={header}
        status={status === 'error' ? 'error' : 'loading'}
        errorMessage={error ?? 'Failed to load coaching settings.'}
        onRetry={retry}
        loadingVariant="form"
      />
    );
  }

  return (
    <SettingsScreenState
      colors={colors}
      header={header}
      status="ready"
      errorMessage={error ?? 'Failed to load coaching settings.'}
      onRetry={retry}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {error ? <StatusBanner message={error} variant="error" /> : null}

        <SectionHeader title="BOOKING RULES" />
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
          <Stepper
            label="Session buffer"
            value={rules.bufferMinutesDefault}
            onValueChange={(v) => update('bufferMinutesDefault', v)}
            min={0}
            max={60}
            step={5}
            suffix=" min"
            disabled={saving}
          />
          <Separator />
          <Stepper
            label="Minimum notice"
            value={rules.minimumAdvanceBookingHours}
            onValueChange={(v) => update('minimumAdvanceBookingHours', v)}
            min={0}
            max={72}
            step={1}
            suffix="h"
            disabled={saving}
          />
          <Separator />
          <Stepper
            label="Booking window"
            value={rules.maxAdvanceBookingDays}
            onValueChange={(v) => update('maxAdvanceBookingDays', v)}
            min={7}
            max={90}
            step={7}
            suffix=" days"
            disabled={saving}
          />
          <Separator />
          <ToggleRow
            label="Same-day bookings"
            value={rules.allowSameDayBookings}
            onValueChange={(v) => update('allowSameDayBookings', v)}
            disabled={saving}
          />
        </View>

        <SectionHeader title="MANAGE" />
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
          <NavigationRow
            label="Cancellation policy"
            value={policySummary}
            onPress={() => router.push(Routes.SETTINGS_CANCELLATION_POLICY)}
            icon="shield-checkmark-outline"
          />
          <Separator />
          <NavigationRow
            label="Travel radius"
            value={
              travelSettings
                ? `${travelSettings.radiusMiles} mi · ${currentUser?.postcode ?? 'Postcode needed'}`
                : `${currentUser?.postcode ?? 'Set postcode'}`
            }
            onPress={() => router.push(Routes.SETTINGS_TRAVEL_RADIUS)}
            icon="location-outline"
          />
          <Separator />
          <NavigationRow
            label="Blocked dates"
            value={blockedDateCount > 0 ? `${blockedDateCount}` : undefined}
            onPress={() => router.push(Routes.AVAILABILITY_BLOCK_DATE)}
            icon="calendar-outline"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Saved toast */}
      {showSaved && <ToastView toastOpacity={toastOpacity} colors={colors} scheme={scheme} />}
    </SettingsScreenState>
  );
}

function ToastView({
  toastOpacity,
  colors,
  scheme,
}: {
  toastOpacity: import('react-native-reanimated').SharedValue<number>;
  colors: ReturnType<typeof useTheme>['colors'];
  scheme: ReturnType<typeof useTheme>['scheme'];
}) {
  const animStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));
  return (
    <Animated.View
      style={[styles.toast, Shadows[scheme].card, { backgroundColor: colors.surface }, animStyle]}
      pointerEvents="none"
    >
      <Row align="center" gap="xs">
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <ThemedText style={[styles.toastText, { color: colors.success }]}>Saved</ThemedText>
      </Row>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs },
  card: { borderRadius: Radii.card, overflow: 'hidden' },
  toast: {
    position: 'absolute',
    bottom: Spacing.xl,
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  toastText: { ...Typography.bodySemiBold },
  bottomSpacer: { height: Spacing.lg },
});
