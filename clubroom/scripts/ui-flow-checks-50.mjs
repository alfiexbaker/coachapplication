import fs from 'node:fs/promises';
import path from 'node:path';

let baseUrl = process.env.UI_BASE_URL || 'http://localhost:8083';
const defaultOutDir = process.env.UI_FLOW_OUT_DIR || '/tmp/ui-flow-checks-50';
const failLevels = ['none', 'high', 'medium'];
const authSettleTimeoutMs = 15000;
const authPollMs = 250;
let chromium = null;
let devices = null;
const apiSeed = {
  coachUserId: 'usr_65972cc3-8f9b-7199-b867-7df5b7faf34b',
  clubId: 'clb_4ee614a0-62ee-73ff-9328-0f74a326c2c1',
  squadId: 'sqd_9640510a-e7cb-7575-a2a7-649ac28b5ee2',
  athleteId: 'ath_7df7ec13-e136-7525-985f-dec069fc983f',
  familyId: 'fam_81784aed-ccd2-75f1-bf87-0c820aefcc89',
  familySecondAthleteId: 'ath_d0cc3175-cbe3-7971-9cd1-5ce9d52cda7a',
  postId: 'pst_5163fa19-773d-7a2c-9c52-954f178706ec',
  bookingId: 'bok_af55c625-92ff-4063-b135-41a9f309d326',
  completedBookingId: 'bok_48cc7cd5-098c-7e0d-833d-26cddbdf3abe',
};
const preflightProofPathByRole = {
  coach: '/schedule',
  parent: '/family',
  guardian: '/family',
  athlete: '/development/my-progress',
  admin: `/club/${apiSeed.clubId}/dashboard`,
};
const credentialsFile =
  process.env.UI_FLOW_CREDENTIALS_FILE ||
  path.join(process.cwd(), 'docs/backend-api/test-data/TEST_ACCOUNTS.staging.local.txt');
const loginIdentityPlaceholder = /(?:e\.g\. coach|enter your account email)/i;
let creds = null;

async function loadFlowCredentials() {
  let stat;
  let content;
  try {
    [stat, content] = await Promise.all([
      fs.stat(credentialsFile),
      fs.readFile(credentialsFile, 'utf8'),
    ]);
  } catch (error) {
    throw new Error(
      `UI flow credentials are unavailable at ${credentialsFile}. Run the staging test-account reset first. ${String(error)}`,
    );
  }

  if ((stat.mode & 0o077) !== 0) {
    throw new Error(`UI flow credentials must be owner-only (0600): ${credentialsFile}`);
  }

  const accounts = content
    .split(/\n\s*\n/)
    .map((block) => ({
      email: /^Email:\s*(.+)$/m.exec(block)?.[1]?.trim(),
      password: /^Password:\s*(.+)$/m.exec(block)?.[1],
      roles: /^Roles:\s*(.+)$/m
        .exec(block)?.[1]
        ?.split(',')
        .map((role) => role.trim()),
      attached: /^Attached:\s*(.+)$/m.exec(block)?.[1] ?? '',
    }))
    .filter((account) => account.email && account.password);

  const requireAccount = (label, predicate) => {
    const account = accounts.find(predicate);
    if (!account) {
      throw new Error(`Missing ${label} account relationship in ${credentialsFile}`);
    }
    return { username: account.email, password: account.password };
  };

  return {
    coach: requireAccount(
      'coach',
      (account) =>
        account.roles?.includes('coach') &&
        account.attached.includes('coachProfile=yes') &&
        account.attached.includes(`clubs=${apiSeed.clubId}:coach`),
    ),
    parent: requireAccount(
      'family administrator',
      (account) =>
        account.roles?.includes('parent') &&
        account.attached.includes(`families=${apiSeed.familyId}`) &&
        account.attached.includes(apiSeed.athleteId) &&
        account.attached.includes(apiSeed.familySecondAthleteId),
    ),
    guardian: requireAccount(
      'assigned guardian',
      (account) =>
        account.roles?.includes('parent') &&
        account.attached.includes(`families=${apiSeed.familyId}`) &&
        account.attached.includes(apiSeed.athleteId) &&
        !account.attached.includes(apiSeed.familySecondAthleteId),
    ),
    athlete: requireAccount(
      'athlete',
      (account) =>
        account.roles?.includes('athlete') &&
        account.attached.includes(`athlete=${apiSeed.athleteId}`),
    ),
    admin: requireAccount(
      'club admin',
      (account) =>
        account.roles?.includes('club_admin') &&
        account.attached.includes(`clubs=${apiSeed.clubId}:club_admin`),
    ),
  };
}

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
const verificationFlowRoutes = [
  { id: 'hub', path: '/verification', title: 'verification status' },
  { id: 'identity', path: '/verification/id', title: 'identity verification' },
  { id: 'background', path: '/verification/background', title: 'background verification' },
  { id: 'insurance', path: '/verification/insurance', title: 'insurance verification' },
  { id: 'credentials', path: '/verification/credentials', title: 'credential verification' },
];
const verificationCoachActions = {
  hub: [
    { type: 'assertTextVisible', text: 'Profile status', required: true },
    { type: 'assertTextVisible', text: 'Documents', required: true },
  ],
  identity: [
    { type: 'clickText', text: 'Passport', required: true },
    { type: 'assertButtonVisible', name: 'Choose document', required: true },
    {
      type: 'assertVerticalGap',
      above: { role: 'button', name: 'Choose document' },
      below: { text: 'Requirements' },
      minimumGap: 16,
      required: true,
    },
  ],
  background: [{ type: 'assertTextVisible', text: 'DBS verified', required: true }],
  insurance: [
    { type: 'assertButtonVisible', name: 'Choose document', required: true },
    { type: 'assertButtonVisible', name: 'Submit for review', required: true },
  ],
  credentials: [
    { type: 'clickButton', name: 'Add credential', required: true },
    { type: 'assertTextVisible', text: 'Credential type', required: true },
    { type: 'clickText', text: 'Other qualification', required: true },
    { type: 'assertTextVisible', text: 'Qualification name', required: true },
    { type: 'assertButtonVisible', name: 'Choose document', required: true },
  ],
};
const verificationCoachFlows = verificationFlowRoutes.map((route) => ({
  id: `coach_verification_${route.id}`,
  role: 'coach',
  title: `Coach opens ${route.title}`,
  path: route.path,
  expectPath: route.path,
  actions: verificationCoachActions[route.id] ?? [],
}));
const verificationDeniedFlows = ['parent', 'athlete', 'admin'].flatMap((role) =>
  verificationFlowRoutes.map((route) => ({
    id: `${role}_verification_${route.id}_denied`,
    role,
    title: `${role} is denied ${route.title}`,
    path: route.path,
    expectPathNot: '/verification',
  })),
);

const addChildDetailsActions = [
  { type: 'wait', ms: 1200, required: true },
  { type: 'fillInput', name: 'First name', value: 'Alex', required: true },
  { type: 'fillInput', name: 'Last name', value: 'Morgan', required: true },
  { type: 'clickControl', role: 'radio', name: 'Male', required: true },
  { type: 'clickControl', role: 'radio', name: 'Son', required: true },
];

const addChildSupportActions = [
  ...addChildDetailsActions,
  { type: 'clickButton', name: 'Continue', required: true },
  { type: 'assertTextVisible', text: 'Support needs', required: true },
];

const addChildSafetyActions = [
  ...addChildSupportActions,
  {
    type: 'clickControl',
    role: 'radio',
    name: 'No coaching adjustments are needed',
    required: true,
  },
  { type: 'clickButton', name: 'Continue', required: true },
  { type: 'assertTextVisible', text: 'Safety', required: true },
];

const settingsRouteFlows = [
  {
    id: 'account',
    path: '/settings/account',
    title: 'account settings',
    heading: 'Account',
    content: 'Contact',
    visible: [
      'Email',
      'Phone',
      'Security',
      'Send password reset link',
      'Support',
      'Support ref',
      'Account access',
      'Request account pause',
      'Request account closure',
    ],
    absent: [
      'Email Address',
      'Phone Number',
      'Change Password',
      'Contact details vs verification',
      'Account Information',
      'Account Type',
      'Member since',
      'Danger Zone',
    ],
  },
  {
    id: 'blocked_users',
    path: '/settings/blocked-users',
    title: 'blocked users',
    heading: 'Blocked Users',
    content: 'No blocked accounts',
    visible: ['People you block cannot message you or appear in search.'],
  },
  {
    id: 'calendar_sync',
    path: '/settings/calendar-sync',
    title: 'calendar export',
    heading: 'Calendar Export',
    content: 'Calendar File',
    absent: [
      'Sync Settings',
      'Enable Calendar Sync',
      'Auto-Sync New Bookings',
      'Calendar Provider',
    ],
  },
  {
    id: 'coaching',
    path: '/settings/coaching',
    title: 'coaching settings',
    heading: 'Coaching Settings',
    content: 'BOOKING RULES',
    visible: [
      'Session buffer',
      'Minimum notice',
      'Booking window',
      'Same-day bookings',
      'MANAGE',
      'Cancellation policy',
      'Travel radius',
      'Blocked dates',
    ],
    absent: [
      'Buffer between sessions',
      'Time between back-to-back sessions',
      'How far in advance parents must book',
      'Max advance booking',
      'How far ahead parents can book',
      'Allow same-day bookings',
      'Let parents book sessions today',
      'CANCELLATION POLICY',
      'TRAVEL & LOCATION',
    ],
  },
  {
    id: 'help',
    path: '/settings/help',
    title: 'help',
    heading: 'Help & Support',
    content: 'Email support',
    visible: ['Send feedback', 'Common questions', 'How do I book a session?'],
    absent: [
      'Report a Problem',
      'Share Clubroom',
      'Still need help?',
      'Support is handled by email in this build.',
      'App Version: 1.0.0',
    ],
    actions: [
      { type: 'clickButton', name: 'Send feedback', required: true },
      { type: 'assertTextVisible', text: 'Choose what you want to send.', required: true },
      { type: 'clickButton', name: 'Cancel', exact: true, required: true },
      { type: 'assertTextAbsent', text: 'Choose what you want to send.', required: true },
      { type: 'clickButton', name: 'How do I book a session?', required: true },
      {
        type: 'assertTextVisible',
        text: 'Parents and athletes can open Bookings, choose Discover, then select a coach or open session.',
        required: true,
      },
      { type: 'clickButton', name: 'How do I book a session?', required: true },
      {
        type: 'assertTextAbsent',
        text: 'Parents and athletes can open Bookings, choose Discover, then select a coach or open session.',
        required: true,
      },
      { type: 'clickButton', name: 'How do I book a session?', required: true },
      {
        type: 'assertTextVisible',
        text: 'Parents and athletes can open Bookings, choose Discover, then select a coach or open session.',
        required: true,
      },
    ],
  },
  {
    id: 'notifications',
    path: '/settings/notifications',
    title: 'notification settings',
    heading: 'Notifications',
    content: 'NOTIFICATION CHANNELS',
  },
  {
    id: 'notification_preferences',
    path: '/settings/notifications/preferences',
    title: 'notification preferences',
    heading: 'Notifications',
    content: 'NOTIFICATION CHANNELS',
  },
  {
    id: 'privacy_policy',
    path: '/settings/privacy-policy',
    title: 'privacy policy',
    heading: 'Privacy Policy',
    content: '1. Introduction',
  },
  {
    id: 'privacy',
    path: '/settings/privacy',
    title: 'privacy settings',
    heading: 'Privacy',
    content: 'Profile Visibility',
    absent: [
      'Online Status',
      'Activity Status',
      'Show Earnings',
      'Show Client Count',
      'Share Analytics',
      'Personalized Ads',
      'Share with Partners',
      'Cookie & Tracking',
    ],
  },
  {
    id: 'terms',
    path: '/settings/terms',
    title: 'terms',
    heading: 'Terms',
    content: '1. Acceptance of Terms',
  },
  {
    id: 'travel_radius',
    path: '/settings/travel-radius',
    title: 'travel radius',
    heading: 'Travel Radius',
    content: 'Base postcode',
    visible: ['Search radius', 'Session formats', 'In-person sessions', 'Remote sessions'],
    absent: [
      'Your Location',
      'Suggested range',
      'local grassroots coverage',
      'Accept travel sessions',
      'Accept remote sessions',
    ],
  },
].map((route) => ({
  id: `coach_settings_${route.id}`,
  role: 'coach',
  title: `Coach opens ${route.title}`,
  path: route.path,
  expectPath: route.path,
  actions: [
    ...[route.heading, route.content, ...(route.visible ?? [])].map((text) => ({
      type: 'assertTextVisible',
      text,
      required: true,
    })),
    {
      type: 'assertTargetInViewport',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    {
      type: 'assertTargetInViewport',
      text: route.heading,
      required: true,
    },
    ...(route.absent ?? []).map((text) => ({
      type: 'assertTextAbsent',
      text,
      required: true,
    })),
    { type: 'assertScrollTop', required: true },
    ...(route.actions ?? []),
    ...((route.actions?.length ?? 0) > 0
      ? [
          { type: 'scrollToTop', required: true },
          { type: 'assertScrollTop', required: true },
        ]
      : []),
  ],
}));

const travelRadiusSaveFailureFlow = {
  id: 'coach_settings_travel_radius_save_failure',
  role: 'coach',
  title: 'Coach sees a failed travel radius save roll back',
  path: '/settings/travel-radius',
  expectPath: '/settings/travel-radius',
  expectedErrors: [
    'response:503:PATCH:http://localhost:4000/v1/coaches/me/travel-settings',
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  actions: [
    { type: 'assertTextVisible', text: '10 mi', required: true },
    {
      type: 'mockApiError',
      path: '/v1/coaches/me/travel-settings',
      method: 'PATCH',
      status: 503,
      message: 'Travel settings were not saved.',
      required: true,
    },
    {
      type: 'clickControl',
      role: 'button',
      name: 'Increase in-person radius',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Travel settings were not saved.', required: true },
    { type: 'assertTextVisible', text: '10 mi', required: true },
    { type: 'assertTextAbsent', text: '11 mi', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const coachingSettingsSaveFailureFlow = {
  id: 'coach_settings_coaching_save_failure',
  role: 'coach',
  title: 'Coach sees failed booking-rule changes roll back',
  path: '/settings/coaching',
  expectPath: '/settings/coaching',
  expectedErrors: [
    'response:503:PATCH:http://localhost:4000/v1/coaches/me/scheduling-rules',
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  actions: [
    { type: 'assertTextVisible', text: '15 min', required: true },
    {
      type: 'mockApiError',
      path: '/v1/coaches/me/scheduling-rules',
      method: 'PATCH',
      status: 503,
      message: 'Service unavailable.',
      required: true,
    },
    {
      type: 'clickControl',
      role: 'button',
      name: 'Increase Session buffer',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Not saved. Previous settings restored.', required: true },
    { type: 'assertTextVisible', text: '15 min', required: true },
    { type: 'assertTextAbsent', text: '20 min', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const accountSettingsInteractionsFlow = {
  id: 'coach_settings_account_interactions',
  role: 'coach',
  title: 'Coach exercises truthful account controls',
  path: '/settings/account',
  expectPath: '/settings/account',
  expectedErrors: [
    'response:503:PATCH:http://localhost:4000/v1/auth/me',
    'response:503:POST:http://localhost:4000/v1/me/data-deletion-requests',
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  actions: [
    { type: 'assertTextVisible', text: 'Contact', required: true },
    { type: 'assertTextAbsent', text: 'Contact details vs verification', required: true },
    { type: 'clickControl', role: 'button', name: 'Phone', required: true },
    { type: 'fillInput', name: 'Phone number', value: '+44 7700 900123', required: true },
    {
      type: 'mockApiError',
      path: '/v1/auth/me',
      method: 'PATCH',
      status: 503,
      message: 'Phone number was not saved.',
      required: true,
    },
    { type: 'clickButton', name: 'Save phone number', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Phone number was not saved.', required: true },
    { type: 'assertButtonVisible', name: 'Save phone number', required: true },
    { type: 'clickButton', name: 'Cancel phone edit', exact: true, required: true },
    {
      type: 'mockApiResponse',
      path: '/v1/auth/forgot-password',
      method: 'POST',
      status: 204,
      required: true,
    },
    { type: 'clickButton', name: 'Send password reset link', required: true },
    { type: 'assertTextVisible', text: 'Password reset link sent.', required: true },
    { type: 'clickButton', name: 'Request account pause', required: true },
    { type: 'assertTextVisible', text: 'Request Account Pause', required: true },
    { type: 'clickButton', name: 'Cancel', exact: true, required: true },
    { type: 'assertTextAbsent', text: 'Request Account Pause', required: true },
    { type: 'clickButton', name: 'Request account closure', required: true },
    { type: 'assertTextVisible', text: 'Request Account Closure', required: true },
    { type: 'clickButton', name: 'Cancel', exact: true, required: true },
    { type: 'assertTextAbsent', text: 'Request Account Closure', required: true },
    {
      type: 'mockApiError',
      path: '/v1/me/data-deletion-requests',
      method: 'POST',
      status: 503,
      message: 'Account closure request was not created.',
      required: true,
    },
    { type: 'clickButton', name: 'Request account closure', required: true },
    { type: 'clickButton', name: 'Create request', exact: true, required: true },
    {
      type: 'assertTextVisible',
      text: 'Account closure request was not created.',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Status unavailable. Try again.', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const blockedUsersListFixture = {
  blocks: [],
  blockedUserIds: ['usr_blocked_ui_fixture'],
  blockedUsers: [
    {
      id: 'usr_blocked_ui_fixture',
      name: 'Jordan Reed',
      blockedAt: '2026-07-30T10:00:00.000Z',
    },
  ],
  total: 1,
  status: null,
  seedVersion: null,
  requestId: 'req_blocked_ui_fixture',
};

const blockedUsersReadyFlow = {
  id: 'coach_settings_blocked_users_ready',
  role: 'coach',
  title: 'Coach reviews a blocked account',
  path: '/settings/blocked-users',
  expectPath: '/settings/blocked-users',
  setupActions: [
    {
      type: 'mockApiResponse',
      path: '/v1/blocks',
      method: 'GET',
      status: 200,
      body: blockedUsersListFixture,
      required: true,
    },
  ],
  actions: [
    { type: 'assertTextVisible', text: 'Jordan Reed', required: true },
    { type: 'assertTextVisible', text: 'Blocked 30 Jul 2026', required: true },
    { type: 'assertTextAbsent', text: 'usr_blocked_ui_fixture', required: true },
    { type: 'assertButtonVisible', name: 'Unblock Jordan Reed', required: true },
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
  ],
};

const blockedUsersInteractionsFlow = {
  id: 'coach_settings_blocked_users_interactions',
  role: 'coach',
  title: 'Coach reviews and unblocks an account safely',
  path: '/settings/blocked-users',
  expectPath: '/settings/blocked-users',
  expectedErrors: [
    'response:503:DELETE:http://localhost:4000/v1/blocks?…',
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  setupActions: [
    {
      type: 'mockApiResponse',
      path: '/v1/blocks',
      method: 'GET',
      status: 200,
      body: blockedUsersListFixture,
      required: true,
    },
  ],
  actions: [
    { type: 'assertTextVisible', text: 'Jordan Reed', required: true },
    { type: 'assertTextVisible', text: 'Blocked 30 Jul 2026', required: true },
    { type: 'assertTextAbsent', text: 'usr_blocked_ui_fixture', required: true },
    { type: 'clickButton', name: 'Unblock Jordan Reed', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Unblock account?', required: true },
    { type: 'clickButton', name: 'Keep blocked', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Jordan Reed', required: true },
    {
      type: 'mockApiError',
      path: '/v1/blocks?*',
      method: 'DELETE',
      status: 503,
      message: 'Account was not unblocked.',
      required: true,
    },
    { type: 'clickButton', name: 'Unblock Jordan Reed', exact: true, required: true },
    { type: 'clickButton', name: 'Unblock', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Account was not unblocked.', required: true },
    { type: 'assertButtonVisible', name: 'Unblock Jordan Reed', required: true },
    {
      type: 'mockApiResponse',
      path: '/v1/blocks',
      method: 'GET',
      status: 200,
      body: {
        blocks: [],
        blockedUserIds: [],
        blockedUsers: [],
        total: 0,
        status: null,
        seedVersion: null,
        requestId: 'req_unblocked_ui_fixture',
      },
      required: true,
    },
    {
      type: 'mockApiResponse',
      path: '/v1/blocks?*',
      method: 'DELETE',
      status: 200,
      body: {
        status: {
          relationship: 'none',
          blocked: false,
          blockerId: null,
          blockedId: null,
        },
        requestId: 'req_unblock_success_ui_fixture',
      },
      required: true,
    },
    { type: 'clickButton', name: 'Unblock Jordan Reed', exact: true, required: true },
    { type: 'clickButton', name: 'Unblock', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Account unblocked.', required: true },
    { type: 'assertTextVisible', text: 'No blocked accounts', required: true },
    { type: 'assertTextAbsent', text: 'Jordan Reed', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const clubPostReadyFlow = {
  id: 'coach_create_club_post_ready',
  role: 'coach',
  title: 'Coach sees the clean club update composer',
  path: `/create-club-post?clubId=${apiSeed.clubId}`,
  expectPath: '/create-club-post',
  actions: [
    { type: 'assertTextVisible', text: 'New club update', required: true },
    { type: 'assertTextVisible', text: 'All members', required: true },
    { type: 'assertTextVisible', text: 'Author', required: true },
    { type: 'assertTextVisible', text: 'Type', required: true },
    { type: 'assertTextAbsent', text: 'Distribution', required: true },
    { type: 'assertTextAbsent', text: 'Personal Feed', required: true },
    { type: 'assertTextAbsent', text: 'Specific Group', required: true },
    { type: 'assertTextAbsent', text: 'Photo', required: true },
    { type: 'assertTextAbsent', text: 'Video', required: true },
    { type: 'assertTextAbsent', text: 'Event', required: true },
    { type: 'assertButtonVisible', name: 'Close club update', required: true },
    { type: 'assertButtonVisible', name: 'Publish update', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const clubPostComposerFlow = {
  id: 'coach_create_club_post_interactions',
  role: 'coach',
  title: 'Coach composes a truthful club-wide update',
  path: `/create-club-post?clubId=${apiSeed.clubId}`,
  expectPath: '/create-club-post',
  expectedErrors: [
    'response:503:POST:http://localhost:4000/v1/posts',
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  actions: [
    { type: 'assertTextVisible', text: 'New club update', required: true },
    { type: 'assertTextVisible', text: 'All members', required: true },
    { type: 'assertTextVisible', text: 'Author', required: true },
    { type: 'assertTextVisible', text: 'Type', required: true },
    { type: 'assertTextAbsent', text: 'Distribution', required: true },
    { type: 'assertTextAbsent', text: 'Personal Feed', required: true },
    { type: 'assertTextAbsent', text: 'Specific Group', required: true },
    { type: 'assertTextAbsent', text: 'Photo', required: true },
    { type: 'assertTextAbsent', text: 'Video', required: true },
    { type: 'assertTextAbsent', text: 'Event', required: true },
    { type: 'clickControl', role: 'radio', name: 'Post as you', required: true },
    { type: 'clickControl', role: 'radio', name: 'Announcement post', required: true },
    { type: 'fillInput', name: 'Headline', value: 'Saturday fixtures', required: true },
    {
      type: 'fillInput',
      name: 'Update text',
      value: 'Meet at the clubhouse at 09:00.',
      required: true,
    },
    { type: 'assertButtonVisible', name: 'Publish update', required: true },
    {
      type: 'mockApiError',
      path: '/v1/posts',
      method: 'POST',
      status: 503,
      message: 'Club update was not saved.',
      required: true,
    },
    { type: 'clickButton', name: 'Publish update', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Club update was not saved.', required: true },
    { type: 'assertButtonVisible', name: 'Publish update', required: true },
  ],
};

const clubPostDeniedFlows = ['parent', 'athlete'].map((role) => ({
  id: `${role}_create_club_post_denied`,
  role,
  title: `${role} is denied the club update composer`,
  path: `/create-club-post?clubId=${apiSeed.clubId}`,
  expectPath: '/create-club-post',
  actions: [
    { type: 'assertTextVisible', text: 'Club update unavailable', required: true },
    {
      type: 'assertTextVisible',
      text: 'You do not have permission to publish updates for this club.',
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Write an update', required: true },
  ],
}));

const postDetailReadyFlows = ['coach', 'parent', 'guardian', 'admin'].map((role) => ({
  id: `${role}_post_detail_ready`,
  role,
  title: `${role} opens an accessible club update`,
  path: `/post-detail?postId=${apiSeed.postId}`,
  expectPath: '/post-detail',
  actions: [
    { type: 'assertTextVisible', text: 'Update', required: true },
    {
      type: 'assertTextVisible',
      text: 'Weekly training highlights and reminders for families.',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Comments', required: true },
    { type: 'assertTextVisible', text: 'Olivia Barton', required: true },
    { type: 'assertTextVisible', text: 'James Barton', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    {
      type: 'assertButtonVisible',
      name: role === 'coach' ? 'Unlike post' : 'Like post',
      required: true,
    },
    { type: 'assertButtonVisible', name: 'Like comment', required: true },
    { type: 'assertButtonVisible', name: 'Reply to comment', required: true },
    { type: 'assertButtonVisible', name: 'Send comment', required: true },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: role === 'coach' ? 'Unlike post' : 'Like post',
      required: true,
    },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Like comment',
      required: true,
    },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Reply to comment',
      required: true,
    },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Send comment',
      required: true,
    },
    { type: 'assertTextAbsent', text: '0/2000', required: true },
    { type: 'assertTextAbsent', text: 'Comments (2)', required: true },
    { type: 'assertTextAbsent', text: 'Be the first to comment on this post.', required: true },
    ...(role === 'parent'
      ? [{ type: 'assertButtonVisible', name: 'Delete comment by Olivia Barton', required: true }]
      : role === 'guardian'
        ? [{ type: 'assertButtonVisible', name: 'Delete comment by James Barton', required: true }]
        : [{ type: 'assertTextAbsent', text: 'Delete', required: true }]),
    { type: 'scrollToTop', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
  ],
}));

const postDetailDeniedFlow = {
  id: 'athlete_post_detail_denied',
  role: 'athlete',
  title: 'Athlete without club membership is denied the club update',
  path: `/post-detail?postId=${apiSeed.postId}`,
  expectPath: '/post-detail',
  expectedErrors: [
    `response:404:GET:http://localhost:4000/v1/posts/${apiSeed.postId}`,
    'console:Failed to load resource: the server responded with a status of 404 (Not Found)',
  ],
  setupActions: [
    {
      type: 'trackApiRequest',
      path: `/v1/posts/${apiSeed.postId}/comments`,
      method: 'GET',
      required: true,
    },
  ],
  actions: [
    { type: 'scrollToTop', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: 'Update unavailable', required: true },
    {
      type: 'assertTextVisible',
      text: 'This update was removed or you do not have access.',
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Comments', required: true },
    {
      type: 'assertApiRequestCount',
      path: `/v1/posts/${apiSeed.postId}/comments`,
      method: 'GET',
      count: 0,
      required: true,
    },
  ],
};

const postDetailInteractionFlow = {
  id: 'coach_post_detail_interactions',
  role: 'coach',
  title: 'Coach recovers from post and comment mutation failures',
  path: `/post-detail?postId=${apiSeed.postId}`,
  expectPath: '/post-detail',
  expectedErrors: [
    `response:503:POST:http://localhost:4000/v1/posts/${apiSeed.postId}/reactions/toggle`,
    `response:503:POST:http://localhost:4000/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3/reactions/toggle`,
    `response:503:POST:http://localhost:4000/v1/posts/${apiSeed.postId}/comments`,
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
    'console:[ERROR] [',
    'console:Error data:',
  ],
  actions: [
    {
      type: 'trackApiRequest',
      path: `/v1/posts/${apiSeed.postId}/reactions/toggle`,
      method: 'POST',
      required: true,
    },
    {
      type: 'mockApiError',
      path: `/v1/posts/${apiSeed.postId}/reactions/toggle`,
      method: 'POST',
      status: 503,
      message: 'Post reaction was not saved.',
      delayMs: 450,
      required: true,
    },
    { type: 'clickButton', name: 'Unlike post', exact: true, waitMs: 50, required: true },
    { type: 'assertButtonDisabled', name: 'Like post', exact: true, required: true },
    { type: 'wait', ms: 550, required: true },
    { type: 'assertTextVisible', text: 'Post reaction was not saved.', required: true },
    { type: 'assertButtonEnabled', name: 'Unlike post', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: `/v1/posts/${apiSeed.postId}/reactions/toggle`,
      method: 'POST',
      count: 1,
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: '/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3/reactions/toggle',
      method: 'POST',
      required: true,
    },
    {
      type: 'mockApiError',
      path: '/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3/reactions/toggle',
      method: 'POST',
      status: 503,
      message: 'Comment reaction was not saved.',
      delayMs: 450,
      required: true,
    },
    { type: 'clickButton', name: 'Like comment', waitMs: 50, required: true },
    { type: 'assertButtonDisabled', name: 'Like comment', required: true },
    { type: 'wait', ms: 550, required: true },
    { type: 'assertTextVisible', text: 'Comment reaction was not saved.', required: true },
    { type: 'assertButtonEnabled', name: 'Like comment', required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3/reactions/toggle',
      method: 'POST',
      count: 1,
      required: true,
    },
    { type: 'clickButton', name: 'Reply to comment', waitMs: 50, required: true },
    { type: 'assertTextVisible', text: 'Replying to Olivia Barton', required: true },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Cancel reply',
      required: true,
    },
    {
      type: 'fillInput',
      name: 'Reply to Olivia Barton',
      value: 'Training times noted.',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: `/v1/posts/${apiSeed.postId}/comments`,
      method: 'POST',
      required: true,
    },
    {
      type: 'mockApiError',
      path: `/v1/posts/${apiSeed.postId}/comments`,
      method: 'POST',
      status: 503,
      message: 'Comment was not sent.',
      delayMs: 450,
      required: true,
    },
    { type: 'clickButton', name: 'Send comment', exact: true, waitMs: 50, required: true },
    { type: 'assertButtonDisabled', name: 'Send comment', exact: true, required: true },
    { type: 'wait', ms: 550, required: true },
    { type: 'assertTextVisible', text: 'Comment was not sent.', required: true },
    { type: 'assertButtonEnabled', name: 'Send comment', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: `/v1/posts/${apiSeed.postId}/comments`,
      method: 'POST',
      count: 1,
      required: true,
    },
  ],
};

const postDetailDeleteFlow = {
  id: 'parent_post_detail_delete_failure',
  role: 'parent',
  title: 'Parent sees and safely confirms their own comment deletion',
  path: `/post-detail?postId=${apiSeed.postId}`,
  expectPath: '/post-detail',
  expectedErrors: [
    'response:503:DELETE:http://localhost:4000/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3',
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
    'console:[ERROR] [',
    'console:Error data:',
  ],
  actions: [
    {
      type: 'trackApiRequest',
      path: '/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3',
      method: 'DELETE',
      required: true,
    },
    {
      type: 'mockApiError',
      path: '/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3',
      method: 'DELETE',
      status: 503,
      message: 'Comment was not deleted.',
      delayMs: 450,
      required: true,
    },
    {
      type: 'clickButton',
      name: 'Delete comment by Olivia Barton',
      exact: true,
      required: true,
    },
    { type: 'assertTextVisible', text: 'Delete comment?', required: true },
    { type: 'assertTextVisible', text: 'This cannot be undone.', required: true },
    { type: 'clickButton', name: 'Delete', exact: true, waitMs: 50, required: true },
    {
      type: 'assertButtonDisabled',
      name: 'Delete comment by Olivia Barton',
      exact: true,
      required: true,
    },
    { type: 'wait', ms: 550, required: true },
    { type: 'assertTextVisible', text: 'Comment was not deleted.', required: true },
    {
      type: 'assertButtonEnabled',
      name: 'Delete comment by Olivia Barton',
      exact: true,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: '/v1/comments/cmt_0f055f57-69a1-7136-b238-3cad9c42d7d3',
      method: 'DELETE',
      count: 1,
      required: true,
    },
  ],
};

const squadCreateReadyFlow = {
  id: 'admin_squad_create_ready',
  role: 'admin',
  title: 'Club admin sees the lean squad creator',
  path: `/club/squad/create?clubId=${apiSeed.clubId}`,
  expectPath: '/club/squad/create',
  actions: [
    { type: 'assertTextVisible', text: 'New squad', required: true },
    { type: 'assertTextVisible', text: 'Name', required: true },
    { type: 'assertTextVisible', text: 'Age group', required: true },
    { type: 'assertTextVisible', text: 'Level', required: true },
    { type: 'assertTextAbsent', text: 'Meeting Location', required: true },
    { type: 'assertTextAbsent', text: 'Focus Areas', required: true },
    { type: 'assertTextAbsent', text: 'Preview', required: true },
    { type: 'assertButtonVisible', name: 'Close squad creator', required: true },
    { type: 'assertButtonVisible', name: 'Create squad', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const squadCreateInteractionsFlow = {
  id: 'admin_squad_create_interactions',
  role: 'admin',
  title: 'Club admin completes squad fields and recovers from a failed create',
  path: `/club/squad/create?clubId=${apiSeed.clubId}`,
  expectPath: '/club/squad/create',
  expectedErrors: [
    `response:503:POST:http://localhost:4000/v1/clubs/${apiSeed.clubId}/squads`,
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
    'console:[ERROR] [',
    'console:Error data: {code: UNKNOWN, message: Squad was not created., details: undefined}',
  ],
  actions: [
    { type: 'fillInput', name: 'Squad name', value: 'U14 Girls', required: true },
    { type: 'clickControl', role: 'radio', name: 'U14 age group', required: true },
    { type: 'clickControl', role: 'radio', name: 'Performance level', required: true },
    { type: 'assertButtonVisible', name: 'Create squad', required: true },
    {
      type: 'mockApiError',
      path: `/v1/clubs/${apiSeed.clubId}/squads`,
      method: 'POST',
      status: 503,
      message: 'Squad was not created.',
      required: true,
    },
    { type: 'clickButton', name: 'Create squad', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Squad was not created.', required: true },
    { type: 'assertButtonVisible', name: 'Create squad', required: true },
  ],
};

const squadCreateDeniedFlows = ['coach', 'parent', 'guardian', 'athlete'].map((role) => ({
  id: `${role}_squad_create_denied`,
  role,
  title: `${role} is denied the squad creator`,
  path: `/club/squad/create?clubId=${apiSeed.clubId}`,
  expectPath: '/club/squad/create',
  actions: [
    { type: 'assertTextVisible', text: 'Squad creation unavailable', required: true },
    {
      type: 'assertTextVisible',
      text: 'You do not have permission to create squads for this club.',
      required: true,
    },
    { type: 'assertTextAbsent', text: 'U14 Girls', required: true },
    { type: 'assertTextAbsent', text: 'Age group', required: true },
  ],
}));

const childProfileReadyFlow = {
  id: 'parent_edit_child_profile_ready',
  role: 'parent',
  title: 'Family administrator sees the focused player profile editor',
  path: `/edit-child-profile?childId=${apiSeed.athleteId}`,
  expectPath: '/edit-child-profile',
  actions: [
    { type: 'assertTextVisible', text: 'Edit player', required: true },
    { type: 'assertTextVisible', text: 'Player details', required: true },
    { type: 'assertTextVisible', text: 'Preferred position', required: true },
    { type: 'assertTextAbsent', text: 'Health & Safety', required: true },
    { type: 'assertTextAbsent', text: 'Notes for Coaches', required: true },
    { type: 'assertTextAbsent', text: 'Manage Medical Information', required: true },
    { type: 'assertTextAbsent', text: 'Manage Emergency Contacts', required: true },
    { type: 'assertButtonVisible', name: 'Date of birth, optional', required: true },
    { type: 'assertButtonVisible', name: 'Save profile changes', required: true },
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
    { type: 'assertTextVisible', text: 'Edit player', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
  ],
  postActions: [
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
    { type: 'assertTextVisible', text: 'Edit player', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: 'Player details', required: true },
  ],
};

const childProfileInteractionFlow = {
  id: 'parent_edit_child_profile_interactions',
  role: 'parent',
  title: 'Family administrator edits profile fields and recovers from a failed save',
  path: `/edit-child-profile?childId=${apiSeed.athleteId}`,
  expectPath: '/edit-child-profile',
  expectedErrors: [
    `response:503:PATCH:http://localhost:4000/v1/athletes/${apiSeed.athleteId}`,
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  actions: [
    { type: 'fillInput', name: 'First name', value: '', required: true },
    { type: 'clickButton', name: 'Save profile changes', exact: true, required: true },
    {
      type: 'assertTextVisible',
      text: 'Enter the player’s first and last name.',
      required: true,
    },
    { type: 'fillInput', name: 'First name', value: 'Alfie Test', required: true },
    { type: 'fillInput', name: 'Last name', value: 'Barton Test', required: true },
    { type: 'fillInput', name: 'Nickname, optional', value: 'Matchday', required: true },
    { type: 'clickButton', name: 'Date of birth, optional', exact: true, required: true },
    { type: 'clickControl', role: 'radio', name: 'Female', required: true },
    { type: 'clickControl', role: 'radio', name: 'Daughter', required: true },
    { type: 'clickControl', role: 'radio', name: 'Defender', required: true },
    {
      type: 'mockApiError',
      path: `/v1/athletes/${apiSeed.athleteId}`,
      method: 'PATCH',
      status: 503,
      message: 'Player profile changes were not saved.',
      required: true,
    },
    { type: 'clickButton', name: 'Save profile changes', exact: true, required: true },
    {
      type: 'assertTextVisible',
      text: 'Player profile changes were not saved.',
      required: true,
    },
    { type: 'assertButtonVisible', name: 'Save profile changes', required: true },
  ],
  postActions: [
    {
      type: 'assertTextVisible',
      text: 'Player profile changes were not saved.',
      required: true,
    },
    { type: 'assertButtonVisible', name: 'Save profile changes', required: true },
  ],
};

const childProfileDeniedFlows = ['guardian', 'coach', 'athlete', 'admin'].map((role) => ({
  id: `${role}_edit_child_profile_denied`,
  role,
  title: `${role} is denied the player profile editor`,
  path: `/edit-child-profile?childId=${apiSeed.athleteId}`,
  expectPath: '/edit-child-profile',
  actions: [
    { type: 'assertTextVisible', text: 'Edit player', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: 'Profile editing unavailable', required: true },
    {
      type: 'assertTextVisible',
      text: 'You do not have permission to edit this player.',
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Player details', required: true },
    { type: 'assertTextAbsent', text: 'Save changes', required: true },
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
    { type: 'assertTextVisible', text: 'Edit player', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: 'Profile editing unavailable', required: true },
  ],
  postActions: [
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
    { type: 'assertTextVisible', text: 'Edit player', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: 'Profile editing unavailable', required: true },
  ],
}));

const childSupportReadyFlow = {
  id: 'parent_edit_child_support_ready',
  role: 'parent',
  title: 'Family administrator sees the focused player support editor',
  path: `/edit-child-sen?childId=${apiSeed.athleteId}`,
  expectPath: '/edit-child-sen',
  actions: [
    { type: 'assertTextVisible', text: 'Player support', required: true },
    { type: 'assertTextVisible', text: 'Conditions and access needs', required: true },
    { type: 'assertTextVisible', text: 'Session adjustments', required: true },
    { type: 'assertTextVisible', text: 'Coach guidance', required: true },
    { type: 'assertTextAbsent', text: 'Current Disabilities', required: true },
    { type: 'assertTextAbsent', text: 'Notes for Coaches', required: true },
    { type: 'assertTextAbsent', text: 'Edit SEN', required: true },
    { type: 'assertButtonVisible', name: 'Save support changes', required: true },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Save support changes',
      minWidth: 44,
      minHeight: 44,
      required: true,
    },
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
    { type: 'assertTextVisible', text: 'Player support', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
  ],
  postActions: [
    { type: 'scrollToTop', required: true },
    { type: 'assertScrollTop', required: true },
    { type: 'assertTextVisible', text: 'Player support', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    {
      type: 'assertTargetInViewport',
      text: 'Player support',
      required: true,
    },
    {
      type: 'assertTargetUnobscured',
      text: 'Player support',
      required: true,
    },
    {
      type: 'assertTargetInViewport',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    {
      type: 'assertTargetUnobscured',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Go back',
      minWidth: 44,
      minHeight: 44,
      required: true,
    },
    { type: 'assertTextVisible', text: 'Conditions and access needs', required: true },
  ],
};

const childSupportInteractionFlow = {
  id: 'parent_edit_child_support_interactions',
  role: 'parent',
  title: 'Family administrator drafts support and recovers from one failed atomic save',
  path: `/edit-child-sen?childId=${apiSeed.athleteId}`,
  expectPath: '/edit-child-sen',
  expectedErrors: [
    `response:503:PATCH:http://localhost:4000/v1/athletes/${apiSeed.athleteId}`,
    'console:Failed to load resource: the server responded with a status of 503 (Service Unavailable)',
  ],
  actions: [
    { type: 'clickButton', name: 'Add condition', exact: true, required: true },
    { type: 'clickControl', role: 'radio', name: 'Dyslexia', required: true },
    {
      type: 'fillInput',
      name: 'Dyslexia notes, optional',
      value: 'Needs written steps',
      required: true,
    },
    {
      type: 'fillInput',
      name: 'Support required, optional',
      value: 'Pair spoken instructions with a visual example',
      required: true,
    },
    {
      type: 'fillInput',
      name: 'communication preference',
      value: 'Visual cue',
      required: true,
    },
    {
      type: 'clickButton',
      name: 'Add communication preference',
      exact: true,
      required: true,
    },
    { type: 'clickButton', name: 'Add condition', exact: true, required: true },
    { type: 'clickButton', name: 'Add adjustment', exact: true, required: true },
    { type: 'clickControl', role: 'radio', name: 'Learning', required: true },
    {
      type: 'fillInput',
      name: 'Adjustment name',
      value: 'Extra processing time',
      required: true,
    },
    { type: 'clickControl', role: 'radio', name: 'Mild', required: true },
    { type: 'clickButton', name: 'Add adjustment', exact: true, required: true },
    {
      type: 'fillInput',
      name: 'Communication guidance, optional',
      value: 'Give one instruction at a time',
      required: true,
    },
    {
      type: 'fillInput',
      name: 'Behaviour and regulation guidance, optional',
      value: 'A quiet reset helps after a noisy drill',
      required: true,
    },
    {
      type: 'mockApiError',
      path: `/v1/athletes/${apiSeed.athleteId}`,
      method: 'PATCH',
      status: 503,
      message: 'Support changes were not saved.',
      required: true,
    },
    { type: 'clickButton', name: 'Save support changes', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Support changes were not saved.', required: true },
    { type: 'assertButtonVisible', name: 'Save support changes', required: true },
  ],
  postActions: [
    { type: 'assertTextVisible', text: 'Support changes were not saved.', required: true },
    { type: 'assertButtonVisible', name: 'Save support changes', required: true },
    {
      type: 'assertTargetInViewport',
      text: 'Player support',
      required: true,
    },
    {
      type: 'assertTargetUnobscured',
      text: 'Player support',
      required: true,
    },
    {
      type: 'assertTargetInViewport',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    {
      type: 'assertTargetUnobscured',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Dyslexia', required: true },
    { type: 'assertButtonVisible', name: 'Remove Extra processing time', required: true },
    {
      type: 'assertTargetMinSize',
      role: 'button',
      name: 'Remove Extra processing time',
      minWidth: 44,
      minHeight: 44,
      required: true,
    },
  ],
};

const childSupportDeniedFlows = ['guardian', 'coach', 'athlete', 'admin'].map((role) => ({
  id: `${role}_edit_child_support_denied`,
  role,
  title: `${role} is denied the player support editor`,
  path: `/edit-child-sen?childId=${apiSeed.athleteId}`,
  expectPath: '/edit-child-sen',
  actions: [
    { type: 'assertTextVisible', text: 'Player support', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: 'Support editing unavailable', required: true },
    {
      type: 'assertTextVisible',
      text: 'You do not have permission to edit this player’s support information.',
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Conditions and access needs', required: true },
    { type: 'assertTextAbsent', text: 'Save changes', required: true },
  ],
  postActions: [
    { type: 'assertTextVisible', text: 'Player support', required: true },
    { type: 'assertButtonVisible', name: 'Go back', required: true },
    {
      type: 'assertTargetInViewport',
      text: 'Player support',
      required: true,
    },
    {
      type: 'assertTargetUnobscured',
      text: 'Player support',
      required: true,
    },
    {
      type: 'assertTargetInViewport',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    {
      type: 'assertTargetUnobscured',
      role: 'button',
      name: 'Go back',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Support editing unavailable', required: true },
  ],
}));

const inviteCodeSettingsReadyFlow = {
  id: 'admin_invite_code_settings_ready',
  role: 'admin',
  title: 'Club admin sees the canonical club invite controls',
  path: `/club/settings?clubId=${apiSeed.clubId}&section=invites`,
  expectPath: '/club/settings',
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Club Settings', required: true },
    { type: 'assertTextVisible', text: 'Invite codes', required: true },
    { type: 'assertTextVisible', text: 'Create and share club access codes.', required: true },
    { type: 'assertTextVisible', text: 'Create member code', required: true },
    { type: 'assertTextAbsent', text: 'School Invite Code', required: true },
    { type: 'assertTextAbsent', text: 'Use invite code', required: true },
  ],
  postActions: [
    { type: 'assertTargetInViewport', text: 'Invite codes', required: true },
    { type: 'assertTargetUnobscured', text: 'Invite codes', required: true },
  ],
};

const inviteCodeSettingsDeniedFlows = ['coach', 'parent', 'guardian', 'athlete'].map((role) => ({
  id: `${role}_invite_code_settings_denied`,
  role,
  title: `${role} does not receive club invite-management controls`,
  path: `/club/settings?clubId=${apiSeed.clubId}&section=invites`,
  expectPath: '/club/settings',
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextAbsent', text: 'Invite codes', required: true },
    { type: 'assertTextAbsent', text: 'Create member code', required: true },
    { type: 'assertTextAbsent', text: 'Create coach code', required: true },
    { type: 'assertTextAbsent', text: 'Create admin code', required: true },
    { type: 'assertTextAbsent', text: 'School Invite Code', required: true },
  ],
}));

const availabilityScheduleActions = [
  { type: 'wait', ms: 2500, required: true },
  { type: 'assertTextVisible', text: 'Availability', required: true },
  { type: 'assertTextVisible', text: 'Manage your availability', required: true },
  { type: 'assertTextVisible', text: 'This Week', required: true },
  { type: 'assertTextVisible', text: 'Take Time Off', required: true },
  { type: 'assertTextVisible', text: 'Booking Rules', required: true },
  { type: 'assertTargetMinSize', role: 'button', name: 'Take time off', required: true },
  { type: 'assertTargetMinSize', role: 'button', name: 'Booking rules', required: true },
];

const availabilityScheduleReadyFlow = {
  id: 'coach_availability_schedule_ready',
  role: 'coach',
  title: 'Coach opens canonical Schedule availability',
  path: '/schedule?segment=availability',
  expectPath: '/schedule',
  actions: availabilityScheduleActions,
  postActions: [
    { type: 'assertTargetInViewport', text: 'Availability', required: true },
    { type: 'assertTargetUnobscured', text: 'Availability', required: true },
  ],
};

const availabilityLegacyRedirectFlow = {
  id: 'coach_availability_legacy_redirect',
  role: 'coach',
  title: 'Legacy availability link lands on the canonical Schedule segment',
  path: '/availability',
  expectPath: '/schedule',
  actions: availabilityScheduleActions,
};

const availabilityScheduleDeniedFlows = ['parent', 'guardian', 'athlete', 'admin'].map((role) => ({
  id: `${role}_availability_schedule_denied`,
  role,
  title: `${role} is denied coach availability management`,
  path: '/schedule?segment=availability',
  expectPathNot: '/schedule',
}));

const bookingDetailSharedActions = [
  { type: 'wait', ms: 2500, required: true },
  { type: 'assertTextVisible', text: '1-on-1 session', required: true },
  { type: 'assertTextVisible', text: 'Confirmed', required: true },
  { type: 'assertTextVisible', text: 'Amelia Indoor Dome', required: true },
  { type: 'assertTextVisible', text: 'Directions', required: true },
  { type: 'assertTextAbsent', text: 'Weather', required: true },
  { type: 'assertTextAbsent', text: 'Ownership & Audit', required: true },
  { type: 'assertTextAbsent', text: 'Trust and support', required: true },
  { type: 'assertTextAbsent', text: 'Follow-ups parents will see', required: true },
  { type: 'assertTextAbsent', text: 'Billing Issue', required: true },
  { type: 'assertTargetMinSize', role: 'button', name: 'Go back', required: true },
  {
    type: 'assertTargetMinSize',
    role: 'button',
    name: 'Directions to Amelia Indoor Dome',
    required: true,
  },
];

const bookingDetailAllowedFlows = ['coach', 'parent', 'guardian', 'athlete'].map((role) => ({
  id: `${role}_booking_detail_ready`,
  role,
  title: `${role} opens an assigned booking`,
  path: `/bookings/${apiSeed.bookingId}`,
  expectPath: `/bookings/${apiSeed.bookingId}`,
  actions: [
    ...bookingDetailSharedActions,
    {
      type: 'assertTextVisible',
      text: role === 'coach' ? 'Complete session' : 'Message coach',
      required: true,
    },
    ...(role === 'coach'
      ? [
          { type: 'assertTextVisible', text: 'Message contact', required: true },
          { type: 'assertTextAbsent', text: 'Message family', required: true },
        ]
      : []),
  ],
  postActions: [
    { type: 'assertTargetInViewport', text: '1-on-1 session', required: true },
    { type: 'assertTargetUnobscured', text: '1-on-1 session', required: true },
  ],
}));

const bookingDetailDeniedFlow = {
  id: 'admin_booking_detail_denied',
  role: 'admin',
  title: 'Unrelated club admin is denied booking detail',
  path: `/bookings/${apiSeed.bookingId}`,
  expectPath: `/bookings/${apiSeed.bookingId}`,
  expectedErrors: [
    'response:403:GET:http://localhost:4000/v1/bookings/',
    'console:Failed to load resource: the server responded with a status of 403',
  ],
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Booking unavailable', required: true },
    { type: 'assertButtonVisible', name: 'Back to bookings', required: true },
    { type: 'assertTextAbsent', text: 'Try again', required: true },
    { type: 'assertTextAbsent', text: 'Amelia Indoor Dome', required: true },
  ],
};

const bookingProblemPath = `/bookings/report-problem?bookingId=${encodeURIComponent(apiSeed.bookingId)}`;

const bookingProblemReadyActions = [
  { type: 'wait', ms: 2500, required: true },
  { type: 'assertTextVisible', text: 'Report problem', required: true },
  { type: 'assertTextVisible', text: 'Sent to', required: true },
  { type: 'assertTextVisible', text: 'What happened?', required: true },
  { type: 'assertTextVisible', text: 'Details', required: true },
  { type: 'assertButtonVisible', name: 'Send report', required: true },
  { type: 'assertButtonDisabled', name: 'Send report', exact: true, required: true },
  { type: 'assertTextAbsent', text: 'Help us improve', required: true },
  { type: 'assertTextAbsent', text: 'Reports are reviewed within 24 hours.', required: true },
  { type: 'assertTargetMinSize', role: 'radio', name: 'Safety concern', required: true },
];

const bookingProblemReadyFlows = ['parent', 'guardian', 'athlete'].map((role) => ({
  id: `${role}_booking_problem_ready`,
  role,
  title: `${role} opens booking problem reporting`,
  path: bookingProblemPath,
  expectPath: '/bookings/report-problem',
  actions: bookingProblemReadyActions,
  postActions: [
    { type: 'assertTargetInViewport', text: 'What happened?', required: true },
    { type: 'assertTargetUnobscured', text: 'What happened?', required: true },
  ],
}));

const bookingProblemDeniedFlows = ['coach', 'admin'].map((role) => ({
  id: `${role}_booking_problem_denied`,
  role,
  title: `${role} is denied the family booking problem form`,
  path: bookingProblemPath,
  expectPath: '/bookings/report-problem',
  actions: [
    { type: 'wait', ms: 1500, required: true },
    { type: 'assertTextVisible', text: 'Booking unavailable', required: true },
    { type: 'assertButtonVisible', name: 'Back to bookings', required: true },
    { type: 'assertTextAbsent', text: 'What happened?', required: true },
    { type: 'assertTextAbsent', text: 'Send report', required: true },
  ],
}));

const bookingProblemMissingContextFlow = {
  id: 'parent_booking_problem_missing_context',
  role: 'parent',
  title: 'Booking problem reporting rejects a missing booking id',
  path: '/bookings/report-problem',
  expectPath: '/bookings/report-problem',
  actions: [
    { type: 'wait', ms: 700, required: true },
    { type: 'assertTextVisible', text: 'Booking unavailable', required: true },
    { type: 'assertButtonVisible', name: 'Back to bookings', required: true },
    { type: 'assertTextAbsent', text: 'What happened?', required: true },
  ],
};

const bookingProblemSubmitFlow = {
  id: 'parent_booking_problem_submit',
  role: 'parent',
  title: 'Parent completes the booking problem form once',
  path: bookingProblemPath,
  actions: [
    { type: 'wait', ms: 2500, required: true },
    {
      type: 'mockApiResponse',
      method: 'POST',
      path: '/v1/safeguarding/incidents',
      status: 201,
      body: { id: 'safe_ui_booking_problem_audit' },
      required: true,
    },
    { type: 'clickControl', role: 'radio', name: 'Safety concern', required: true },
    {
      type: 'assertTextVisible',
      text: 'If anyone is in immediate danger, contact emergency services.',
      required: true,
    },
    {
      type: 'fillInput',
      name: 'Issue details',
      value: 'Route audit report. No staging mutation from this UI flow.',
      required: true,
    },
    { type: 'assertButtonEnabled', name: 'Send report', exact: true, required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Send report', required: true },
    { type: 'clickButton', name: 'Send report', exact: true, waitMs: 1000, required: true },
    {
      type: 'assertApiRequestCount',
      method: 'POST',
      path: '/v1/safeguarding/incidents',
      count: 1,
      required: true,
    },
  ],
};

const sessionFeedbackCompletionFlow = {
  id: 'coach_booking_completion_entry',
  role: 'coach',
  title: 'Coach enters explicit booking completion without a feedback redirect',
  path: `/bookings/${apiSeed.bookingId}`,
  expectPath: `/session/${apiSeed.bookingId}/complete`,
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Confirmed', required: true },
    { type: 'assertButtonVisible', name: 'Complete session', required: true },
    { type: 'assertTextAbsent', text: 'Add session feedback', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Complete session', required: true },
    { type: 'clickButton', name: 'Complete session', waitMs: 1500, required: true },
    { type: 'assertTextVisible', text: 'Complete Session', required: true },
  ],
  postActions: [
    { type: 'assertTargetInViewport', text: 'Complete Session', required: true },
    { type: 'assertTargetUnobscured', text: 'Complete Session', required: true },
  ],
};

const sessionFeedbackCoachNotesFlow = {
  id: 'coach_completed_booking_notes_entry',
  role: 'coach',
  title: 'Coach opens the single notes control from a completed booking',
  path: `/bookings/${apiSeed.completedBookingId}`,
  expectPath: `/session-notes/${apiSeed.completedBookingId}`,
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Completed', required: true },
    { type: 'assertTextVisible', text: 'Session notes & development', required: true },
    { type: 'assertButtonVisible', name: 'Add coach notes', required: true },
    { type: 'assertTextAbsent', text: 'Add session feedback', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Add coach notes', required: true },
    { type: 'clickButton', name: 'Add coach notes', exact: true, waitMs: 1500, required: true },
    { type: 'assertTextVisible', text: 'Session notes', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Go back', required: true },
    { type: 'assertTextVisible', text: '0/3 selected', required: true },
    { type: 'assertTextAbsent', text: 'Select at least one focus area', required: true },
    { type: 'assertTextAbsent', text: 'Rate athlete effort', required: true },
  ],
  postActions: [
    { type: 'assertTargetInViewport', text: 'Session notes', required: true },
    { type: 'assertTargetUnobscured', text: 'Session notes', required: true },
  ],
};

const sessionFeedbackReadOnlyFlows = ['parent', 'athlete'].map((role) => ({
  id: `${role}_completed_booking_feedback_read_only`,
  role,
  title: `${role} sees completed booking feedback as read-only`,
  path: `/bookings/${apiSeed.completedBookingId}`,
  expectPath: `/bookings/${apiSeed.completedBookingId}`,
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Completed', required: true },
    { type: 'assertTextVisible', text: 'Coach feedback', required: true },
    { type: 'assertTextVisible', text: 'No coach feedback yet.', required: true },
    { type: 'assertTextAbsent', text: 'Add coach notes', required: true },
    { type: 'assertTextAbsent', text: 'Add session feedback', required: true },
    { type: 'scrollIntoView', text: 'Coach feedback', required: true },
  ],
  postActions: [
    { type: 'assertTargetInViewport', text: 'Coach feedback', required: true },
    { type: 'assertTargetUnobscured', text: 'Coach feedback', required: true },
  ],
}));

const sessionFeedbackDeniedFlows = ['guardian', 'admin'].map((role) => ({
  id: `${role}_completed_booking_feedback_denied`,
  role,
  title: `${role} is denied completed booking feedback`,
  path: `/bookings/${apiSeed.completedBookingId}`,
  expectPath: `/bookings/${apiSeed.completedBookingId}`,
  expectedErrors: [
    'response:403:GET:http://localhost:4000/v1/bookings/',
    'console:Failed to load resource: the server responded with a status of 403',
  ],
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Booking unavailable', required: true },
    { type: 'assertButtonVisible', name: 'Back to bookings', required: true },
    { type: 'assertTextAbsent', text: 'Coach feedback', required: true },
    { type: 'assertTextAbsent', text: 'Add coach notes', required: true },
    { type: 'assertTextAbsent', text: 'Add session feedback', required: true },
  ],
  postActions: [
    { type: 'scrollToTop', required: true },
    { type: 'assertTargetInViewport', text: 'Booking unavailable', required: true },
    { type: 'assertTargetUnobscured', text: 'Booking unavailable', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Back to bookings', required: true },
  ],
}));

const coachProfileCanonicalFlow = {
  id: 'coach_profile_editor_redirect',
  role: 'coach',
  title: 'Coach profile compatibility link opens the canonical editor',
  path: '/coach-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
    { type: 'trackApiRequest', path: '/v1/posts*', method: 'GET', required: true },
    { type: 'trackApiRequest', path: '/v1/follows*', method: 'GET', required: true },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'assertTextVisible', text: 'Edit Profile', required: true },
    { type: 'assertTextVisible', text: 'Name', required: true },
    { type: 'assertButtonVisible', name: 'Save profile', required: true },
    { type: 'assertButtonDisabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      count: 1,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: '/v1/posts*',
      method: 'GET',
      count: 0,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: '/v1/follows*',
      method: 'GET',
      count: 0,
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Profile Offline', required: true },
    { type: 'assertTextAbsent', text: 'Profile completion', required: true },
    { type: 'assertTextAbsent', text: 'Quick Access', required: true },
    { type: 'assertTextAbsent', text: 'Cover Photo', required: true },
    { type: 'assertTextAbsent', text: 'Profile Photo', required: true },
    { type: 'assertTextAbsent', text: 'Photos', required: true },
    { type: 'assertTextAbsent', text: 'Reviews', required: true },
    { type: 'assertTextAbsent', text: 'Sign Out', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Save profile', required: true },
    { type: 'scrollToTop', required: true },
  ],
};

const coachProfileBioEditFlow = {
  id: 'coach_profile_bio_edit',
  role: 'coach',
  title: 'Coach edits a full-length profile bio without an implicit write',
  path: '/edit-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'assertButtonDisabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'fillInput',
      name: 'Bio',
      value: 'UEFA-qualified coach focused on clear sessions and player development.',
      required: true,
    },
    {
      type: 'assertInputValue',
      name: 'Bio',
      value: 'UEFA-qualified coach focused on clear sessions and player development.',
      required: true,
    },
    { type: 'assertButtonEnabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
  ],
};

const coachProfileFocusPricingFlow = {
  id: 'coach_profile_focus_pricing',
  role: 'coach',
  title: 'Coach changes football focus and validates pricing without saving',
  path: '/edit-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'scrollIntoView', text: 'Coaching focus', required: true },
    { type: 'assertTargetMinSize', role: 'checkbox', name: 'Passing', required: true },
    { type: 'clickControl', role: 'checkbox', name: 'Passing', required: true },
    { type: 'assertButtonEnabled', name: 'Save profile', exact: true, required: true },
    { type: 'scrollIntoView', text: 'Pricing', required: true },
    { type: 'assertTargetMinSize', role: 'textbox', name: 'Minimum price', required: true },
    { type: 'assertTargetMinSize', role: 'textbox', name: 'Maximum price', required: true },
    { type: 'fillInput', name: 'Minimum price', value: '200', required: true },
    { type: 'fillInput', name: 'Maximum price', value: '50', required: true },
    { type: 'assertTextVisible', text: 'Minimum must be lower than maximum', required: true },
    { type: 'assertButtonDisabled', name: 'Save profile', exact: true, required: true },
    { type: 'fillInput', name: 'Maximum price', value: '200', required: true },
    { type: 'assertButtonEnabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      count: 1,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
  ],
};

const coachProfileLinksContactFlow = {
  id: 'coach_profile_links_contact',
  role: 'coach',
  title: 'Coach validates social links and edits contact fields without saving',
  path: '/edit-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'scrollIntoView', text: 'Social links', required: true },
    {
      type: 'fillInput',
      name: 'Instagram',
      value: 'https://evilinstagram.com/coach',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Use an Instagram URL', required: true },
    { type: 'assertButtonDisabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'fillInput',
      name: 'Instagram',
      value: 'https://instagram.com/clubroomcoach',
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Use an Instagram URL', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Clear Instagram', required: true },
    { type: 'clickButton', name: 'Clear Instagram', exact: true, required: true },
    { type: 'assertInputValue', name: 'Instagram', value: '', required: true },
    { type: 'scrollIntoView', text: 'Contact', required: true },
    { type: 'assertTargetMinSize', role: 'textbox', name: 'Email address', required: true },
    { type: 'assertTargetMinSize', role: 'textbox', name: 'Phone number', required: true },
    { type: 'assertTargetMinSize', role: 'textbox', name: 'Website URL', required: true },
    {
      type: 'fillInput',
      name: 'Website URL',
      value: 'javascript:alert(1)',
      required: true,
    },
    { type: 'assertTextVisible', text: 'Enter a valid URL', required: true },
    { type: 'assertButtonDisabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'fillInput',
      name: 'Website URL',
      value: 'https://clubroom.example',
      required: true,
    },
    {
      type: 'scrollIntoView',
      role: 'textbox',
      name: 'Website URL',
      position: 'center',
      required: true,
    },
    { type: 'assertTargetInViewport', role: 'textbox', name: 'Website URL', required: true },
    { type: 'assertTargetUnobscured', role: 'textbox', name: 'Website URL', required: true },
    { type: 'assertButtonEnabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      count: 1,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
  ],
};

const coachProfileExperienceFlow = {
  id: 'coach_profile_experience_validation',
  role: 'coach',
  title: 'Coach inspects experience fields and receives inline validation',
  path: '/edit-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'scrollIntoView', role: 'button', name: 'Add experience', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Add experience', required: true },
    { type: 'clickButton', name: 'Add experience', exact: true, required: true },
    { type: 'assertTargetInViewport', role: 'button', name: 'Close', required: true },
    { type: 'assertTargetUnobscured', role: 'button', name: 'Close', required: true },
    { type: 'assertTextVisible', text: 'Role', required: true },
    { type: 'assertTextVisible', text: 'Club or organisation', required: true },
    { type: 'assertTextVisible', text: 'Start date', required: true },
    { type: 'assertTextVisible', text: 'End date (optional)', required: true },
    { type: 'assertTextVisible', text: 'Description', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Start date', required: true },
    { type: 'assertTargetMinSize', role: 'checkbox', name: 'Current role', required: true },
    { type: 'clickControl', role: 'checkbox', name: 'Current role', required: true },
    { type: 'assertTextAbsent', text: 'End date (optional)', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Save experience', required: true },
    { type: 'clickButton', name: 'Save experience', exact: true, required: true },
    {
      type: 'assertTextVisible',
      text: 'Role, club or organisation, and start date are required.',
      required: true,
    },
    { type: 'assertTargetMinSize', role: 'button', name: 'Close', required: true },
    { type: 'assertTargetInViewport', role: 'button', name: 'Save experience', required: true },
    { type: 'assertTargetUnobscured', role: 'button', name: 'Save experience', required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
  ],
};

const coachProfileLanguageFlow = {
  id: 'coach_profile_language_edit',
  role: 'coach',
  title: 'Coach validates and adds a language locally',
  path: '/edit-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'scrollIntoView', role: 'button', name: 'Add language', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Add language', required: true },
    { type: 'clickButton', name: 'Add language', exact: true, required: true },
    { type: 'clickButton', name: 'Save language', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Language is required.', required: true },
    { type: 'fillInput', name: 'Language name', value: 'Welsh', required: true },
    { type: 'assertTargetMinSize', role: 'radio', name: 'Fluent', required: true },
    { type: 'clickControl', role: 'radio', name: 'Fluent', required: true },
    { type: 'clickButton', name: 'Save language', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Welsh', required: true },
    { type: 'assertTextAbsent', text: 'Quick add', required: true },
    { type: 'assertButtonEnabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
  ],
};

const coachProfileQualificationFlow = {
  id: 'coach_profile_qualification_edit',
  role: 'coach',
  title: 'Coach validates and adds a qualification label locally',
  path: '/edit-profile',
  expectPath: '/edit-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'scrollIntoView', role: 'button', name: 'Add qualification', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Add qualification', required: true },
    { type: 'clickButton', name: 'Add qualification', exact: true, required: true },
    { type: 'assertTextAbsent', text: 'Issue Date', required: true },
    { type: 'assertTextAbsent', text: 'Expiry Date', required: true },
    { type: 'assertTextAbsent', text: 'Credential URL', required: true },
    { type: 'clickButton', name: 'Save qualification', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Qualification name is required.', required: true },
    {
      type: 'fillInput',
      name: 'Qualification name',
      value: 'Youth Goalkeeping Award',
      required: true,
    },
    { type: 'fillInput', name: 'Qualification issuer', value: 'The FA', required: true },
    { type: 'clickButton', name: 'Save qualification', exact: true, required: true },
    { type: 'assertTextVisible', text: 'Youth Goalkeeping Award', required: true },
    {
      type: 'scrollIntoView',
      text: 'Youth Goalkeeping Award',
      position: 'center',
      required: true,
    },
    { type: 'assertTargetInViewport', text: 'Youth Goalkeeping Award', required: true },
    { type: 'assertTargetUnobscured', text: 'Youth Goalkeeping Award', required: true },
    { type: 'assertTextAbsent', text: 'Valid', required: true },
    { type: 'assertTextAbsent', text: 'Expired', required: true },
    { type: 'assertButtonEnabled', name: 'Save profile', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'PATCH',
      count: 0,
      required: true,
    },
  ],
};

const coachProfileDeniedFlows = ['parent', 'guardian', 'athlete', 'admin'].map((role) => ({
  id: `${role}_coach_profile_denied`,
  role,
  title: `${role} cannot mount the coach self-profile route`,
  path: '/coach-profile',
  expectPathNot: '/coach-profile',
  setupActions: [
    {
      type: 'trackApiRequest',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1200, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/coaches/me/profile',
      method: 'GET',
      count: 0,
      required: true,
    },
    { type: 'assertTextAbsent', text: 'Edit Profile', required: true },
    { type: 'assertTextAbsent', text: 'Profile Offline', required: true },
    { type: 'assertTextAbsent', text: 'Profile completion', required: true },
  ],
}));

const clubHubCanonicalRedirectFlows = ['coach', 'parent', 'guardian', 'athlete', 'admin'].map(
  (role) => ({
    id: `${role}_club_hub_my_clubs_redirect`,
    role,
    title: `${role} legacy Club Hub entry opens My Clubs directly`,
    path: '/club-hub',
    expectPath: '/club/my-clubs',
    actions: [
      { type: 'wait', ms: 1800, required: true },
      { type: 'assertTextVisible', text: 'My Clubs', required: true },
      { type: 'assertTextVisible', text: 'Join a club', required: true },
      { type: 'assertTextAbsent', text: 'Club Hub', required: true },
      { type: 'assertButtonDisabled', name: 'Join club', exact: true, required: true },
      { type: 'assertTargetMinSize', role: 'button', name: 'Close', required: true },
      { type: 'assertTargetMinSize', role: 'button', name: 'Join club', required: true },
    ],
  }),
);

const clubHubInviteConfirmationFlow = {
  id: 'coach_club_hub_invite_confirmation',
  role: 'coach',
  title: 'Coach invite link requires an explicit Join action',
  path: '/club-hub?inviteCode=CLUB-READ-ONLY-AUDIT',
  expectPath: '/club/my-clubs',
  setupActions: [
    { type: 'trackApiRequest', path: '/v1/clubs/join', method: 'POST', required: true },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'assertTextVisible', text: 'My Clubs', required: true },
    {
      type: 'assertInputValue',
      name: 'Invite code or link',
      value: 'CLUB-READ-ONLY-AUDIT',
      required: true,
    },
    { type: 'assertButtonEnabled', name: 'Join club', exact: true, required: true },
    {
      type: 'assertApiRequestCount',
      path: '/v1/clubs/join',
      method: 'POST',
      count: 0,
      required: true,
    },
    { type: 'assertTargetMinSize', role: 'button', name: 'Join club', required: true },
  ],
};

const clubHubAuthorizedDetailFlows = ['coach', 'parent', 'guardian', 'admin'].map((role) => ({
  id: `${role}_club_hub_club_detail_redirect`,
  role,
  title: `${role} Club Hub link opens canonical club detail`,
  path: `/club-hub?clubId=${apiSeed.clubId}`,
  expectPath: `/club/${apiSeed.clubId}`,
  setupActions: [
    {
      type: 'trackApiRequest',
      path: `/v1/clubs/${apiSeed.clubId}/members`,
      method: 'GET',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextVisible', text: 'Updates', required: true },
    { type: 'assertTextAbsent', text: 'Invites', required: true },
    { type: 'assertButtonAbsent', name: 'Add club photo', required: true },
    { type: 'assertButtonAbsent', name: 'Change club photo', required: true },
    { type: 'assertButtonAbsent', name: 'Add cover photo', required: true },
    { type: 'assertButtonAbsent', name: 'Change cover photo', required: true },
    ...(role === 'parent' || role === 'guardian'
      ? [
          { type: 'assertButtonAbsent', name: 'New Post', required: true },
          { type: 'assertButtonAbsent', name: 'Create Event', required: true },
          { type: 'assertButtonAbsent', name: 'Show club members', required: true },
        ]
      : []),
    {
      type: 'assertApiRequestCount',
      path: `/v1/clubs/${apiSeed.clubId}/members`,
      method: 'GET',
      count: role === 'admin' ? 1 : 0,
      required: true,
    },
    { type: 'assertTargetMinSize', role: 'button', name: 'Go back', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Club options', required: true },
  ],
}));

const clubHubDeniedDetailFlows = ['athlete'].map((role) => ({
  id: `${role}_club_hub_club_detail_denied`,
  role,
  title: `${role} cannot probe an unrelated club through Club Hub`,
  path: `/club-hub?clubId=${apiSeed.clubId}`,
  expectPath: `/club/${apiSeed.clubId}`,
  setupActions: [
    {
      type: 'trackApiRequest',
      path: `/v1/posts?clubId=${apiSeed.clubId}`,
      method: 'GET',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: `/v1/clubs/${apiSeed.clubId}/members`,
      method: 'GET',
      required: true,
    },
    {
      type: 'trackApiRequest',
      path: `/v1/clubs/${apiSeed.clubId}/schedule`,
      method: 'GET',
      required: true,
    },
  ],
  actions: [
    { type: 'wait', ms: 1800, required: true },
    { type: 'assertTextVisible', text: 'Club not found', required: true },
    { type: 'assertButtonVisible', name: 'Go Back', required: true },
    { type: 'assertTextAbsent', text: 'Updates', required: true },
    {
      type: 'assertApiRequestCount',
      path: `/v1/posts?clubId=${apiSeed.clubId}`,
      method: 'GET',
      count: 0,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: `/v1/clubs/${apiSeed.clubId}/members`,
      method: 'GET',
      count: 0,
      required: true,
    },
    {
      type: 'assertApiRequestCount',
      path: `/v1/clubs/${apiSeed.clubId}/schedule`,
      method: 'GET',
      count: 0,
      required: true,
    },
  ],
  postActions: [
    { type: 'scrollToTop', required: true },
    { type: 'assertTargetInViewport', text: 'Club not found', required: true },
    { type: 'assertTargetUnobscured', text: 'Club not found', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Go Back', required: true },
  ],
}));

const clubHubDashboardSettingsFlow = {
  id: 'admin_club_dashboard_settings_entry',
  role: 'admin',
  title: 'Club admin opens settings without looping through Club Hub',
  path: `/club/${apiSeed.clubId}/dashboard`,
  expectPath: '/club/settings',
  actions: [
    { type: 'wait', ms: 2500, required: true },
    { type: 'assertTextAbsent', text: 'Club Hub & Admin', required: true },
    { type: 'scrollIntoView', role: 'button', name: 'Club settings', required: true },
    { type: 'assertTargetMinSize', role: 'button', name: 'Club settings', required: true },
    { type: 'clickButton', name: 'Club settings', exact: true, waitMs: 1800, required: true },
    { type: 'assertTextVisible', text: 'Club Settings', required: true },
  ],
};

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
  ...settingsRouteFlows,
  travelRadiusSaveFailureFlow,
  coachingSettingsSaveFailureFlow,
  accountSettingsInteractionsFlow,
  blockedUsersReadyFlow,
  blockedUsersInteractionsFlow,
  clubPostReadyFlow,
  clubPostComposerFlow,
  ...clubPostDeniedFlows,
  ...postDetailReadyFlows,
  postDetailDeniedFlow,
  postDetailInteractionFlow,
  postDetailDeleteFlow,
  squadCreateReadyFlow,
  squadCreateInteractionsFlow,
  ...squadCreateDeniedFlows,
  childProfileReadyFlow,
  childProfileInteractionFlow,
  ...childProfileDeniedFlows,
  childSupportReadyFlow,
  childSupportInteractionFlow,
  ...childSupportDeniedFlows,
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
    path: '/group-sessions',
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
    path: '/session-invites',
  },
  {
    id: 'coach_session_invites_create_redirect',
    role: 'coach',
    title: 'Coach hits invite redirect',
    path: '/session-invites/create',
  },
  {
    id: 'coach_club_settings',
    role: 'coach',
    title: 'Coach opens club settings',
    path: '/club/settings',
  },
  {
    id: 'coach_club_create',
    role: 'coach',
    title: 'Coach opens create club',
    path: '/club/create',
  },
  {
    id: 'coach_squad_detail',
    role: 'coach',
    title: 'Coach opens squad detail',
    path: `/club/squad/${apiSeed.squadId}`,
  },
  {
    id: 'coach_add_member_to_squad',
    role: 'coach',
    title: 'Coach opens add-member panel inside squad',
    path: `/club/squad/${apiSeed.squadId}`,
    actions: [{ type: 'clickButton', name: 'Add', required: true }],
  },
  {
    id: 'coach_squad_invite_screen',
    role: 'coach',
    title: 'Coach opens squad invite screen',
    path: `/squads/${apiSeed.squadId}/invite`,
  },
  {
    id: 'coach_manage',
    role: 'coach',
    title: 'Coach opens management hub',
    path: '/manage',
    expectPath: '/manage/bookings',
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
    path: `/sessions/create?intent=new&source=club_manage&actingAs=club&clubId=${apiSeed.clubId}&assigneeCoachId=${apiSeed.coachUserId}`,
    expectPath: '/sessions/create',
  },
  {
    id: 'coach_existing_invite_ownership',
    role: 'coach',
    title: 'Coach existing-invite flow exposes ownership summary and session picker',
    path: `/sessions/create?intent=existing&source=club_manage&actingAs=club&clubId=${apiSeed.clubId}&assigneeCoachId=${apiSeed.coachUserId}`,
    actions: [
      { type: 'wait', ms: 2500, required: true },
      { type: 'assertTextVisible', text: 'Add to Session', required: true },
      { type: 'assertTextPresent', text: 'Ownership summary', required: true },
      { type: 'assertTextPresent', text: 'Session owner:', required: true },
      {
        type: 'assertTextPresent',
        text: 'Session picker: Assigned coach sessions',
        required: true,
      },
      { type: 'assertTextPresent', text: 'Send invites', required: true },
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
    id: 'coach_earnings_payment_instructions',
    role: 'coach',
    title: 'Coach can open direct payment instructions',
    path: '/earnings',
    actions: [
      { type: 'clickText', text: 'Payment Instructions', required: true },
      { type: 'assertTextVisible', text: 'Direct Payment Instructions', required: true },
      { type: 'assertButtonVisible', name: 'Copy direct payment instructions', required: true },
    ],
  },
  {
    id: 'owner_dashboard',
    role: 'admin',
    title: 'Owner opens club dashboard',
    path: `/club/${apiSeed.clubId}/dashboard`,
    expectPath: `/club/${apiSeed.clubId}/dashboard`,
  },
  {
    id: 'owner_head_coach',
    role: 'admin',
    title: 'Owner opens head coach oversight',
    path: `/manage/head-coach?clubId=${apiSeed.clubId}`,
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
    path: `/roster/${apiSeed.athleteId}/raise-concern`,
    expectPath: `/roster/${apiSeed.athleteId}/raise-concern`,
  },
  {
    id: 'coach_health_review',
    role: 'coach',
    title: 'Coach opens athlete health review',
    path: `/roster/${apiSeed.athleteId}/health`,
    expectPath: `/roster/${apiSeed.athleteId}/health`,
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
  {
    id: 'parent_favourites',
    role: 'parent',
    title: 'Parent opens favourites',
    path: '/favourites',
  },
  {
    id: 'parent_book_coach',
    role: 'parent',
    title: 'Parent opens find coach',
    path: '/book-coach',
  },
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
    path: `/development/child-progress/${apiSeed.athleteId}`,
  },
  {
    id: 'parent_book_flow_start',
    role: 'parent',
    title: 'Parent opens book flow home',
    path: `/book/${apiSeed.coachUserId}`,
  },
  {
    id: 'parent_book_flow_type',
    role: 'parent',
    title: 'Parent opens session-type step',
    path: `/book/${apiSeed.coachUserId}/session-type`,
  },
  {
    id: 'parent_book_flow_schedule',
    role: 'parent',
    title: 'Parent opens schedule step',
    path: `/book/${apiSeed.coachUserId}/schedule`,
  },
  {
    id: 'parent_book_flow_details',
    role: 'parent',
    title: 'Parent opens details step',
    path: `/book/${apiSeed.coachUserId}/details`,
  },
  {
    id: 'parent_book_flow_review',
    role: 'parent',
    title: 'Parent opens review step',
    path: `/book/${apiSeed.coachUserId}/review`,
  },
  {
    id: 'parent_book_flow_confirmation',
    role: 'parent',
    title: 'Parent opens confirmation step',
    path: `/book/${apiSeed.coachUserId}/confirmation`,
  },
  {
    id: 'parent_child_medical',
    role: 'parent',
    title: 'Parent opens child medical profile',
    path: `/child/${apiSeed.athleteId}/medical`,
    expectPath: `/child/${apiSeed.athleteId}/medical`,
  },
  {
    id: 'parent_child_emergency',
    role: 'parent',
    title: 'Parent opens child emergency profile',
    path: `/child/${apiSeed.athleteId}/emergency`,
    expectPath: `/child/${apiSeed.athleteId}/emergency`,
  },
  {
    id: 'parent_add_child',
    role: 'parent',
    title: 'Family administrator opens add-child flow',
    path: '/add-child',
    expectPath: '/add-child',
    actions: [
      { type: 'wait', ms: 2500, required: true },
      { type: 'assertTextVisible', text: 'Player details', required: true },
    ],
  },
  {
    id: 'parent_add_child_support',
    role: 'parent',
    title: 'Family administrator checks add-child support step',
    path: '/add-child',
    expectPath: '/add-child',
    actions: addChildSupportActions,
  },
  {
    id: 'parent_add_child_support_details',
    role: 'parent',
    title: 'Family administrator expands add-child support details',
    path: '/add-child',
    expectPath: '/add-child',
    actions: [
      ...addChildSupportActions,
      {
        type: 'clickControl',
        role: 'radio',
        name: 'Yes, coaching adjustments are needed',
        required: true,
      },
      { type: 'assertTextVisible', text: 'Conditions and access needs', required: true },
      { type: 'assertButtonVisible', name: 'Add condition', required: true },
      { type: 'assertButtonVisible', name: 'Add adjustment', required: true },
    ],
  },
  {
    id: 'parent_add_child_safety',
    role: 'parent',
    title: 'Family administrator checks add-child safety step',
    path: '/add-child',
    expectPath: '/add-child',
    actions: [
      ...addChildSafetyActions,
      { type: 'assertTextVisible', text: 'Emergency contact', required: true },
    ],
  },
  {
    id: 'parent_add_child_medical_details',
    role: 'parent',
    title: 'Family administrator expands add-child medical details',
    path: '/add-child',
    expectPath: '/add-child',
    actions: [
      ...addChildSafetyActions,
      {
        type: 'clickControl',
        role: 'radio',
        name: 'Yes, a coach needs medical details',
        required: true,
      },
      { type: 'assertTextVisible', text: 'Allergies', required: true },
    ],
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
    id: 'athlete_development_detail',
    role: 'athlete',
    title: 'Athlete opens development detail',
    path: `/development/athlete/${apiSeed.athleteId}`,
  },
  {
    id: 'athlete_discover_sessions',
    role: 'athlete',
    title: 'Athlete opens discover sessions',
    path: '/discover-sessions',
  },
  {
    id: 'athlete_favourites',
    role: 'athlete',
    title: 'Athlete opens favourites',
    path: '/favourites',
  },
  {
    id: 'athlete_find_coach',
    role: 'athlete',
    title: 'Athlete opens find coach',
    path: '/book-coach',
  },
  {
    id: 'athlete_health',
    role: 'athlete',
    title: 'Athlete opens health dashboard',
    path: '/health',
  },
  {
    id: 'athlete_health_injuries',
    role: 'athlete',
    title: 'Athlete opens injury log',
    path: '/health/injuries',
    expectPath: '/health/injuries',
  },
  {
    id: 'athlete_chat_list',
    role: 'athlete',
    title: 'Athlete opens chat list',
    path: '/chat',
    expectPath: '/messages',
  },
  ...['guardian', 'coach', 'athlete', 'admin'].map((role) => ({
    id: `${role}_add_child_denied`,
    role,
    title: `${role} is denied the add-child flow`,
    path: '/add-child',
    expectPathNot: '/add-child',
  })),
  ...verificationCoachFlows,
  ...verificationDeniedFlows,
  inviteCodeSettingsReadyFlow,
  ...inviteCodeSettingsDeniedFlows,
  availabilityScheduleReadyFlow,
  availabilityLegacyRedirectFlow,
  ...availabilityScheduleDeniedFlows,
  ...bookingDetailAllowedFlows,
  bookingDetailDeniedFlow,
  ...bookingProblemReadyFlows,
  ...bookingProblemDeniedFlows,
  bookingProblemMissingContextFlow,
  bookingProblemSubmitFlow,
  sessionFeedbackCompletionFlow,
  sessionFeedbackCoachNotesFlow,
  ...sessionFeedbackReadOnlyFlows,
  ...sessionFeedbackDeniedFlows,
  coachProfileCanonicalFlow,
  coachProfileBioEditFlow,
  coachProfileFocusPricingFlow,
  coachProfileLinksContactFlow,
  coachProfileExperienceFlow,
  coachProfileLanguageFlow,
  coachProfileQualificationFlow,
  ...coachProfileDeniedFlows,
  ...clubHubCanonicalRedirectFlows,
  clubHubInviteConfirmationFlow,
  ...clubHubAuthorizedDetailFlows,
  ...clubHubDeniedDetailFlows,
  clubHubDashboardSettingsFlow,
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
  'settings-routes': settingsRouteFlows.map((flow) => flow.id),
  'account-settings-interactions': [accountSettingsInteractionsFlow.id],
  'blocked-users-ready': [blockedUsersReadyFlow.id],
  'blocked-users-interactions': [blockedUsersInteractionsFlow.id],
  'club-post-audit': [clubPostReadyFlow, clubPostComposerFlow, ...clubPostDeniedFlows].map(
    (flow) => flow.id,
  ),
  'post-detail-audit': [
    ...postDetailReadyFlows,
    postDetailDeniedFlow,
    postDetailInteractionFlow,
    postDetailDeleteFlow,
  ].map((flow) => flow.id),
  'create-squad-audit': [
    squadCreateReadyFlow,
    squadCreateInteractionsFlow,
    ...squadCreateDeniedFlows,
  ].map((flow) => flow.id),
  'edit-child-profile-audit': [
    childProfileReadyFlow,
    childProfileInteractionFlow,
    ...childProfileDeniedFlows,
  ].map((flow) => flow.id),
  'edit-child-support-audit': [
    childSupportReadyFlow,
    childSupportInteractionFlow,
    ...childSupportDeniedFlows,
  ].map((flow) => flow.id),
  'invite-code-settings-audit': [inviteCodeSettingsReadyFlow, ...inviteCodeSettingsDeniedFlows].map(
    (flow) => flow.id,
  ),
  'availability-route-audit': [
    availabilityScheduleReadyFlow,
    availabilityLegacyRedirectFlow,
    ...availabilityScheduleDeniedFlows,
  ].map((flow) => flow.id),
  'booking-detail-audit': [...bookingDetailAllowedFlows, bookingDetailDeniedFlow].map(
    (flow) => flow.id,
  ),
  'booking-problem-audit': [
    ...bookingProblemReadyFlows,
    ...bookingProblemDeniedFlows,
    bookingProblemMissingContextFlow,
    bookingProblemSubmitFlow,
  ].map((flow) => flow.id),
  'session-feedback-retirement': [
    sessionFeedbackCompletionFlow,
    sessionFeedbackCoachNotesFlow,
    ...sessionFeedbackReadOnlyFlows,
    ...sessionFeedbackDeniedFlows,
  ].map((flow) => flow.id),
  'coach-profile-canonical': [
    coachProfileCanonicalFlow,
    coachProfileBioEditFlow,
    coachProfileFocusPricingFlow,
    coachProfileLinksContactFlow,
    coachProfileExperienceFlow,
    coachProfileLanguageFlow,
    coachProfileQualificationFlow,
    ...coachProfileDeniedFlows,
  ].map((flow) => flow.id),
  'club-hub-canonical': [
    ...clubHubCanonicalRedirectFlows,
    clubHubInviteConfirmationFlow,
    ...clubHubAuthorizedDetailFlows,
    ...clubHubDeniedDetailFlows,
    clubHubDashboardSettingsFlow,
  ].map((flow) => flow.id),
  'travel-radius-save-failure': [travelRadiusSaveFailureFlow.id],
  'coaching-settings-save-failure': [coachingSettingsSaveFailureFlow.id],
  verification: [...verificationCoachFlows, ...verificationDeniedFlows].map((flow) => flow.id),
  'add-child-authority': [
    'parent_add_child',
    'guardian_add_child_denied',
    'coach_add_child_denied',
    'athlete_add_child_denied',
    'admin_add_child_denied',
  ],
  'add-child-redesign': [
    'parent_add_child',
    'parent_add_child_support',
    'parent_add_child_support_details',
    'parent_add_child_safety',
    'parent_add_child_medical_details',
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

const allowedRoles = ['coach', 'parent', 'guardian', 'athlete', 'admin'];

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
    '  UI_FLOW_CREDENTIALS_FILE   Owner-only staging credential file',
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
  await fs.writeFile(
    path.join(options.outDir, 'report.partial.json'),
    JSON.stringify(partial, null, 2),
  );
}

async function login(page, role) {
  if (!creds) {
    throw new Error('UI flow credentials were not loaded');
  }
  const { username, password } = creds[role];
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1000);

  const usernameInput = page.getByPlaceholder(loginIdentityPlaceholder).first();
  const passwordInput = page.getByPlaceholder('••••••••');

  const loginVisible = await usernameInput
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  if (!loginVisible) {
    return;
  }

  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.waitForTimeout(250);

  await passwordInput.press('Enter');

  if (!(await waitForLoginFormHidden(page, 45000))) {
    throw new Error(`Login form remained visible for ${role}`);
  }
  await page.waitForTimeout(1200);
}

async function isLoginFormVisible(page) {
  return page
    .getByPlaceholder(loginIdentityPlaceholder)
    .first()
    .isVisible()
    .catch(() => false);
}

async function waitForLoginFormHidden(page, timeoutMs = authSettleTimeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await isLoginFormVisible(page))) {
      return true;
    }
    await page.waitForTimeout(Math.min(authPollMs, Math.max(0, deadline - Date.now())));
  }

  return !(await isLoginFormVisible(page));
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

      if (!(await waitForLoginFormHidden(page))) {
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

async function firstVisible(locator, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;

  do {
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }

    if (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } while (Date.now() < deadline);

  return null;
}

function requestCounterKey(action) {
  return `${action.method}:${action.path}`;
}

function countTrackedRequest(page, action) {
  page.__uiAuditRequestCounts ??= new Map();
  const key = requestCounterKey(action);
  page.__uiAuditRequestCounts.set(key, (page.__uiAuditRequestCounts.get(key) ?? 0) + 1);
}

function actionTargetLocator(page, target) {
  if (target.role) {
    return page.getByRole(target.role, { name: target.name });
  }
  return page.getByText(target.text, { exact: true });
}

async function runAction(page, action, actionErrors) {
  try {
    if (action.type === 'trackApiRequest') {
      page.__uiAuditRequestCounts ??= new Map();
      page.__uiAuditRequestCounts.set(requestCounterKey(action), 0);
      await page.route(`**${action.path}`, async (route) => {
        if (route.request().method() === action.method) {
          countTrackedRequest(page, action);
        }
        await route.fallback();
      });
      return;
    }

    if (action.type === 'mockApiResponse') {
      await page.route(`**${action.path}`, async (route) => {
        if (route.request().method() !== action.method) {
          await route.continue();
          return;
        }
        countTrackedRequest(page, action);
        if (action.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, action.delayMs));
        }
        if (action.status === 204) {
          await route.fulfill({ status: action.status });
          return;
        }
        await route.fulfill({
          status: action.status,
          contentType: 'application/json',
          body: JSON.stringify(action.body ?? {}),
        });
      });
      return;
    }

    if (action.type === 'mockApiError') {
      await page.route(`**${action.path}`, async (route) => {
        if (route.request().method() !== action.method) {
          await route.continue();
          return;
        }
        countTrackedRequest(page, action);
        if (action.delayMs) {
          await new Promise((resolve) => setTimeout(resolve, action.delayMs));
        }
        await route.fulfill({
          status: action.status,
          contentType: 'application/json',
          body: JSON.stringify({ message: action.message }),
        });
      });
      return;
    }

    if (action.type === 'fillInput') {
      const target = await firstVisible(page.getByLabel(action.name));
      if (!target) throw new Error(`Input not visible: ${action.name}`);
      await target.fill(action.value);
      await page.waitForTimeout(250);
      return;
    }

    if (action.type === 'assertInputValue') {
      const target = await firstVisible(page.getByLabel(action.name));
      if (!target) throw new Error(`Input not visible: ${action.name}`);
      const actual = await target.inputValue();
      if (actual !== action.value) {
        throw new Error(`Input ${action.name} was "${actual}"; expected "${action.value}"`);
      }
      return;
    }

    if (action.type === 'clickControl') {
      const target = await firstVisible(page.getByRole(action.role, { name: action.name }));
      if (!target) throw new Error(`${action.role} not visible: ${action.name}`);
      await target.click();
      await page.waitForTimeout(500);
      return;
    }

    if (action.type === 'clickButton') {
      const target = await firstVisible(
        page.getByRole('button', { name: action.name, exact: action.exact ?? false }),
      );
      if (!target) throw new Error(`Button not visible: ${action.name}`);
      await target.click();
      await page.waitForTimeout(action.waitMs ?? 700);
      return;
    }

    if (action.type === 'clickAnyButton') {
      const names = Array.isArray(action.names) ? action.names : [];
      for (const name of names) {
        const target = await firstVisible(page.getByRole('button', { name }));
        if (target) {
          await target.click();
          await page.waitForTimeout(700);
          return;
        }
      }
      throw new Error(`No matching visible button found: ${names.join(' | ')}`);
    }

    if (action.type === 'assertButtonDisabled' || action.type === 'assertButtonEnabled') {
      const target = await firstVisible(
        page.getByRole('button', { name: action.name, exact: action.exact ?? false }),
      );
      if (!target) throw new Error(`Button not visible: ${action.name}`);
      const disabled = await target.isDisabled();
      const expectedDisabled = action.type === 'assertButtonDisabled';
      if (disabled !== expectedDisabled) {
        throw new Error(
          `Button ${action.name} should be ${expectedDisabled ? 'disabled' : 'enabled'}`,
        );
      }
      return;
    }

    if (action.type === 'assertApiRequestCount') {
      const actual = page.__uiAuditRequestCounts?.get(requestCounterKey(action)) ?? 0;
      if (actual !== action.count) {
        throw new Error(
          `Request count ${requestCounterKey(action)} was ${actual}; expected ${action.count}`,
        );
      }
      return;
    }

    if (action.type === 'clickText') {
      const target = await firstVisible(page.getByText(action.text));
      if (!target) throw new Error(`Text not visible: ${action.text}`);
      await target.click();
      await page.waitForTimeout(700);
      return;
    }

    if (action.type === 'assertButtonVisible') {
      const target = await firstVisible(page.getByRole('button', { name: action.name }));
      if (!target) {
        throw new Error(`Button not visible: ${action.name}`);
      }
      return;
    }

    if (action.type === 'assertButtonAbsent') {
      const count = await page
        .getByRole('button', { name: action.name, exact: action.exact ?? true })
        .count()
        .catch(() => 0);
      if (count > 0) {
        throw new Error(`Button should be absent: ${action.name}`);
      }
      return;
    }

    if (action.type === 'assertTextVisible') {
      const target = await firstVisible(page.getByText(action.text));
      if (!target) {
        throw new Error(`Text not visible: ${action.text}`);
      }
      return;
    }

    if (action.type === 'assertTextPresent') {
      const count = await page
        .getByText(action.text)
        .count()
        .catch(() => 0);
      if (count < 1) {
        throw new Error(`Text not present: ${action.text}`);
      }
      return;
    }

    if (action.type === 'assertTextAbsent') {
      const count = await page
        .getByText(action.text, { exact: true })
        .count()
        .catch(() => 0);
      if (count > 0) {
        throw new Error(`Text should be absent: ${action.text}`);
      }
      return;
    }

    if (action.type === 'assertTargetInViewport') {
      const target = await firstVisible(actionTargetLocator(page, action));
      if (!target) {
        throw new Error(`Viewport target not visible: ${action.name ?? action.text}`);
      }

      const [box, viewport] = await Promise.all([
        target.boundingBox(),
        page.evaluate(() => ({
          width: window.visualViewport?.width ?? window.innerWidth,
          height: window.visualViewport?.height ?? window.innerHeight,
        })),
      ]);
      if (!box) {
        throw new Error(`Viewport target bounds unavailable: ${action.name ?? action.text}`);
      }

      const outside =
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > viewport.width ||
        box.y + box.height > viewport.height;
      if (outside) {
        throw new Error(
          `Target outside viewport: ${action.name ?? action.text} at ${box.x.toFixed(1)},${box.y.toFixed(1)} ${box.width.toFixed(1)}x${box.height.toFixed(1)} within ${viewport.width}x${viewport.height}`,
        );
      }
      return;
    }

    if (action.type === 'assertTargetUnobscured') {
      const target = await firstVisible(actionTargetLocator(page, action));
      if (!target) {
        throw new Error(`Unobscured target not visible: ${action.name ?? action.text}`);
      }
      const result = await target.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const insetX = Math.min(3, rect.width / 4);
        const insetY = Math.min(3, rect.height / 4);
        const points = [
          [rect.left + rect.width / 2, rect.top + rect.height / 2],
          [rect.left + insetX, rect.top + insetY],
          [rect.right - insetX, rect.top + insetY],
          [rect.left + insetX, rect.bottom - insetY],
          [rect.right - insetX, rect.bottom - insetY],
        ];
        const checks = points.map(([rawX, rawY]) => {
          const x = Math.min(window.innerWidth - 1, Math.max(0, rawX));
          const y = Math.min(window.innerHeight - 1, Math.max(0, rawY));
          const hits = document.elementsFromPoint(x, y);
          return {
            unobscured: hits.some(
              (hit) => hit === element || element.contains(hit) || hit.contains(element),
            ),
            topTag: hits[0]?.tagName ?? null,
          };
        });
        return {
          unobscured: checks.every((check) => check.unobscured),
          opacity: style.opacity,
          visibility: style.visibility,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          topTags: checks.map((check) => check.topTag),
        };
      });
      if (!result.unobscured || result.visibility !== 'visible' || Number(result.opacity) <= 0.01) {
        throw new Error(
          `Target obscured: ${action.name ?? action.text} at ${result.rect.x.toFixed(1)},${result.rect.y.toFixed(1)} ${result.rect.width.toFixed(1)}x${result.rect.height.toFixed(1)}; top=${result.topTags.join(',')}; visibility=${result.visibility}; opacity=${result.opacity}`,
        );
      }
      return;
    }

    if (action.type === 'assertTargetMinSize') {
      const target = await firstVisible(actionTargetLocator(page, action));
      if (!target) {
        throw new Error(`Minimum-size target not visible: ${action.name ?? action.text}`);
      }
      const box = await target.boundingBox();
      if (!box) {
        throw new Error(`Minimum-size target has no bounds: ${action.name ?? action.text}`);
      }
      const minWidth = action.minWidth ?? 44;
      const minHeight = action.minHeight ?? 44;
      if (box.width < minWidth || box.height < minHeight) {
        throw new Error(
          `Target too small: ${action.name ?? action.text} is ${box.width.toFixed(1)}x${box.height.toFixed(1)}; expected at least ${minWidth}x${minHeight}`,
        );
      }
      return;
    }

    if (action.type === 'assertVerticalGap') {
      const above = await firstVisible(actionTargetLocator(page, action.above));
      const below = await firstVisible(actionTargetLocator(page, action.below));
      if (!above || !below) {
        throw new Error('Vertical gap targets are not both visible');
      }
      const [aboveBox, belowBox] = await Promise.all([above.boundingBox(), below.boundingBox()]);
      if (!aboveBox || !belowBox) {
        throw new Error('Vertical gap target bounds are unavailable');
      }
      const gap = belowBox.y - (aboveBox.y + aboveBox.height);
      if (gap < action.minimumGap) {
        throw new Error(`Vertical gap ${gap.toFixed(1)}px is below ${action.minimumGap}px`);
      }
      return;
    }

    if (action.type === 'assertScrollTop') {
      const offsets = await page.evaluate(() => {
        const results = [];
        if (window.scrollY > 1) results.push(`window:${window.scrollY}`);
        for (const element of document.querySelectorAll('*')) {
          if (!(element instanceof HTMLElement) || element.scrollTop <= 1) continue;
          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) continue;
          const label =
            element.getAttribute('aria-label') ||
            element.getAttribute('role') ||
            element.tagName.toLowerCase();
          results.push(`${label}:${element.scrollTop}`);
        }
        return results;
      });
      if (offsets.length > 0) {
        throw new Error(`Route did not open at the top: ${offsets.join(', ')}`);
      }
      return;
    }

    if (action.type === 'scrollIntoView') {
      const target = await firstVisible(actionTargetLocator(page, action));
      if (!target) {
        throw new Error(`Scroll target not visible: ${action.name ?? action.text}`);
      }
      if (action.position === 'center') {
        await target.evaluate((element) =>
          element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }),
        );
      } else {
        await target.scrollIntoViewIfNeeded();
      }
      await page.waitForTimeout(100);
      return;
    }

    if (action.type === 'scrollToTop') {
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        for (const element of document.querySelectorAll('*')) {
          if (element instanceof HTMLElement && element.scrollTop > 0) {
            element.scrollTop = 0;
          }
        }
      });
      await page.waitForTimeout(100);
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

    const visibleText = (body?.innerText || '').replace(/\s+/g, ' ').trim();
    const copyScanText = visibleText.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+(?:\s+[A-Z0-9.-]+)*\.[A-Z]{2,}\b/gi,
      '[email]',
    );
    const productTextIssues = [];
    if (/\b(?:usr|ath|clb|sqd)_[0-9a-f][0-9a-f-]{6,}\b/i.test(visibleText)) {
      productTextIssues.push('copy:raw_internal_identifier_visible');
    }
    if (/\b(?:one_to_one|small_group|group_session)\b/i.test(visibleText)) {
      productTextIssues.push('copy:raw_service_type_visible');
    }
    if (/\b[A-Z]{2,}(?:_[A-Z0-9]{2,})+\b/.test(visibleText)) {
      productTextIssues.push('copy:raw_enum_label_visible');
    }
    if (/\bCoach unavailable\b/i.test(visibleText)) {
      productTextIssues.push('state:coach_unavailable_visible');
    }
    if (
      /\b(?:seeded|mock|sample|synthetic)\b/i.test(copyScanText) ||
      /\bdemo\s+(?:account|copy|data|mode|notification|walkthrough)\b/i.test(copyScanText)
    ) {
      productTextIssues.push('copy:demo_or_mock_copy_visible');
    }
    if (
      /\b(?:Codex(?: staging)? smoke|staging[- ]smoke|Clubroom staging)\b/i.test(visibleText) ||
      /\bapps\/api\/scripts\/staging-smoke\.ts\b/i.test(visibleText) ||
      /@[a-z0-9.-]+\.test\b/i.test(visibleText)
    ) {
      productTextIssues.push('copy:test_fixture_visible');
    }
    if (/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/.test(visibleText)) {
      productTextIssues.push('copy:raw_timestamp_visible');
    }
    if (/\bRelationship:\s*(?:OTHER|PARENT|GUARDIAN|CARER)\b/.test(visibleText)) {
      productTextIssues.push('copy:raw_enum_label_visible');
    }
    if (/\bcoming soon\b/i.test(visibleText)) {
      productTextIssues.push('copy:coming_soon_visible');
    }
    if (/\bdev only\b/i.test(visibleText)) {
      productTextIssues.push('copy:dev_only_visible');
    }
    if (
      /\bUnmatched Route\b/i.test(visibleText) ||
      /\bPage could not be found\b/i.test(visibleText)
    ) {
      productTextIssues.push('route:unmatched_route_visible');
    }
    if (/\bSomething went wrong\b/i.test(visibleText)) {
      productTextIssues.push('state:unexpected_error_visible');
    }

    return {
      viewportWidth,
      horizontalOverflow: Math.round(horizontalOverflow),
      nestedButtons,
      productTextIssues,
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

  if (issues.some((issue) => issue.startsWith('auth:login_form_visible_after_navigation'))) {
    severity = 'high';
  }

  if (issues.some((issue) => issue === 'route:unmatched_route_visible')) {
    severity = 'high';
  }

  if (issues.some((issue) => issue === 'state:unexpected_error_visible')) {
    severity = 'high';
  }

  if (metrics.nestedButtons > 0) {
    issues.push(`ui:nested_buttons:${metrics.nestedButtons}`);
    if (severity !== 'high') severity = 'medium';
  }

  if (metrics.horizontalOverflow > 6) {
    issues.push(`ui:horizontal_overflow:${metrics.horizontalOverflow}px`);
    if (severity !== 'high') severity = 'medium';
  }

  if (metrics.productTextIssues?.length > 0) {
    issues.push(...metrics.productTextIssues);
    if (severity !== 'high') severity = 'medium';
  }

  return { severity, issues };
}

function describeFailedRequest(request) {
  const failureText = request.failure()?.errorText || 'request_failed';
  if (failureText === 'net::ERR_ABORTED') {
    return null;
  }
  let target = request.url();

  try {
    const parsed = new URL(target);
    const base = new URL(baseUrl);
    target =
      parsed.origin === base.origin
        ? `${parsed.pathname}${parsed.search ? '?…' : ''}`
        : `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search ? '?…' : ''}`;
  } catch {
    target = target.split('?')[0] ?? target;
  }

  const preview = target.length > 180 ? `${target.slice(0, 177)}…` : target;
  return `requestfailed:${request.method()}:${preview}:${failureText}`;
}

function formatNetworkTarget(rawUrl) {
  let target = rawUrl;
  try {
    const parsed = new URL(target);
    const base = new URL(baseUrl);
    target =
      parsed.origin === base.origin
        ? `${parsed.pathname}${parsed.search ? '?…' : ''}`
        : `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search ? '?…' : ''}`;
  } catch {
    target = target.split('?')[0] ?? target;
  }
  return target.length > 180 ? `${target.slice(0, 177)}…` : target;
}

function describeHttpProblem(response) {
  const status = response.status();
  if (status < 400) {
    return null;
  }
  const request = response.request();
  const url = formatNetworkTarget(response.url());
  return `response:${status}:${request.method()}:${url}`;
}

async function runFlowWithRetry(page, flow, options, currentFlowErrors) {
  const start = Date.now();
  let lastError = null;
  let lastIssues = [];

  for (let attempt = 1; attempt <= options.retries + 1; attempt += 1) {
    currentFlowErrors.length = 0;
    const actionErrors = [];

    try {
      await page.unrouteAll();
      for (const action of flow.setupActions ?? []) {
        await runAction(page, action, actionErrors);
      }
      await page.goto(`${baseUrl}${flow.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      await page.waitForTimeout(options.pauseMs);

      if (!(await waitForLoginFormHidden(page))) {
        currentFlowErrors.push(`auth:login_form_visible_after_navigation:${flow.path}`);
      } else {
        for (const action of flow.actions ?? []) {
          await runAction(page, action, actionErrors);
        }
      }

      await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});

      for (const action of flow.postActions ?? []) {
        await runAction(page, action, actionErrors);
      }

      const finalPath = await page.evaluate(() => window.location.pathname);

      if (flow.expectPath) {
        if (!finalPath.startsWith(flow.expectPath)) {
          currentFlowErrors.push(`assert:path_expected:${flow.expectPath}:actual:${finalPath}`);
        }
      }
      if (flow.expectPathNot) {
        if (finalPath.startsWith(flow.expectPathNot)) {
          currentFlowErrors.push(`assert:path_forbidden:${flow.expectPathNot}:actual:${finalPath}`);
        }
      }

      if (!(await waitForLoginFormHidden(page))) {
        currentFlowErrors.push(`auth:login_form_visible_after_navigation:${flow.path}`);
      }

      const expectedErrors = flow.expectedErrors ?? [];
      const observedExpectedErrors = expectedErrors.filter((expected) =>
        currentFlowErrors.some((error) => error.includes(expected)),
      );
      for (const expected of expectedErrors) {
        if (!observedExpectedErrors.includes(expected)) {
          actionErrors.push(`expected_error_missing:${expected}`);
        }
      }
      const unexpectedFlowErrors = currentFlowErrors.filter(
        (error) => !expectedErrors.some((expected) => error.includes(expected)),
      );
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await page.waitForTimeout(100);
      const metrics = await collectMetrics(page);
      const screenshotPath = path.join(options.outDir, flowFile(flow));
      await page.screenshot({ path: screenshotPath, fullPage: false });
      const { severity, issues } = classify(unexpectedFlowErrors, actionErrors, metrics);

      return {
        id: flow.id,
        role: flow.role,
        title: flow.title,
        path: flow.path,
        finalPath,
        screenshot: screenshotPath,
        status: severity === 'high' ? 'failed' : 'ok',
        severity,
        issues,
        metrics,
        expectedErrors: observedExpectedErrors,
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

  creds = await loadFlowCredentials();
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
        page.on('requestfailed', (request) => {
          const failedRequest = describeFailedRequest(request);
          if (failedRequest) {
            currentFlowErrors.push(failedRequest);
          }
        });
        page.on('response', (response) => {
          const httpProblem = describeHttpProblem(response);
          if (httpProblem) {
            currentFlowErrors.push(httpProblem);
          }
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
          // Login briefly renders role home data before the requested audit route.
          // Let those requests settle so their cancellation is not attributed to
          // the first audited flow.
          await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
          await page.waitForTimeout(options.pauseMs);
          currentFlowErrors.length = 0;

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
      await writeReportFiles(
        roleReport,
        options.outDir,
        `report.${role}`,
        `UI Flow Check Report (${role})`,
      );

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
