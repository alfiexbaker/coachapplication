/**
 * Special Needs Screen
 *
 * Displays athlete disabilities, accommodations, parent notes, and medical alerts.
 * Coach observations are available only to authorised coach and admin roles.
 */

import { useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SpecialNeedsHero } from '@/components/development/special-needs-hero';
import { SpecialNeedsDisabilities } from '@/components/development/special-needs-disabilities';
import { SpecialNeedsAccommodations } from '@/components/development/special-needs-accommodations';
import { SpecialNeedsNotesSection } from '@/components/development/special-needs-notes-section';
import { SpecialNeedsObservations } from '@/components/development/special-needs-observations';
import { CoachObservationModal } from '@/components/development/coach-observation-modal';
import { Spacing } from '@/constants/theme';
import { useSpecialNeeds } from '@/hooks/use-special-needs';
import { useCoachObservations } from '@/hooks/use-coach-observations';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { useAuth } from '@/hooks/use-auth';

const SPECIAL_NEEDS_HEADER = <PageHeader title="Needs & notes" showBack centerTitle />;

function CoachObservationsSection({
  athleteId,
  currentUserId,
}: {
  athleteId: string;
  currentUserId: string;
}) {
  const obsHook = useCoachObservations(athleteId);
  const handleEditObs = (obs: Parameters<typeof obsHook.showModal>[0]) => obsHook.showModal(obs);

  return (
    <>
      <SpecialNeedsObservations
        observations={obsHook.observations}
        loading={obsHook.loading}
        error={obsHook.error}
        onAdd={() => obsHook.showModal()}
        onEdit={handleEditObs}
        onDelete={obsHook.deleteObservation}
        onRetry={obsHook.retry}
        currentUserId={currentUserId}
      />

      <CoachObservationModal
        visible={obsHook.modalVisible}
        observation={obsHook.editingObservation}
        onSave={obsHook.handleSave}
        onClose={obsHook.hideModal}
        saving={obsHook.saving}
      />
    </>
  );
}

export default function SpecialNeedsScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const { currentUser } = useAuth();
  const {
    athlete,
    childProfile,
    loading,
    status,
    error,
    retry,
    disabilityCount,
    specialNeedsCount,
    allergyCount,
    conditionCount,
    medicationCount,
    parentNoteCount,
    totalCount,
  } = useSpecialNeeds();
  const canManageCoachObservations = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  if (loading) {
    return (
      <PageContainer edges={['top', 'bottom']} gap={Spacing.md} header={SPECIAL_NEEDS_HEADER}>
        <LoadingState variant="hero" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    const accessDenied = error?.code === 'UNAUTHORIZED';
    return (
      <PageContainer edges={['top', 'bottom']} gap={Spacing.md} header={SPECIAL_NEEDS_HEADER}>
        <ErrorState
          title={accessDenied ? 'Needs and notes unavailable' : undefined}
          message={error?.message ?? 'Failed to load special needs profile.'}
          onRetry={accessDenied ? undefined : retry}
        />
      </PageContainer>
    );
  }

  if (!athlete) {
    return (
      <PageContainer edges={['top', 'bottom']} gap={Spacing.md} header={SPECIAL_NEEDS_HEADER}>
        <EmptyState
          icon="accessibility-outline"
          title="Special needs unavailable"
          message="We could not find this athlete profile."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer edges={['top', 'bottom']} gap={Spacing.md} header={SPECIAL_NEEDS_HEADER}>
      <SpecialNeedsHero
        name={athlete.name}
        avatar={athlete.avatar}
        totalCount={totalCount}
        disabilityCount={disabilityCount}
        specialNeedsCount={specialNeedsCount}
        allergyCount={allergyCount}
        conditionCount={conditionCount}
        medicationCount={medicationCount}
        parentNoteCount={parentNoteCount}
        lastUpdated={childProfile?.updatedAt}
      />

      {childProfile && <SpecialNeedsDisabilities disabilities={childProfile.disabilities} />}
      {childProfile && <SpecialNeedsAccommodations specialNeeds={childProfile.specialNeeds} />}
      {childProfile && <SpecialNeedsNotesSection childProfile={childProfile} />}

      {canManageCoachObservations && athleteId ? (
        <CoachObservationsSection
          key={currentUser?.id ?? 'unknown'}
          athleteId={athleteId}
          currentUserId={currentUser?.id ?? ''}
        />
      ) : null}
    </PageContainer>
  );
}
