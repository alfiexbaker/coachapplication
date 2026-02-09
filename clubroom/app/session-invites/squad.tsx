/**
 * Squad Bulk Invite Screen
 *
 * Multi-step wizard for coaches to send bulk session invites to an entire squad.
 * Steps: squad -> details -> members -> slots -> confirm -> result
 */

import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { WizardHeader } from '@/components/invite/wizard-header';
import { WizardStepIndicator } from '@/components/invite/wizard-step-indicator';
import { WizardFooter } from '@/components/invite/wizard-footer';
import { SquadSelectStep } from '@/components/invite/squad-select-step';
import { SquadDetailsStep } from '@/components/invite/squad-details-step';
import { SquadMembersStep } from '@/components/invite/squad-members-step';
import { TimeSlotForm } from '@/components/invite/time-slot-form';
import { SquadConfirmStep } from '@/components/invite/squad-confirm-step';
import { SquadResultStep } from '@/components/invite/squad-result-step';
import { BulkInviteButton } from '@/components/squad/BulkInviteButton';
import { useSquadInvite, NAV_STEPS } from '@/components/invite/use-squad-invite';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';

const SCROLL_STYLE = { padding: Spacing.lg, paddingTop: 0, paddingBottom: Spacing['2xl'] };

export default function SquadBulkInviteScreen() {
  const { colors } = useTheme();
  const { currentUser } = useAuth();
  const params = useLocalSearchParams<{ squadId?: string; sessionId?: string }>();
  const w = useSquadInvite(currentUser, params);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <WizardHeader
        title="Squad Bulk Invite"
        onBack={w.step === 'result' ? w.handleDone : w.prevStep}
        showClose={w.showClose}
        colors={colors}
      />
      {w.step !== 'result' && (
        <WizardStepIndicator steps={NAV_STEPS} currentStep={w.step} colors={colors} />
      )}

      <ScrollView contentContainerStyle={SCROLL_STYLE} showsVerticalScrollIndicator={false}>
        {w.step === 'squad' && (
          <SquadSelectStep
            clubId={w.clubId}
            selectedSquadIds={w.selectedSquadIds}
            onSelectionChange={w.setSelectedSquadIds}
            selectedSquad={w.selectedSquad}
            colors={colors}
          />
        )}
        {w.step === 'details' && (
          <SquadDetailsStep
            sessionTitle={w.sessionTitle}
            sessionType={w.sessionType}
            focus={w.focus}
            notes={w.notes}
            price={w.price}
            onSessionTitleChange={w.setSessionTitle}
            onSessionTypeChange={w.setSessionType}
            onFocusChange={w.setFocus}
            onNotesChange={w.setNotes}
            onPriceChange={w.setPrice}
            colors={colors}
          />
        )}
        {w.step === 'members' && w.selectedSquadIds.length > 0 && (
          <SquadMembersStep
            squadId={w.selectedSquadIds[0]}
            sessionId={params.sessionId}
            selectedMemberIds={w.selectedMemberIds}
            onSelectionChange={w.setSelectedMemberIds}
            onParentCountChange={w.setUniqueParentCount}
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
        {w.step === 'confirm' && (
          <SquadConfirmStep
            squadName={w.selectedSquad?.name}
            sessionTitle={w.sessionTitle}
            sessionType={w.sessionType}
            focus={w.focus}
            selectedMemberCount={w.selectedMemberIds.length}
            uniqueParentCount={w.uniqueParentCount}
            proposedSlots={w.proposedSlots}
            price={w.price}
            notes={w.notes}
            colors={colors}
          />
        )}
        {w.step === 'result' && w.inviteResult && (
          <SquadResultStep
            result={w.inviteResult.result}
            invitedMembers={w.inviteResult.squadInvite.invitedMembers}
            squadName={w.selectedSquad?.name}
            sessionTitle={w.sessionTitle}
            onViewInvites={w.handleViewInvites}
            onDone={w.handleDone}
          />
        )}
      </ScrollView>

      {w.step !== 'result' && (
        <WizardFooter
          isLastStep={w.step === 'confirm'}
          canProceed={w.canProceed}
          onNext={w.nextStep}
          colors={colors}
          actionContent={
            w.step === 'confirm' ? (
              <BulkInviteButton
                selectedCount={w.selectedMemberIds.length}
                notificationCount={w.uniqueParentCount}
                onPress={w.sendBulkInvites}
                loading={w.sendingInvites}
                disabled={!w.canProceed}
              />
            ) : undefined
          }
        />
      )}
    </SafeAreaView>
  );
}
