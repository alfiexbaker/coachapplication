import React from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Stack, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Stepper, ToggleRow, NavigationRow, SectionHeader, Separator } from '@/components/settings/coaching-rows';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
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
    showSaved,
    toastOpacity,
    update,
    currentUser,
  } = useCoachingSettings();

  if (loading || !rules) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Coaching Settings' }} />
        {status === 'error' ? (
          <ErrorState
            message={error ?? 'Failed to load coaching settings.'}
            onRetry={retry}
          />
        ) : (
          <LoadingState variant="form" />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Coaching Settings', headerShadowVisible: false, headerStyle: { backgroundColor: colors.background } }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        {/* Scheduling */}
        <SectionHeader title="SCHEDULING" />
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
          <Stepper label="Buffer between sessions" value={rules.bufferMinutesDefault} onValueChange={(v) => update('bufferMinutesDefault', v)} min={0} max={60} step={5} suffix=" min" helperText="Time between back-to-back sessions" />
          <Separator />
          <Stepper label="Minimum notice" value={rules.minimumAdvanceBookingHours} onValueChange={(v) => update('minimumAdvanceBookingHours', v)} min={0} max={72} step={1} suffix="h" helperText="How far in advance parents must book" />
          <Separator />
          <Stepper label="Max advance booking" value={rules.maxAdvanceBookingDays} onValueChange={(v) => update('maxAdvanceBookingDays', v)} min={7} max={90} step={7} suffix=" days" helperText="How far ahead parents can book" />
          <Separator />
          <ToggleRow label="Allow same-day bookings" value={rules.allowSameDayBookings} onValueChange={(v) => update('allowSameDayBookings', v)} helperText="Let parents book sessions today" />
          <Separator />
          <ToggleRow label="Allow rescheduling" value={rules.allowRescheduling} onValueChange={(v) => update('allowRescheduling', v)} helperText="Let parents move confirmed sessions" />
          {rules.allowRescheduling && (
            <>
              <Separator />
              <Stepper label="Reschedule deadline" value={rules.rescheduleDeadlineHours} onValueChange={(v) => update('rescheduleDeadlineHours', v)} min={1} max={48} step={1} suffix="h" helperText="Minimum hours before session to reschedule" />
            </>
          )}
        </View>

        {/* Cancellation Policy */}
        <SectionHeader title="CANCELLATION POLICY" />
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
          <NavigationRow label="Cancellation policy" value="Standard" onPress={() => router.push(Routes.SETTINGS_CANCELLATION_POLICY)} icon="shield-checkmark-outline" />
        </View>

        {/* Travel & Location */}
        <SectionHeader title="TRAVEL & LOCATION" />
        <View style={[styles.card, { backgroundColor: colors.surface }, Shadows[scheme].card]}>
          <NavigationRow label="Travel radius" value={`${currentUser?.postcode ?? 'Set postcode'}`} onPress={() => router.push(Routes.SETTINGS_TRAVEL_RADIUS)} icon="location-outline" />
          <Separator />
          <NavigationRow label="Blocked dates" onPress={() => router.push(Routes.SETTINGS_BLOCKED_DATES)} icon="calendar-outline" />
          <Separator />
          <NavigationRow label="Smart slot suggestions" onPress={() => router.push(Routes.SETTINGS_SMART_SLOTS)} icon="sparkles-outline" />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Saved toast */}
      {showSaved && (
        <ToastView toastOpacity={toastOpacity} colors={colors} scheme={scheme} />
      )}
    </View>
  );
}

function ToastView({ toastOpacity, colors, scheme }: { toastOpacity: import('react-native-reanimated').SharedValue<number>; colors: ReturnType<typeof useTheme>['colors']; scheme: ReturnType<typeof useTheme>['scheme'] }) {
  const animStyle = useAnimatedStyle(() => ({ opacity: toastOpacity.value }));
  return (
    <Animated.View style={[styles.toast, Shadows[scheme].card, { backgroundColor: colors.surface }, animStyle]} pointerEvents="none">
      <Row align="center" gap="xs">
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <ThemedText style={[styles.toastText, { color: colors.success }]}>Saved</ThemedText>
      </Row>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.xs },
  card: { borderRadius: Radii.card, overflow: 'hidden' },
  toast: { position: 'absolute', bottom: Spacing.xl, alignSelf: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.pill },
  toastText: { ...Typography.bodySemiBold },
  bottomSpacer: { height: Spacing.lg },
});
