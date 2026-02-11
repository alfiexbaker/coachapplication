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
  isRecurring: boolean;
  hasMultipleKids: boolean;
  childOptions: Child[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  weeksToBook: number;
  onSetWeeks: (weeks: number) => void;
  onCancelBooking: () => void;
}

function SessionBookingOptionsInner({
  isRegistered,
  isRecurring,
  hasMultipleKids,
  childOptions,
  selectedChildId,
  onSelectChild,
  weeksToBook,
  onSetWeeks,
  onCancelBooking,
}: SessionBookingOptionsProps) {
  const { colors: palette } = useTheme();

  if (isRegistered) {
    return (
      <SurfaceCard style={[styles.card, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <Row align="start" gap={12}>
          <Ionicons name="checkmark-circle" size={24} color={palette.success} />
          <View style={styles.registeredInfo}>
            <ThemedText style={[styles.registeredText, { color: palette.success }]}>
              Registered for this session
            </ThemedText>
            <Clickable style={styles.cancelBookingLink} onPress={onCancelBooking}>
              <ThemedText style={[styles.cancelBookingText, { color: palette.error }]}>
                Cancel Booking
              </ThemedText>
            </Clickable>
          </View>
        </Row>
      </SurfaceCard>
    );
  }

  return (
    <>
      {hasMultipleKids && (
        <SurfaceCard style={styles.card}>
          <ThemedText type="subtitle">Book for:</ThemedText>
          {childOptions.map((child) => (
            <Clickable
              key={child.id}
              onPress={() => onSelectChild(child.id)}
              style={[
                styles.childOption,
                {
                  backgroundColor:
                    selectedChildId === child.id ? withAlpha(palette.tint, 0.09) : palette.card,
                  borderColor: selectedChildId === child.id ? palette.tint : palette.border,
                },
              ]}
            >
              <Row align="center" gap={12}>
                <Ionicons
                  name={selectedChildId === child.id ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={selectedChildId === child.id ? palette.tint : palette.icon}
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
  card: { marginBottom: 16, padding: 20, gap: 14 },
  childOption: { padding: 16, borderRadius: Radii.md, borderWidth: 2, marginTop: 10 },
  weeksSelector: { marginTop: 10 },
  weekButton: {
    flex: 1,
    paddingVertical: 16,
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
  cancelBookingLink: { alignSelf: 'flex-start' },
  cancelBookingText: { fontSize: scaleFont(14), fontWeight: '600' },
});
