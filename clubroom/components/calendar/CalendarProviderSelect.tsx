import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { CalendarProvider } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

interface ProviderOption {
  id: CalendarProvider;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'APPLE',
    label: 'Apple Calendar',
    icon: 'logo-apple',
    color: '#000000', // Brand: Apple official color
  },
  {
    id: 'GOOGLE',
    label: 'Google Calendar',
    icon: 'logo-google',
    color: '#4285F4', // Brand: Google official color
  },
  {
    id: 'OUTLOOK',
    label: 'Outlook',
    icon: 'mail',
    color: '#0078D4', // Brand: Microsoft Outlook official color
  },
];

export interface CalendarProviderSelectProps {
  selectedProvider: CalendarProvider;
  onProviderChange: (provider: CalendarProvider) => void;
  disabled?: boolean;
}

export function CalendarProviderSelect({
  selectedProvider,
  onProviderChange,
  disabled = false,
}: CalendarProviderSelectProps) {
  const { colors: palette, scheme } = useTheme();

  return (
    <View style={styles.container}>
      {PROVIDERS.map((provider) => {
        const isSelected = selectedProvider === provider.id;

        return (
          <Clickable
            key={provider.id}
            onPress={() => !disabled && onProviderChange(provider.id)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`Select ${provider.label}`}
            accessibilityState={{ selected: isSelected, disabled }}
            style={({ pressed }) => [
              styles.providerOption,
              {
                backgroundColor: isSelected ? withAlpha(palette.accent, 0.09) : palette.card,
                borderColor: isSelected ? palette.accent : palette.border,
                opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    scheme === 'dark' ? withAlpha(provider.color, 0.19) : withAlpha(provider.color, 0.09),
                },
              ]}
            >
              <Ionicons
                name={provider.icon}
                size={24}
                color={scheme === 'dark' ? palette.onPrimary : provider.color}
              />
            </View>
            <ThemedText
              style={[
                styles.providerLabel,
                { color: isSelected ? palette.accent : palette.text },
              ]}
            >
              {provider.label}
            </ThemedText>
            {isSelected && (
              <View style={[styles.checkmark, { backgroundColor: palette.accent }]}>
                <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
              </View>
            )}
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  providerOption: {
    alignItems: 'center',
    padding: Spacing.md,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerLabel: { ...Typography.subheading, flex: 1 },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
