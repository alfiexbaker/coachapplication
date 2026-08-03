import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const coveragePath = new URL(
  "../../reviews/ios-native-audit/coverage.csv",
  import.meta.url,
);
const expectedHeaders = [
  "id",
  "flow_id",
  "flow_name",
  "role",
  "route",
  "screen",
  "state",
  "device",
  "environment",
  "entry_path",
  "preconditions",
  "step_number",
  "branch",
  "action",
  "expected_transition",
  "actual_transition",
  "api_endpoint",
  "api_result",
  "request_id",
  "database_tables",
  "database_result",
  "rls_result",
  "audit_event",
  "sentry_issue",
  "sentry_result",
  "affected_roles",
  "affected_role_result",
  "purpose_clear",
  "primary_action_clear",
  "unnecessary_ui",
  "generic_ai_patterns",
  "copy_direct",
  "native_behavior",
  "football_specific",
  "visual_consistency",
  "accessibility",
  "status",
  "severity",
  "evidence",
  "issue",
  "fix_commit",
  "retest_status",
  "notes",
];

const fixCommit = "fix(family): make player support updates atomic";
const finalReport =
  "reviews/ios-native-audit/runtime/2026-08-01/edit-child-support-audit-final-5";
const addChildRegression =
  "reviews/ios-native-audit/runtime/2026-08-01/add-child-shared-support-regression-final";
const databaseEvidence =
  "reviews/ios-native-audit/runtime/2026-08-01/edit-child-support-audit-final-2/db-support-authority.md";
const sentryEvidence =
  "reviews/ios-native-audit/runtime/2026-08-01/edit-child-support-audit-final-2/sentry.md";

function evidenceRow(values) {
  const unknown = Object.keys(values).filter((key) => !expectedHeaders.includes(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown coverage fields for ${values.id}: ${unknown.join(", ")}`);
  }
  return expectedHeaders.map((header) => values[header] ?? "");
}

const routeRow = evidenceRow({
  id: "ROUTE-005",
  flow_id: "EDIT-CHILD-SUPPORT-ROUTE",
  flow_name: "Player support route coverage",
  role: "assigned family profile manager; denied guardian; coach; athlete; club admin",
  route: "app/(modal)/edit-child-sen.tsx | /edit-child-sen",
  screen: "Player support",
  state: "loading; ready; draft; saving; rejected; denied; not found",
  device: "iPhone 16 Pro responsive browser viewport; iPhone 16 Pro Max native blocker proof",
  environment: "local Expo web with staging authority reads and intercepted PATCH",
  entry_path: "Family player profile support action; direct protected route",
  preconditions: "Assigned player and MANAGE_PROFILE or ADMIN family permission",
  step_number: "1",
  branch: "authorized editor; unauthorized roles; missing player; failed save",
  action: "Authorize before fetch, edit support records and guidance locally, save once, and exit denied states",
  expected_transition: "Only an assigned family profile manager sees sensitive support controls; one atomic save owns the mutation",
  actual_transition: "Parent ready and failure branches passed; guardian, coach, athlete, and club admin saw a focused denial before support data or controls",
  api_endpoint: "GET/PATCH /v1/athletes/:athleteId",
  api_result: "6/6 UI flows and 28/28 Fastify family-athlete route tests passed",
  database_tables: "Family | FamilyMembership | GuardianChildLink | Athlete | ChildSenTag | AuditEvent",
  database_result: "Intercepted 503 left staging athlete version and support data unchanged; legacy ADHD tag remained visible through API projection",
  rls_result: "Focused current relations passed; Fastify assignment and permission boundary is authoritative; SEC-004 remains open",
  audit_event: "API tests prove athlete.update SUCCESS and safe DENY metadata; intercepted UI failure created no product event",
  sentry_result: "Issue read blocked by HTTP 403 under ENV-004; no issue data or state returned",
  affected_roles: "parent; guardian; coach; athlete; club admin",
  affected_role_result: "Authorized parent 2/2; every unauthorized role 1/1 denied before sensitive controls",
  purpose_clear: "passed",
  primary_action_clear: "passed",
  unnecessary_ui: "duplicate cards, always-open diagnosis controls, and dead per-row network actions removed",
  generic_ai_patterns: "generated-looking catalogue, padded helper copy, and speculative support completeness removed",
  copy_direct: "Player support; Conditions and access needs; Session adjustments; Coach guidance; Save support changes",
  native_behavior: "Actual iOS app visually open; semantic target run remains honestly blocked by ENV-006",
  football_specific: "support is framed around coaching guidance and session adjustments",
  visual_consistency: "flat dark hierarchy, one footer action, existing tokens, progressive disclosure",
  accessibility: "named back, add, remove, radio, input, and save controls; header and back control verified in viewport and unobscured; back, save, and remove targets verified at least 44 by 44",
  status: "fixed",
  severity: "high",
  evidence: `app/(modal)/edit-child-sen.tsx | hooks/use-edit-child-sen.ts | scripts/ui-flow-checks-50.mjs | ${finalReport}/report.json`,
  issue: "The route inventory had no runtime proof and the old screen mixed eager sensitive controls with piecemeal writes",
  fix_commit: fixCommit,
  retest_status: "Five role preflights and 6/6 strict target flows passed with zero medium or high findings",
  notes: "The deliberate UI PATCH failure was intercepted locally; no destructive or production test was run.",
});

const appendedRows = [
  evidenceRow({
    id: "UI-039",
    flow_id: "LEAN-PLAYER-SUPPORT-EDITOR",
    flow_name: "Focused player-support editor",
    role: "assigned family profile manager",
    route: "/edit-child-sen",
    screen: "Player support",
    state: "ready; adding condition; adding adjustment; dirty; saving; rejected",
    device: "iPhone 16 Pro responsive browser viewport",
    environment: "local Expo web with staging reads and intercepted PATCH",
    entry_path: "Family player profile support action",
    preconditions: "Assigned player and MANAGE_PROFILE or ADMIN family permission",
    step_number: "1",
    branch: "existing legacy support; new condition; new adjustment; coaching notes; failed atomic save",
    action: "Reveal only the requested editor, draft every change locally, then submit once",
    expected_transition: "A direct support workflow with progressive disclosure, no diagnosis wall, and one outcome-labelled action",
    actual_transition: "Live ADHD support rendered; Dyslexia, a communication preference, Extra processing time, and both guidance fields stayed in draft after the intentional 503",
    api_endpoint: "intercepted PATCH /v1/athletes/:athleteId",
    api_result: "Intentional 503 rendered inline and was exactly reconciled",
    database_tables: "Athlete | ChildSenTag",
    database_result: "No staging mutation; draft survived the failed save",
    rls_result: "Support fetch is gated by family-athlete manage authority before sensitive data is requested",
    audit_event: "No product event expected for the locally intercepted failure",
    sentry_result: "Target flow emitted only the declared 503; Sentry issue read remained blocked by ENV-004",
    affected_roles: "parent; delegated family profile manager",
    affected_role_result: "Authorized fixture passed; unauthorized fixtures never saw support controls",
    purpose_clear: "passed",
    primary_action_clear: "passed",
    unnecessary_ui: "always-expanded selectors, duplicate cards, immediate row writes, and ornamental surfaces removed",
    generic_ai_patterns: "diagnosis catalogue, vague headings, inflated explanation, and generated-looking completeness removed",
    copy_direct: "Player support; Add condition; Add adjustment; Save support changes",
    native_behavior: "Existing native-compatible inputs and radio controls retained; target native semantics blocked by ENV-006",
    football_specific: "session adjustments and coach guidance describe the practical training outcome",
    visual_consistency: "existing dark theme and spacing tokens with a flat section hierarchy and fixed footer action",
    accessibility: "explicit labels, checked radio states, named add/remove controls, inline alert, busy action, unobscured header and named back control; key actions verified at least 44 by 44",
    status: "fixed",
    severity: "high",
    evidence: `app/(modal)/edit-child-sen.tsx | components/family/medical-special-needs-form-sections.tsx | ${finalReport}/parent__parent_edit_child_support_ready.png | ${finalReport}/parent__parent_edit_child_support_interactions.png | ${addChildRegression}/report.json`,
    issue: "The previous editor looked generated, exposed too much at once, and saved sensitive rows independently",
    fix_commit: fixCommit,
    retest_status: "Parent ready and full interaction flows passed after post-settle visibility and occlusion checks; shared add-player support regression passed 5/5",
    notes: "Empty guidance values intentionally clear saved notes in the single supported update.",
  }),
  evidenceRow({
    id: "API-010",
    flow_id: "ATHLETE-SUPPORT-PATCH-AUTHORITY",
    flow_name: "Strict atomic audited player-support update",
    role: "assigned family profile manager; unauthorized caller",
    route: "GET/PATCH /v1/athletes/:athleteId",
    screen: "Fastify family-athlete authority",
    state: "authorized; forbidden; malformed nested support; excessive tags; surplus key; legacy tag-only read",
    device: "isolated Fastify seed process; read-only staging query",
    environment: "NODE_ENV=test API_DATA_BACKEND=seed; staging catalog read",
    entry_path: "childService.getChild and childService.updateChild",
    preconditions: "Authenticated caller, explicit athlete assignment, MANAGE_PROFILE or ADMIN family permission",
    step_number: "1",
    branch: "authorize before strict parse; transact supported fields; project legacy support when detailed JSON is empty",
    action: "Patch all support fields together, reject oversized or surplus nested input, and read a legacy tag-only athlete",
    expected_transition: "Only bounded supported data mutates atomically; every outcome is audited without raw support values; legacy support is not silently hidden",
    actual_transition: "An 11-tag payload with a private surplus key returned 400 with no version change and safe DENY fields; the live ADHD tag projected into the response; valid support produced SUCCESS audit metadata",
    api_endpoint: "GET/PATCH /v1/athletes/:athleteId",
    api_result: "28/28 family-athlete route tests passed",
    database_tables: "Family | FamilyMembership | GuardianChildLink | Athlete | ChildSenTag | AuditEvent",
    database_result: "Authorized repository transaction owns Athlete support JSON, guidance notes, and ChildSenTag synchronization; staging checks were read-only",
    rls_result: "Repository is reachable only after Fastify manage-access enforcement; current focused relations expose no client grants",
    audit_event: "athlete.update SUCCESS with requestedFields; DENY with VALIDATION_FAILED and field names only; raw notes and secret values absent",
    sentry_result: "Not applicable to isolated tests; production issue read blocked under ENV-004",
    affected_roles: "family admin; delegated profile manager; view-only guardian; coach; athlete; club admin",
    affected_role_result: "Explicit assignment plus permission required; unrelated and narrower roles denied",
    purpose_clear: "passed",
    primary_action_clear: "passed",
    unnecessary_ui: "not applicable",
    generic_ai_patterns: "not applicable",
    copy_direct: "not applicable",
    native_behavior: "not applicable",
    football_specific: "bounded support categories, session adjustments, and coaching guidance",
    visual_consistency: "not applicable",
    accessibility: "not applicable",
    status: "fixed",
    severity: "critical",
    evidence: `apps/api/src/modules/family-athlete/routes.ts | apps/api/src/modules/family-athlete/routes.test.ts | apps/api/src/repositories/p0/family-athlete-repository.ts | ${databaseEvidence}`,
    issue: "Nested support input was insufficiently bounded and legacy ChildSenTag rows disappeared when detailed support JSON was empty",
    fix_commit: fixCommit,
    retest_status: "28/28 route tests, API typecheck, and focused read-only legacy-data proof passed",
    notes: "No staging support write was made. A future authorized save synchronizes legacy tag rows inside the existing transaction.",
  }),
  evidenceRow({
    id: "QA-015",
    flow_id: "EDIT-CHILD-SUPPORT-NONDESTRUCTIVE-INTERACTIONS",
    flow_name: "Player-support cross-role and failure proof",
    role: "parent; guardian; coach; athlete; admin",
    route: "scripts/ui-flow-checks-50.mjs | /edit-child-sen",
    screen: "Player support audit profile",
    state: "ready; progressive disclosure; draft controls; injected 503; four denied outcomes",
    device: "iPhone 16 Pro responsive viewport; iPhone 16 Pro Max native blocker proof",
    environment: "local Expo web with staging reads and intercepted PATCH",
    entry_path: "Direct protected route",
    preconditions: "All five role preflights passed",
    step_number: "1",
    branch: "authorized parent; denied guardian, coach, athlete, and admin",
    action: "Assert lean copy, exercise condition, preference, adjustment and guidance controls, reject one save, then verify each denial and exit",
    expected_transition: "Every declared branch passes without staging mutation, hidden header controls, or undeclared medium/high findings",
    actual_transition: "6/6 passed; the parent draft retained Dyslexia, Extra processing time, and inline failure; all denied roles showed no support controls",
    api_endpoint: "intercepted PATCH /v1/athletes/:athleteId",
    api_result: "503 fulfilled locally; no upstream mutation",
    database_tables: "Family | FamilyMembership | GuardianChildLink | Athlete | ChildSenTag | AuditEvent",
    database_result: "Staging athlete version and support values remained unchanged",
    rls_result: "Unauthorized UI roles fail before sensitive controls; API tests independently prove the authority boundary",
    audit_event: "No API audit expected for the intercepted UI write; isolated route tests prove success and denial auditing",
    sentry_result: `HTTP 403 under ENV-004; ${sentryEvidence}`,
    affected_roles: "parent; guardian; coach; athlete; admin",
    affected_role_result: "Parent 2/2; every denied role 1/1",
    purpose_clear: "not applicable",
    primary_action_clear: "passed",
    unnecessary_ui: "absence assertions passed",
    generic_ai_patterns: "absence assertions passed",
    copy_direct: "passed",
    native_behavior: "Actual iOS app visually open; semantic target run honestly blocked by ENV-006",
    football_specific: "player support, session adjustments, and coach guidance",
    visual_consistency: "ready, failure, and denied screenshots retained",
    accessibility: "named controls exercised; post-actions proved the header and back control were visible, in viewport, and unobscured; back, save, and remove targets met the 44 by 44 minimum",
    status: "fixed",
    severity: "high",
    evidence: `scripts/ui-flow-checks-50.mjs | ${finalReport}/report.json | ${finalReport}/parent__parent_edit_child_support_interactions.png`,
    issue: "No deterministic role-aware proof covered the support editor, progressive disclosure, failed atomic save, denied exits, or header occlusion",
    fix_commit: fixCommit,
    retest_status: "Strict five-role preflight and 6/6 target profile passed with zero medium or high findings",
    notes: "The intentional 503 is reconciled only within the failure branch; post-settle checks prevent stale or obscured output from counting as evidence.",
  }),
  evidenceRow({
    id: "SEC-010",
    flow_id: "PLAYER-SUPPORT-RLS-AUTHORITY",
    flow_name: "Player-support and audit-event staging database posture",
    role: "system",
    route: "Supabase Postgres catalog | family and support authority relations",
    screen: "Database authority",
    state: "57 migrations; current RLS, grants, policies, principal, support values, and legacy tags inspected",
    device: "read-only staging catalog",
    environment: "staging database",
    entry_path: "database preflight plus focused catalog and support-value query",
    preconditions: "Staging DATABASE_URL; never production",
    step_number: "1",
    branch: "current objects versus future default privileges; before and after intercepted UI failure",
    action: "Inspect Family, FamilyMembership, GuardianChildLink, Athlete, ChildSenTag, and AuditEvent without changing data",
    expected_transition: "Current player-support data remains unreachable to direct client roles and the intercepted failure writes nothing",
    actual_transition: "All focused current relations passed; athlete stayed at version 1 with unchanged support values; live ADHD legacy tag was present; global preflight remains blocked by 25 supabase_admin future-default findings",
    api_endpoint: "Postgres catalog and focused read-only Prisma query",
    api_result: "Read-only queries completed; Supabase MCP unavailable under ENV-003",
    database_tables: "_prisma_migrations | Family | FamilyMembership | GuardianChildLink | Athlete | ChildSenTag | AuditEvent",
    database_result: "57/57 migrations; no row mutation; legacy ADHD tag confirmed",
    rls_result: "RLS enabled and not forced; no PUBLIC, anon, or authenticated grants; zero direct policies on focused relations",
    audit_event: "No product audit expected for catalog reads or the intercepted UI failure",
    sentry_result: "not applicable",
    affected_roles: "all roles",
    affected_role_result: "Direct client roles cannot reach focused current objects",
    purpose_clear: "passed for current objects; SEC-004 remains open",
    primary_action_clear: "requires privileged future-default fix",
    unnecessary_ui: "not applicable",
    generic_ai_patterns: "not applicable",
    copy_direct: "not applicable",
    native_behavior: "not applicable",
    football_specific: "protects minor support needs, coaching guidance, assignment authority, and audit trail",
    visual_consistency: "not applicable",
    accessibility: "not applicable",
    status: "fixed",
    severity: "critical",
    evidence: `${databaseEvidence} | scripts/db-staging-preflight.js`,
    issue: "No current-object exposure was found; the existing supabase_admin future-default blocker still prevents release approval",
    fix_commit: fixCommit,
    retest_status: "57/57 migrations and focused relation and support-value checks passed read-only",
    notes: "service_role retains trusted direct authority and must never enter a client bundle. The connected postgres principal cannot alter supabase_admin defaults.",
  }),
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const repoRoot = new URL("../../", import.meta.url).pathname;
const csvText = execFileSync(
  "git",
  ["show", "HEAD:reviews/ios-native-audit/coverage.csv"],
  { cwd: repoRoot, encoding: "utf8" },
);
const workbook = await Workbook.fromCSV(csvText, { sheetName: "Coverage" });
const sheet = workbook.worksheets.getItem("Coverage");
const existingRows = sheet.getUsedRange().values;

if (existingRows.length !== 223) {
  throw new Error(`Expected 223 rows including header, found ${existingRows.length}`);
}
if (JSON.stringify(existingRows[0]) !== JSON.stringify(expectedHeaders)) {
  throw new Error("Coverage headers no longer match the 43-column evidence contract");
}

const routeIndex = existingRows.findIndex((row) => row[0] === "ROUTE-005");
if (routeIndex < 1) {
  throw new Error("ROUTE-005 was not found");
}

sheet.getRangeByIndexes(routeIndex, 0, 1, expectedHeaders.length).values = [routeRow];
sheet.getRangeByIndexes(
  existingRows.length,
  0,
  appendedRows.length,
  expectedHeaders.length,
).values = appendedRows;

const finalValues = sheet
  .getRangeByIndexes(0, 0, 227, expectedHeaders.length)
  .values;
const ids = finalValues.slice(1).map((row) => String(row[0] ?? ""));
const expectedNewIds = ["UI-039", "API-010", "QA-015", "SEC-010"];

if (finalValues.some((row) => row.length !== expectedHeaders.length)) {
  throw new Error("At least one authored coverage row is not 43 columns wide");
}
if (ids.some((id) => id.length === 0)) {
  throw new Error("At least one coverage row has a blank id");
}
if (new Set(ids).size !== ids.length) {
  throw new Error("Coverage ids are not unique");
}
if (expectedNewIds.some((id) => !ids.includes(id))) {
  throw new Error("At least one new coverage id is missing");
}

const rawLines = csvText.trimEnd().split(/\r?\n/);
const rawRouteIndex = rawLines.findIndex((line) => line.startsWith("ROUTE-005,"));
if (rawRouteIndex < 1) {
  throw new Error("Raw ROUTE-005 row was not found");
}
rawLines[rawRouteIndex] = routeRow.map(csvCell).join(",");
rawLines.push(...appendedRows.map((row) => row.map(csvCell).join(",")));
const serialized = `${rawLines.join("\n")}\n`;
await fs.writeFile(coveragePath, serialized, "utf8");

const verificationText = await fs.readFile(coveragePath, "utf8");
const verificationWorkbook = await Workbook.fromCSV(verificationText, {
  sheetName: "Coverage",
});
const verificationSheet = verificationWorkbook.worksheets.getItem("Coverage");
const verificationValues = verificationSheet.getUsedRange().values;
if (verificationValues.length !== 227) {
  throw new Error(`Expected 227 verified rows including header, found ${verificationValues.length}`);
}
if (verificationValues.some((row) => row.length !== expectedHeaders.length)) {
  throw new Error("The saved CSV did not round-trip as 43 columns");
}

verificationSheet.showGridLines = false;
verificationSheet.freezePanes.freezeRows(1);
verificationSheet.getRange("A1:AQ1").format = {
  fill: "#111827",
  font: { bold: true, color: "#FFFFFF" },
  rowHeight: 24,
};
verificationSheet.getRange("A224:G227").format = {
  fill: "#F8FAFC",
  font: { color: "#111827" },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "inside", style: "thin", color: "#CBD5E1" },
};
verificationSheet.getRange("A224:A227").format.columnWidth = 13;
verificationSheet.getRange("B224:B227").format.columnWidth = 38;
verificationSheet.getRange("C224:C227").format.columnWidth = 42;
verificationSheet.getRange("D224:D227").format.columnWidth = 42;
verificationSheet.getRange("E224:E227").format.columnWidth = 48;
verificationSheet.getRange("F224:F227").format.columnWidth = 30;
verificationSheet.getRange("G224:G227").format.columnWidth = 62;
verificationSheet.getRange("A224:G227").format.autofitRows();

const relevant = await verificationWorkbook.inspect({
  kind: "region",
  sheetId: "Coverage",
  range: "A224:G227",
  maxChars: 4500,
  tableMaxRows: 4,
  tableMaxCols: 7,
});
process.stdout.write(`${relevant.ndjson}\n`);

const errors = await verificationWorkbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "coverage error token scan",
});
process.stdout.write(`${errors.ndjson}\n`);

const preview = await verificationWorkbook.render({
  sheetName: "Coverage",
  range: "A224:G227",
  scale: 1,
  format: "png",
});
await fs.writeFile(
  new URL("coverage-after.png", import.meta.url),
  new Uint8Array(await preview.arrayBuffer()),
);

const verificationXlsx = await SpreadsheetFile.exportXlsx(verificationWorkbook);
await verificationXlsx.save(
  new URL("coverage-verification.xlsx", import.meta.url).pathname,
);

process.stdout.write(
  JSON.stringify(
    {
      rows: verificationValues.length - 1,
      columns: expectedHeaders.length,
      routeReplaced: "ROUTE-005",
      appended: expectedNewIds,
      uniqueIds: new Set(ids).size,
    },
    null,
    2,
  ) + "\n",
);
