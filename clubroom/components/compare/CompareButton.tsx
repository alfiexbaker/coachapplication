/**
 * CompareButton Component
 *
 * A button to add/remove coaches from the comparison list.
 * Shows different states based on whether the coach is already in comparison.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { comparisonService } from '@/services/comparison-service';

interface CompareButtonProps {
  coachId: string;
  coachName: string;
  variant?: 'icon' | 'full' | 'compact';
  onStateChange?: (isInComparison: boolean) => void;
}

export function CompareButton({
  coachId,
  coachName,
  variant = 'icon',
  onStateChange,
}: CompareButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [isInComparison, setIsInComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canAddMore, setCanAddMore] = useState(true);

  const checkState = useCallback(async () => {
    try {
      const inComparison = await comparisonService.isInComparison(coachId);
      const canAdd = await comparisonService.canAddMore();
      setIsInComparison(inComparison);
      setCanAddMore(canAdd || inComparison);
    } catch {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [coachId]);

  useEffect(() => {
    void checkState();
  }, [checkState]);

  const handlePress = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isInComparison) {
        await comparisonService.removeFromComparison(coachId);
        setIsInComparison(false);
        onStateChange?.(false);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        const result = await comparisonService.addToComparison(coachId);
        if (result.success) {
          setIsInComparison(true);
          onStateChange?.(true);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
      const canAdd = await comparisonService.canAddMore();
      setCanAddMore(canAdd || !isInComparison);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [coachId, isInComparison, onStateChange]);

  const isDisabled = isLoading || (!isInComparison && !canAddMore);

  if (variant === 'icon') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
        accessibilityHint={
          isInComparison
            ? `Remove ${coachName} from comparison`
            : `Add ${coachName} to comparison`
        }
        disabled={isDisabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.iconButton,
          {
            backgroundColor: isInComparison
              ? withAlpha(palette.success, 0.09)
              : pressed
              ? palette.surfaceSecondary
              : 'transparent',
            borderColor: isInComparison ? palette.success : palette.border,
            opacity: isDisabled && !isLoading ? 0.5 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={palette.muted} />
        ) : (
          <Ionicons
            name={isInComparison ? 'checkmark-circle' : 'git-compare-outline'}
            size={20}
            color={isInComparison ? palette.success : palette.icon}
          />
        )}
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
        disabled={isDisabled}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.compactButton,
          {
            backgroundColor: isInComparison
              ? withAlpha(palette.success, 0.09)
              : pressed
              ? palette.surfaceSecondary
              : palette.surface,
            borderColor: isInComparison ? palette.success : palette.border,
            opacity: isDisabled && !isLoading ? 0.5 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={palette.muted} />
        ) : (
          <>
            <Ionicons
              name={isInComparison ? 'checkmark-circle' : 'git-compare-outline'}
              size={16}
              color={isInComparison ? palette.success : palette.icon}
            />
            <ThemedText
              style={[
                styles.compactText,
                { color: isInComparison ? palette.success : palette.text },
              ]}
            >
              {isInComparison ? 'Added' : 'Compare'}
            </ThemedText>
          </>
        )}
      </Pressable>
    );
  }

  // Full variant
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fullButton,
        {
          backgroundColor: isInComparison
            ? withAlpha(palette.success, 0.09)
            : pressed
            ? palette.surfaceSecondary
            : palette.surface,
          borderColor: isInComparison ? palette.success : palette.border,
          opacity: isDisabled && !isLoading ? 0.5 : 1,
        },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={palette.muted} />
      ) : (
        <View style={styles.fullContent}>
          <Ionicons
            name={isInComparison ? 'checkmark-circle' : 'git-compare-outline'}
            size={20}
            color={isInComparison ? palette.success : palette.icon}
          />
          <View style={styles.fullTextContainer}>
            <ThemedText
              style={[
                styles.fullLabel,
                { color: isInComparison ? palette.success : palette.text },
              ]}
            >
              {isInComparison ? 'In Comparison' : 'Add to Compare'}
            </ThemedText>
            <ThemedText style={[styles.fullHint, { color: palette.muted }]}>
              {isInComparison
                ? 'Tap to remove from comparison'
                : canAddMore
                ? 'Compare with other coaches'
                : 'Comparison list is full'}
            </ThemedText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  compactText: { ...Typography.smallSemiBold },
  fullButton: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  fullContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fullTextContainer: {
    flex: 1,
  },
  fullLabel: { ...Typography.bodySemiBold },
  fullHint: { ...Typography.caption, marginTop: Spacing.micro },
});
