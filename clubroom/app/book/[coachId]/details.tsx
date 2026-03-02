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
import type { User } from '@/constants/app-types';

const LOCATION_OPTIONS = [
  'Coach preferred location',
  'My location',
  'Neutral venue',
  'Virtual session',
];

export default function DetailsScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { children, isMultiChild } = useChildContext();
  const { currentUser } = useAuth();
  const [allowBookSelf, setAllowBookSelf] = useState(false);

  const hasChildTargets = children.length > 0;
  const canSelectSelf = !hasChildTargets || allowBookSelf;

  useEffect(() => {
    if (!currentUser?.id || !hasChildTargets) {
      setAllowBookSelf(false);
      return;
    }
    let cancelled = false;
    void bookingSelfSettingService.isEnabled(currentUser.id).then((enabled) => {
      if (!cancelled) {
        setAllowBookSelf(enabled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, hasChildTargets]);

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
        />

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Location</ThemedText>
          {LOCATION_OPTIONS.map((option) => {
            const active = draft.locationOption === option;
            return (
              <Clickable
                key={option}
                onPress={() => updateDraft({ locationOption: option })}
                style={[
                  styles.option,
                  {
                    backgroundColor: active ? withAlpha(palette.tint, 0.07) : palette.surface,
                    borderColor: active ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText>{option}</ThemedText>
              </Clickable>
            );
          })}
          <TextInput
            placeholder="Add address or Zoom link"
            placeholderTextColor={palette.muted}
            style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            value={draft.locationText}
            onChangeText={(text) => updateDraft({ locationText: text })}
          />
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
        {hasChildTargets && !allowBookSelf && (
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
          onPress={() => router.push(Routes.bookReview(coachId))}
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
