/**
 * Create/Edit Goal Screen
 *
 * Screen for creating a new goal or editing an existing one.
 * Uses the GoalForm component for the form UI.
 */

import { useState, useCallback, useEffect } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { createLogger } from '@/utils/logger';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { GoalForm } from '@/components/goals';
import { LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import type { Goal, CreateGoalInput, UpdateGoalInput, GoalCreator } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import type { ThemeColors } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';
import { hasChildren } from '@/utils/user-helpers';

const logger = createLogger('CreateGoalScreen');

/**
 * Screen for creating or editing a goal.
 */
export default function CreateGoalScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = params.editId;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(Boolean(editId));

  const isEditing = Boolean(editId);
  const userId = currentUser?.id ?? 'user1';

  // Load goal if editing
  useEffect(() => {
    const loadGoal = async () => {
      if (editId) {
        try {
          const data = await progressService.getGoalById(editId);
          setGoal(data);
        } catch (error) {
          logger.error('Failed to load goal', error);
          Alert.alert('Error', 'Failed to load goal for editing.');
          router.back();
        } finally {
          setInitialLoading(false);
        }
      }
    };

    loadGoal();
  }, [editId]);

  // Determine creator type based on current user role
  const getCreatorType = useCallback((): GoalCreator => {
    if (!currentUser) return 'ATHLETE';
    if (currentUser.role === 'COACH') return 'COACH';
    if (hasChildren(currentUser)) return 'PARENT';
    return 'ATHLETE';
  }, [currentUser]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (data: CreateGoalInput | UpdateGoalInput) => {
      setLoading(true);
      try {
        if (isEditing && editId) {
          // Update existing goal
          const updatedGoal = await progressService.updateGoal(editId, data as UpdateGoalInput);
          if (updatedGoal) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } else {
            throw new Error('Failed to update goal');
          }
        } else {
          // Create new goal
          const createData = data as CreateGoalInput;
          const newGoal = await progressService.createGoal(
            userId,
            createData,
            getCreatorType(),
            currentUser?.id ?? userId,
          );

          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Navigate to the new goal
          router.replace(Routes.goal(newGoal.id));
        }
      } catch (error) {
        logger.error('Failed to save goal', error);
        Alert.alert(
          'Error',
          isEditing
            ? 'Failed to update goal. Please try again.'
            : 'Failed to create goal. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    },
    [isEditing, editId, userId, currentUser, getCreatorType],
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (loading) return;
    router.back();
  }, [loading]);

  // Loading state for edit mode
  if (initialLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <Header title="Edit Goal" onBack={handleCancel} palette={palette} />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Header
        title={isEditing ? 'Edit Goal' : 'Create Goal'}
        onBack={handleCancel}
        palette={palette}
      />
      <GoalForm
        goal={goal ?? undefined}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </SafeAreaView>
  );
}

/**
 * Header component for the screen
 */
function Header({
  title,
  onBack,
  palette,
}: {
  title: string;
  onBack: () => void;
  palette: ThemeColors;
}) {
  return (
    <Clickable onPress={onBack} style={styles.header} hitSlop={8}>
      <Row align="center" justify="space-between">
        <Ionicons name="close" size={24} color={palette.text} />
        <ThemedText type="subtitle" style={styles.headerTitle}>
          {title}
        </ThemedText>
        <Ionicons name="close" size={24} color="transparent" />
      </Row>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: scaleFont(Typography.heading.fontSize),
  },
});
