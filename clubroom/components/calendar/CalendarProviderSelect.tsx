import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CalendarProvider } from '@/constants/types';

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
    color: '#000000',
  },
  {
    id: 'GOOGLE',
    label: 'Google Calendar',
    icon: 'logo-google',
    color: '#4285F4',
  },
  {
    id: 'OUTLOOK',
    label: 'Outlook',
    icon: 'mail',
    color: '#0078D4',
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      {PROVIDERS.map((provider) => {
        const isSelected = selectedProvider === provider.id;

        return (
          <Pressable
            key={provider.id}
            onPress={() => !disabled && onProviderChange(provider.id)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.providerOption,
              {
                backgroundColor: isSelected ? `${palette.accent}15` : palette.card,
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
                    scheme === 'dark' ? `${provider.color}30` : `${provider.color}15`,
                },
              ]}
            >
              <Ionicons
                name={provider.icon}
                size={24}
                color={scheme === 'dark' ? '#FFFFFF' : provider.color}
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
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            )}
          </Pressable>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
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
  providerLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
