/**
 * SessionBookingOptions — Parent/athlete view: child selector + weeks selector + registered banner.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

interface Child {
  id: string;
  name: string;
}

interface SessionBookingOptionsProps {
  isRegistered: boolean;
  canAddAnotherChild: boolean;
  isRecurring: boolean;
  hasMultipleKids: boolean;
  childOptions: Child[];
  selectedChildIds: string[];
  onToggleChild: (id: string) => void;
  weeksToBook: number;
  onSetWeeks: (weeks: number) => void;
  onCancelBooking: () => void;
}

function SessionBookingOptionsInner({
  isRegistered,
  canAddAnotherChild,
  isRecurring,
  hasMultipleKids,
  childOptions,
  selectedChildIds,
  onToggleChild,
  weeksToBook,
  onSetWeeks,
  onCancelBooking,
}: SessionBookingOptionsProps) {
  const { colors: palette } = useTheme();

  const shouldShowChildSelector =
    childOptions.length > 0 && (hasMultipleKids || !isRegistered || canAddAnotherChild);

  return (
    <>
      {isRegistered && (
        <SurfaceCard style={[styles.card, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Row align="start" gap={12}>
            <Ionicons name="checkmark-circle" size={24} color={palette.success} />
            <View style={styles.registeredInfo}>
              <ThemedText style={[styles.registeredText, { color: palette.success }]}>
                Registered for this session
              </ThemedText>
              {canAddAnotherChild ? (
                <ThemedText style={[styles.registeredSubtext, { color: palette.muted }]}>
                  You can add another child from your family below.
                </ThemedText>
              ) : null}
            </View>
          </Row>
        </SurfaceCard>
      )}

      {isRegistered && (
        <Clickable
          style={[
            styles.cancelBookingButton,
            {
              borderColor: withAlpha(palette.error, 0.35),
              backgroundColor: withAlpha(palette.error, 0.08),
            },
          ]}
          onPress={onCancelBooking}
          accessibilityRole="button"
          accessibilityLabel="Cancel booking"
        >
          <Row align="center" justify="center" gap="xxs">
            <Ionicons name="close-circle-outline" size={14} color={palette.error} />
            <ThemedText style={[styles.cancelBookingText, { color: palette.error }]}>
              Cancel this booking
            </ThemedText>
          </Row>
        </Clickable>
      )}

      {shouldShowChildSelector && (
        <SurfaceCard style={styles.card}>
          <ThemedText type="subtitle">
            {isRegistered && canAddAnotherChild ? 'Add another child:' : 'Book for:'}
          </ThemedText>
          {childOptions.map((child) => (
            <Clickable
              key={child.id}
              onPress={() => onToggleChild(child.id)}
              style={[
                styles.childOption,
                {
                  backgroundColor:
                    selectedChildIds.includes(child.id)
                      ? withAlpha(palette.tint, 0.09)
                      : palette.card,
                  borderColor: selectedChildIds.includes(child.id) ? palette.tint : palette.border,
                },
              ]}
            >
              <Row align="center" gap={12}>
                <Ionicons
                  name={selectedChildIds.includes(child.id) ? 'checkbox' : 'square-outline'}
                  size={20}
                  color={selectedChildIds.includes(child.id) ? palette.tint : palette.icon}
                />
                <ThemedText>{child.name}</ThemedText>
              </Row>
            </Clickable>
          ))}
        </SurfaceCard>
      )}

      {isRecurring && (
        <SurfaceCard style={styles.card}>
          <ThemedText type="subtitle">Book for how many weeks?</ThemedText>
          <Row gap={10} style={styles.weeksSelector}>
            {[1, 2, 3, 4].map((weeks) => (
              <Clickable
                key={weeks}
                onPress={() => onSetWeeks(weeks)}
                style={[
                  styles.weekButton,
                  {
                    backgroundColor: weeksToBook === weeks ? palette.tint : palette.card,
                    borderColor: weeksToBook === weeks ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.weekButtonText,
                    weeksToBook === weeks && { color: palette.onPrimary },
                  ]}
                >
                  {weeks} week{weeks > 1 ? 's' : ''}
                </ThemedText>
              </Clickable>
            ))}
          </Row>
        </SurfaceCard>
      )}
    </>
  );
}

export const SessionBookingOptions = memo(SessionBookingOptionsInner);

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.sm, padding: Spacing.md, gap: Spacing.sm },
  childOption: { padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 2, marginTop: Spacing.xs },
  weeksSelector: { marginTop: Spacing.xs },
  weekButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  weekButtonText: { fontSize: scaleFont(15), fontWeight: '700', letterSpacing: 0.2 },
  registeredInfo: { flex: 1, gap: Spacing.xxs },
  registeredText: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(23),
  },
  registeredSubtext: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
  },
  cancelBookingButton: {
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBookingText: { fontSize: scaleFont(14), fontWeight: '600' },
});
