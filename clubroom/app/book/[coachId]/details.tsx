import { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ChildSelector } from '@/components/bookings/child-selector';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useChildContext } from '@/hooks/use-child-context';
import { useAuth } from '@/hooks/use-auth';
import { ok } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { bookingSelfSettingService } from '@/services/booking-self-setting-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { bookingStepAnalyticsService } from '@/services/booking/booking-step-analytics-service';
import type { User } from '@/constants/app-types';
import {
  BOOKING_LOCATION_OPTION_LIST,
  BOOKING_LOCATION_OPTIONS,
} from '@/constants/booking-flow';
import {
  canBookForSelf,
  hasAccountChildren,
  resolveAccountChildCount,
} from '@/utils/booking-self-capability';

export default function DetailsScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { children, isMultiChild } = useChildContext();
  const { currentUser } = useAuth();
  const [allowBookSelf, setAllowBookSelf] = useState(false);
  const hasPresetLocation = Boolean(draft.locationText?.trim());
  const isCoachPresetLocation =
    draft.locationOption === BOOKING_LOCATION_OPTIONS.COACH_PRESET && hasPresetLocation;
  const lockPresetLocation = Boolean(draft.sessionOfferingId) && hasPresetLocation;

  const accountChildCount = resolveAccountChildCount({
    contextChildCount: children.length,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });
  const accountHasChildren = hasAccountChildren({
    contextChildCount: children.length,
    accountChildRefCount: currentUser?.children?.length ?? 0,
  });
  const hasSelectableChildren = children.length > 0;
  const canSelectSelf = canBookForSelf({
    contextChildCount: hasSelectableChildren ? children.length : 0,
    accountChildRefCount: hasSelectableChildren ? (currentUser?.children?.length ?? 0) : 0,
    allowBookSelf: hasSelectableChildren ? allowBookSelf : true,
  });

  const applyAllowBookSelf = useCallback(
    (enabled: boolean) => {
      setAllowBookSelf(enabled);
    },
    [],
  );

  useEffect(() => {
    if (!currentUser?.id || !accountHasChildren) {
      applyAllowBookSelf(false);
      return;
    }
    let cancelled = false;
    void bookingSelfSettingService.isEnabled(currentUser.id).then((enabled) => {
      if (!cancelled) {
        applyAllowBookSelf(enabled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [accountHasChildren, applyAllowBookSelf, currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) {
      return;
    }

    return onTyped(ServiceEvents.BOOKING_SELF_SETTING_CHANGED, (payload) => {
      if (payload.userId !== currentUser.id) {
        return;
      }
      applyAllowBookSelf(payload.enabled);
    });
  }, [applyAllowBookSelf, currentUser?.id]);

  useEffect(() => {
    if ((!draft.locationOption && draft.locationText?.trim()) || lockPresetLocation) {
      updateDraft({ locationOption: BOOKING_LOCATION_OPTIONS.COACH_PRESET });
    }
  }, [draft.locationOption, draft.locationText, lockPresetLocation, updateDraft]);

  const childOptions = useMemo(
    () =>
      children.map((c) => ({
        id: c.id,
        name: c.name,
        email: '',
        role: 'USER' as const,
        postcode: '',
        dateOfBirth: '',
      })) satisfies User[],
    [children],
  );

  const bookingTargets = useMemo<User[]>(() => {
    if (!currentUser) {
      return childOptions;
    }

    const selfTarget: User = {
      id: currentUser.id,
      name: 'Myself',
      email: '',
      role: 'USER' as const,
      postcode: '',
      dateOfBirth: currentUser.dateOfBirth || '',
    };

    return canSelectSelf ? [selfTarget, ...childOptions] : childOptions;
  }, [canSelectSelf, childOptions, currentUser]);

  // Auto-select a target when the draft has none:
  // - single child: default to child
  // - self selectable: default to self
  // - otherwise: default to first child
  useEffect(() => {
    if (!currentUser || draft.childId) {
      return;
    }

    if (children.length === 1) {
      updateDraft({ childId: children[0].id, athleteName: children[0].name });
      return;
    }

    if (canSelectSelf) {
      updateDraft({
        childId: currentUser.id,
        athleteName: currentUser.name || currentUser.fullName || 'Athlete',
      });
      return;
    }

    if (children.length > 0) {
      updateDraft({ childId: children[0].id, athleteName: children[0].name });
    }
  }, [canSelectSelf, children, currentUser, draft.childId, updateDraft]);

  useEffect(() => {
    if (!currentUser?.id || canSelectSelf) {
      return;
    }
    if (draft.childId !== currentUser.id) {
      return;
    }
    if (children.length > 0) {
      updateDraft({ childId: children[0].id, athleteName: children[0].name });
    } else {
      updateDraft({ childId: undefined, athleteName: undefined });
    }
  }, [canSelectSelf, children, currentUser?.id, draft.childId, updateDraft]);

  const handleSelectChild = useCallback(
    (targetId: string) => {
      if (!currentUser) {
        return;
      }

      if (targetId === currentUser.id && canSelectSelf) {
        updateDraft({
          childId: currentUser.id,
          athleteName: currentUser.name || currentUser.fullName || 'Athlete',
        });
        return;
      }

      const child = children.find((c) => c.id === targetId);
      updateDraft({ childId: targetId, athleteName: child?.name });
    },
    [canSelectSelf, children, currentUser, updateDraft],
  );
  const handleBack = useCallback(() => {
    void bookingStepAnalyticsService.track({
      step: 'details',
      status: 'abandoned',
      failure_code: 'back_navigation',
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });
    router.back();
  }, [accountHasChildren, currentUser?.role, currentUser?.id, draft]);

  const handleContinue = useCallback(() => {
    if (!coachId) {
      void bookingStepAnalyticsService.track({
        step: 'details',
        status: 'validation_fail',
        failure_code: 'missing_coach_id',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    if (!draft.childId) {
      void bookingStepAnalyticsService.track({
        step: 'details',
        status: 'validation_fail',
        failure_code: 'missing_booking_target',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    if (!canSelectSelf && currentUser?.id && draft.childId === currentUser.id) {
      void bookingStepAnalyticsService.track({
        step: 'details',
        status: 'validation_fail',
        failure_code: 'self_booking_disabled',
        role: currentUser?.role,
        currentUserId: currentUser?.id,
        hasChildren: accountHasChildren,
        actingAs: draft.actingAs,
        draft,
      });
      return;
    }

    void bookingStepAnalyticsService.track({
      step: 'details',
      status: 'success',
      role: currentUser?.role,
      currentUserId: currentUser?.id,
      hasChildren: accountHasChildren,
      actingAs: draft.actingAs,
      draft,
    });
    router.push(Routes.bookReview(coachId));
  }, [accountHasChildren, canSelectSelf, coachId, currentUser, draft, router]);

  const canContinue =
    Boolean(draft.childId) && (canSelectSelf || draft.childId !== currentUser?.id);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Add details"
          subtitle="Tell your coach what you need"
          step={3}
          onBack={handleBack}
        />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Location</ThemedText>
          {lockPresetLocation ? (
            <View
              style={[
                styles.settingHintCard,
                {
                  borderColor: withAlpha(palette.tint, 0.25),
                  backgroundColor: withAlpha(palette.tint, 0.06),
                },
              ]}
            >
              <Row align="center" gap="xs">
                <Ionicons name="location-outline" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.text }}>
                  {draft.locationText}
                </ThemedText>
              </Row>
              <ThemedText style={{ color: palette.muted }}>
                Venue locked from this session listing.
              </ThemedText>
            </View>
          ) : (
            <>
              {BOOKING_LOCATION_OPTION_LIST.map((option) => {
                const active = draft.locationOption === option;
                const disabled =
                  option === BOOKING_LOCATION_OPTIONS.COACH_PRESET && !draft.locationText?.trim();
                return (
                  <Clickable
                    key={option}
                    onPress={() => {
                      if (disabled) return;
                      updateDraft({ locationOption: option });
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: active ? withAlpha(palette.tint, 0.07) : palette.surface,
                        borderColor: active ? palette.tint : palette.border,
                        opacity: disabled ? 0.45 : 1,
                      },
                    ]}
                    disabled={disabled}
                  >
                    <ThemedText>{option}</ThemedText>
                  </Clickable>
                );
              })}
              <TextInput
                placeholder={
                  draft.locationOption === BOOKING_LOCATION_OPTIONS.VIRTUAL
                    ? 'Add meeting link or app'
                    : 'Add address or meeting point'
                }
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, color: palette.text }]}
                value={draft.locationText}
                onChangeText={(text) => updateDraft({ locationText: text })}
                editable={!isCoachPresetLocation}
              />
              {isCoachPresetLocation && (
                <View
                  style={[
                    styles.settingHintCard,
                    {
                      borderColor: withAlpha(palette.tint, 0.25),
                      backgroundColor: withAlpha(palette.tint, 0.06),
                    },
                  ]}
                >
                  <ThemedText style={{ color: palette.text }}>
                    Venue is preset from this coach offering/slot.
                  </ThemedText>
                </View>
              )}
            </>
          )}
        </View>

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Special requests</ThemedText>
          <TextInput
            placeholder="Focus on passing technique"
            placeholderTextColor={palette.muted}
            style={[styles.textArea, { borderColor: palette.border, color: palette.text }]}
            value={draft.notes}
            onChangeText={(text) => updateDraft({ notes: text })}
            multiline
          />
        </View>

        {bookingTargets.length > 0 && (
          <ChildSelector
            childOptions={bookingTargets}
            selectedChildId={draft.childId}
            onSelectChild={handleSelectChild}
            autoSelected={!isMultiChild && bookingTargets.length === 1}
          />
        )}
        {hasSelectableChildren && accountChildCount > 0 && !allowBookSelf && (
          <View
            style={[
              styles.settingHintCard,
              {
                borderColor: withAlpha(palette.tint, 0.25),
                backgroundColor: withAlpha(palette.tint, 0.06),
              },
            ]}
          >
            <ThemedText style={{ color: palette.text }}>
              Booking for yourself is off.
            </ThemedText>
            <Clickable
              onPress={() => router.push(Routes.SETTINGS)}
              style={styles.settingHintCta}
              accessibilityLabel="Open settings"
            >
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Open settings</ThemedText>
            </Clickable>
          </View>
        )}
        {currentUser && (
          <Clickable
            onPress={() => router.push(Routes.MODAL_ADD_CHILD)}
            style={[
              styles.addChildCta,
              {
                borderColor: withAlpha(palette.tint, 0.3),
                backgroundColor: withAlpha(palette.tint, 0.06),
              },
            ]}
            accessibilityLabel="Add child profile"
          >
            <Row align="center" gap="sm">
              <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
              <ThemedText style={{ color: palette.tint, fontWeight: '600' }}>
                Add child profile
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleContinue}
          style={[
            styles.cta,
            {
              backgroundColor: canContinue ? palette.tint : withAlpha(palette.tint, 0.4),
            },
          ]}
          disabled={!canContinue}
          accessibilityLabel="Continue to review"
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              Continue
            </ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  option: { padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1.5 },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md },
  textArea: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  addChildCta: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  settingHintCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  settingHintCta: {
    alignSelf: 'flex-start',
  },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
});
