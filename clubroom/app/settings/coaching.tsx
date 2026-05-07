import React from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Stack, router } from 'expo-router';
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
import { Row } from '@/components/primitives/row';
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
    showSaved,
    toastOpacity,
    update,
    currentUser,
  } = useCoachingSettings();

  if (loading || !rules) {
    return (
      <>
        <Stack.Screen options={{ title: 'Coaching Settings' }} />
        <SettingsScreenState
          colors={colors}
          status={status === 'error' ? 'error' : 'loading'}
          errorMessage={error ?? 'Failed to load coaching settings.'}
          onRetry={retry}
          loadingVariant="form"
        />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Coaching Settings',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
        }}
      />

      <SettingsScreenState
        colors={colors}
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
          {/* Scheduling */}
          <SectionHeader title="SCHEDULING" />
          <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
            <Stepper
              label="Buffer between sessions"
              value={rules.bufferMinutesDefault}
              onValueChange={(v) => update('bufferMinutesDefault', v)}
              min={0}
              max={60}
              step={5}
              suffix=" min"
              helperText="Time between back-to-back sessions"
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
              helperText="How far in advance parents must book"
            />
            <Separator />
            <Stepper
              label="Max advance booking"
              value={rules.maxAdvanceBookingDays}
              onValueChange={(v) => update('maxAdvanceBookingDays', v)}
              min={7}
              max={90}
              step={7}
              suffix=" days"
              helperText="How far ahead parents can book"
            />
            <Separator />
            <ToggleRow
              label="Allow same-day bookings"
              value={rules.allowSameDayBookings}
              onValueChange={(v) => update('allowSameDayBookings', v)}
              helperText="Let parents book sessions today"
            />
          </View>

          {/* Cancellation Policy */}
          <SectionHeader title="CANCELLATION POLICY" />
          <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
            <NavigationRow
              label="Cancellation policy"
              value={policySummary}
              onPress={() => router.push(Routes.SETTINGS_CANCELLATION_POLICY)}
              icon="shield-checkmark-outline"
            />
          </View>

          {/* Travel & Location */}
          <SectionHeader title="TRAVEL & LOCATION" />
          <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
            <NavigationRow
              label="Travel radius"
              value={
                travelSettings
                  ? `${travelSettings.radiusMiles}mi from ${currentUser?.postcode ?? 'postcode'}`
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
            <Separator />
            <NavigationRow
              label="Smart slot suggestions"
              onPress={() => router.push(Routes.SETTINGS_SMART_SLOTS)}
              icon="sparkles-outline"
            />
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Saved toast */}
        {showSaved && <ToastView toastOpacity={toastOpacity} colors={colors} scheme={scheme} />}
      </SettingsScreenState>
    </>
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
