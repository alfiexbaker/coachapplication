/**
 * AvailabilitySetupWizard — Composition root for 3-step availability setup.
 * Sub-components: WizardStepDays, WizardStepHours, WizardStepReview
 * Hook: useAvailabilityWizard
 */
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing } from '@/constants/theme';
import { useAvailabilityWizard } from '@/hooks/use-availability-wizard';
import { WizardStepDays } from '@/components/availability/wizard-step-days';
import { WizardStepHours } from '@/components/availability/wizard-step-hours';
import { WizardStepReview } from '@/components/availability/wizard-step-review';
import type { AvailabilityTemplate } from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';

export interface AvailabilitySetupWizardProps {
  coachId: string;
  onComplete: () => void;
  existingTemplates?: AvailabilityTemplate[];
  title?: string;
  sessionTemplates?: SessionTemplate[];
}

export function AvailabilitySetupWizard({
  coachId,
  onComplete,
  existingTemplates,
  sessionTemplates,
}: AvailabilitySetupWizardProps) {
  const w = useAvailabilityWizard({ coachId, onComplete, existingTemplates, sessionTemplates });

  return (
    <SurfaceCard style={{ padding: Spacing.lg, gap: Spacing.lg }}>
      {w.step === 1 && (
        <WizardStepDays
          selectedDays={w.selectedDays}
          selectedCount={w.selectedCount}
          onToggleDay={w.toggleDay}
          onApplyPreset={w.applyPreset}
          onNext={() => w.setStep(2)}
        />
      )}

      {w.step === 2 && (
        <WizardStepHours
          selectedDays={w.selectedDays}
          selectedCount={w.selectedCount}
          sameHours={w.sameHours}
          globalHours={w.globalHours}
          perDayHours={w.perDayHours}
          totalHoursLive={w.totalHoursLive}
          location={w.location}
          showLocationInput={w.showLocationInput}
          sessionTemplateId={w.sessionTemplateId}
          sessionTemplates={sessionTemplates}
          onToggleSameHours={w.toggleSameHours}
          onUpdateGlobalHours={(field, value) => w.updateDayHours(0, field, value)}
          onUpdateDayHours={w.updateDayHours}
          onSelectLocation={w.selectLocation}
          onSetLocation={w.setLocation}
          onSetShowLocationInput={w.setShowLocationInput}
          onSelectSessionTemplate={w.selectSessionTemplate}
          onBack={() => w.setStep(1)}
          onNext={() => w.setStep(3)}
        />
      )}

      {w.step === 3 && (
        <WizardStepReview
          selectedDays={w.selectedDays}
          selectedCount={w.selectedCount}
          totalHoursLive={w.totalHoursLive}
          getHoursForDay={w.getHoursForDay}
          location={w.location}
          linkedSessionTemplate={w.linkedSessionTemplate}
          saving={w.saving}
          onConfirm={w.handleConfirm}
          onBack={() => w.setStep(2)}
        />
      )}
    </SurfaceCard>
  );
}
