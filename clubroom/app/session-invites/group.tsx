/**
 * Group Invite Screen
 *
 * Multi-step wizard for coaches to send bulk session invites to individual
 * athletes, squads, or custom selections.
 *
 * Steps: target -> type -> slots -> preview -> confirm
 */

import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InviteAthleteModal } from '@/components/coach/invite-athlete-modal';
import { WizardHeader } from '@/components/invite/wizard-header';
import { WizardStepIndicator } from '@/components/invite/wizard-step-indicator';
import { WizardFooter } from '@/components/invite/wizard-footer';
import { GroupTargetStep } from '@/components/invite/group-target-step';
import { GroupSessionDetailsStep } from '@/components/invite/group-session-details-step';
import { TimeSlotForm } from '@/components/invite/time-slot-form';
import { GroupPreviewStep } from '@/components/invite/group-preview-step';
import { GroupConfirmStep } from '@/components/invite/group-confirm-step';
import { useGroupInvite, VISIBLE_STEPS } from '@/components/invite/use-group-invite';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';

const SCROLL_STYLE = { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing['2xl'] };

export default function GroupInviteScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const w = useGroupInvite(currentUser);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <WizardHeader title="Group Invite" onBack={w.prevStep} colors={colors} />
      <WizardStepIndicator steps={VISIBLE_STEPS} currentStep={w.step} colors={colors} />

      <ScrollView contentContainerStyle={SCROLL_STYLE} showsVerticalScrollIndicator={false}>
        {w.step === 'target' && (
          <GroupTargetStep
            targetType={w.targetType}
            onTargetSelect={w.handleTargetSelect}
            squads={w.squads}
            selectedSquadId={w.selectedSquadId}
            onSquadSelect={w.handleSquadSelect}
            colors={colors}
          />
        )}
        {w.step === 'type' && (
          <GroupSessionDetailsStep
            athleteCount={w.selectedAthletes.length}
            sessionType={w.sessionType}
            focus={w.focus}
            price={w.price}
            notes={w.notes}
            onSessionTypeChange={w.setSessionType}
            onFocusChange={w.setFocus}
            onPriceChange={w.setPrice}
            onNotesChange={w.setNotes}
            onEditAthletes={w.handleEditAthletes}
            colors={colors}
          />
        )}
        {w.step === 'slots' && (
          <TimeSlotForm
            proposedSlots={w.proposedSlots}
            onAddSlot={w.handleAddSlot}
            onRemoveSlot={w.handleRemoveSlot}
            slotDate={w.slotDate}
            slotStartTime={w.slotStartTime}
            slotEndTime={w.slotEndTime}
            slotLocation={w.slotLocation}
            onSlotDateChange={w.setSlotDate}
            onSlotStartTimeChange={w.setSlotStartTime}
            onSlotEndTimeChange={w.setSlotEndTime}
            onSlotLocationChange={w.setSlotLocation}
            colors={colors}
          />
        )}
        {w.step === 'preview' && (
          <GroupPreviewStep
            selectedAthletes={w.selectedAthletes}
            sessionType={w.sessionType}
            focus={w.focus}
            proposedSlots={w.proposedSlots}
            price={w.price}
            colors={colors}
          />
        )}
        {w.step === 'confirm' && (
          <GroupConfirmStep selectedAthletes={w.selectedAthletes} colors={colors} />
        )}
      </ScrollView>

      <WizardFooter
        isLastStep={w.step === 'confirm'}
        canProceed={w.canProceed()}
        onNext={w.nextStep}
        actionLabel={w.actionLabel}
        actionLoading={w.loading}
        onAction={w.submitBulkInvites}
        colors={colors}
      />

      <InviteAthleteModal
        visible={w.showAthleteModal}
        onClose={() => w.setShowAthleteModal(false)}
        onSelect={w.handleAthletesSelected}
        athletes={w.rosterAsAthletes}
        squads={w.squads}
        multiSelect={true}
        title="Select Athletes"
      />
    </SafeAreaView>
  );
}
