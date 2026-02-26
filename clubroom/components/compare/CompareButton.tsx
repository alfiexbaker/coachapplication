import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { comparisonService } from '@/services/comparison-service';
import { Row } from '@/components/primitives';

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
  const { colors: palette } = useTheme();

  const [isInComparison, setIsInComparison] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canAddMore, setCanAddMore] = useState(true);

  const checkState = useCallback(async () => {
    const inComparisonResult = await comparisonService.isInComparison(coachId);
    const canAddResult = await comparisonService.canAddMore();
    const inComparison = inComparisonResult.success ? inComparisonResult.data : false;
    const canAdd = canAddResult.success ? canAddResult.data : false;
    setIsInComparison(inComparison);
    setCanAddMore(canAdd || inComparison);
    setIsLoading(false);
  }, [coachId]);

  useEffect(() => {
    void checkState();
  }, [checkState]);

  const handlePress = useCallback(async () => {
    setIsLoading(true);
    let nextInComparison = isInComparison;
    try {
      if (isInComparison) {
        const removeResult = await comparisonService.removeFromComparison(coachId);
        if (removeResult.success) {
          nextInComparison = false;
          setIsInComparison(false);
          onStateChange?.(false);
          if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        const result = await comparisonService.addToComparison(coachId);
        if (result.success && result.data.success) {
          nextInComparison = true;
          setIsInComparison(true);
          onStateChange?.(true);
          if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          nextInComparison = false;
          if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
      const canAddResult = await comparisonService.canAddMore();
      const canAdd = canAddResult.success ? canAddResult.data : false;
      setCanAddMore(canAdd || nextInComparison);
    } catch {
      if (Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [coachId, isInComparison, onStateChange]);

  const isDisabled = isLoading || (!isInComparison && !canAddMore);
  const showCapacityAlert = useCallback(() => {
    Alert.alert(
      'Comparison list full',
      `You can compare up to ${comparisonService.getMaxCoaches()} coaches at a time. Remove one to add another.`,
    );
  }, []);

  const handlePressWithReason = useCallback(() => {
    if (!isInComparison && !canAddMore) {
      showCapacityAlert();
      return;
    }
    void handlePress();
  }, [canAddMore, handlePress, isInComparison, showCapacityAlert]);

  if (variant === 'icon') {
    return (
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
        accessibilityHint={
          isInComparison ? `Remove ${coachName} from comparison` : `Add ${coachName} to comparison`
        }
        disabled={isLoading}
        accessibilityState={{ disabled: isDisabled, selected: isInComparison }}
        onPress={handlePressWithReason}
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
      </Clickable>
    );
  }

  if (variant === 'compact') {
    return (
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
        disabled={isLoading}
        accessibilityState={{ disabled: isDisabled, selected: isInComparison }}
        onPress={handlePressWithReason}
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
      </Clickable>
    );
  }

  return (
    <Clickable
      accessibilityRole="button"
      accessibilityLabel={isInComparison ? 'Remove from comparison' : 'Add to comparison'}
        disabled={isLoading}
      accessibilityState={{ disabled: isDisabled, selected: isInComparison }}
      onPress={handlePressWithReason}
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
        <Row style={styles.fullContent}>
          <Ionicons
            name={isInComparison ? 'checkmark-circle' : 'git-compare-outline'}
            size={20}
            color={isInComparison ? palette.success : palette.icon}
          />
          <View style={styles.fullTextContainer}>
            <ThemedText
              style={[styles.fullLabel, { color: isInComparison ? palette.success : palette.text }]}
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
        </Row>
      )}
    </Clickable>
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
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fullTextContainer: {
    flex: 1,
  },
  fullLabel: { ...Typography.bodySemiBold },
  fullHint: { ...Typography.caption, marginTop: Spacing.micro },
});
