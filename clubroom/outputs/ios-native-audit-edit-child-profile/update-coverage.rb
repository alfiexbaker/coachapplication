require 'csv'

path = 'reviews/ios-native-audit/coverage.csv'
table = CSV.read(path, headers: true, encoding: 'UTF-8')
headers = table.headers

def replace_row(table, id, values)
  row = table.find { |candidate| candidate['id'] == id }
  raise "Missing coverage row #{id}" unless row

  values.each { |key, value| row[key] = value }
end

def build_row(headers, values)
  unknown = values.keys - headers
  raise "Unknown columns: #{unknown.join(', ')}" unless unknown.empty?

  headers.map { |header| values.fetch(header, '') }
end

replace_row(table, 'ENV-006', {
  'device' => 'iPhone 16 Pro Max simulator',
  'actual_transition' => 'Clubroom was visibly open at native sign-in; semantic runner attach failed because macOS Developer Tools security is disabled',
  'evidence' => 'reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-native-blocked/current-screen.png | reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-2/native-blocker.md',
  'notes' => 'No sudo or privileged host change was attempted. Enable with sudo DevToolsSecurity -enable, then rerun target-route semantics.'
})

replace_row(table, 'ROUTE-004', {
  'flow_id' => 'EDIT-CHILD-PROFILE-ROUTE',
  'flow_name' => 'Reachable player-profile editor coverage',
  'role' => 'parent; guardian; coach; athlete; admin',
  'route' => '/edit-child-profile?childId=:athleteId',
  'screen' => 'Edit player',
  'state' => 'loading; ready; dirty; submitting; rejected; denied; not found; error',
  'device' => 'iPhone 16 Pro responsive viewport; native simulator host-blocked',
  'environment' => 'local Expo web with staging reads and intercepted mutation',
  'entry_path' => 'Family player profile and direct protected route',
  'preconditions' => 'Authenticated roles; assigned player fixture; explicit family profile permission',
  'step_number' => '1',
  'branch' => 'assigned profile manager; unassigned or non-family role; failed save',
  'action' => 'Open, inspect, edit basic fields, reject save, and revisit across roles',
  'expected_transition' => 'Only an assigned profile manager sees controls; denied roles see one truthful exit; failed save stays actionable',
  'actual_transition' => 'Parent validation, every basic field control, and failure recovery passed; guardian, coach, athlete, and admin denial passed with visible labelled back control',
  'api_endpoint' => 'GET /v1/me | GET /v1/families/:familyId | GET/PATCH /v1/athletes/:athleteId',
  'api_result' => 'Strict update contract and family-athlete authority tests passed; deliberate UI PATCH returned intercepted 503',
  'database_tables' => 'Family | FamilyMembership | GuardianChildLink | Athlete | AuditEvent',
  'database_result' => 'Focused read-only catalog check passed for current objects; no staging mutation',
  'rls_result' => 'Current relations RLS-enabled with no direct PUBLIC, anon, or authenticated grants; SEC-004 remains open',
  'audit_event' => 'athlete.update SUCCESS/DENY behavior tested; denied metadata contains field names and error code, never values',
  'sentry_result' => 'blocked by HTTP 403 under ENV-004',
  'affected_roles' => 'parent; guardian; coach; athlete; admin',
  'affected_role_result' => 'Parent 2/2; guardian, coach, athlete, and admin each 1/1',
  'purpose_clear' => 'passed',
  'primary_action_clear' => 'passed',
  'unnecessary_ui' => 'duplicate health, emergency, consent, support, and coach-note controls removed',
  'generic_ai_patterns' => 'no speculative cards, helper prose, fake progress, gradients, or ornamental actions',
  'copy_direct' => 'passed',
  'native_behavior' => 'Shared React Native surface; native semantic runner blocked and recorded without a false claim',
  'football_specific' => 'player identity, relationship, and preferred football position',
  'visual_consistency' => 'ready, rejected, and denied screenshots manually accepted',
  'accessibility' => 'labelled inputs, radio roles and checked states, alert semantics, 44px controls, and labelled back action',
  'status' => 'fixed',
  'severity' => 'high',
  'evidence' => 'reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-5/report.json | app/(modal)/edit-child-profile.tsx',
  'issue' => 'The generic editor duplicated sensitive flows and fetched a player before proving edit authority',
  'fix_commit' => 'fix(family): harden player profile editing',
  'retest_status' => '6/6 strict UI flows, focused app tests, 27/27 family-athlete API tests, and both typechecks passed',
  'notes' => 'Ponytail keeps this screen to one basic-profile intent. Native semantics, Sentry reads, Supabase MCP, and future default grants remain explicitly blocked elsewhere.'
})

new_rows = {
  'UI-038' => {
    'id' => 'UI-038',
    'flow_id' => 'EDIT-CHILD-PROFILE-SIMPLIFICATION',
    'flow_name' => 'Lean player-profile editor',
    'role' => 'assigned family profile manager',
    'route' => '/edit-child-profile',
    'screen' => 'Edit player',
    'state' => 'ready; dirty; saving; rejected; denied',
    'device' => 'iPhone 16 Pro responsive browser viewport',
    'environment' => 'local Expo web with live authority reads and intercepted patch',
    'entry_path' => 'Family player profile',
    'preconditions' => 'Assigned player and MANAGE_PROFILE or ADMIN permission',
    'step_number' => '1',
    'branch' => 'basic identity and football fields only',
    'action' => 'Inspect, edit nickname and position, submit once, and recover from failure',
    'expected_transition' => 'One focused form, one save action, and concise inline state feedback',
    'actual_transition' => 'Flat form retained identity, date, relationship, gender, and position; blank-name validation stayed inline; failed save kept form and restored action',
    'api_endpoint' => 'intercepted PATCH /v1/athletes/:athleteId',
    'api_result' => 'Intentional 503 rendered inline and was exactly reconciled',
    'database_tables' => 'Athlete',
    'database_result' => 'No staging mutation',
    'rls_result' => 'Fastify authority; focused current-object catalog posture passed',
    'audit_event' => 'No product event expected for intercepted write',
    'sentry_result' => 'Issue reads blocked by HTTP 403; runner found no unexpected target-flow error',
    'affected_roles' => 'parent; delegated guardian',
    'affected_role_result' => 'Authorized fixture passed; view-only guardian denied',
    'purpose_clear' => 'passed',
    'primary_action_clear' => 'passed',
    'unnecessary_ui' => 'medical, emergency, consent, support, communication-note, behavior-note, and duplicate card surfaces removed',
    'generic_ai_patterns' => 'removed generated-looking sections, explanatory filler, and speculative completeness',
    'copy_direct' => 'Edit player; Player details; Save changes',
    'native_behavior' => 'Date picker uses existing native field; target semantic run host-blocked',
    'football_specific' => 'preferred football position radio choices',
    'visual_consistency' => 'clean dark hierarchy with one hairline section boundary and existing tokens',
    'accessibility' => 'named inputs, radio semantics, checked states, inline alert, busy state, and named back/save controls',
    'status' => 'fixed',
    'severity' => 'high',
    'evidence' => 'app/(modal)/edit-child-profile.tsx | reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-5/parent__parent_edit_child_profile_ready.png | reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-5/parent__parent_edit_child_profile_interactions.png',
    'issue' => 'The previous modal looked generated, mixed unrelated sensitive jobs, and exposed duplicate controls',
    'fix_commit' => 'fix(family): harden player profile editing',
    'retest_status' => 'Ready, invalid, date-trigger, every field family, and rejected-submit interactions passed with severity none',
    'notes' => 'Existing theme and component vocabulary retained; no ornamental redesign system was invented.'
  },
  'API-009' => {
    'id' => 'API-009',
    'flow_id' => 'ATHLETE-PROFILE-PATCH-AUTHORITY',
    'flow_name' => 'Strict audited player-profile update',
    'role' => 'assigned family profile manager; unauthorized caller',
    'route' => 'PATCH /v1/athletes/:athleteId',
    'screen' => 'Fastify family-athlete authority',
    'state' => 'authorized; forbidden; malformed; surplus field; empty patch',
    'device' => 'isolated Fastify seed process',
    'environment' => 'NODE_ENV=test API_DATA_BACKEND=seed',
    'entry_path' => 'childService.updateChild',
    'preconditions' => 'Authenticated fixtures and family-athlete assignment',
    'step_number' => '1',
    'branch' => 'authorize before schema parse; persist supported fields only',
    'action' => 'Patch valid profile then submit invalid date plus privateOverride',
    'expected_transition' => 'Unauthorized or malformed requests cannot mutate; every outcome is audited safely',
    'actual_transition' => 'Invalid surplus request returned 400, athlete version stayed unchanged, and one DENY audit recorded only safe metadata',
    'api_endpoint' => 'PATCH /v1/athletes/:athleteId',
    'api_result' => '27/27 family-athlete route tests passed',
    'database_tables' => 'Family | FamilyMembership | GuardianChildLink | Athlete | AuditEvent',
    'database_result' => 'Rejected seed request left athlete version unchanged',
    'rls_result' => 'Repository is reachable only after Fastify manage-access enforcement',
    'audit_event' => 'athlete.update DENY with VALIDATION_FAILED and requestedFields; raw date and values absent',
    'sentry_result' => 'Not applicable to isolated process',
    'affected_roles' => 'family admin; delegated profile manager; view-only guardian; coach; athlete; club admin',
    'affected_role_result' => 'Explicit assignment plus permission required; unrelated roles denied',
    'purpose_clear' => 'passed',
    'primary_action_clear' => 'passed',
    'unnecessary_ui' => 'not applicable',
    'generic_ai_patterns' => 'not applicable',
    'copy_direct' => 'passed',
    'native_behavior' => 'not applicable',
    'football_specific' => 'position enum limited to GK DEF MID ATT or null',
    'visual_consistency' => 'not applicable',
    'accessibility' => 'not applicable',
    'status' => 'fixed',
    'severity' => 'critical',
    'evidence' => 'apps/api/src/modules/family-athlete/routes.ts | apps/api/src/modules/family-athlete/routes.test.ts',
    'issue' => 'The athlete patch accepted surplus object keys and schema failures were not classified as audit denials',
    'fix_commit' => 'fix(family): harden player profile editing',
    'retest_status' => '27/27 route tests and API typecheck passed',
    'notes' => 'Authentication and family-athlete manage access execute before body parsing; audit metadata never includes request values.'
  },
  'QA-014' => {
    'id' => 'QA-014',
    'flow_id' => 'EDIT-CHILD-PROFILE-NONDESTRUCTIVE-INTERACTIONS',
    'flow_name' => 'Player-profile cross-role and failure proof',
    'role' => 'parent; guardian; coach; athlete; admin',
    'route' => 'scripts/ui-flow-checks-50.mjs | /edit-child-profile',
    'screen' => 'Edit child profile audit profile',
    'state' => 'ready; semantic controls; injected 503; four denied outcomes',
    'device' => 'iPhone 16 Pro responsive viewport; iPhone 16 Pro Max native blocker proof',
    'environment' => 'local Expo web with staging reads and intercepted PATCH',
    'entry_path' => 'Direct protected route',
    'preconditions' => 'All five role preflights passed',
    'step_number' => '1',
    'branch' => 'authorized parent; denied guardian coach athlete admin',
    'action' => 'Assert fields and removed copy, exercise radios and save failure, verify denial content and exit control',
    'expected_transition' => 'All branches pass without a staging mutation or undeclared medium/high finding',
    'actual_transition' => '6/6 passed with zero medium/high findings; parent exercised both names, nickname, date trigger, gender, relationship, position, validation, and save; denied screens proved a visible Go back control',
    'api_endpoint' => 'intercepted PATCH /v1/athletes/:athleteId',
    'api_result' => '503 fulfilled locally; no upstream mutation',
    'database_tables' => 'Family | FamilyMembership | GuardianChildLink | Athlete | AuditEvent',
    'database_result' => 'No staging mutation; focused read-only catalog checks passed',
    'rls_result' => 'Unauthorized UI roles fail before profile controls; API tests independently enforce authority',
    'audit_event' => 'No API audit expected for intercepted write; route tests prove success and denial auditing',
    'sentry_result' => 'HTTP 403 under ENV-004',
    'affected_roles' => 'parent; guardian; coach; athlete; admin',
    'affected_role_result' => 'Parent 2/2; every denied role 1/1',
    'purpose_clear' => 'not applicable',
    'primary_action_clear' => 'passed',
    'unnecessary_ui' => 'absence assertions passed',
    'generic_ai_patterns' => 'absence assertions passed',
    'copy_direct' => 'passed',
    'native_behavior' => 'Actual iOS app visually open; semantic target run honestly blocked by ENV-006',
    'football_specific' => 'player and preferred-position flow',
    'visual_consistency' => 'ready, failure, and denied screenshots retained',
    'accessibility' => 'named back, save, date, input, and radio controls exercised or asserted',
    'status' => 'fixed',
    'severity' => 'high',
    'evidence' => 'scripts/ui-flow-checks-50.mjs | reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-5/report.json | reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-2/native-blocker.md',
    'issue' => 'No deterministic role-aware interaction profile previously covered the player editor and its denied exits',
    'fix_commit' => 'fix(family): harden player profile editing',
    'retest_status' => 'Strict fail-on-medium profile passed 6/6 after all basic controls, every denied exit, and post-network-settle visibility were explicitly checked',
    'notes' => 'The intentional 503 is reconciled only within the failure branch. Post-settle assertions prevent blank or stale screenshots from counting as evidence. Native semantics are not inferred from responsive output.'
  },
  'SEC-009' => {
    'id' => 'SEC-009',
    'flow_id' => 'CHILD-PROFILE-RLS-AUTHORITY',
    'flow_name' => 'Child-profile and audit-event staging database posture',
    'role' => 'system',
    'route' => 'Supabase Postgres catalog | family and athlete authority relations',
    'screen' => 'Database authority',
    'state' => '57 migrations; current RLS, grants, policies, and principal inspected',
    'device' => 'read-only staging catalog',
    'environment' => 'staging database',
    'entry_path' => 'database preflight plus focused catalog query',
    'preconditions' => 'Staging DATABASE_URL; never production',
    'step_number' => '1',
    'branch' => 'current objects versus future default privileges',
    'action' => 'Inspect Family, FamilyMembership, GuardianChildLink, Athlete, and AuditEvent without changing data',
    'expected_transition' => 'Current child-profile data remains unavailable to direct client roles',
    'actual_transition' => 'All focused current relations passed; global preflight remains blocked by 25 supabase_admin future-default findings',
    'api_endpoint' => 'Postgres catalog read',
    'api_result' => 'Read-only queries completed; Supabase MCP unavailable under ENV-003',
    'database_tables' => '_prisma_migrations | Family | FamilyMembership | GuardianChildLink | Athlete | AuditEvent',
    'database_result' => '57/57 migrations; no row mutation',
    'rls_result' => 'RLS enabled, not forced; no PUBLIC, anon, or authenticated grants; zero direct policies',
    'audit_event' => 'No product audit expected for catalog reads',
    'sentry_result' => 'not applicable',
    'affected_roles' => 'all roles',
    'affected_role_result' => 'Direct client roles cannot reach focused current objects',
    'purpose_clear' => 'passed for current objects; SEC-004 remains open',
    'primary_action_clear' => 'requires privileged future-default fix',
    'unnecessary_ui' => 'not applicable',
    'generic_ai_patterns' => 'not applicable',
    'copy_direct' => 'not applicable',
    'native_behavior' => 'not applicable',
    'football_specific' => 'protects minor player identity, assignment, family authority, and audit trail',
    'visual_consistency' => 'not applicable',
    'accessibility' => 'not applicable',
    'status' => 'fixed',
    'severity' => 'critical',
    'evidence' => 'reviews/ios-native-audit/runtime/2026-08-01/edit-child-profile-audit-final-2/db-child-profile-authority.md | scripts/db-staging-preflight.js',
    'issue' => 'No current-object exposure found; existing supabase_admin future defaults still block release approval',
    'fix_commit' => 'fix(family): harden player profile editing',
    'retest_status' => '57/57 migrations and focused relation catalog checks passed read-only',
    'notes' => 'service_role remains trusted direct authority and must never enter a client bundle. Connected postgres cannot alter supabase_admin defaults.'
  }
}

table.delete_if { |row| new_rows.key?(row['id']) }
new_rows.each_value { |values| table << build_row(headers, values) }

File.open(path, 'w:UTF-8') do |file|
  file.write(CSV.generate(row_sep: "\n") do |csv|
    csv << headers
    table.each { |row| csv << row.fields }
  end)
end

puts "updated #{path}: #{table.length} rows, #{headers.length} columns"
