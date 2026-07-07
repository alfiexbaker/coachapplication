#!/usr/bin/env node
/* eslint-disable no-console */

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');
const { listFiles } = require('./file-scan-utils');
const { resolveLoadingRouteEntry } = require('../navigation/loading-route-manifest');

const ROOT = path.resolve(__dirname, '..');

const ROUTE_RULES = [
  {
    match: /app\/\+html\.tsx|app\/_layout\.tsx|app\/.*\/_layout\.tsx/,
    pdos: 'PDOS-01',
    verdict: 'OPS-CORE',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'app shell, providers, routing, and account/session frame',
  },
  {
    match: /app\/\(tabs\)\/(messages|notifications)\.tsx|app\/chat\/index\.tsx/,
    pdos: 'PDOS-02',
    verdict: 'COMMUNICATION-REVIEW',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'operational messaging and notification entry',
  },
  {
    match: /app\/\(tabs\)\/(athletes|roster)\.tsx/,
    pdos: 'PDOS-06',
    verdict: 'TRUST-CORE',
    personas: ['coach', 'club', 'parent', 'child', 'compliance'],
    job: 'athlete roster and trust-context entry',
  },
  {
    match: /app\/\(tabs\)\/availability\.tsx/,
    pdos: 'PDOS-03',
    verdict: 'PROTECT',
    personas: ['coach', 'club'],
    job: 'coach availability and bookable storefront readiness entry',
  },
  {
    match: /app\/\(tabs\)\/schedule\.tsx/,
    pdos: 'PDOS-10',
    verdict: 'OPS-CORE',
    personas: ['club', 'coach', 'parent', 'child'],
    job: 'schedule and operational activity entry',
  },
  {
    match: /app\/\(tabs\)\/more\.tsx/,
    pdos: 'PDOS-01',
    verdict: 'OPS-CORE',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'secondary navigation to account, help, and operating settings',
  },
  {
    match: /app\/\(tabs\)\/(index|profile|edit-profile)\.tsx/,
    pdos: 'PDOS-01',
    verdict: 'OPS-CORE',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'role home, identity, and profile management entry',
  },
  {
    match: /app\/\(tabs\)\/admin\/invite-codes\.tsx/,
    pdos: 'PDOS-10',
    verdict: 'OPS-CORE',
    personas: ['club', 'compliance'],
    job: 'club invite-code operations and access control',
  },
  {
    match: /app\/availability\/(add-template|calendar|edit-template)\.tsx/,
    pdos: 'PDOS-03',
    verdict: 'PROTECT',
    personas: ['coach', 'club'],
    job: 'coach availability management and bookable storefront readiness',
  },
  {
    match: /app\/availability\/block-date\.tsx/,
    pdos: 'PDOS-03',
    verdict: 'PROTECT',
    personas: ['coach', 'club'],
    job: 'coach availability blocking and bookable-slot protection',
  },
  {
    match: /app\/chat\/\[threadId\]\.tsx|app\/coach-invites\.tsx|app\/invites\.tsx/,
    pdos: 'PDOS-02',
    verdict: 'COMMUNICATION-REVIEW',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'operational communication, invite, and response entry',
  },
  {
    match: /app\/health\/(\[id\]|index|log)\.tsx/,
    pdos: 'PDOS-06',
    verdict: 'TRUST-CORE',
    personas: ['parent', 'coach', 'club', 'child', 'compliance'],
    job: 'health, injury, and readiness context',
  },
  {
    match: /app\/health\/injuries\.tsx|app\/child\/|app\/\(modal\)\/(add-child|edit-child-profile|edit-child-sen)\.tsx/,
    pdos: 'PDOS-06',
    verdict: 'TRUST-CORE',
    personas: ['parent', 'coach', 'club', 'child', 'compliance'],
    job: 'child profile, medical, emergency, SEN, and readiness context',
  },
  {
    match: /app\/verification\//,
    pdos: 'PDOS-03',
    verdict: 'PROTECT',
    personas: ['coach', 'club', 'compliance'],
    job: 'coach verification and trusted storefront readiness',
  },
  {
    match:
      /app\/discover-sessions\.tsx|app\/discover\/map\.tsx|app\/book-coach\.tsx|app\/coach\/|app\/\(tabs\)\/coach-profile\.tsx|app\/favourites\//,
    pdos: 'PDOS-03',
    verdict: 'PROTECT',
    personas: ['parent', 'coach', 'club'],
    job: 'storefront, trust, follow, and booking entry',
  },
  {
    match: /app\/book\/|app\/group-sessions\/|app\/sessions\/create\.tsx|app\/session-invites\//,
    pdos: 'PDOS-04',
    verdict: 'PAID-CORE',
    personas: ['parent', 'coach', 'club', 'child'],
    job: 'paid product selection, booking, registration, invite, or package setup',
  },
  {
    match:
      /app\/\(tabs\)\/feed\.tsx|app\/\(modal\)\/create-club-post\.tsx|app\/\(modal\)\/post-detail\.tsx|app\/community\/|app\/profile\//,
    pdos: 'PDOS-02',
    verdict: 'COMMUNICATION-REVIEW',
    personas: ['parent', 'coach', 'club'],
    job: 'staff-led communication, coach homepage, comments, or operational messaging',
  },
  {
    match: /app\/matches\//,
    pdos: 'PDOS-10',
    verdict: 'OPS-CORE',
    personas: ['club', 'coach', 'parent'],
    job: 'club and selected-squad fixture schedule context',
  },
  {
    match:
      /app\/club\/|app\/\(tabs\)\/club-hub\.tsx|app\/squads\/|app\/events\/|app\/\(modal\)\/create-squad\.tsx/,
    pdos: 'PDOS-10',
    verdict: 'OPS-CORE',
    personas: ['club', 'coach', 'parent', 'compliance'],
    job: 'club activity operations, schedule, squads, staff-led updates, and evidence',
  },
  {
    match: /app\/manage\//,
    pdos: 'PDOS-05',
    verdict: 'OPS-CORE',
    personas: ['club', 'coach', 'compliance'],
    job: 'staff authority, assignment, and operations control',
  },
  {
    match: /app\/booking\/|app\/\(tabs\)\/bookings|app\/bookings\//,
    pdos: 'PDOS-06',
    verdict: 'PAID-CORE',
    personas: ['parent', 'coach', 'child'],
    job: 'booking lifecycle, readiness, cancellation, receipt, and session state',
  },
  {
    match: /app\/family\/|app\/\(tabs\)\/children\.tsx|app\/roster\/|app\/development\/athlete\//,
    pdos: 'PDOS-06',
    verdict: 'TRUST-CORE',
    personas: ['parent', 'coach', 'club', 'child', 'compliance'],
    job: 'child readiness, roster, medical, consent, emergency, and trust context',
  },
  {
    match: /app\/session\/|app\/session-notes\//,
    pdos: 'PDOS-07',
    verdict: 'OPS-CORE',
    personas: ['coach', 'parent', 'child', 'club'],
    job: 'delivery, attendance, completion, and feedback entry',
  },
  {
    match: /app\/development\/|app\/videos\/|app\/review\//,
    pdos: 'PDOS-08',
    verdict: 'DEVELOPMENT-CORE',
    personas: ['parent', 'coach', 'child'],
    job: 'development proof, video, review, rebook, and next work',
  },
  {
    match: /app\/invoices\/|app\/earnings\.tsx|app\/\(tabs\)\/earnings\.tsx/,
    pdos: 'PDOS-09',
    verdict: 'COMMERCIAL-CORE',
    personas: ['parent', 'coach', 'club', 'compliance'],
    job: 'invoice, payment state, reconciliation, and earnings',
  },
  {
    match: /app\/\(tabs\)\/settings\.tsx|app\/settings\//,
    pdos: 'PDOS-01',
    verdict: 'OPS-CORE',
    personas: ['parent', 'coach', 'club'],
    job: 'account, communication, trust, and operating settings',
  },
];

const SERVICE_IMPORT_PATTERN =
  /from ['"]@\/services\/([^'"]+)['"]|from ['"]\.\.\/services\/([^'"]+)['"]|from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g;
const HOOK_IMPORT_PATTERN = /from ['"]@\/hooks\/([^'"]+)['"]/g;
const COMPONENT_IMPORT_PATTERN = /from ['"]@\/components\/([^'"]+)['"]/g;
const IMPLEMENTATION_RISK_FLAGS = new Set([
  'local-storage-authority-check',
  'direct-fetch-check',
  'money-hard-wall-check',
  'sensitive-read-audit-check',
]);

function parseArgs(argv) {
  return {
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    write: argv.includes('--write'),
    strict: argv.includes('--strict'),
  };
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function routePathFromFile(file) {
  return file
    .replace(/^app\//, '/')
    .replace(/\/index\.tsx$/, '')
    .replace(/\.tsx$/, '')
    .replace(/\(tabs\)\//g, '')
    .replace(/\(modal\)\//g, 'modal/');
}

function classifyRoute(file) {
  const rule = ROUTE_RULES.find((candidate) => candidate.match.test(file));
  if (rule) return rule;

  return {
    pdos: 'PDOS-01',
    verdict: 'REVIEW',
    personas: ['unknown'],
    job: 'needs explicit product decision',
  };
}

function extractMatches(content, pattern) {
  const matches = [];
  let match;

  while ((match = pattern.exec(content))) {
    matches.push(match[1] || match[2] || match[3]);
  }

  pattern.lastIndex = 0;
  return matches;
}

function readProjectFileIfExists(relativeFile) {
  const absolutePath = path.join(ROOT, relativeFile);
  if (!existsSync(absolutePath)) return null;
  return readFileSync(absolutePath, 'utf8');
}

function firstExistingFile(candidates) {
  return candidates.find((candidate) => existsSync(path.join(ROOT, candidate))) ?? null;
}

function resolveHookFile(importPath) {
  return firstExistingFile([
    `hooks/${importPath}.ts`,
    `hooks/${importPath}.tsx`,
    `hooks/${importPath}/index.ts`,
    `hooks/${importPath}/index.tsx`,
  ]);
}

function resolveComponentFile(importPath) {
  return firstExistingFile([
    `components/${importPath}.ts`,
    `components/${importPath}.tsx`,
    `components/${importPath}/index.ts`,
    `components/${importPath}/index.tsx`,
  ]);
}

function resolveServiceFiles(importPath) {
  const files = [
    `services/${importPath}.ts`,
    `services/${importPath}.tsx`,
    `services/${importPath}/index.ts`,
    `services/${importPath}/index.tsx`,
  ];

  if (importPath === 'booking-service' || importPath === 'booking') {
    files.push(
      'services/booking/index.ts',
      'services/booking/booking-crud-service.ts',
      'services/booking/booking-authority-service.ts',
    );
  }

  if (importPath === 'invoice-service') {
    files.push('services/invoice-service.ts');
  }

  if (importPath === 'recurring-booking-service' || importPath === 'family-recurring-service') {
    files.push(
      'services/recurring-booking-service.ts',
      'services/family-recurring-service.ts',
      'services/booking/booking-authority-service.ts',
      'apps/api/src/modules/booking/routes.ts',
    );
  }

  if (importPath === 'org-staffing-service') {
    files.push(
      'services/org-staffing-service.ts',
      'apps/api/src/modules/coach-club/staffing-console.ts',
    );
  }

  if (importPath === 'group-session-service' || importPath === 'group-session') {
    files.push(
      'services/group-session/index.ts',
      'services/group-session/group-session-authority-service.ts',
      'apps/api/src/modules/p0-core/routes.ts',
    );
  }

  if (importPath === 'child-service') {
    files.push(
      'services/child-service.ts',
      'services/safety-service.ts',
      'services/family/family-api-support.ts',
      'services/family/family-health-service.ts',
      'apps/api/src/modules/family-athlete/routes.ts',
    );
  }

  if (importPath === 'safety-service') {
    files.push(
      'services/family/family-health-service.ts',
      'apps/api/src/modules/family-athlete/routes.ts',
    );
  }

  if (importPath === 'consent-service') {
    files.push(
      'services/safety-service.ts',
      'services/family/family-health-service.ts',
      'apps/api/src/modules/family-athlete/routes.ts',
    );
  }

  if (importPath === 'injury-service') {
    files.push('apps/api/src/modules/family-athlete/routes.ts');
  }

  if (importPath === 'concern-service') {
    files.push(
      'services/trust/index.ts',
      'services/trust/safeguarding-service.ts',
      'apps/api/src/modules/trust-ops/routes.ts',
    );
  }

  if (importPath === 'trust' || importPath === 'trust/safeguarding-service') {
    files.push('services/trust/safeguarding-service.ts', 'apps/api/src/modules/trust-ops/routes.ts');
  }

  if (
    importPath === 'community-service' ||
    importPath === 'community' ||
    importPath === 'community/community-group-service' ||
    importPath === 'community/community-messaging-service'
  ) {
    files.push(
      'services/community/index.ts',
      'services/community/community-group-service.ts',
      'services/community/community-messaging-service.ts',
      'services/community-media-authority-service.ts',
      'apps/api/src/modules/wave2plus/routes.ts',
    );
  }

  return uniq(files).filter((file) => existsSync(path.join(ROOT, file)));
}

function collectImportedComponentContents(seedContent, maxDepth = 2) {
  const visited = new Set();
  const contents = [];
  let frontier = [seedContent];

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const nextFrontier = [];
    const imports = uniq(
      frontier.flatMap((content) => extractMatches(content, COMPONENT_IMPORT_PATTERN)),
    );

    for (const importPath of imports) {
      const file = resolveComponentFile(importPath);
      if (!file || visited.has(file)) continue;

      const content = readProjectFileIfExists(file);
      if (!content) continue;

      visited.add(file);
      contents.push(content);
      nextFrontier.push(content);
    }

    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  return contents;
}

function collectRouteContext(routeContent) {
  const hookImports = uniq(extractMatches(routeContent, HOOK_IMPORT_PATTERN));
  const hookContents = hookImports
    .map(resolveHookFile)
    .filter(Boolean)
    .map((file) => readProjectFileIfExists(file))
    .filter(Boolean);
  const componentContents = collectImportedComponentContents(routeContent);
  const hookServiceImports = hookContents.flatMap((content) =>
    extractMatches(content, SERVICE_IMPORT_PATTERN),
  );
  const componentServiceImports = componentContents.flatMap((content) =>
    extractMatches(content, SERVICE_IMPORT_PATTERN),
  );
  const serviceImports = uniq([
    ...extractMatches(routeContent, SERVICE_IMPORT_PATTERN),
    ...hookServiceImports,
    ...componentServiceImports,
  ]);
  const serviceContents = serviceImports
    .flatMap(resolveServiceFiles)
    .map((file) => readProjectFileIfExists(file))
    .filter(Boolean);
  const uiContent = [routeContent, ...hookContents, ...componentContents].join('\n');
  const authorityContent = [uiContent, ...serviceContents].join('\n');
  const authorityEvidence = [];

  if (
    serviceImports.includes('booking-service') &&
    /bookingService\.cancel\s*\(/.test(uiContent) &&
    /bookingAuthorityService\.cancelBooking\s*\(/.test(authorityContent) &&
    authorityContent.includes('/v1/bookings/${bookingId}/cancel')
  ) {
    authorityEvidence.push('booking-cancel-api-authority');
  }

  if (
    serviceImports.includes('invoice-service') &&
    /invoiceService\.(getInvoiceByBookingId|getInvoiceById|getUserInvoices|getInvoicesFiltered)\s*\(/.test(
      uiContent,
    ) &&
    /getAuthoritativeInvoices/.test(authorityContent) &&
    authorityContent.includes('/v1/invoices')
  ) {
    authorityEvidence.push('invoice-read-api-authority');
  }

  if (
    serviceImports.includes('invoice-service') &&
    /invoiceService\.(markAsPaid|markAsUnpaid)\s*\(/.test(uiContent) &&
    authorityContent.includes('/v1/invoices/${invoiceId}/mark-paid') &&
    authorityContent.includes('/v1/invoices/${invoiceId}/mark-unpaid')
  ) {
    authorityEvidence.push('invoice-reconciler-api-authority');
  }

  if (
    serviceImports.includes('invoice-service') &&
    /invoiceService\.markAsPaid\s*\(/.test(uiContent) &&
    authorityContent.includes('/v1/invoices/${invoiceId}/mark-paid') &&
    authorityContent.includes('manualReceipt')
  ) {
    authorityEvidence.push('invoice-manual-receipt-api-authority');
  }

  if (
    serviceImports.includes('invoice-service') &&
    /invoiceService\.createPaymentSession\s*\(/.test(uiContent) &&
    authorityContent.includes('/v1/invoices/${invoiceId}/payments')
  ) {
    authorityEvidence.push('invoice-payment-session-api-authority');
  }

  if (
    serviceImports.includes('invoice-service') &&
    /invoiceService\.(voidInvoice|writeOff|restoreFromWriteOff)\s*\(/.test(uiContent) &&
    authorityContent.includes('/v1/invoices/${invoiceId}/void') &&
    authorityContent.includes('/v1/invoices/${invoiceId}/write-off') &&
    authorityContent.includes('/v1/invoices/${invoiceId}/restore')
  ) {
    authorityEvidence.push('invoice-adjustment-api-authority');
  }

  if (
    serviceImports.includes('scheduling-rules-service') &&
    /schedulingRulesService\.(getCancellationPolicy|setCancellationPolicy)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/coaches/me/scheduling-rules')
  ) {
    authorityEvidence.push('scheduling-policy-api-authority');
  }

  if (
    (serviceImports.includes('recurring-booking-service') ||
      serviceImports.includes('family-recurring-service')) &&
    /(recurringBookingService\.(list|getById|createRecurring|getUserRecurringBookings|getCoachRecurringBookings|getActiveUserRecurringBookings|getActiveCoachRecurringBookings|cancelRecurring|pauseRecurring|resumeRecurring|updateRecurring)|familyRecurringService\.listPlansForParent)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/booking-series')
  ) {
    authorityEvidence.push('booking-series-api-authority');
  }

  if (
    serviceImports.includes('org-staffing-service') &&
    /orgStaffingService\.(getConsoleData|assignOffering)\s*\(/.test(uiContent) &&
    authorityContent.includes('/staffing-console') &&
    authorityContent.includes('/work-assignments/')
  ) {
    authorityEvidence.push('club-work-assignment-api-authority');
  }

  if (
    serviceImports.includes('group-session-service') &&
    /groupSessionService\.(listSessions|getSession|createSession|publishSession|cancelSession|register|cancelRegistration|listRoster|markAttendance|updateOffPlatformAttendees|cancelRecurringInstance|endRecurringSeries)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/group-sessions')
  ) {
    authorityEvidence.push('group-session-api-authority');
  }

  if (
    (serviceImports.includes('safety-service') || serviceImports.includes('consent-service')) &&
    /(safetyService\.(getEmergencyInfo|updateEmergencyInfo|updateMedicalInfo|updateConsent|addContact|updateContact|removeContact|getAthleteEmergency)|consentService\.(getAthleteConsents|getRosterConsents|getConsentSummary|checkConsent))\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/athletes/${apiAthleteId}/medical') &&
    authorityContent.includes('/v1/athletes/${apiAthleteId}/emergency-contacts') &&
    authorityContent.includes('/v1/athletes/${apiAthleteId}/consents') &&
    /assertCan(Read|Write)AthleteMedical/.test(authorityContent) &&
    /action: "medical\.read"[\s\S]*sensitiveRead: true/.test(authorityContent) &&
    /action: "emergency_contacts\.read"[\s\S]*sensitiveRead: true/.test(authorityContent) &&
    /action: "consents\.read"[\s\S]*sensitiveRead: true/.test(authorityContent)
  ) {
    authorityEvidence.push('athlete-medical-api-authority');
  }

  if (
    serviceImports.includes('child-service') &&
    /childService\.(getChildren|getChild|createChild|updateChild|addDisability|removeDisability|addSpecialNeed|removeSpecialNeed|getChildrenWithSpecialNeeds)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/families/${contextResult.data.familyId}') &&
    authorityContent.includes('/v1/athletes/${childId}') &&
    authorityContent.includes('ensureCanReadAthleteProfile') &&
    /action: "athlete\.read"[\s\S]*sensitiveRead: true/.test(authorityContent)
  ) {
    authorityEvidence.push('child-profile-api-authority');
  }

  if (
    serviceImports.includes('child-service') &&
    /childService\.(getChildren|getChild|createChild|updateChild|getChildrenWithSpecialNeeds)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('hydrateChildTrustData') &&
    authorityContent.includes('syncTrustSensitiveChildData') &&
    authorityContent.includes('safetyService.getEmergencyInfo') &&
    authorityContent.includes('safetyService.updateEmergencyInfo') &&
    authorityContent.includes('/v1/athletes/${apiAthleteId}/medical') &&
    authorityContent.includes('/v1/athletes/${apiAthleteId}/emergency-contacts') &&
    authorityContent.includes('/v1/athletes/${apiAthleteId}/consents') &&
    /assertCan(Read|Write)AthleteMedical/.test(authorityContent) &&
    /action: "medical\.read"[\s\S]*sensitiveRead: true/.test(authorityContent) &&
    /action: "emergency_contacts\.read"[\s\S]*sensitiveRead: true/.test(authorityContent) &&
    /action: "consents\.read"[\s\S]*sensitiveRead: true/.test(authorityContent)
  ) {
    authorityEvidence.push('child-trust-sensitive-api-authority');
  }

  if (
    serviceImports.includes('child-service') &&
    /childService\.(createChild|updateChild|addDisability|removeDisability|addSpecialNeed|removeSpecialNeed)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('apiFetch<ApiFamilyAthlete>(\'/v1/athletes\'') &&
    authorityContent.includes('/v1/athletes/${childId}') &&
    authorityContent.includes('app.post("/athletes"') &&
    authorityContent.includes('app.patch("/athletes/:athleteId"') &&
    authorityContent.includes('repository.hasFamilyMembership') &&
    /action: "athlete\.create"/.test(authorityContent) &&
    /action: "athlete\.update"/.test(authorityContent)
  ) {
    authorityEvidence.push('child-profile-write-api-authority');
  }

  if (
    serviceImports.includes('injury-service') &&
    /injuryService\.(getUserInjuriesForActor|getUserInjuries|getAthleteInjuries|logInjury|updateInjury|markAsHealed|markAsHealedForActor)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/athletes/${athleteId}/injuries') &&
    authorityContent.includes('/v1/injuries/${id}') &&
    /assertCan(Read|Write)AthleteHealth/.test(authorityContent) &&
    /action: "athlete_injury\.read"[\s\S]*sensitiveRead: true/.test(authorityContent)
  ) {
    authorityEvidence.push('athlete-injury-api-authority');
  }

  if (
    (serviceImports.includes('trust') ||
      serviceImports.includes('trust/safeguarding-service') ||
      serviceImports.includes('concern-service')) &&
    /(safeguardingService\.(createIncident|getIncident|addAction)|concernService\.raiseConcern)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/safeguarding/incidents') &&
    authorityContent.includes('/v1/safeguarding/incidents/${incidentId}/actions') &&
    authorityContent.includes('assertCanCreateSafeguardingIncident') &&
    authorityContent.includes('assertCanAccessSafeguardingIncident') &&
    /action: 'safeguarding_incident\.read'[\s\S]*sensitiveRead: true/.test(authorityContent)
  ) {
    authorityEvidence.push('safeguarding-api-authority');
  }

  if (
    serviceImports.includes('match-service') &&
    /matchService\.(getClubMatches|getUpcomingMatches|getPastMatches|getMatch|createMatch|invitePlayers|respondToMatch|setLineup|recordResult|cancelMatch)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/clubs/${encodeURIComponent(clubId)}/matches') &&
    authorityContent.includes('/v1/matches/${encodeURIComponent(matchId)}') &&
    authorityContent.includes('/v1/matches/${encodeURIComponent(input.matchId)}/players/respond') &&
    authorityContent.includes('/v1/matches/${encodeURIComponent(input.matchId)}/lineup')
  ) {
    authorityEvidence.push('match-api-authority');
  }

  if (
    serviceImports.includes('social-feed-service') &&
    /(clubFeedService|socialFeedService)\.(createPostAuthority|getFeedAuthority|toggleReactionAuthority)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('apiFetch<ApiPostCreateResponse>("/v1/posts"') &&
    authorityContent.includes('/v1/posts?clubId=${encodeURIComponent(clubId)}') &&
    authorityContent.includes('/v1/posts/${encodeURIComponent(postId)}/reactions/toggle')
  ) {
    authorityEvidence.push('post-api-authority');
  }

  if (
    serviceImports.includes('comment-service') &&
    /commentService\.(getCommentsForPost|getCommentCount|createComment|deleteComment|toggleLike|getLatestComment)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('/v1/posts/${encodeURIComponent(postId)}/comments') &&
    authorityContent.includes('/v1/posts/${encodeURIComponent(input.postId)}/comments') &&
    authorityContent.includes('/v1/comments/${encodeURIComponent(input.commentId)}') &&
    authorityContent.includes('/v1/comments/${encodeURIComponent(input.commentId)}/reactions/toggle')
  ) {
    authorityEvidence.push('comment-api-authority');
  }

  if (
    (serviceImports.includes('community-service') ||
      serviceImports.includes('community') ||
      serviceImports.includes('community/community-messaging-service')) &&
    /communityService\.(getGroup|getGroupMessages|sendGroupMessage|markMessagesRead)\s*\(/.test(
      uiContent,
    ) &&
    authorityContent.includes('"/v1/community-groups"') &&
    authorityContent.includes('"/v1/message-threads"') &&
    authorityContent.includes('/v1/community-groups/${encodeURIComponent(groupId)}/messages') &&
    authorityContent.includes('/v1/community-groups/${encodeURIComponent(groupId)}/messages/read')
  ) {
    authorityEvidence.push('community-chat-api-authority');
  }

  return {
    hookImports,
    serviceImports,
    authorityEvidence,
  };
}

function importsNativeAlert(content) {
  return (
    /Alert\.(alert|prompt)/.test(content) ||
    /import\s*\{[^}]*\bAlert\b[^}]*\}\s*from\s*['"]react-native['"]/.test(content)
  );
}

function hasStalePlaceholder(content) {
  return (
    /TODO|FIXME|\bmock\b|coming soon|not implemented|stubbed/i.test(content) ||
    /\bplaceholder\s+(copy|data|state|screen|content|route|implementation)\b/i.test(content)
  );
}

function riskIsCovered(flag, authorityEvidence) {
  if (flag === 'money-hard-wall-check') {
    return (
      authorityEvidence.includes('booking-cancel-api-authority') ||
      authorityEvidence.includes('scheduling-policy-api-authority') ||
      authorityEvidence.some((evidence) => evidence.startsWith('invoice-'))
    );
  }

  if (flag === 'sensitive-read-audit-check') {
    return (
      authorityEvidence.includes('child-profile-api-authority') ||
      authorityEvidence.includes('child-trust-sensitive-api-authority') ||
      authorityEvidence.includes('athlete-medical-api-authority') ||
      authorityEvidence.includes('athlete-injury-api-authority') ||
      authorityEvidence.includes('safeguarding-api-authority')
    );
  }

  return false;
}

function needsImplementationForRiskFlags(riskFlags, authorityEvidence) {
  return riskFlags.some(
    (flag) => IMPLEMENTATION_RISK_FLAGS.has(flag) && !riskIsCovered(flag, authorityEvidence),
  );
}

function isStaticLegalCopyRoute(file) {
  return /^app\/settings\/(privacy-policy|terms)\.tsx$/.test(file);
}

function stripDecorativeIconNames(content) {
  return content
    .replace(/\bicon\s*:\s*['"][^'"]+['"]/g, '')
    .replace(/\bname\s*=\s*['"][^'"]+-outline['"]/g, '');
}

function hasRuntimeDataSource(content, context) {
  return (
    context.serviceImports.length > 0 ||
    /fetch\s*\(|AsyncStorage|localStorage/.test(content)
  );
}

function filterRiskFlags(flags, content, context) {
  if (hasRuntimeDataSource(content, context)) {
    return flags;
  }

  return flags.filter((flag) => flag !== 'sensitive-read-audit-check');
}

function getRiskFlags(content, file) {
  const flags = [];
  const staticLegalCopy = isStaticLegalCopyRoute(file);
  const keywordContent = stripDecorativeIconNames(content);

  if (/AsyncStorage|localStorage/.test(keywordContent)) flags.push('local-storage-authority-check');
  if (importsNativeAlert(keywordContent)) flags.push('native-alert-check');
  if (/fetch\s*\(/.test(keywordContent)) flags.push('direct-fetch-check');
  if (/ActivityIndicator/.test(keywordContent)) flags.push('spinner-check');
  if (/router\.(push|replace)\(\s*['"`]/.test(keywordContent)) flags.push('route-literal-check');
  if (hasStalePlaceholder(keywordContent)) flags.push('stale-placeholder-check');
  if (/commentsEnabled|comment/i.test(keywordContent) && /post|feed/i.test(keywordContent))
    flags.push('comment-control-check');
  if (
    !staticLegalCopy &&
    /refund|writeOff|write-off|markPaid|MARKED_PAID|voidPayment|voidInvoice|voidTransaction|voidCharge/i.test(
      keywordContent,
    )
  )
    flags.push('money-hard-wall-check');
  if (!staticLegalCopy && /medical|consent|emergency|safeguard/i.test(keywordContent))
    flags.push('sensitive-read-audit-check');

  return flags;
}

function auditRoute(file) {
  const absolutePath = path.join(ROOT, file);
  const content = readFileSync(absolutePath, 'utf8');
  const classification = classifyRoute(file);
  const loading = resolveLoadingRouteEntry(file);
  const context = collectRouteContext(content);
  const riskFlags = filterRiskFlags(getRiskFlags(content, file), content, context);
  const needsImplementation = needsImplementationForRiskFlags(
    riskFlags,
    context.authorityEvidence,
  );

  return {
    file,
    route: routePathFromFile(file),
    pdos: classification.pdos,
    verdict: classification.verdict,
    personas: classification.personas,
    job: classification.job,
    loadingStrategy: loading?.strategy ?? 'missing',
    loadingOwner: loading?.owner ?? 'missing',
    serviceImports: context.serviceImports,
    hookImports: context.hookImports,
    authorityEvidence: context.authorityEvidence,
    riskFlags,
    hasAuthorityImport: context.serviceImports.length > 0 || context.authorityEvidence.length > 0,
    needsDecision: classification.verdict === 'REVIEW',
    needsImplementation,
  };
}

function buildReport() {
  const routeFiles = listFiles(['app'], { extensions: ['.tsx'] });
  const routes = routeFiles.map(auditRoute);
  const byPdos = {};
  const byVerdict = {};

  for (const route of routes) {
    byPdos[route.pdos] = (byPdos[route.pdos] ?? 0) + 1;
    byVerdict[route.verdict] = (byVerdict[route.verdict] ?? 0) + 1;
  }

  const decisionRoutes = routes.filter((route) => route.needsDecision);
  const implementationRoutes = routes.filter((route) => route.needsImplementation);

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      routes: routes.length,
      needsDecision: decisionRoutes.length,
      needsImplementation: implementationRoutes.length,
      byPdos,
      byVerdict,
    },
    routes,
  };
}

function toMarkdown(report) {
  const lines = [];

  lines.push('# PDOS Route Authority Audit');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Routes: ${report.totals.routes}`);
  lines.push(`Needs decision: ${report.totals.needsDecision}`);
  lines.push(`Needs implementation: ${report.totals.needsImplementation}`);
  lines.push('');
  lines.push('## Summary By Sprint');
  lines.push('');
  for (const [pdos, count] of Object.entries(report.totals.byPdos).sort()) {
    lines.push(`- ${pdos}: ${count}`);
  }
  lines.push('');
  lines.push('## Summary By Verdict');
  lines.push('');
  for (const [verdict, count] of Object.entries(report.totals.byVerdict).sort()) {
    lines.push(`- ${verdict}: ${count}`);
  }
  lines.push('');
  lines.push('## Decision Queue');
  lines.push('');

  const decisionRoutes = report.routes.filter((route) => route.needsDecision);
  if (decisionRoutes.length === 0) {
    lines.push('- None.');
  } else {
    for (const route of decisionRoutes) {
      lines.push(`- ${route.file} -> ${route.pdos} / ${route.verdict} / ${route.job}`);
      if (route.riskFlags.length > 0) {
        lines.push(`  Risks: ${route.riskFlags.join(', ')}`);
      }
      if (route.serviceImports.length > 0) {
        lines.push(`  Services: ${route.serviceImports.join(', ')}`);
      }
      if (route.authorityEvidence.length > 0) {
        lines.push(`  Evidence: ${route.authorityEvidence.join(', ')}`);
      }
    }
  }

  lines.push('');
  lines.push('## Implementation Risk Queue');
  lines.push('');

  const implementationRoutes = report.routes.filter((route) => route.needsImplementation);
  if (implementationRoutes.length === 0) {
    lines.push('- None.');
  } else {
    for (const route of implementationRoutes) {
      lines.push(`- ${route.file} -> ${route.pdos} / ${route.verdict} / ${route.job}`);
      if (route.riskFlags.length > 0) {
        lines.push(`  Risks: ${route.riskFlags.join(', ')}`);
      }
      if (route.serviceImports.length > 0) {
        lines.push(`  Services: ${route.serviceImports.join(', ')}`);
      }
      if (route.authorityEvidence.length > 0) {
        lines.push(`  Evidence: ${route.authorityEvidence.join(', ')}`);
      }
    }
  }

  lines.push('');
  lines.push('## Full Route Matrix');
  lines.push('');
  lines.push('| Route file | PDOS | Verdict | Loading | Job | Risks | Evidence |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- |');

  for (const route of report.routes) {
    lines.push(
      `| \`${route.file}\` | ${route.pdos} | ${route.verdict} | ${route.loadingStrategy} | ${route.job} | ${route.riskFlags.join(', ') || '-'} | ${route.authorityEvidence.join(', ') || '-'} |`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function writeReport(report) {
  const reviewsDir = path.join(ROOT, 'reviews');
  mkdirSync(reviewsDir, { recursive: true });
  writeFileSync(
    path.join(reviewsDir, 'pdos-route-authority-audit.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  writeFileSync(path.join(reviewsDir, 'pdos-route-authority-audit.md'), toMarkdown(report));
}

function printText(report) {
  console.log('PDOS route authority audit');
  console.log(`- routes: ${report.totals.routes}`);
  console.log(`- needsDecision: ${report.totals.needsDecision}`);
  console.log(`- needsImplementation: ${report.totals.needsImplementation}`);
  console.log('');
  console.log('By PDOS:');
  for (const [pdos, count] of Object.entries(report.totals.byPdos).sort()) {
    console.log(`- ${pdos}: ${count}`);
  }
  console.log('');
  console.log('By verdict:');
  for (const [verdict, count] of Object.entries(report.totals.byVerdict).sort()) {
    console.log(`- ${verdict}: ${count}`);
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildReport();

  if (options.write) {
    writeReport(report);
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (options.markdown) {
    console.log(toMarkdown(report));
  } else {
    printText(report);
  }

  if (
    options.strict &&
    (report.totals.needsDecision > 0 || report.totals.needsImplementation > 0)
  ) {
    process.exitCode = 1;
  }
}

main();
