/**
 * Create Drill Screen
 *
 * Screen for coaches to create a new drill in their library.
 * Uses DrillForm component for the form UI.
 */

import { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { PageHeader } from '@/components/primitives/page-header';
import { DrillForm } from '@/components/drills';
import { Spacing, Typography } from '@/constants/theme';
import type { CreateDrillInput } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('CreateDrillScreen');

/**
 * Screen for creating a new drill in the coach's library.
 */
export default function CreateDrillScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get coach info
  const coachId = currentUser?.id ?? 'coach1';
  const coachName = currentUser?.name ?? 'Coach';

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (values: CreateDrillInput) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setIsSubmitting(true);

      try {
        const newDrill = await drillService.createDrill(coachId, coachName, values);

        uiFeedback.showToast(`"${newDrill.title}" has been added to your library.`, 'success');
        router.back();
      } catch (error) {
        logger.error('Failed to create drill:', error);
        uiFeedback.showToast('Failed to create drill. Please try again.', 'error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [coachId, coachName],
  );

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    uiFeedback.alert('Discard Changes?', 'Your drill will not be saved.', [
      { text: 'Keep Editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Create Drill"
        showBack
        backIcon="close"
        onBackPress={handleCancel}
        centerTitle
        containerStyle={[styles.header, { borderBottomColor: palette.border }]}
      />

      {/* Form */}
      <DrillForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
        submitLabel="Create Drill"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: scaleFont(Typography.heading.fontSize),
  },
});
