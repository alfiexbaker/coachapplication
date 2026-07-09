import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBookingTargetDraftPatch,
  hasResolvedBookingTargets,
  resolveBookingDraftTargets,
  resolveDefaultBookingTarget,
  resolveSingleBookingDraftTarget,
} from '@/utils/booking-targets';

const currentUser = {
  id: 'usr_parent',
  fullName: 'Jordan Parent',
  name: 'Parent',
};

const children = [
  { id: 'ath_child_1', referenceId: 'ref_child_1', name: 'Maya Player' },
  { id: 'ath_child_2', name: 'Athlete' },
];

describe('booking-target helpers', () => {
  it('builds draft target patches without generic names', () => {
    assert.deepEqual(
      buildBookingTargetDraftPatch({
        targetId: 'ath_child_1',
        currentUser,
        children,
      }),
      { childId: 'ath_child_1', athleteName: 'Maya Player' },
    );

    assert.deepEqual(
      buildBookingTargetDraftPatch({
        targetId: 'ath_child_2',
        currentUser,
        children,
      }),
      { childId: 'ath_child_2', athleteName: undefined },
    );
  });

  it('resolves booking targets only from draft ids', () => {
    assert.deepEqual(
      resolveBookingDraftTargets({
        draft: {},
        currentUser,
        children,
      }),
      { athleteIds: [], athleteNames: [] },
    );

    assert.deepEqual(
      resolveBookingDraftTargets({
        draft: { childIds: ['ath_child_1', 'ath_child_1'], athleteName: 'Stale Name' },
        currentUser,
        children,
      }),
      { athleteIds: ['ath_child_1'], athleteNames: ['Maya Player'] },
    );

    assert.deepEqual(
      resolveBookingDraftTargets({
        draft: { childId: 'usr_parent' },
        currentUser,
        children,
      }),
      { athleteIds: ['usr_parent'], athleteNames: ['Jordan Parent'] },
    );
  });

  it('marks unresolved or placeholder target names as incomplete', () => {
    assert.equal(
      hasResolvedBookingTargets({ athleteIds: ['ath_child_1'], athleteNames: ['Maya Player'] }),
      true,
    );
    assert.equal(
      hasResolvedBookingTargets({ athleteIds: ['ath_child_2'], athleteNames: ['Athlete'] }),
      false,
    );
    assert.equal(hasResolvedBookingTargets({ athleteIds: [], athleteNames: [] }), false);
  });

  it('uses one draft target for multi-week booking without guessing current user', () => {
    assert.equal(resolveSingleBookingDraftTarget({ draft: {}, currentUser, children }), null);
    assert.deepEqual(
      resolveSingleBookingDraftTarget({
        draft: { athleteId: 'ath_child_1' },
        currentUser,
        children,
      }),
      { id: 'ath_child_1', name: 'Maya Player' },
    );
  });

  it('resolves default booking prefill targets for discover and session detail', () => {
    assert.deepEqual(
      resolveDefaultBookingTarget({
        preferredChildId: 'ath_child_1',
        currentUser,
        children,
      }),
      { id: 'ath_child_1', name: 'Maya Player' },
    );
    assert.deepEqual(
      resolveDefaultBookingTarget({
        preferredChildId: 'usr_parent',
        currentUser,
        children,
      }),
      { id: 'usr_parent', name: 'Jordan Parent' },
    );
    assert.deepEqual(
      resolveDefaultBookingTarget({
        preferredChildId: 'missing_child',
        currentUser,
        children: [children[0]],
      }),
      { id: 'ath_child_1', name: 'Maya Player' },
    );
    assert.deepEqual(
      resolveDefaultBookingTarget({
        currentUser,
        children: [],
      }),
      { id: 'usr_parent', name: 'Jordan Parent' },
    );
    assert.equal(resolveDefaultBookingTarget({ currentUser, children }), null);
  });
});
