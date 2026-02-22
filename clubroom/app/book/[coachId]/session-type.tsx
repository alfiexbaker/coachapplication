import { useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { BookingWizardHeader } from '@/components/ui/booking/booking-wizard';
import { SessionTypeSelector } from '@/components/ui/booking/session-type-selector';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ErrorState } from '@/components/ui/screen-states';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { useBookingFlow } from '@/context/booking-flow-context';
import { sessionTemplateService } from '@/services/session-template-service';
import type { SessionTemplate } from '@/constants/session-types';

function formatTemplateType(type: SessionTemplate['type']): string {
  if (type === '1-to-1') return '1-to-1';
  if (type === 'small-group') return 'Small group';
  if (type === 'clinic') return 'Clinic';
  if (type === 'assessment') return 'Assessment';
  return type;
}

export default function SessionTypeScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const { draft, updateDraft } = useBookingFlow();
  const loadTemplates = useCallback(async () => {
    if (!coachId) {
      return err(serviceError('VALIDATION', 'Coach information is missing for booking.'));
    }

    try {
      const templates = await sessionTemplateService.getTemplates(coachId);
      return ok(templates);
    } catch (error) {
      return err(serviceError('UNKNOWN', 'Failed to load coach session types.', error));
    }
  }, [coachId]);

  const {
    data: templates,
    status,
    error,
    retry,
    colors: palette,
  } = useScreen<SessionTemplate[]>({
    load: loadTemplates,
    deps: [loadTemplates],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const resolvedTemplates = useMemo(() => templates ?? [], [templates]);
  const selectedTemplate = useMemo(
    () => resolvedTemplates.find((template) => template.id === draft.sessionTemplateId),
    [resolvedTemplates, draft.sessionTemplateId],
  );

  useEffect(() => {
    if (!coachId || resolvedTemplates.length === 0) return;
    const currentlySelected = resolvedTemplates.find(
      (template) => template.id === draft.sessionTemplateId,
    );
    if (currentlySelected) return;

    const fallback = resolvedTemplates[0];
    updateDraft({
      coachId,
      sessionTemplateId: fallback.id,
      sessionType: fallback.type,
      sessionTypeLabel: fallback.name,
      duration: fallback.duration,
      price: fallback.defaultPrice,
      participants: fallback.capacity > 1 ? fallback.capacity : undefined,
    });
  }, [coachId, draft.sessionTemplateId, resolvedTemplates, updateDraft]);

  const templateOptions = useMemo(
    () =>
      resolvedTemplates.map((template) => ({
        id: template.id,
        title: template.name,
        priceText: `£${template.defaultPrice}`,
        description: formatTemplateType(template.type),
        detailText: `${template.duration} mins · up to ${template.capacity}`,
      })),
    [resolvedTemplates],
  );

  const durationOptions = useMemo(() => {
    const optionSet = new Set<number>([60, 90, 120]);
    if (selectedTemplate?.duration) optionSet.add(selectedTemplate.duration);
    if (draft.duration) optionSet.add(draft.duration);
    return Array.from(optionSet).sort((a, b) => a - b);
  }, [draft.duration, selectedTemplate?.duration]);

  const handleSelectTemplate = useCallback(
    (templateId: string) => {
      const template = resolvedTemplates.find((item) => item.id === templateId);
      if (!template || !coachId) return;

      updateDraft({
        coachId,
        sessionTemplateId: template.id,
        sessionType: template.type,
        sessionTypeLabel: template.name,
        duration: template.duration,
        price: template.defaultPrice,
        participants: template.capacity > 1 ? template.capacity : undefined,
      });
    },
    [coachId, resolvedTemplates, updateDraft],
  );

  const handleContinue = useCallback(() => {
    if (!coachId || !draft.sessionTemplateId) return;
    router.push(Routes.bookSchedule(coachId));
  }, [coachId, draft.sessionTemplateId]);

  const canContinue = Boolean(coachId && draft.sessionTemplateId);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <BookingWizardHeader
          title="Book a session"
          subtitle="Pick what this coach offers"
          step={1}
        />

        <SessionTypeSelector
          selected={draft.sessionTemplateId}
          onSelect={handleSelectTemplate}
          options={templateOptions}
          loading={status === 'loading'}
        />

        {status === 'error' ? (
          <ErrorState
            message={error?.message ?? 'Could not load session types.'}
            onRetry={retry}
          />
        ) : null}

        <View style={{ gap: Spacing.sm }}>
          <ThemedText type="defaultSemiBold">Duration</ThemedText>
          <Row style={styles.row}>
            {durationOptions.map((duration) => {
              const active = draft.duration === duration;
              return (
                <Clickable
                  key={duration}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? withAlpha(palette.tint, 0.09) : palette.surface,
                      borderColor: active ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() => updateDraft({ duration })}
                >
                  <ThemedText style={{ color: active ? palette.tint : palette.text }}>
                    {duration} mins
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>

        {selectedTemplate && selectedTemplate.capacity > 1 ? (
          <View style={{ gap: Spacing.sm }}>
            <ThemedText type="defaultSemiBold">
              Participants (max {selectedTemplate.capacity})
            </ThemedText>
            <TextInput
              placeholder={String(selectedTemplate.capacity)}
              keyboardType="number-pad"
              placeholderTextColor={palette.muted}
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              value={draft.participants?.toString() || ''}
              onChangeText={(text) => {
                const parsed = Number(text);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  updateDraft({ participants: undefined });
                  return;
                }
                const clamped = Math.min(parsed, selectedTemplate.capacity);
                updateDraft({ participants: clamped });
              }}
            />
          </View>
        ) : null}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: palette.border }]}>
        <Clickable
          onPress={handleContinue}
          style={[
            styles.cta,
            { backgroundColor: canContinue ? palette.tint : withAlpha(palette.tint, 0.4) },
          ]}
          disabled={!canContinue}
        >
          <Row justify="center" align="center" gap="sm">
            <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
            <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
              Continue
            </ThemedText>
          </Row>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  row: { gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.md },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  cta: { padding: Spacing.md, borderRadius: Radii.button },
});
