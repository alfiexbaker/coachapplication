import React, { useState } from 'react';
import { StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { calendarService } from '@/services/calendar-service';
import type { Booking } from '@/constants/app-types';
import { useTheme } from '@/hooks/useTheme';

export interface CalendarExportButtonProps {
  /** Single booking to export */
  booking?: Booking;
  /** Multiple bookings to export */
  bookings?: Booking[];
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'icon';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
  /** Custom label for the button */
  label?: string;
  /** Callback after successful export */
  onExportSuccess?: () => void;
  /** Callback after export failure */
  onExportError?: (error: string) => void;
  /** Whether the button is disabled */
  disabled?: boolean;
}

export function CalendarExportButton({
  booking,
  bookings,
  variant = 'secondary',
  size = 'medium',
  label,
  onExportSuccess,
  onExportError,
  disabled = false,
}: CalendarExportButtonProps) {
  const { colors: palette } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const handleExport = async () => {
    if (disabled || isExporting) return;

    setIsExporting(true);
    try {
      let result: { success: boolean; error?: string };

      if (booking) {
        result = await calendarService.exportToCalendar(booking);
      } else if (bookings && bookings.length > 0) {
        result = await calendarService.exportMultipleToCalendar(bookings);
      } else {
        result = { success: false, error: 'No booking to export' };
      }

      if (result.success) {
        onExportSuccess?.();
      } else {
        const errorMsg = result.error || 'Failed to export to calendar';
        onExportError?.(errorMsg);
        Alert.alert('Export Failed', errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Export failed';
      onExportError?.(errorMsg);
      Alert.alert('Export Failed', errorMsg);
    } finally {
      setIsExporting(false);
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          ...Typography.small,
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.sm,
          iconSize: 16,
        };
      case 'large':
        return {
          ...Typography.subheading,
          paddingVertical: Spacing.md,
          paddingHorizontal: Spacing.xl,
          iconSize: 24,
        };
      default:
        return {
          ...Typography.bodySmall,
          paddingVertical: Spacing.sm,
          paddingHorizontal: Spacing.md,
          iconSize: 20,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <Clickable
        onPress={handleExport}
        disabled={disabled || isExporting}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'Export to calendar'}
        style={({ pressed }) => [
          styles.iconButton,
          {
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
            backgroundColor: withAlpha(palette.accent, 0.09),
          },
        ]}
        hitSlop={8}
      >
        {isExporting ? (
          <ActivityIndicator size="small" color={palette.accent} />
        ) : (
          <Ionicons name="calendar-outline" size={sizeStyles.iconSize} color={palette.accent} />
        )}
      </Clickable>
    );
  }

  const buttonLabel = label ?? (bookings?.length ? 'Export All' : 'Add to Calendar');
  const backgroundColor = variant === 'primary' ? palette.accent : withAlpha(palette.accent, 0.09);
  const textColor = variant === 'primary' ? palette.onPrimary : palette.accent;

  return (
    <Clickable
      onPress={handleExport}
      disabled={disabled || isExporting}
      accessibilityRole="button"
      accessibilityLabel={buttonLabel}
      style={({ pressed }) => [
        styles.button,
        {
          paddingVertical: sizeStyles.paddingVertical,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          backgroundColor,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
      ]}
    >
      {isExporting ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          <Ionicons name="calendar-outline" size={sizeStyles.iconSize} color={textColor} />
          <ThemedText
            style={[styles.buttonText, { color: textColor, fontSize: sizeStyles.fontSize }]}
          >
            {buttonLabel}
          </ThemedText>
        </>
      )}
    </Clickable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    gap: Spacing.xs,
    borderRadius: Radii.md,
  },
  buttonText: {
    fontWeight: '600',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
