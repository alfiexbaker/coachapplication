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
  isSessionInPast: boolean;
  canAddAnotherChild: boolean;
  canLeaveReview: boolean;
  canOpenBookingDetail: boolean;
  postSessionMessage?: string | null;
  isRecurring: boolean;
  hasMultipleKids: boolean;
  childOptions: Child[];
  selectedChildIds: string[];
  onToggleChild: (id: string) => void;
  weeksToBook: number;
  onSetWeeks: (weeks: number) => void;
  onCancelBooking: () => void;
  onLeaveReview: () => void;
  onOpenBookingDetail: () => void;
  onMessageCoach: () => void;
  onReportProblem: () => void;
  onBookAgain: () => void;
}

// react-doctor-disable-next-line react-doctor/no-many-boolean-props -- booking option visibility depends on independent registration and capacity facts.
function SessionBookingOptionsInner({
  isRegistered,
  isSessionInPast,
  canAddAnotherChild,
  canLeaveReview,
  canOpenBookingDetail,
  postSessionMessage,
  isRecurring,
  hasMultipleKids,
  childOptions,
  selectedChildIds,
  onToggleChild,
  weeksToBook,
  onSetWeeks,
  onCancelBooking,
  onLeaveReview,
  onOpenBookingDetail,
  onMessageCoach,
  onReportProblem,
  onBookAgain,
}: SessionBookingOptionsProps) {
  const { colors: palette } = useTheme();

  const shouldShowChildSelector =
    !isSessionInPast && childOptions.length > 0 && (hasMultipleKids || !isRegistered || canAddAnotherChild);
  const canCancelBooking = isRegistered && !isSessionInPast;
  const isAwaitingCoachWrapUp = isSessionInPast && canOpenBookingDetail && !canLeaveReview;
  const bookingStateTitle = isSessionInPast
    ? canLeaveReview
      ? 'Session complete'
      : isAwaitingCoachWrapUp
        ? 'Awaiting coach recap'
        : 'Session finished'
    : isRegistered
      ? 'You are booked in'
      : 'Ready to book';
  const bookingStateBody = isSessionInPast
    ? postSessionMessage || 'This session has already started or finished, so family changes are closed.'
    : isRegistered
      ? canAddAnotherChild
        ? 'You are already booked in. Add another family member below if needed.'
        : 'You are booked in for this session. Message the coach or manage the booking here.'
      : childOptions.length > 0
        ? 'Choose who is attending below, then continue.'
        : 'Continue below to book this session or message the coach first.';
  const stateAccentColor = isSessionInPast
    ? canLeaveReview
      ? palette.success
      : palette.warning
    : isRegistered
      ? palette.success
      : palette.tint;
  const stateIconName = isSessionInPast
    ? canLeaveReview
      ? 'checkmark-circle'
      : 'hourglass-outline'
    : isRegistered
      ? 'checkmark-circle'
      : 'calendar-outline';

  const renderActionButton = ({
    label,
    icon,
    onPress,
    tone = 'secondary',
  }: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    tone?: 'primary' | 'secondary' | 'danger';
  }) => {
    const buttonStyles =
      tone === 'primary'
        ? {
            borderColor: stateAccentColor,
            backgroundColor: stateAccentColor,
          }
        : tone === 'danger'
          ? {
              borderColor: withAlpha(palette.error, 0.35),
              backgroundColor: withAlpha(palette.error, 0.08),
            }
          : {
              borderColor: withAlpha(palette.tint, 0.24),
              backgroundColor: withAlpha(palette.tint, 0.08),
            };
    const textColor =
      tone === 'primary' ? palette.onPrimary : tone === 'danger' ? palette.error : palette.tint;

    return (
      <Clickable
        key={label}
        style={[styles.inlineActionButton, buttonStyles]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Row align="center" justify="center" gap="xxs">
          <Ionicons name={icon} size={14} color={textColor} />
          <ThemedText style={[styles.inlineActionText, { color: textColor }]}>{label}</ThemedText>
        </Row>
      </Clickable>
    );
  };

  return (
    <>
      <SurfaceCard style={[styles.card, { backgroundColor: withAlpha(stateAccentColor, 0.09) }]}>
        <Row align="start" gap={12}>
          <Ionicons name={stateIconName} size={24} color={stateAccentColor} />
          <View style={styles.registeredInfo}>
            <ThemedText style={[styles.registeredText, { color: stateAccentColor }]}>
              {bookingStateTitle}
            </ThemedText>
            <ThemedText style={[styles.registeredSubtext, { color: palette.muted }]}>
              {bookingStateBody}
            </ThemedText>
          </View>
        </Row>

        {isSessionInPast ? (
          <>
            {canOpenBookingDetail
              ? renderActionButton({
                  label: canLeaveReview ? 'View recap' : 'Open booking',
                  icon: 'document-text-outline',
                  onPress: onOpenBookingDetail,
                  tone: 'primary',
                })
              : null}
            {canLeaveReview
              ? renderActionButton({
                  label: 'Leave a review',
                  icon: 'star-outline',
                  onPress: onLeaveReview,
                })
              : null}
            {renderActionButton({
              label: 'Message coach',
              icon: 'chatbubble-ellipses-outline',
              onPress: onMessageCoach,
            })}
            {canOpenBookingDetail
              ? renderActionButton({
                  label: 'Report problem',
                  icon: 'warning-outline',
                  onPress: onReportProblem,
                })
              : null}
            {renderActionButton({
              label: 'Book again',
              icon: 'repeat-outline',
              onPress: onBookAgain,
            })}
          </>
        ) : isRegistered ? (
          <>
            {renderActionButton({
              label: 'Message coach',
              icon: 'chatbubble-ellipses-outline',
              onPress: onMessageCoach,
            })}
            {canCancelBooking
              ? renderActionButton({
                  label: 'Cancel this booking',
                  icon: 'close-circle-outline',
                  onPress: onCancelBooking,
                  tone: 'danger',
                })
              : null}
          </>
        ) : (
          renderActionButton({
            label: 'Message coach',
            icon: 'chatbubble-ellipses-outline',
            onPress: onMessageCoach,
          })
        )}
      </SurfaceCard>

      {shouldShowChildSelector && (
        <SurfaceCard style={styles.card}>
          <ThemedText type="subtitle">
            {isRegistered && canAddAnotherChild ? 'Add family member' : "Who's attending?"}
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

      {isRecurring && !isSessionInPast && (
        <SurfaceCard style={styles.card}>
          <ThemedText type="subtitle">Repeat this booking</ThemedText>
          <ThemedText style={[styles.selectorHint, { color: palette.muted }]}>
            Choose how many weeks you want to lock in now.
          </ThemedText>
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

export const SessionBookingOptions = SessionBookingOptionsInner;

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
  selectorHint: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
  },
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
  inlineActionButton: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 42,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineActionText: { fontSize: scaleFont(14), fontWeight: '600' },
});
