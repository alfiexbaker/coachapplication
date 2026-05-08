import fs from 'node:fs/promises';
import path from 'node:path';

let baseUrl = process.env.UI_BASE_URL || 'http://localhost:8083';
const defaultOutDir = process.env.UI_FLOW_OUT_DIR || '/tmp/ui-flow-checks-50';
const failLevels = ['none', 'high', 'medium'];
let chromium = null;
let devices = null;
const preflightProofPathByRole = {
  coach: '/schedule',
  parent: '/family',
  athlete: '/development/my-progress',
};

const creds = {
  coach: { username: 'coach1', password: 'coach' },
  parent: { username: 'parent1', password: 'user' },
  athlete: { username: 'user1', password: 'user' },
};

async function ensurePlaywrightLoaded() {
  if (chromium && devices) {
    return;
  }

  try {
    const playwright = await import('playwright');
    chromium = playwright.chromium;
    devices = playwright.devices;
  } catch (error) {
    throw new Error(
      `Playwright is required to run UI flow checks. Install it with "npm install --save-dev playwright". ${String(error)}`,
    );
  }
}

/**
 * Flow actions are intentionally minimal and resilient:
 * - We never hard-fail on optional actions.
 * - We gather route-level UI diagnostics and screenshots for every flow.
 */
const flows = [
  // Coach flows
  { id: 'coach_home', role: 'coach', title: 'Coach opens dashboard', path: '/' },
  { id: 'coach_schedule', role: 'coach', title: 'Coach opens schedule', path: '/schedule' },
  { id: 'coach_athletes', role: 'coach', title: 'Coach opens athletes', path: '/athletes' },
  { id: 'coach_feed', role: 'coach', title: 'Coach opens feed', path: '/feed' },
  { id: 'coach_messages', role: 'coach', title: 'Coach opens messages', path: '/messages' },
  {
    id: 'coach_bookings',
    role: 'coach',
    title: 'Coach opens bookings',
    path: '/bookings',
    expectPath: '/bookings',
  },
  { id: 'coach_settings', role: 'coach', title: 'Coach opens settings', path: '/settings' },
  {
    id: 'coach_progress',
    role: 'coach',
    title: 'Coach opens development progress',
    path: '/development/my-progress',
  },
  {
    id: 'coach_discover_sessions',
    role: 'coach',
    title: 'Coach opens discover sessions',
    path: '/discover-sessions',
  },
  {
    id: 'coach_availability_calendar',
    role: 'coach',
    title: 'Coach opens availability calendar',
    path: '/availability/calendar',
  },
  {
    id: 'coach_availability_rules',
    role: 'coach',
    title: 'Coach opens cancellation policy',
    path: '/settings/cancellation-policy',
  },
  {
    id: 'coach_group_sessions',
    role: 'coach',
    title: 'Coach opens group sessions',
    path: '/group-sessions/index',
  },
  {
    id: 'coach_group_sessions_create',
    role: 'coach',
    title: 'Coach opens create group session',
    path: '/group-sessions/create',
  },
  {
    id: 'coach_create_invite_entry',
    role: 'coach',
    title: 'Coach opens create/invite hub',
    path: '/sessions/create',
  },
  {
    id: 'coach_make_appointment',
    role: 'coach',
    title: 'Coach starts booking a new appointment',
    path: '/sessions/create',
    actions: [{ type: 'clickButton', name: 'Book New Session', required: true }],
  },
  {
    id: 'coach_invite_existing',
    role: 'coach',
    title: 'Coach starts invite-to-existing flow',
    path: '/sessions/create',
    actions: [{ type: 'clickButton', name: 'Add to Existing Session', required: true }],
  },
  {
    id: 'coach_session_invites',
    role: 'coach',
    title: 'Coach opens invite inbox',
    path: '/session-invites/index',
  },
  {
    id: 'coach_session_invites_create_redirect',
    role: 'coach',
    title: 'Coach hits invite redirect',
    path: '/session-invites/create',
  },
  { id: 'coach_club_settings', role: 'coach', title: 'Coach opens club settings', path: '/club/settings' },
  { id: 'coach_club_create', role: 'coach', title: 'Coach opens create club', path: '/club/create' },
  {
    id: 'coach_squad_create',
    role: 'coach',
    title: 'Coach opens create squad',
    path: '/club/squad/create',
  },
  {
    id: 'coach_squad_detail',
    role: 'coach',
    title: 'Coach opens squad detail',
    path: '/club/squad/squad_u15',
  },
  {
    id: 'coach_add_member_to_squad',
    role: 'coach',
    title: 'Coach opens add-member panel inside squad',
    path: '/club/squad/squad_u15',
    actions: [{ type: 'clickButton', name: 'Add', required: true }],
  },
  {
    id: 'coach_squad_invite_screen',
    role: 'coach',
    title: 'Coach opens squad invite screen',
    path: '/squads/squad_u15/invite',
  },
  {
    id: 'coach_manage',
    role: 'coach',
    title: 'Coach opens management hub',
    path: '/manage',
    expectPath: '/club/club_lions/dashboard',
  },
  {
    id: 'coach_manage_bookings',
    role: 'coach',
    title: 'Coach opens booking console',
    path: '/manage/bookings',
    expectPath: '/manage/bookings',
  },
  {
    id: 'coach_create_as_club_assigned',
    role: 'coach',
    title: 'Coach opens create flow with club-assignment context',
    path: '/sessions/create?intent=new&source=club_manage&actingAs=club&clubId=academy_1&assigneeCoachId=coach1',
    expectPath: '/sessions/create',
  },
  {
    id: 'coach_existing_invite_ownership',
    role: 'coach',
    title: 'Coach existing-invite flow exposes club ownership and assignee controls',
    path: '/sessions/create?intent=existing&source=club_manage&actingAs=club&clubId=academy_1&assigneeCoachId=coach1',
    actions: [
      { type: 'assertTextVisible', text: 'Invite as', required: true },
      { type: 'assertTextPresent', text: 'Assign coach', required: true },
      { type: 'assertTextPresent', text: 'Session picker scope', required: true },
      { type: 'assertTextPresent', text: 'Club-wide', required: true },
      { type: 'assertTextPresent', text: 'Ownership summary', required: true },
    ],
  },
  {
    id: 'coach_schedule_location_modal_actions',
    role: 'coach',
    title: 'Coach can open day editor location modal actions',
    path: '/schedule?segment=availability',
    actions: [
      { type: 'clickText', text: 'Add time block', required: true },
      { type: 'clickButton', name: 'Add new venue', required: true },
      { type: 'assertTextVisible', text: 'Use Location', required: true },
    ],
  },
  {
    id: 'coach_earnings',
    role: 'coach',
    title: 'Coach opens earnings',
    path: '/earnings',
    expectPath: '/earnings',
  },
  {
    id: 'coach_earnings_payment_modal_actions',
    role: 'coach',
    title: 'Coach can open payment instructions modal save action',
    path: '/earnings',
    actions: [
      {
        type: 'clickAnyButton',
        names: ['Show payment instructions', 'Hide payment instructions'],
        required: false,
      },
      { type: 'clickButton', name: 'Edit payment instructions', required: true },
      { type: 'assertButtonVisible', name: 'Save payment instructions', required: true },
    ],
  },
  {
    id: 'owner_dashboard',
    role: 'coach',
    title: 'Owner opens club dashboard',
    path: '/club/club_lions/dashboard',
    expectPath: '/club/club_lions/dashboard',
  },
  {
    id: 'owner_head_coach',
    role: 'coach',
    title: 'Owner opens head coach oversight',
    path: '/manage/head-coach',
    expectPath: '/manage/head-coach',
  },
  {
    id: 'coach_club_invite_members',
    role: 'coach',
    title: 'Coach opens club invite members',
    path: '/club/invite-members',
  },
  {
    id: 'coach_raise_concern',
    role: 'coach',
    title: 'Coach opens raise concern form',
    path: '/roster/user1/raise-concern',
    expectPath: '/roster/user1/raise-concern',
  },
  {
    id: 'coach_health_review',
    role: 'coach',
    title: 'Coach opens athlete health review',
    path: '/roster/user1/health',
    expectPath: '/roster/user1/health',
  },
  // Parent flows
  { id: 'parent_home', role: 'parent', title: 'Parent opens dashboard', path: '/' },
  { id: 'parent_children', role: 'parent', title: 'Parent opens children', path: '/children' },
  { id: 'parent_feed', role: 'parent', title: 'Parent opens feed', path: '/feed' },
  { id: 'parent_messages', role: 'parent', title: 'Parent opens messages', path: '/messages' },
  { id: 'parent_bookings', role: 'parent', title: 'Parent opens bookings', path: '/bookings' },
  { id: 'parent_settings', role: 'parent', title: 'Parent opens settings', path: '/settings' },
  { id: 'parent_family', role: 'parent', title: 'Parent opens family dashboard', path: '/family' },
  {
    id: 'parent_family_calendar',
    role: 'parent',
    title: 'Parent opens family calendar',
    path: '/family/calendar',
  },
  {
    id: 'parent_family_recurring',
    role: 'parent',
    title: 'Parent opens recurring plans',
    path: '/family/recurring',
    expectPath: '/family/recurring',
  },
  {
    id: 'parent_discover_sessions',
    role: 'parent',
    title: 'Parent opens discover sessions',
    path: '/discover-sessions',
  },
  { id: 'parent_favourites', role: 'parent', title: 'Parent opens favourites', path: '/favourites' },
  { id: 'parent_book_coach', role: 'parent', title: 'Parent opens find coach', path: '/book-coach' },
  {
    id: 'parent_progress',
    role: 'parent',
    title: 'Parent opens my progress',
    path: '/development/my-progress',
  },
  {
    id: 'parent_child_progress',
    role: 'parent',
    title: 'Parent opens child progress',
    path: '/development/child-progress/user1',
  },
  { id: 'parent_book_flow_start', role: 'parent', title: 'Parent opens book flow home', path: '/book/coach1' },
  {
    id: 'parent_book_flow_type',
    role: 'parent',
    title: 'Parent opens session-type step',
    path: '/book/coach1/session-type',
  },
  {
    id: 'parent_book_flow_schedule',
    role: 'parent',
    title: 'Parent opens schedule step',
    path: '/book/coach1/schedule',
  },
  {
    id: 'parent_book_flow_details',
    role: 'parent',
    title: 'Parent opens details step',
    path: '/book/coach1/details',
  },
  {
    id: 'parent_book_flow_review',
    role: 'parent',
    title: 'Parent opens review step',
    path: '/book/coach1/review',
  },
  {
    id: 'parent_book_flow_confirmation',
    role: 'parent',
    title: 'Parent opens confirmation step',
    path: '/book/coach1/confirmation',
  },
  {
    id: 'parent_child_medical',
    role: 'parent',
    title: 'Parent opens child medical profile',
    path: '/child/user1/medical',
    expectPath: '/child/user1/medical',
  },
  {
    id: 'parent_child_emergency',
    role: 'parent',
    title: 'Parent opens child emergency profile',
    path: '/child/user1/emergency',
    expectPath: '/child/user1/emergency',
  },

  // Athlete flows
  { id: 'athlete_home', role: 'athlete', title: 'Athlete opens dashboard', path: '/' },
  { id: 'athlete_feed', role: 'athlete', title: 'Athlete opens feed', path: '/feed' },
  { id: 'athlete_messages', role: 'athlete', title: 'Athlete opens messages', path: '/messages' },
  { id: 'athlete_bookings', role: 'athlete', title: 'Athlete opens bookings', path: '/bookings' },
  { id: 'athlete_settings', role: 'athlete', title: 'Athlete opens settings', path: '/settings' },
  {
    id: 'athlete_progress',
    role: 'athlete',
    title: 'Athlete opens my progress',
    path: '/development/my-progress',
  },
  {
    id: 'athlete_analytics',
    role: 'athlete',
    title: 'Athlete opens analytics view',
    path: '/analytics/user1',
  },
  {
    id: 'athlete_discover_sessions',
    role: 'athlete',
    title: 'Athlete opens discover sessions',
    path: '/discover-sessions',
  },
  { id: 'athlete_favourites', role: 'athlete', title: 'Athlete opens favourites', path: '/favourites' },
  { id: 'athlete_find_coach', role: 'athlete', title: 'Athlete opens find coach', path: '/book-coach' },
  { id: 'athlete_health', role: 'athlete', title: 'Athlete opens health dashboard', path: '/health' },
  {
    id: 'athlete_health_injuries',
    role: 'athlete',
    title: 'Athlete opens injury log',
    path: '/health/injuries',
    expectPath: '/health/injuries',
  },
  { id: 'athlete_chat_list', role: 'athlete', title: 'Athlete opens chat list', path: '/chat/index' },
];

const flowProfiles = {
  'coach-core': [
    'coach_home',
    'coach_schedule',
    'coach_athletes',
    'coach_bookings',
    'coach_progress',
    'coach_group_sessions',
    'coach_create_invite_entry',
    'coach_manage',
    'coach_manage_bookings',
    'coach_settings',
    'coach_raise_concern',
  ],
  'parent-core': [
    'parent_home',
    'parent_children',
    'parent_bookings',
    'parent_family',
    'parent_book_coach',
    'parent_progress',
    'parent_child_progress',
    'parent_book_flow_start',
    'parent_book_flow_schedule',
    'parent_settings',
    'parent_child_medical',
    'parent_child_emergency',
  ],
  'athlete-core': [
    'athlete_home',
    'athlete_bookings',
    'athlete_progress',
    'athlete_find_coach',
    'athlete_settings',
    'athlete_health',
    'athlete_health_injuries',
  ],
  'trust-core': [
    'coach_raise_concern',
    'parent_child_medical',
    'parent_child_emergency',
    'athlete_health',
    'athlete_health_injuries',
  ],
  'pre-api-core': [
    'coach_home',
    'coach_schedule',
    'coach_athletes',
    'coach_bookings',
    'coach_earnings',
    'coach_progress',
    'coach_group_sessions',
    'coach_create_invite_entry',
    'coach_manage',
    'coach_manage_bookings',
    'owner_dashboard',
    'owner_head_coach',
    'coach_settings',
    'coach_raise_concern',
    'parent_home',
    'parent_children',
    'parent_bookings',
    'parent_family',
    'parent_family_recurring',
    'parent_book_coach',
    'parent_progress',
    'parent_child_progress',
    'parent_book_flow_start',
    'parent_book_flow_schedule',
    'parent_settings',
    'parent_child_medical',
    'parent_child_emergency',
    'athlete_home',
    'athlete_bookings',
    'athlete_progress',
    'athlete_find_coach',
    'athlete_settings',
    'athlete_health',
    'athlete_health_injuries',
  ],
};

const flowById = new Map(flows.map((flow) => [flow.id, flow]));
const allowedProfiles = Object.keys(flowProfiles);

function flowFile(flow) {
  return `${flow.role}__${flow.id}.png`;
}

const allowedRoles = Object.keys(creds);

function parseList(value) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parseNonNegativeInt(value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${flagName} must be a non-negative integer.`);
  }
  return parsed;
}

function parsePositiveInt(value, flagName) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${flagName} must be a positive integer.`);
  }
  return parsed;
}

function ensureProfileFlowIdsAreValid() {
  for (const [profileName, ids] of Object.entries(flowProfiles)) {
    for (const id of ids) {
      if (!flowById.has(id)) {
        throw new Error(`Flow profile "${profileName}" references unknown flow id "${id}"`);
      }
    }
  }
}

function resolveProfileFlowIds(profileNames) {
  const profileFlowIds = new Set();
  for (const profileName of profileNames) {
    const ids = flowProfiles[profileName] ?? [];
    for (const id of ids) {
      profileFlowIds.add(id);
    }
  }
  return profileFlowIds;
}

function resolveProfileRoles(profileNames) {
  const roles = new Set();
  for (const flowId of resolveProfileFlowIds(profileNames)) {
    const flow = flowById.get(flowId);
    if (flow) {
      roles.add(flow.role);
    }
  }
  return Array.from(roles);
}

function selectFlowsForRun(allFlows, options) {
  let selected = allFlows.filter((flow) => options.roles.includes(flow.role));

  if (options.profiles.length === 0) {
    return selected;
  }

  const selectedFlowIds = resolveProfileFlowIds(options.profiles);
  selected = selected.filter((flow) => selectedFlowIds.has(flow.id));
  return selected;
}

function parseCliOptions(argv) {
  ensureProfileFlowIdsAreValid();
  const envFailOn = (process.env.UI_FLOW_FAIL_ON || 'high').toLowerCase();
  if (!failLevels.includes(envFailOn)) {
    throw new Error(
      `UI_FLOW_FAIL_ON must be one of: ${failLevels.join(', ')} (received "${envFailOn}")`,
    );
  }

  const options = {
    outDir: defaultOutDir,
    roles: [],
    chunkSize:
      process.env.UI_FLOW_CHUNK_SIZE !== undefined
        ? parseNonNegativeInt(process.env.UI_FLOW_CHUNK_SIZE, 'UI_FLOW_CHUNK_SIZE')
        : 0,
    chunkIndex:
      process.env.UI_FLOW_CHUNK_INDEX !== undefined
        ? parsePositiveInt(process.env.UI_FLOW_CHUNK_INDEX, 'UI_FLOW_CHUNK_INDEX')
        : null,
    retries:
      process.env.UI_FLOW_RETRIES !== undefined
        ? parseNonNegativeInt(process.env.UI_FLOW_RETRIES, 'UI_FLOW_RETRIES')
        : 1,
    headless: process.env.UI_FLOW_HEADED === '1' ? false : true,
    listOnly: false,
    helpOnly: false,
    failOn: envFailOn,
    pauseMs:
      process.env.UI_FLOW_PAUSE_MS !== undefined
        ? parseNonNegativeInt(process.env.UI_FLOW_PAUSE_MS, 'UI_FLOW_PAUSE_MS')
        : 900,
    skipPreflight: process.env.UI_FLOW_SKIP_PREFLIGHT === '1',
    preflightOnly: false,
    profiles: [],
    rolesExplicit: false,
  };

  if (process.env.UI_FLOW_ROLES) {
    options.roles.push(...parseList(process.env.UI_FLOW_ROLES));
    options.rolesExplicit = true;
  }
  if (process.env.UI_FLOW_PROFILES) {
    options.profiles.push(...parseList(process.env.UI_FLOW_PROFILES));
  }
  if (process.env.UI_FLOW_PROFILE) {
    options.profiles.push(process.env.UI_FLOW_PROFILE.trim().toLowerCase());
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.helpOnly = true;
      continue;
    }
    if (arg === '--list') {
      options.listOnly = true;
      continue;
    }
    if (arg === '--headed') {
      options.headless = false;
      continue;
    }
    if (arg === '--skip-preflight') {
      options.skipPreflight = true;
      continue;
    }
    if (arg === '--preflight-only') {
      options.preflightOnly = true;
      continue;
    }
    if (arg.startsWith('--roles=')) {
      options.roles.push(...parseList(arg.slice('--roles='.length)));
      options.rolesExplicit = true;
      continue;
    }
    if (arg.startsWith('--role=')) {
      options.roles.push(arg.slice('--role='.length).trim().toLowerCase());
      options.rolesExplicit = true;
      continue;
    }
    if (arg.startsWith('--profiles=')) {
      options.profiles.push(...parseList(arg.slice('--profiles='.length)));
      continue;
    }
    if (arg.startsWith('--profile=')) {
      options.profiles.push(arg.slice('--profile='.length).trim().toLowerCase());
      continue;
    }
    if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.slice('--out-dir='.length).trim();
      continue;
    }
    if (arg.startsWith('--chunk-size=')) {
      options.chunkSize = parseNonNegativeInt(arg.slice('--chunk-size='.length), '--chunk-size');
      continue;
    }
    if (arg.startsWith('--chunk-index=')) {
      options.chunkIndex = parsePositiveInt(arg.slice('--chunk-index='.length), '--chunk-index');
      continue;
    }
    if (arg.startsWith('--retries=')) {
      options.retries = parseNonNegativeInt(arg.slice('--retries='.length), '--retries');
      continue;
    }
    if (arg.startsWith('--pause-ms=')) {
      options.pauseMs = parseNonNegativeInt(arg.slice('--pause-ms='.length), '--pause-ms');
      continue;
    }
    if (arg.startsWith('--fail-on=')) {
      options.failOn = arg.slice('--fail-on='.length).trim().toLowerCase();
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  const uniqueRoles = Array.from(new Set(options.roles));
  const uniqueProfiles = Array.from(new Set(options.profiles));
  const invalidRole = uniqueRoles.find((role) => !allowedRoles.includes(role));
  if (invalidRole) {
    throw new Error(`Invalid role "${invalidRole}". Allowed roles: ${allowedRoles.join(', ')}`);
  }
  const invalidProfile = uniqueProfiles.find((profile) => !allowedProfiles.includes(profile));
  if (invalidProfile) {
    throw new Error(
      `Invalid profile "${invalidProfile}". Allowed profiles: ${allowedProfiles.join(', ')}`,
    );
  }
  if (!failLevels.includes(options.failOn)) {
    throw new Error(`--fail-on must be one of: ${failLevels.join(', ')}`);
  }
  if (options.preflightOnly && options.skipPreflight) {
    throw new Error('--preflight-only cannot be used with --skip-preflight');
  }

  const resolvedRoles =
    uniqueRoles.length > 0
      ? uniqueRoles
      : uniqueProfiles.length > 0 && !options.rolesExplicit
        ? resolveProfileRoles(uniqueProfiles)
        : [...allowedRoles];

  return {
    ...options,
    profiles: uniqueProfiles,
    roles: resolvedRoles.length > 0 ? resolvedRoles : [...allowedRoles],
  };
}

function usageText() {
  return [
    'UI flow checks (50+) options:',
    '',
    '  --help, -h                 Show help and exit',
    '  --list                     Show available roles/flow counts and exit',
    '  --roles=coach,parent       Run only specific roles',
    '  --role=coach               Add one role (repeatable)',
    `  --profiles=${allowedProfiles.join(',')}  Run named flow profile(s)`,
    '  --profile=coach-core       Add one named flow profile (repeatable)',
    '  --chunk-size=10            Split each role into chunks of N flows',
    '  --chunk-index=2            Run only chunk N (1-based) for selected role(s)',
    '  --retries=1                Retry login and flow navigation failures N times',
    '  --pause-ms=900             Wait between navigation/action steps in ms',
    '  --fail-on=high             Exit non-zero on: none | high | medium',
    '  --skip-preflight           Skip login/access preflight checks',
    '  --preflight-only           Run only login/access preflight checks',
    '  --out-dir=/tmp/path        Output directory for screenshots/reports',
    '  --headed                   Run browser headed (not headless)',
    '',
    'Environment overrides:',
    '  UI_BASE_URL                Base URL (default: http://localhost:8083)',
    '  UI_FLOW_OUT_DIR            Output directory',
    '  UI_FLOW_ROLES              Comma-separated roles',
    '  UI_FLOW_PROFILES           Comma-separated named profiles',
    '  UI_FLOW_PROFILE            Single named profile',
    '  UI_FLOW_CHUNK_SIZE         Chunk size',
    '  UI_FLOW_CHUNK_INDEX        Chunk index (1-based)',
    '  UI_FLOW_RETRIES            Retry count',
    '  UI_FLOW_PAUSE_MS           Pause duration',
    '  UI_FLOW_FAIL_ON            none | high | medium',
    '  UI_FLOW_SKIP_PREFLIGHT=1   Skip login/access preflight',
    '  UI_FLOW_HEADED=1           Headed mode',
  ].join('\n');
}

function splitIntoChunks(items, chunkSize) {
  if (chunkSize <= 0 || chunkSize >= items.length) {
    return [items];
  }

  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildTotals(results) {
  return {
    total: results.length,
    ok: results.filter((r) => r.status === 'ok').length,
    failed: results.filter((r) => r.status === 'failed').length,
    high: results.filter((r) => r.severity === 'high').length,
    medium: results.filter((r) => r.severity === 'medium').length,
    none: results.filter((r) => r.severity === 'none').length,
  };
}

function buildReport(results, meta = {}) {
  return {
    baseUrl,
    generatedAt: new Date().toISOString(),
    meta,
    totals: buildTotals(results),
    results,
  };
}

function shouldFailRun(totals, failOn) {
  if (failOn === 'none') {
    return { shouldFail: false, reason: '' };
  }
  if (failOn === 'high') {
    const shouldFail = totals.high > 0;
    return {
      shouldFail,
      reason: shouldFail ? `high severity findings detected (${totals.high})` : '',
    };
  }
  const mediumOrHigher = totals.high + totals.medium;
  const shouldFail = mediumOrHigher > 0;
  return {
    shouldFail,
    reason: shouldFail
      ? `medium-or-higher findings detected (high=${totals.high}, medium=${totals.medium})`
      : '',
  };
}

function buildMarkdown(report, title) {
  const markdownLines = [
    `# ${title}`,
    '',
    `- Base URL: ${report.baseUrl}`,
    `- Generated: ${report.generatedAt}`,
    `- Total flows: ${report.totals.total}`,
    `- Failed: ${report.totals.failed}`,
    `- High: ${report.totals.high}`,
    `- Medium: ${report.totals.medium}`,
  ];

  if (report.meta.roles?.length) {
    markdownLines.push(`- Roles: ${report.meta.roles.join(', ')}`);
  }
  if (report.meta.profiles?.length) {
    markdownLines.push(`- Profiles: ${report.meta.profiles.join(', ')}`);
  }
  if (report.meta.chunkSize) {
    markdownLines.push(`- Chunk size: ${report.meta.chunkSize}`);
  }
  if (report.meta.chunkIndex !== undefined && report.meta.chunkIndex !== null) {
    markdownLines.push(`- Chunk index: ${report.meta.chunkIndex}`);
  }
  if (report.meta.retries !== undefined) {
    markdownLines.push(`- Retries: ${report.meta.retries}`);
  }

  markdownLines.push('', '## High / Medium Findings', '');

  const findings = report.results.filter((r) => r.severity === 'high' || r.severity === 'medium');
  if (findings.length === 0) {
    markdownLines.push('- None');
  } else {
    for (const item of findings) {
      markdownLines.push(
        `- [${item.severity.toUpperCase()}] ${item.id} (${item.path}) :: ${item.issues.join(' | ')}`,
      );
    }
  }

  return `${markdownLines.join('\n')}\n`;
}

async function writeReportFiles(report, outDir, stem, title) {
  await fs.writeFile(path.join(outDir, `${stem}.json`), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(outDir, `${stem}.md`), buildMarkdown(report, title));
}

function buildPreflightMarkdown(results) {
  const lines = [
    '# UI Flow Access Preflight',
    '',
    `- Base URL: ${baseUrl}`,
    `- Generated: ${new Date().toISOString()}`,
    '',
    '## Results',
    '',
  ];

  for (const result of results) {
    lines.push(
      `- ${result.status === 'ok' ? 'PASS' : 'FAIL'} ${result.role} :: ${result.details.join(' | ')}`,
    );
  }

  return `${lines.join('\n')}\n`;
}

async function writePreflightFiles(outDir, results) {
  const payload = {
    baseUrl,
    generatedAt: new Date().toISOString(),
    results,
  };
  await fs.writeFile(path.join(outDir, 'preflight.json'), JSON.stringify(payload, null, 2));
  await fs.writeFile(path.join(outDir, 'preflight.md'), buildPreflightMarkdown(results));
}

async function writePartialReport(allResults, options) {
  const partial = buildReport(allResults, {
    roles: options.roles,
    profiles: options.profiles,
    chunkSize: options.chunkSize || undefined,
    chunkIndex: options.chunkIndex,
    retries: options.retries,
  });
  await fs.writeFile(path.join(options.outDir, 'report.partial.json'), JSON.stringify(partial, null, 2));
}

async function login(page, role) {
  const { username, password } = creds[role];
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1000);

  const usernameInput = page.getByPlaceholder('e.g. coach');
  const passwordInput = page.getByPlaceholder('••••••••');

  if (!(await usernameInput.isVisible().catch(() => false))) {
    return;
  }

  await usernameInput.fill(username);
  await passwordInput.fill(password);

  const loginButtonByRole = page.getByRole('button', { name: 'Log in', exact: true }).first();
  const loginButtonByText = page.getByText('Log in', { exact: true }).first();
  if (await loginButtonByRole.isVisible().catch(() => false)) {
    await loginButtonByRole.click();
  } else if (await loginButtonByText.isVisible().catch(() => false)) {
    await loginButtonByText.click();
  } else {
    await passwordInput.press('Enter');
  }

  await page.waitForFunction(
    () => {
      try {
        const localKeys = [
          'auth_user',
          '@auth_user',
          '@clubroom:auth_user',
          '@react-native-async-storage/auth_user',
        ];
        const hasAuthKey = localKeys.some((key) => Boolean(window.localStorage.getItem(key)));
        const loginFieldPresent = Boolean(document.querySelector('input[placeholder="e.g. coach"]'));
        return hasAuthKey || !loginFieldPresent;
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 45000 },
  );
  await page.waitForTimeout(1200);
}

async function verifyBaseUrlReachable() {
  const tryFetch = async (url) => {
    const response = await fetch(url, { method: 'GET' });
    return {
      ok: response.ok,
      detail: `base_url_http_${response.status}`,
      url,
    };
  };

  try {
    return await tryFetch(baseUrl);
  } catch (error) {
    // Some environments resolve localhost to an address the dev server is not bound to.
    // Auto-fallback to 127.0.0.1 for local runs so preflight remains stable.
    try {
      const url = new URL(baseUrl);
      if (url.hostname === 'localhost') {
        const fallbackUrl = `${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`;
        const fallback = await tryFetch(fallbackUrl);
        if (fallback.ok) {
          baseUrl = fallbackUrl;
          return {
            ok: true,
            detail: `${fallback.detail};base_url_fallback:${fallbackUrl}`,
            url: fallbackUrl,
          };
        }
      }
    } catch {
      // Ignore URL parse or fallback errors and return the original failure below.
    }

    return {
      ok: false,
      detail: `base_url_unreachable:${String(error)}`,
      url: baseUrl,
    };
  }
}

async function runAccessPreflight(browser, options) {
  const baseUrlStatus = await verifyBaseUrlReachable();
  const results = [];
  if (!baseUrlStatus.ok) {
    const failed = options.roles.map((role) => ({
      role,
      status: 'failed',
      details: [baseUrlStatus.detail],
    }));
    return failed;
  }

  for (const role of options.roles) {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();
    const details = [baseUrlStatus.detail];
    let status = 'ok';

    try {
      const loginAttempts = await loginWithRetry(page, role, options.retries);
      details.push(`login_attempts:${loginAttempts}`);

      const proofPath = preflightProofPathByRole[role] ?? '/';
      await page.goto(`${baseUrl}${proofPath}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(options.pauseMs);

      const loginVisible = await page
        .getByPlaceholder('e.g. coach')
        .isVisible()
        .catch(() => false);
      if (loginVisible) {
        throw new Error(`login_form_visible_after_navigation:${proofPath}`);
      }

      const currentPath = await page.evaluate(() => window.location.pathname);
      details.push(`proof_path:${proofPath}`);
      details.push(`current_path:${currentPath}`);

      const screenshotPath = path.join(options.outDir, `preflight.${role}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      details.push(`screenshot:${screenshotPath}`);
    } catch (error) {
      status = 'failed';
      details.push(`preflight_failed:${String(error)}`);
    } finally {
      await context.close();
    }

    results.push({
      role,
      status,
      details,
    });
  }

  return results;
}

async function loginWithRetry(page, role, retries) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      await login(page, role);
      return attempt;
    } catch (error) {
      lastError = error;
      if (attempt <= retries) {
        await page.waitForTimeout(800 * attempt);
      }
    }
  }
  throw lastError;
}

async function runAction(page, action, actionErrors) {
  try {
    if (action.type === 'clickButton') {
      await page.getByRole('button', { name: action.name }).first().click();
      await page.waitForTimeout(700);
      return;
    }

    if (action.type === 'clickAnyButton') {
      const names = Array.isArray(action.names) ? action.names : [];
      for (const name of names) {
        const locator = page.getByRole('button', { name }).first();
        if (await locator.isVisible().catch(() => false)) {
          await locator.click();
          await page.waitForTimeout(700);
          return;
        }
      }
      throw new Error(`No matching visible button found: ${names.join(' | ')}`);
    }

    if (action.type === 'clickText') {
      await page.getByText(action.text).first().click();
      await page.waitForTimeout(700);
      return;
    }

    if (action.type === 'assertButtonVisible') {
      const isVisible = await page
        .getByRole('button', { name: action.name })
        .first()
        .isVisible()
        .catch(() => false);
      if (!isVisible) {
        throw new Error(`Button not visible: ${action.name}`);
      }
      return;
    }

    if (action.type === 'assertTextVisible') {
      const isVisible = await page
        .getByText(action.text)
        .first()
        .isVisible()
        .catch(() => false);
      if (!isVisible) {
        throw new Error(`Text not visible: ${action.text}`);
      }
      return;
    }

    if (action.type === 'assertTextPresent') {
      const count = await page.getByText(action.text).count().catch(() => 0);
      if (count < 1) {
        throw new Error(`Text not present: ${action.text}`);
      }
      return;
    }

    if (action.type === 'wait') {
      await page.waitForTimeout(action.ms ?? 700);
      return;
    }
  } catch (error) {
    const message = `action_failed:${action.type}:${String(error)}`;
    if (action.required) {
      actionErrors.push(message);
    }
  }
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const html = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    const horizontalOverflow = Math.max(
      (html?.scrollWidth || 0) - viewportWidth,
      (body?.scrollWidth || 0) - viewportWidth,
      0,
    );

    // Native web hydration safety: nested button controls are invalid.
    const nestedButtons = document.querySelectorAll('button button').length;

    return {
      viewportWidth,
      horizontalOverflow: Math.round(horizontalOverflow),
      nestedButtons,
    };
  });
}

function classify(flowErrors, actionErrors, metrics) {
  const issues = [];
  let severity = 'none';

  if (actionErrors.length > 0) {
    issues.push(...actionErrors);
    severity = 'high';
  }

  if (flowErrors.length > 0) {
    issues.push(...flowErrors);
    if (severity !== 'high') severity = 'medium';
  }

  if (metrics.nestedButtons > 0) {
    issues.push(`ui:nested_buttons:${metrics.nestedButtons}`);
    if (severity !== 'high') severity = 'medium';
  }

  if (metrics.horizontalOverflow > 6) {
    issues.push(`ui:horizontal_overflow:${metrics.horizontalOverflow}px`);
    if (severity !== 'high') severity = 'medium';
  }

  return { severity, issues };
}

async function runFlowWithRetry(page, flow, options, currentFlowErrors) {
  const start = Date.now();
  let lastError = null;
  let lastIssues = [];

  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    currentFlowErrors.length = 0;
    const actionErrors = [];

    try {
      await page.goto(`${baseUrl}${flow.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(options.pauseMs);

      for (const action of flow.actions ?? []) {
        await runAction(page, action, actionErrors);
      }

      if (flow.expectPath) {
        const currentPath = await page.evaluate(() => window.location.pathname);
        if (!currentPath.startsWith(flow.expectPath)) {
          currentFlowErrors.push(
            `assert:path_expected:${flow.expectPath}:actual:${currentPath}`,
          );
        }
      }

      const metrics = await collectMetrics(page);
      const screenshotPath = path.join(options.outDir, flowFile(flow));
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const { severity, issues } = classify(currentFlowErrors, actionErrors, metrics);

      return {
        id: flow.id,
        role: flow.role,
        title: flow.title,
        path: flow.path,
        screenshot: screenshotPath,
        status: severity === 'high' ? 'failed' : 'ok',
        severity,
        issues,
        metrics,
        attempts: attempt,
        durationMs: Date.now() - start,
      };
    } catch (error) {
      lastError = error;
      lastIssues = [...currentFlowErrors, ...actionErrors, `navigation_failed:${String(error)}`];
      if (attempt <= options.retries) {
        // Short backoff to ride out transient bundling/network hiccups in local/CI.
        await page.waitForTimeout(1200 * attempt);
      }
    }
  }

  return {
    id: flow.id,
    role: flow.role,
    title: flow.title,
    path: flow.path,
    status: 'failed',
    severity: 'high',
    issues: lastIssues.length > 0 ? lastIssues : [`navigation_failed:${String(lastError)}`],
    attempts: options.retries + 1,
    durationMs: Date.now() - start,
  };
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  if (options.helpOnly) {
    console.log(usageText());
    return;
  }
  await fs.mkdir(options.outDir, { recursive: true });

  const selectedFlows = selectFlowsForRun(flows, options);
  const grouped = selectedFlows.reduce((acc, flow) => {
    if (!acc[flow.role]) acc[flow.role] = [];
    acc[flow.role].push(flow);
    return acc;
  }, {});

  if (options.listOnly) {
    const allFlowsByRole = flows.reduce((acc, flow) => {
      acc[flow.role] = (acc[flow.role] ?? 0) + 1;
      return acc;
    }, {});
    const byRole = Object.fromEntries(
      allowedRoles.map((role) => [role, grouped[role] ? grouped[role].length : 0]),
    );
    const selectedProfileFlowCounts = Object.fromEntries(
      allowedProfiles.map((profile) => [profile, flowProfiles[profile]?.length ?? 0]),
    );
    console.log(
      JSON.stringify(
        {
          baseUrl,
          availableRoles: allowedRoles,
          availableProfiles: allowedProfiles,
          selectedRoles: options.roles,
          selectedProfiles: options.profiles,
          totalFlows: flows.length,
          selectedFlowCount: selectedFlows.length,
          allFlowsByRole,
          selectedFlowsByRole: byRole,
          profileFlowCounts: selectedProfileFlowCounts,
        },
        null,
        2,
      ),
    );
    return;
  }

  if (selectedFlows.length === 0) {
    throw new Error(
      `No flows selected for roles=${options.roles.join(',')} profiles=${options.profiles.join(',') || 'none'}`,
    );
  }

  await ensurePlaywrightLoaded();
  const browser = await chromium.launch({ headless: options.headless });
  const allResults = [];
  const roleSummaries = [];

  try {
    if (!options.skipPreflight) {
      console.log(
        JSON.stringify(
          {
            stage: 'preflight:start',
            baseUrl,
            roles: options.roles,
            profiles: options.profiles,
          },
          null,
          2,
        ),
      );

      const preflightResults = await runAccessPreflight(browser, options);
      await writePreflightFiles(options.outDir, preflightResults);
      const failedPreflight = preflightResults.filter((result) => result.status !== 'ok');

      console.log(
        JSON.stringify(
          {
            stage: 'preflight:done',
            outDir: options.outDir,
            results: preflightResults,
            failed: failedPreflight.length,
          },
          null,
          2,
        ),
      );

      if (failedPreflight.length > 0) {
        process.exitCode = 1;
        return;
      }

      if (options.preflightOnly) {
        return;
      }
    }

    for (const role of options.roles) {
      const roleFlows = grouped[role] ?? [];
      const chunks = splitIntoChunks(roleFlows, options.chunkSize);

      if (options.chunkIndex !== null && options.chunkIndex > chunks.length) {
        roleSummaries.push({
          role,
          skipped: true,
          reason: `chunk_index_out_of_range (${options.chunkIndex} > ${chunks.length})`,
        });
        continue;
      }

      const chunkIndices =
        options.chunkIndex === null ? chunks.map((_, index) => index) : [options.chunkIndex - 1];

      const roleResults = [];

      for (const chunkIdx of chunkIndices) {
        const chunkFlows = chunks[chunkIdx] ?? [];
        if (chunkFlows.length === 0) continue;

        const context = await browser.newContext({ ...devices['iPhone 13'] });
        const page = await context.newPage();
        let currentFlowErrors = [];

        console.log(
          JSON.stringify(
            {
              stage: 'role:start',
              role,
              chunk: chunkIdx + 1,
              chunks: chunks.length,
              flowCount: chunkFlows.length,
            },
            null,
            2,
          ),
        );

        page.on('console', (msg) => {
          if (msg.type() === 'error') currentFlowErrors.push(`console:${msg.text()}`);
        });
        page.on('pageerror', (err) => currentFlowErrors.push(`pageerror:${err.message}`));

        let loginError = null;
        let loginAttempts = 0;
        try {
          loginAttempts = await loginWithRetry(page, role, options.retries);
        } catch (error) {
          loginError = error;
        }

        const chunkResults = [];

        if (loginError) {
          for (const flow of chunkFlows) {
            const failed = {
              id: flow.id,
              role: flow.role,
              title: flow.title,
              path: flow.path,
              status: 'failed',
              severity: 'high',
              issues: [`login_failed:${String(loginError)}`],
              attempts: loginAttempts || options.retries + 1,
              durationMs: 0,
            };
            chunkResults.push(failed);
            roleResults.push(failed);
            allResults.push(failed);
          }
        } else {
          for (const flow of chunkFlows) {
            console.log(
              JSON.stringify(
                {
                  stage: 'flow:start',
                  role,
                  id: flow.id,
                  path: flow.path,
                },
                null,
                2,
              ),
            );
            const result = await runFlowWithRetry(page, flow, options, currentFlowErrors);
            chunkResults.push(result);
            roleResults.push(result);
            allResults.push(result);
            await writePartialReport(allResults, options);

            console.log(
              JSON.stringify(
                {
                  stage: 'flow:done',
                  role,
                  id: flow.id,
                  status: result.status,
                  severity: result.severity,
                  issues: result.issues ?? [],
                },
                null,
                2,
              ),
            );
          }
        }

        await context.close();

        const chunkLabel = `chunk-${chunkIdx + 1}-of-${chunks.length}`;
        const chunkReport = buildReport(chunkResults, {
          roles: [role],
          profiles: options.profiles,
          role,
          chunkIndex: chunkIdx + 1,
          chunkSize: options.chunkSize || roleFlows.length,
          retries: options.retries,
          pauseMs: options.pauseMs,
        });
        await writeReportFiles(
          chunkReport,
          options.outDir,
          `report.${role}.${chunkLabel}`,
          `UI Flow Check Report (${role}, ${chunkLabel})`,
        );
      }

      const roleReport = buildReport(roleResults, {
        roles: [role],
        profiles: options.profiles,
        role,
        chunkSize: options.chunkSize || roleFlows.length,
        chunkIndex: options.chunkIndex,
        retries: options.retries,
        pauseMs: options.pauseMs,
      });
      await writeReportFiles(roleReport, options.outDir, `report.${role}`, `UI Flow Check Report (${role})`);

      roleSummaries.push({
        role,
        totals: roleReport.totals,
      });
    }
  } finally {
    await browser.close();
  }

  const report = buildReport(allResults, {
    roles: options.roles,
    profiles: options.profiles,
    chunkSize: options.chunkSize || undefined,
    chunkIndex: options.chunkIndex,
    retries: options.retries,
    pauseMs: options.pauseMs,
    failOn: options.failOn,
    outDir: options.outDir,
  });

  await writeReportFiles(report, options.outDir, 'report', 'UI Flow Check Report (50+)');
  const failDecision = shouldFailRun(report.totals, options.failOn);
  console.log(
    JSON.stringify(
      {
        totals: report.totals,
        roles: roleSummaries,
        failOn: options.failOn,
        shouldFail: failDecision.shouldFail,
        failReason: failDecision.reason || undefined,
        outDir: options.outDir,
      },
      null,
      2,
    ),
  );
  if (failDecision.shouldFail) {
    process.exitCode = 1;
  }
}

await main();
