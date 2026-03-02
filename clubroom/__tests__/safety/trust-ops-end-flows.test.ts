import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import { Routes } from '@/navigation/routes';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertMatches(source: string, pattern: RegExp, message: string): void {
  assert.ok(pattern.test(source), message);
}

describe('Trust/Ops end-flow readiness', () => {
  it('group completion flow wires raise concern for both board and completion summary', () => {
    const source = readSource('app/session/[id]/complete.tsx');

    assert.ok(
      source.includes('onRaiseConcern={handleRaiseConcernByRegistration}'),
      'Group completion board must expose raise concern action',
    );
    assertMatches(
      source,
      /onRaiseConcern=\{\(athlete\)\s*=>\s*\{\s*handleRaiseConcernByAthlete\(athlete\.athleteId\);/m,
      'Completion summary must route concern from athlete chip selection',
    );
    assertMatches(
      source,
      /const handleRaiseConcernByAthlete = useCallback\(\(athleteId: string\) => \{[\s\S]*router\.push\(Routes\.rosterAthleteConcern\(athleteId\)\);/m,
      'Athlete concern callback must navigate using the target athlete id',
    );
    assertMatches(
      source,
      /const handleRaiseConcernByRegistration = useCallback\(\s*\(registrationId: string\)\s*=>\s*\{[\s\S]*const athleteId = athlete\?\.registration\.userId;[\s\S]*router\.push\(Routes\.rosterAthleteConcern\(athleteId\)\);/m,
      'Registration-based concern callback must resolve and pass athlete id context',
    );
  });

  it('one-to-one development session flow exposes raise concern with athlete context', () => {
    const source = readSource('app/development/session/[sessionId].tsx');

    assert.ok(source.includes('Raise Concern'), '1:1 session screen should render Raise Concern CTA');
    assertMatches(
      source,
      /const targetAthleteId = athlete\.id \|\| session\.athleteId;/m,
      '1:1 concern action must derive athlete id from session context',
    );
    assertMatches(
      source,
      /router\.push\(Routes\.rosterAthleteConcern\(targetAthleteId\)\);/m,
      '1:1 concern action must navigate to roster concern form with athlete id',
    );
  });

  it('home/profile surfaces expose health and injury entry points', () => {
    const homeSource = readSource('components/user/home-screen-sections.tsx');
    const parentSource = readSource('components/parent/discover-screen.tsx');
    const childProgressSource = readSource('app/development/child-progress/[childId].tsx');

    assert.ok(
      homeSource.includes("label: 'Health', route: Routes.HEALTH"),
      'Athlete home quick actions should include Health route',
    );
    assert.ok(
      homeSource.includes("label: 'Journal', route: Routes.ATHLETE_JOURNAL"),
      'Athlete home quick actions should include Journal route',
    );
    assert.ok(
      parentSource.includes('router.push(Routes.HEALTH)'),
      'Parent discover quick links should route to Health',
    );
    assert.ok(
      parentSource.includes('Health & Injury'),
      'Parent discover quick links should clearly label Health & Injury',
    );
    assert.ok(
      childProgressSource.includes('router.push(Routes.HEALTH)'),
      'Parent child-progress profile actions should route to Health',
    );
    assert.ok(
      childProgressSource.includes('Health Log'),
      'Parent child-progress profile actions should label Health Log entry clearly',
    );
  });

  it('booking issue flow carries safety category and booking context into report problem route', () => {
    const bookingDetailSource = readSource('app/(tabs)/bookings/[id].tsx');
    const bookingHookSource = readSource('hooks/use-booking-detail.ts');
    const reportProblemSource = readSource('app/(tabs)/bookings/report-problem.tsx');

    assert.ok(
      bookingDetailSource.includes('onReportProblem={handlers.reportProblem}'),
      'Booking detail screen must expose report problem action from parent view',
    );
    assert.ok(
      bookingHookSource.includes('Routes.bookingsReportProblem({ bookingId: booking.id })'),
      'Booking detail handler must pass booking id to report problem route',
    );
    assert.ok(
      reportProblemSource.includes("{ id: 'safety', icon: 'shield-outline', label: 'Safety concern' }"),
      'Report problem categories must include a dedicated safety concern option',
    );
  });

  it('bookings report-problem route builder preserves booking context params', () => {
    const route = Routes.bookingsReportProblem({ bookingId: 'booking_123' }) as {
      pathname: string;
      params?: { bookingId?: string };
    };

    assert.equal(route.pathname, '/(tabs)/bookings/report-problem');
    assert.equal(route.params?.bookingId, 'booking_123');
  });
});
