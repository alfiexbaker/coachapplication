import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import {
  adminUserSummaryResponseSchema,
  apiVersionResponseSchema,
  athleteAnalyticsResponseSchema,
  athleteSkillHistoryResponseSchema,
  athleteSkillUpdateRequestSchema,
  athleteSkillUpdateResponseSchema,
  bookingListResponseSchema,
  bookingSeriesListResponseSchema,
  bookingSeriesResponseSchema,
  bookingResponseSchema,
  cancelBookingRequestSchema,
  cancelBookingSeriesRequestSchema,
  cancelBookingSeriesResponseSchema,
  clubMatchResponseSchema,
  clubInvitesResponseSchema,
  completeBookingRequestSchema,
  confirmBookingRequestSchema,
  createBookingRequestSchema,
  createBookingSeriesRequestSchema,
  createBookingSeriesResponseSchema,
  createClubInvitesRequestSchema,
  createClubInvitesResponseSchema,
  createClubMatchRequestSchema,
  createHeadCoachStandardRequestSchema,
  createHeadCoachTaskRequestSchema,
  headCoachOversightResponseSchema,
  headCoachStandardResponseSchema,
  headCoachTaskResponseSchema,
  importClubMatchesRequestSchema,
  importClubMatchesResponseSchema,
  joinClubRequestSchema,
  joinClubResponseSchema,
  listClubMatchesResponseSchema,
  ownerDashboardResponseSchema,
  pauseBookingSeriesRequestSchema,
  pauseBookingSeriesResponseSchema,
  practiceLogCreateRequestSchema,
  practiceLogListResponseSchema,
  practiceLogMutationResponseSchema,
  practiceLogTodayResponseSchema,
  reopenBookingRequestSchema,
  resumeBookingSeriesRequestSchema,
  resumeBookingSeriesResponseSchema,
  resolveBookingRequestSchema,
  resolveClubJoinCodeResponseSchema,
  respondToClubInviteRequestSchema,
  respondToClubInviteResponseSchema,
  staffingConsoleResponseSchema,
  updateBookingRequestSchema,
  updateBookingSeriesRequestSchema,
  updateBookingSeriesResponseSchema,
  updateHeadCoachStandardRequestSchema,
  updateHeadCoachTaskRequestSchema,
  userProfileResponseSchema,
  userSearchResponseSchema,
} from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';

const app = buildApp();

type OpenApiSchema = {
  $ref?: string;
  additionalProperties?: unknown;
  anyOf?: OpenApiSchema[];
  const?: unknown;
  description?: string;
  enum?: unknown[];
  items?: OpenApiSchema;
  maxItems?: number;
  minimum?: number;
  minLength?: number;
  minProperties?: number;
  oneOf?: OpenApiSchema[];
  pattern?: string;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  type?: string;
};

type JsonContent = {
  schema?: unknown;
  examples?: Record<string, { value?: unknown }>;
};

type OpenApiResponse = {
  description?: string;
  content?: {
    'application/json'?: JsonContent;
    'text/html'?: {
      schema?: unknown;
    };
  };
};

type OpenApiOperation = {
  operationId?: string;
  parameters?: Array<{ name?: string; in?: string; required?: boolean; schema?: unknown }>;
  requestBody?: {
    required?: boolean;
    content?: {
      'application/json'?: JsonContent;
    };
  };
  responses?: Record<string, OpenApiResponse | unknown>;
  security?: unknown[];
  summary?: string;
  tags?: string[];
  'x-clubroom-effect'?: string;
};

type OpenApiPayload = {
  openapi: string;
  info: { description?: string; version?: string };
  'x-clubroom-api-lifecycle': {
    currentMajor: string;
    status: string;
    breakingChangeStrategy: string;
    minimumDeprecationDays: number;
    deprecationHeaders: string[];
  };
  tags: Array<{ name: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    responses: Record<string, unknown>;
    schemas: Record<string, OpenApiSchema>;
    securitySchemes: Record<string, unknown>;
  };
};

function requestSchema(operation: OpenApiOperation | undefined): unknown {
  return operation?.requestBody?.content?.['application/json']?.schema;
}

function responseSchema(operation: OpenApiOperation | undefined, status: string): unknown {
  return (operation?.responses?.[status] as OpenApiResponse | undefined)?.content?.[
    'application/json'
  ]?.schema;
}

function requestExample(operation: OpenApiOperation | undefined): unknown {
  return operation?.requestBody?.content?.['application/json']?.examples?.example?.value;
}

function responseExample(operation: OpenApiOperation | undefined, status: string): unknown {
  return (operation?.responses?.[status] as OpenApiResponse | undefined)?.content?.[
    'application/json'
  ]?.examples?.example?.value;
}

function assertStaffingConsoleOpenApi(payload: OpenApiPayload): void {
  const operation = payload.paths['/v1/clubs/{clubId}/staffing-console']?.get as
    | OpenApiOperation
    | undefined;

  assert.equal(operation?.operationId, 'listClubStaffingConsole');
  assert.equal(operation?.['x-clubroom-effect'], 'list staffing console');
  assert.deepEqual(responseSchema(operation, '200'), {
    $ref: '#/components/schemas/StaffingConsoleResponse',
  });
  staffingConsoleResponseSchema.parse(responseExample(operation, '200'));
  assert.equal(payload.components.schemas.StaffingConsoleResponse.additionalProperties, false);
  assert.deepEqual(payload.components.schemas.StaffingConsoleResponse.required, [
    'club',
    'viewerMembership',
    'privilegedAdminAccess',
    'canManageAssignments',
    'staff',
    'unassignedWork',
    'assignedWork',
    'summary',
    'clubId',
    'requestId',
  ]);
  assert.deepEqual(payload.components.schemas.StaffingWorkItem.required, [
    'offeringId',
    'title',
    'scheduledAt',
    'location',
    'isVirtual',
    'status',
    'sessionType',
    'currentParticipants',
    'maxParticipants',
    'createdByUserId',
    'createdByName',
    'assigneeCoachId',
    'assigneeCoachName',
    'linkedBookingCount',
    'isRecurring',
  ]);
}

function assertHeadCoachOpenApi(payload: OpenApiPayload): void {
  const listOversight = payload.paths['/v1/clubs/{clubId}/head-coach/oversight']?.get as
    | OpenApiOperation
    | undefined;
  const createTask = payload.paths['/v1/clubs/{clubId}/head-coach/tasks']?.post as
    | OpenApiOperation
    | undefined;
  const updateTask = payload.paths['/v1/clubs/{clubId}/head-coach/tasks/{taskId}']?.patch as
    | OpenApiOperation
    | undefined;
  const createStandard = payload.paths['/v1/clubs/{clubId}/head-coach/standards']?.post as
    | OpenApiOperation
    | undefined;
  const updateStandard = payload.paths['/v1/clubs/{clubId}/head-coach/standards/{standardId}']
    ?.patch as OpenApiOperation | undefined;

  assert.equal(listOversight?.operationId, 'listHeadCoachOversight');
  assert.deepEqual(responseSchema(listOversight, '200'), {
    $ref: '#/components/schemas/HeadCoachOversightResponse',
  });
  headCoachOversightResponseSchema.parse(responseExample(listOversight, '200'));
  assert.equal(payload.components.schemas.HeadCoachOversightResponse.additionalProperties, false);
  assert.deepEqual(payload.components.schemas.HeadCoachSquad.required, [
    'id',
    'clubId',
    'name',
    'ageBandLabel',
    'memberCount',
    'ownerCoachId',
    'ownerCoachName',
    'nextSessionAt',
  ]);

  assert.equal(createTask?.operationId, 'createHeadCoachTask');
  assert.deepEqual(requestSchema(createTask), {
    $ref: '#/components/schemas/CreateHeadCoachTaskRequest',
  });
  assert.deepEqual(responseSchema(createTask, '201'), {
    $ref: '#/components/schemas/HeadCoachTaskResponse',
  });
  assert.equal(createTask?.responses?.['200'], undefined);
  createHeadCoachTaskRequestSchema.parse(requestExample(createTask));
  headCoachTaskResponseSchema.parse(responseExample(createTask, '201'));

  assert.equal(updateTask?.operationId, 'updateHeadCoachTask');
  assert.deepEqual(requestSchema(updateTask), {
    $ref: '#/components/schemas/UpdateHeadCoachTaskRequest',
  });
  assert.deepEqual(responseSchema(updateTask, '200'), {
    $ref: '#/components/schemas/HeadCoachTaskResponse',
  });
  updateHeadCoachTaskRequestSchema.parse(requestExample(updateTask));
  headCoachTaskResponseSchema.parse(responseExample(updateTask, '200'));

  assert.equal(createStandard?.operationId, 'createHeadCoachStandard');
  assert.deepEqual(requestSchema(createStandard), {
    $ref: '#/components/schemas/CreateHeadCoachStandardRequest',
  });
  assert.deepEqual(responseSchema(createStandard, '201'), {
    $ref: '#/components/schemas/HeadCoachStandardResponse',
  });
  assert.equal(createStandard?.responses?.['200'], undefined);
  createHeadCoachStandardRequestSchema.parse(requestExample(createStandard));
  headCoachStandardResponseSchema.parse(responseExample(createStandard, '201'));

  assert.equal(updateStandard?.operationId, 'updateHeadCoachStandard');
  assert.deepEqual(requestSchema(updateStandard), {
    $ref: '#/components/schemas/UpdateHeadCoachStandardRequest',
  });
  assert.deepEqual(responseSchema(updateStandard, '200'), {
    $ref: '#/components/schemas/HeadCoachStandardResponse',
  });
  updateHeadCoachStandardRequestSchema.parse(requestExample(updateStandard));
  headCoachStandardResponseSchema.parse(responseExample(updateStandard, '200'));
}

after(async () => {
  await app.close();
});

describe('meta documentation routes', () => {
  it('serves the generated OpenAPI document at /v1/openapi.json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/openapi.json',
    });

    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /application\/json/);

    const payload = res.json() as OpenApiPayload;
    const authMe = payload.paths['/v1/auth/me']?.get as OpenApiOperation | undefined;
    const getApiVersion = payload.paths['/v1/meta/version']?.get as
      | OpenApiOperation
      | undefined;
    const listAccessGrants = payload.paths['/v1/access-grants']?.get as
      | OpenApiOperation
      | undefined;
    const listRetentionRuns = payload.paths['/v1/admin/retention-runs']?.get as
      | OpenApiOperation
      | undefined;
    const reviewCoachVerification = payload.paths[
      '/v1/coaches/{coachId}/verifications/{type}/review'
    ]?.patch as OpenApiOperation | undefined;
    const authMePatch = payload.paths['/v1/auth/me']?.patch as OpenApiOperation | undefined;
    const getActiveUserSummary = payload.paths['/v1/admin/users/summary']?.get as
      | OpenApiOperation
      | undefined;
    const searchVisibleUsers = payload.paths['/v1/users/search']?.get as
      | OpenApiOperation
      | undefined;
    const getVisibleUserProfile = payload.paths['/v1/users/{userId}']?.get as
      | OpenApiOperation
      | undefined;
    const getAthleteAnalytics = payload.paths['/v1/athletes/{athleteId}/analytics']?.get as
      | OpenApiOperation
      | undefined;
    const getAthleteSkillHistory = payload.paths['/v1/athletes/{athleteId}/skills/history']?.get as
      | OpenApiOperation
      | undefined;
    const recordAthleteSkillUpdate = payload.paths['/v1/athletes/{athleteId}/skill-updates']
      ?.post as OpenApiOperation | undefined;
    const listAthletePracticeLogs = payload.paths['/v1/athletes/{athleteId}/practice-logs']?.get as
      | OpenApiOperation
      | undefined;
    const recordAthletePractice = payload.paths['/v1/athletes/{athleteId}/practice-logs']?.post as
      | OpenApiOperation
      | undefined;
    const getTodayAthletePracticeLog = payload.paths['/v1/athletes/{athleteId}/practice-logs/today']
      ?.get as OpenApiOperation | undefined;
    const createAthlete = payload.paths['/v1/athletes']?.post as
      | { responses?: Record<string, unknown> }
      | undefined;
    const checkEmail = payload.paths['/v1/auth/check-email']?.get as OpenApiOperation | undefined;
    const forgotPassword = payload.paths['/v1/auth/forgot-password']?.post as
      | OpenApiOperation
      | undefined;
    const login = payload.paths['/v1/auth/login']?.post as OpenApiOperation | undefined;
    const logout = payload.paths['/v1/auth/logout']?.post as OpenApiOperation | undefined;
    const refresh = payload.paths['/v1/auth/refresh']?.post as OpenApiOperation | undefined;
    const register = payload.paths['/v1/auth/register']?.post as OpenApiOperation | undefined;
    const resetPassword = payload.paths['/v1/auth/reset-password']?.post as
      | OpenApiOperation
      | undefined;
    const revokeSession = payload.paths['/v1/auth/revoke']?.post as OpenApiOperation | undefined;
    const verifyEmail = payload.paths['/v1/auth/verify-email']?.post as
      | OpenApiOperation
      | undefined;
    const earnings = payload.paths['/v1/coaches/me/earnings']?.get as OpenApiOperation | undefined;
    const payoutMethods = payload.paths['/v1/coaches/me/payout-methods']?.get as
      | OpenApiOperation
      | undefined;
    const createPayoutMethod = payload.paths['/v1/coaches/me/payout-methods']?.post as
      | OpenApiOperation
      | undefined;
    const removePayoutMethod = payload.paths['/v1/coaches/me/payout-methods/{methodId}']?.delete as
      | OpenApiOperation
      | undefined;
    const defaultPayoutMethod = payload.paths['/v1/coaches/me/payout-methods/{methodId}/default']
      ?.patch as OpenApiOperation | undefined;
    const withdrawals = payload.paths['/v1/coaches/me/withdrawals']?.get as
      | OpenApiOperation
      | undefined;
    const requestWithdrawal = payload.paths['/v1/coaches/me/withdrawals']?.post as
      | OpenApiOperation
      | undefined;
    const cancelWithdrawal = payload.paths['/v1/coaches/me/withdrawals/{withdrawalId}/cancel']
      ?.post as OpenApiOperation | undefined;
    const completeWithdrawal = payload.paths['/v1/coaches/me/withdrawals/{withdrawalId}/complete']
      ?.post as OpenApiOperation | undefined;
    const createPaymentSession = payload.paths['/v1/invoices/{invoiceId}/payments']?.post as
      | OpenApiOperation
      | undefined;
    const hostedPayment = payload.paths['/v1/payment-attempts/{attemptId}/hosted']?.get as
      | OpenApiOperation
      | undefined;
    const completePayment = payload.paths['/v1/payment-attempts/{attemptId}/simulated-complete']
      ?.post as OpenApiOperation | undefined;
    const markGroupAttendance = payload.paths[
      '/v1/group-session-registrations/{registrationId}/attendance'
    ]?.patch as OpenApiOperation | undefined;
    const getGroupSessionRoster = payload.paths['/v1/group-sessions/{sessionId}/roster']?.get as
      | OpenApiOperation
      | undefined;
    const completeGroupSession = payload.paths['/v1/group-sessions/{sessionId}/complete']?.post as
      | OpenApiOperation
      | undefined;
    const badgeSeen = payload.paths['/v1/badge-awards/{awardId}/seen']?.post as
      | OpenApiOperation
      | undefined;
    const listAthleteInjuries = payload.paths['/v1/athletes/{athleteId}/injuries']?.get as
      | OpenApiOperation
      | undefined;
    const createAthleteInjury = payload.paths['/v1/athletes/{athleteId}/injuries']?.post as
      | OpenApiOperation
      | undefined;
    const getInjuryRecord = payload.paths['/v1/injuries/{injuryId}']?.get as
      | OpenApiOperation
      | undefined;
    const updateInjuryRecord = payload.paths['/v1/injuries/{injuryId}']?.patch as
      | OpenApiOperation
      | undefined;
    const getAthleteMedical = payload.paths['/v1/athletes/{athleteId}/medical']?.get as
      | OpenApiOperation
      | undefined;
    const updateAthleteMedical = payload.paths['/v1/athletes/{athleteId}/medical']?.patch as
      | OpenApiOperation
      | undefined;
    const listAthleteEmergencyContacts = payload.paths[
      '/v1/athletes/{athleteId}/emergency-contacts'
    ]?.get as OpenApiOperation | undefined;
    const replaceAthleteEmergencyContacts = payload.paths[
      '/v1/athletes/{athleteId}/emergency-contacts'
    ]?.patch as OpenApiOperation | undefined;
    const listAthleteConsents = payload.paths['/v1/athletes/{athleteId}/consents']?.get as
      | OpenApiOperation
      | undefined;
    const replaceAthleteConsents = payload.paths['/v1/athletes/{athleteId}/consents']?.put as
      | OpenApiOperation
      | undefined;
    const listVideos = payload.paths['/v1/videos']?.get as OpenApiOperation | undefined;
    const createVideo = payload.paths['/v1/videos']?.post as OpenApiOperation | undefined;
    const getVideo = payload.paths['/v1/videos/{videoId}']?.get as OpenApiOperation | undefined;
    const updateVideo = payload.paths['/v1/videos/{videoId}']?.patch as
      | OpenApiOperation
      | undefined;
    const updateVideoSharing = payload.paths['/v1/videos/{videoId}/share']?.patch as
      | OpenApiOperation
      | undefined;
    const createVideoAnnotation = payload.paths['/v1/videos/{videoId}/annotations']?.post as
      | OpenApiOperation
      | undefined;
    const videoAnnotationUpdate = payload.paths['/v1/videos/{videoId}/annotations/{annotationId}']
      ?.patch as OpenApiOperation | undefined;
    const videoArchive = payload.paths['/v1/videos/{videoId}']?.delete as
      | OpenApiOperation
      | undefined;
    const initializePrivateUpload = payload.paths['/v1/uploads/init']?.post as
      | OpenApiOperation
      | undefined;
    const completeUpload = payload.paths['/v1/uploads/{uploadSessionId}/complete']?.post as
      | OpenApiOperation
      | undefined;
    const recordUploadScanResult = payload.paths['/v1/uploads/{uploadSessionId}/scan-result']
      ?.post as OpenApiOperation | undefined;
    const listBookings = payload.paths['/v1/bookings']?.get as OpenApiOperation | undefined;
    const createBooking = payload.paths['/v1/bookings']?.post as OpenApiOperation | undefined;
    const getBooking = payload.paths['/v1/bookings/{bookingId}']?.get as
      | OpenApiOperation
      | undefined;
    const updateBooking = payload.paths['/v1/bookings/{bookingId}']?.patch as
      | OpenApiOperation
      | undefined;
    const cancelBooking = payload.paths['/v1/bookings/{bookingId}/cancel']?.post as
      | OpenApiOperation
      | undefined;
    const reopenBooking = payload.paths['/v1/bookings/{bookingId}/reopen']?.post as
      | OpenApiOperation
      | undefined;
    const confirmBooking = payload.paths['/v1/bookings/{bookingId}/confirm']?.post as
      | OpenApiOperation
      | undefined;
    const declineBookingRequest = payload.paths['/v1/bookings/{bookingId}/decline']?.post as
      | OpenApiOperation
      | undefined;
    const withdrawBookingRequest = payload.paths['/v1/bookings/{bookingId}/withdraw']?.post as
      | OpenApiOperation
      | undefined;
    const completeBooking = payload.paths['/v1/bookings/{bookingId}/complete']?.post as
      | OpenApiOperation
      | undefined;
    const listBookingSeries = payload.paths['/v1/booking-series']?.get as
      | OpenApiOperation
      | undefined;
    const createBookingSeries = payload.paths['/v1/booking-series']?.post as
      | OpenApiOperation
      | undefined;
    const getBookingSeries = payload.paths['/v1/booking-series/{seriesId}']?.get as
      | OpenApiOperation
      | undefined;
    const updateBookingSeries = payload.paths['/v1/booking-series/{seriesId}']?.patch as
      | OpenApiOperation
      | undefined;
    const cancelBookingSeries = payload.paths['/v1/booking-series/{seriesId}/cancel']?.post as
      | OpenApiOperation
      | undefined;
    const pauseBookingSeries = payload.paths['/v1/booking-series/{seriesId}/pause']?.post as
      | OpenApiOperation
      | undefined;
    const resumeBookingSeries = payload.paths['/v1/booking-series/{seriesId}/resume']?.post as
      | OpenApiOperation
      | undefined;
    const listCancellationRecords = payload.paths['/v1/cancellation-records']?.get as
      | OpenApiOperation
      | undefined;
    const getCancellationRecord = payload.paths['/v1/cancellation-records/{bookingId}']?.get as
      | OpenApiOperation
      | undefined;
    const workAssignmentHistory = payload.paths[
      '/v1/clubs/{clubId}/work-assignments/{assignmentId}/history'
    ]?.get as OpenApiOperation | undefined;
    const listClubs = payload.paths['/v1/clubs']?.get as OpenApiOperation | undefined;
    const createClub = payload.paths['/v1/clubs']?.post as OpenApiOperation | undefined;
    const resolveClubJoinCode = payload.paths['/v1/clubs/join/resolve']?.get as
      | OpenApiOperation
      | undefined;
    const joinClubWithCode = payload.paths['/v1/clubs/join']?.post as OpenApiOperation | undefined;
    const getClub = payload.paths['/v1/clubs/{clubId}']?.get as OpenApiOperation | undefined;
    const updateClub = payload.paths['/v1/clubs/{clubId}']?.patch as OpenApiOperation | undefined;
    const listClubSquads = payload.paths['/v1/clubs/{clubId}/squads']?.get as
      | OpenApiOperation
      | undefined;
    const createClubSquad = payload.paths['/v1/clubs/{clubId}/squads']?.post as
      | OpenApiOperation
      | undefined;
    const getClubSquad = payload.paths['/v1/squads/{squadId}']?.get as OpenApiOperation | undefined;
    const updateClubSquad = payload.paths['/v1/clubs/{clubId}/squads/{squadId}']?.patch as
      | OpenApiOperation
      | undefined;
    const archiveClubSquad = payload.paths['/v1/clubs/{clubId}/squads/{squadId}']?.delete as
      | OpenApiOperation
      | undefined;
    const setSquadMember = payload.paths['/v1/clubs/{clubId}/squads/{squadId}/members/{userId}']
      ?.put as OpenApiOperation | undefined;
    const removeSquadMember = payload.paths['/v1/clubs/{clubId}/squads/{squadId}/members/{userId}']
      ?.delete as OpenApiOperation | undefined;
    const listClubEvents = payload.paths['/v1/clubs/{clubId}/events']?.get as
      | OpenApiOperation
      | undefined;
    const createClubEvent = payload.paths['/v1/clubs/{clubId}/events']?.post as
      | OpenApiOperation
      | undefined;
    const listClubMatches = payload.paths['/v1/clubs/{clubId}/matches']?.get as
      | OpenApiOperation
      | undefined;
    const createClubMatch = payload.paths['/v1/clubs/{clubId}/matches']?.post as
      | OpenApiOperation
      | undefined;
    const importClubMatches = payload.paths['/v1/clubs/{clubId}/matches/import']?.post as
      | OpenApiOperation
      | undefined;
    const listClubScheduleActivities = payload.paths['/v1/clubs/{clubId}/schedule']?.get as
      | OpenApiOperation
      | undefined;
    const getClubScheduleActivity = payload.paths['/v1/clubs/{clubId}/schedule/{activityId}']
      ?.get as OpenApiOperation | undefined;
    const getClubOwnerDashboard = payload.paths['/v1/clubs/{clubId}/owner-dashboard']?.get as
      | OpenApiOperation
      | undefined;
    const getClubBranding = payload.paths['/v1/clubs/{clubId}/branding']?.get as
      | OpenApiOperation
      | undefined;
    const updateClubBranding = payload.paths['/v1/clubs/{clubId}/branding']?.put as
      | OpenApiOperation
      | undefined;
    const listClubIntegrations = payload.paths['/v1/clubs/{clubId}/integrations']?.get as
      | OpenApiOperation
      | undefined;
    const createClubIntegration = payload.paths['/v1/clubs/{clubId}/integrations']?.post as
      | OpenApiOperation
      | undefined;
    const updateClubIntegration = payload.paths['/v1/clubs/{clubId}/integrations']?.patch as
      | OpenApiOperation
      | undefined;
    const listCommunityGroups = payload.paths['/v1/community-groups']?.get as
      | OpenApiOperation
      | undefined;
    const createCommunityGroup = payload.paths['/v1/community-groups']?.post as
      | OpenApiOperation
      | undefined;
    const joinCommunityGroup = payload.paths['/v1/community-groups/{groupId}/join']?.post as
      | OpenApiOperation
      | undefined;
    const leaveCommunityGroup = payload.paths['/v1/community-groups/{groupId}/leave']?.post as
      | OpenApiOperation
      | undefined;
    const createCommunityGroupJoinRequest = payload.paths[
      '/v1/community-groups/{groupId}/join-requests'
    ]?.post as OpenApiOperation | undefined;
    const listCommunityGroupJoinRequests = payload.paths[
      '/v1/community-groups/{groupId}/join-requests'
    ]?.get as OpenApiOperation | undefined;
    const approveCommunityGroupJoinRequest = payload.paths[
      '/v1/community-groups/{groupId}/join-requests/{requestId}/approve'
    ]?.post as OpenApiOperation | undefined;
    const rejectCommunityGroupJoinRequest = payload.paths[
      '/v1/community-groups/{groupId}/join-requests/{requestId}/reject'
    ]?.post as OpenApiOperation | undefined;
    const createCommunityGroupInvite = payload.paths['/v1/community-groups/{groupId}/invites']
      ?.post as OpenApiOperation | undefined;
    const listMyCommunityGroupInvites = payload.paths['/v1/me/community-group-invites']?.get as
      | OpenApiOperation
      | undefined;
    const acceptCommunityGroupInvite = payload.paths[
      '/v1/community-group-invites/{inviteId}/accept'
    ]?.post as OpenApiOperation | undefined;
    const declineCommunityGroupInvite = payload.paths[
      '/v1/community-group-invites/{inviteId}/decline'
    ]?.post as OpenApiOperation | undefined;
    const addCommunityGroupMember = payload.paths['/v1/community-groups/{groupId}/members']
      ?.post as OpenApiOperation | undefined;
    const updateCommunityGroupMemberRole = payload.paths[
      '/v1/community-groups/{groupId}/members/{memberUserId}/role'
    ]?.patch as OpenApiOperation | undefined;
    const transferCommunityGroupOwnership = payload.paths[
      '/v1/community-groups/{groupId}/members/{memberUserId}/transfer-ownership'
    ]?.post as OpenApiOperation | undefined;
    const removeCommunityGroupMember = payload.paths[
      '/v1/community-groups/{groupId}/members/{memberUserId}/remove'
    ]?.post as OpenApiOperation | undefined;
    const archiveCommunityGroup = payload.paths['/v1/community-groups/{groupId}/archive']?.post as
      | OpenApiOperation
      | undefined;
    const readFollowRelationships = payload.paths['/v1/follows']?.get as
      | OpenApiOperation
      | undefined;
    const createFollow = payload.paths['/v1/follows']?.post as OpenApiOperation | undefined;
    const updateFollowNotificationPreferences = payload.paths['/v1/follows']?.patch as
      | OpenApiOperation
      | undefined;
    const removeFollow = payload.paths['/v1/follows']?.delete as OpenApiOperation | undefined;
    const listFollowRequests = payload.paths['/v1/follow-requests']?.get as
      | OpenApiOperation
      | undefined;
    const createFollowRequest = payload.paths['/v1/follow-requests']?.post as
      | OpenApiOperation
      | undefined;
    const respondToFollowRequest = payload.paths['/v1/follow-requests/{requestId}']?.patch as
      | OpenApiOperation
      | undefined;
    const listPosts = payload.paths['/v1/posts']?.get as OpenApiOperation | undefined;
    const createPost = payload.paths['/v1/posts']?.post as OpenApiOperation | undefined;
    const getPost = payload.paths['/v1/posts/{postId}']?.get as OpenApiOperation | undefined;
    const togglePostReaction = payload.paths['/v1/posts/{postId}/reactions/toggle']?.post as
      | OpenApiOperation
      | undefined;
    const setPostPin = payload.paths['/v1/posts/{postId}/pin']?.patch as
      | OpenApiOperation
      | undefined;
    const listPostComments = payload.paths['/v1/posts/{postId}/comments']?.get as
      | OpenApiOperation
      | undefined;
    const createPostComment = payload.paths['/v1/posts/{postId}/comments']?.post as
      | OpenApiOperation
      | undefined;
    const getPostComment = payload.paths['/v1/comments/{commentId}']?.get as
      | OpenApiOperation
      | undefined;
    const removePostComment = payload.paths['/v1/comments/{commentId}']?.delete as
      | OpenApiOperation
      | undefined;
    const togglePostCommentReaction = payload.paths['/v1/comments/{commentId}/reactions/toggle']
      ?.post as OpenApiOperation | undefined;
    const listMessageThreads = payload.paths['/v1/message-threads']?.get as
      | OpenApiOperation
      | undefined;
    const sendCommunityGroupMessage = payload.paths['/v1/community-groups/{groupId}/messages']
      ?.post as OpenApiOperation | undefined;
    const markCommunityGroupMessagesRead = payload.paths[
      '/v1/community-groups/{groupId}/messages/read'
    ]?.post as OpenApiOperation | undefined;
    const sendMessageThreadMessage = payload.paths['/v1/message-threads/{threadId}/messages']
      ?.post as OpenApiOperation | undefined;
    const markMessageThreadRead = payload.paths['/v1/message-threads/{threadId}/read']?.post as
      | OpenApiOperation
      | undefined;
    const removeMessage = payload.paths['/v1/messages/{messageId}']?.delete as
      | OpenApiOperation
      | undefined;
    const listNotifications = payload.paths['/v1/me/notifications']?.get as
      | OpenApiOperation
      | undefined;
    const updateNotificationPreferences = payload.paths['/v1/me/notifications/preferences']
      ?.patch as OpenApiOperation | undefined;
    const markAllNotificationsRead = payload.paths['/v1/me/notifications/read-all']?.post as
      | OpenApiOperation
      | undefined;
    const dismissAllNotifications = payload.paths['/v1/me/notifications/dismiss-all']?.post as
      | OpenApiOperation
      | undefined;
    const markNotificationRead = payload.paths['/v1/me/notifications/{notificationId}/read']
      ?.post as OpenApiOperation | undefined;
    const dismissNotification = payload.paths['/v1/me/notifications/{notificationId}/dismiss']
      ?.post as OpenApiOperation | undefined;
    const listClubInviteCodes = payload.paths['/v1/clubs/{clubId}/invite-codes']?.get as
      | OpenApiOperation
      | undefined;
    const createClubInviteCode = payload.paths['/v1/clubs/{clubId}/invite-codes']?.post as
      | OpenApiOperation
      | undefined;
    const revokeClubInviteCode = payload.paths['/v1/clubs/{clubId}/invite-codes/{code}']?.delete as
      | OpenApiOperation
      | undefined;
    const createClubInvites = payload.paths['/v1/clubs/{clubId}/invites']?.post as
      | OpenApiOperation
      | undefined;
    const listMyClubInvites = payload.paths['/v1/clubs/invites']?.get as
      | OpenApiOperation
      | undefined;
    const respondToClubInvite = payload.paths['/v1/clubs/invites/{inviteId}/respond']?.post as
      | OpenApiOperation
      | undefined;
    const clubMembers = payload.paths['/v1/clubs/{clubId}/members']?.get as
      | OpenApiOperation
      | undefined;
    const clubMemberRemovals = payload.paths['/v1/clubs/{clubId}/members/removals']?.get as
      | OpenApiOperation
      | undefined;
    const leaveClub = payload.paths['/v1/clubs/{clubId}/members/me/leave']?.post as
      | OpenApiOperation
      | undefined;
    const updateClubMemberRole = payload.paths['/v1/clubs/{clubId}/members/{userId}/role']
      ?.patch as OpenApiOperation | undefined;
    const removeClubMember = payload.paths['/v1/clubs/{clubId}/members/{userId}']?.delete as
      | OpenApiOperation
      | undefined;
    const banClubMember = payload.paths['/v1/clubs/{clubId}/members/{userId}/ban']?.post as
      | OpenApiOperation
      | undefined;
    const restoreClubMember = payload.paths[
      '/v1/clubs/{clubId}/members/removals/{removalId}/restore'
    ]?.post as OpenApiOperation | undefined;
    const safeguardingIncidents = payload.paths['/v1/safeguarding/incidents']?.get as
      | OpenApiOperation
      | undefined;
    const createSafeguardingIncident = payload.paths['/v1/safeguarding/incidents']?.post as
      | OpenApiOperation
      | undefined;
    const safeguardingIncident = payload.paths['/v1/safeguarding/incidents/{incidentId}']?.get as
      | OpenApiOperation
      | undefined;
    const addSafeguardingAction = payload.paths['/v1/safeguarding/incidents/{incidentId}/actions']
      ?.post as OpenApiOperation | undefined;
    const reports = payload.paths['/v1/reports']?.get as OpenApiOperation | undefined;
    const createReport = payload.paths['/v1/reports']?.post as OpenApiOperation | undefined;
    const blocks = payload.paths['/v1/blocks']?.get as OpenApiOperation | undefined;
    const createBlock = payload.paths['/v1/blocks']?.post as OpenApiOperation | undefined;
    const removeBlock = payload.paths['/v1/blocks']?.delete as OpenApiOperation | undefined;
    const accountSessions = payload.paths['/v1/me/sessions']?.get as
      | { tags?: string[] }
      | undefined;
    const revokeAccountSession = payload.paths['/v1/me/sessions/{sessionId}/revoke']?.post as
      | { tags?: string[] }
      | undefined;
    const revokeAllAccountSessions = payload.paths['/v1/me/sessions/revoke-all']?.post as
      | { tags?: string[] }
      | undefined;
    const operations = Object.values(payload.paths).flatMap(
      (pathItem) => Object.values(pathItem) as Array<{ operationId?: string }>,
    );
    const deleteOperations = Object.values(payload.paths).flatMap((pathItem) =>
      Object.entries(pathItem).flatMap(([method, operation]) =>
        method === 'delete'
          ? [
              operation as {
                operationId?: string;
                summary?: string;
                'x-clubroom-effect'?: string;
              },
            ]
          : [],
      ),
    );
    const operationIds = operations.flatMap((operation) =>
      operation.operationId ? [operation.operationId] : [],
    );

    assert.equal(payload.openapi, '3.1.0');
    assert.equal(payload.info.version, '0.1.0');
    assert.match(payload.info.description ?? '', /OpenAPI 3\.1/);
    assert.match(payload.info.description ?? '', /Google AIP conformance is not claimed/);
    assert.match(payload.info.description ?? '', /at least 180 days notice/);
    assert.match(payload.info.description ?? '', /x-clubroom-effect/);
    assert.deepEqual(payload['x-clubroom-api-lifecycle'], {
      currentMajor: 'v1',
      status: 'preview',
      breakingChangeStrategy: 'new-major-path',
      minimumDeprecationDays: 180,
      deprecationHeaders: ['Deprecation', 'Sunset', 'Link'],
    });
    const tagNames = payload.tags.map((tag) => tag.name);
    assert.equal(tagNames.some((tag) => tag.includes('/')), false);
    assert.equal(tagNames.includes('Trust Ops'), false);
    assert.deepEqual(listAccessGrants?.tags, ['Trust & Safety']);
    assert.deepEqual(listRetentionRuns?.tags, ['Trust & Safety']);
    assert.deepEqual(reviewCoachVerification?.tags, ['Verification']);
    assert.equal(getApiVersion?.operationId, 'getApiVersion');
    assert.deepEqual(responseSchema(getApiVersion, '200'), {
      $ref: '#/components/schemas/ApiVersionResponse',
    });
    apiVersionResponseSchema.parse(responseExample(getApiVersion, '200'));
    assert.equal(payload.components.schemas.ApiVersionResponse.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.ApiVersionResponse.required, [
      'service',
      'version',
      'apiVersion',
      'apiStatus',
      'minimumDeprecationDays',
      'apiDataBackend',
      'marketplaceSeedEnabled',
    ]);
    assert.ok(payload.components.responses.BadRequest);
    assert.ok(payload.components.responses.Unauthorized);
    assert.ok(payload.components.responses.ServiceUnavailable);
    assert.deepEqual(payload.components.schemas.ErrorResponse.required, [
      'type',
      'title',
      'status',
      'code',
      'detail',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.AuthLoginRequest.required, ['email', 'password']);
    assert.deepEqual(payload.components.schemas.AuthRegisterRequest.required, [
      'email',
      'password',
      'accountType',
      'firstName',
      'lastName',
    ]);
    assert.deepEqual(payload.components.schemas.AuthTokens.required, [
      'accessToken',
      'refreshToken',
      'expiresAt',
    ]);
    assert.equal(
      payload.components.schemas.AuthUser.properties?.athleteId?.description,
      'Canonical Athlete.id linked to this user through Athlete.userId.',
    );
    assert.equal(
      payload.components.schemas.AuthUser.properties?.athleteName?.description,
      'Display name of the linked athlete profile.',
    );
    assert.equal(
      payload.components.schemas.AuthProfilePatchRequest.properties?.isVerified,
      undefined,
    );
    assert.deepEqual(payload.components.schemas.ClubMemberRemovalRequest.required, undefined);
    assert.deepEqual(payload.components.schemas.ClubMemberBanRequest.required, ['reason']);
    assert.deepEqual(payload.components.schemas.ClubMemberRemovalResponse.required, [
      'removal',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.CreateSafeguardingIncidentRequest.required, [
      'category',
      'summary',
    ]);
    assert.deepEqual(payload.components.schemas.CreateSafeguardingActionRequest.required, [
      'actionType',
      'notes',
    ]);
    assert.deepEqual(payload.components.schemas.SafeguardingIncidentResponse.required, [
      'id',
      'athleteId',
      'bookingId',
      'category',
      'severity',
      'status',
      'summary',
      'details',
      'reportedByUserId',
      'createdAt',
      'updatedAt',
      'actions',
    ]);
    assert.deepEqual(payload.components.schemas.CreateReportRequest.required, [
      'reportedUserId',
      'type',
      'context',
    ]);
    assert.deepEqual(payload.components.schemas.ReportMutationResponse.required, [
      'report',
      'autoBlocked',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.BlockUserRequest.required, ['blockedUserId']);
    assert.deepEqual(payload.components.schemas.BlockStatus.required, [
      'relationship',
      'blocked',
      'blockerId',
      'blockedId',
    ]);
    assert.deepEqual(authMe?.responses?.['401'], { $ref: '#/components/responses/Unauthorized' });
    assert.deepEqual(authMe?.responses?.['403'], { $ref: '#/components/responses/Forbidden' });
    assert.deepEqual(authMe?.responses?.['429'], { $ref: '#/components/responses/RateLimited' });
    assert.deepEqual(authMe?.responses?.['500'], {
      $ref: '#/components/responses/InternalServerError',
    });
    assert.deepEqual(createAthlete?.responses?.['503'], {
      $ref: '#/components/responses/ServiceUnavailable',
    });
    assert.deepEqual(responseSchema(listBookings, '200'), {
      $ref: '#/components/schemas/BookingListResponse',
    });
    assert.equal(listBookings?.operationId, 'listBookings');
    assert.equal(
      listBookings?.parameters?.some(
        (parameter) => parameter.in === 'query' && parameter.name === 'status',
      ),
      true,
    );
    assert.deepEqual(requestSchema(createBooking), {
      $ref: '#/components/schemas/CreateBookingRequest',
    });
    assert.equal(createBooking?.requestBody?.required, true);
    assert.deepEqual(responseSchema(createBooking, '201'), {
      $ref: '#/components/schemas/BookingResponse',
    });
    assert.equal(createBooking?.responses?.['200'], undefined);
    assert.equal((requestExample(createBooking) as { currency?: string }).currency, 'GBP');
    assert.equal(
      (responseExample(createBooking, '201') as { status?: string }).status,
      'AWAITING_CONFIRMATION',
    );
    bookingListResponseSchema.parse(responseExample(listBookings, '200'));
    createBookingRequestSchema.parse(requestExample(createBooking));
    bookingResponseSchema.parse(responseExample(createBooking, '201'));
    assert.deepEqual(responseSchema(getBooking, '200'), {
      $ref: '#/components/schemas/BookingResponse',
    });
    assert.deepEqual(requestSchema(updateBooking), {
      $ref: '#/components/schemas/UpdateBookingRequest',
    });
    assert.deepEqual(requestSchema(cancelBooking), {
      $ref: '#/components/schemas/CancelBookingRequest',
    });
    for (const operation of [updateBooking, cancelBooking]) {
      assert.equal(operation?.requestBody?.required, true);
      assert.deepEqual(responseSchema(operation, '200'), {
        $ref: '#/components/schemas/BookingResponse',
      });
      assert.equal(operation?.responses?.['201'], undefined);
    }
    updateBookingRequestSchema.parse(requestExample(updateBooking));
    cancelBookingRequestSchema.parse(requestExample(cancelBooking));
    assert.deepEqual(requestSchema(reopenBooking), {
      $ref: '#/components/schemas/ReopenBookingRequest',
    });
    assert.deepEqual(requestSchema(confirmBooking), {
      $ref: '#/components/schemas/ConfirmBookingRequest',
    });
    assert.deepEqual(requestSchema(completeBooking), {
      $ref: '#/components/schemas/CompleteBookingRequest',
    });
    for (const operation of [reopenBooking, confirmBooking, completeBooking]) {
      assert.equal(operation?.requestBody?.required, false);
      assert.deepEqual(responseSchema(operation, '200'), {
        $ref: '#/components/schemas/BookingResponse',
      });
      assert.equal(operation?.responses?.['201'], undefined);
    }
    reopenBookingRequestSchema.parse(requestExample(reopenBooking));
    confirmBookingRequestSchema.parse(requestExample(confirmBooking));
    completeBookingRequestSchema.parse(requestExample(completeBooking));
    for (const operation of [declineBookingRequest, withdrawBookingRequest]) {
      assert.deepEqual(requestSchema(operation), {
        $ref: '#/components/schemas/ResolveBookingRequest',
      });
      assert.equal(operation?.requestBody?.required, true);
      assert.deepEqual(responseSchema(operation, '200'), {
        $ref: '#/components/schemas/BookingResponse',
      });
      assert.equal(operation?.responses?.['201'], undefined);
      resolveBookingRequestSchema.parse(requestExample(operation));
      bookingResponseSchema.parse(responseExample(operation, '200'));
    }
    assert.equal(declineBookingRequest?.operationId, 'declineBookingRequest');
    assert.equal(withdrawBookingRequest?.operationId, 'withdrawBookingRequest');
    assert.deepEqual(payload.components.schemas.CreateBookingRequest.required, [
      'coachUserId',
      'athleteIds',
      'bookedByUserId',
      'scheduledAt',
      'durationMinutes',
      'location',
      'serviceType',
    ]);
    assert.deepEqual(payload.components.schemas.CancelBookingRequest.required, ['reason']);
    assert.deepEqual(payload.components.schemas.BookingListResponse.required, [
      'bookings',
      'total',
      'requestId',
    ]);
    assert.equal(listBookingSeries?.operationId, 'listBookingSeries');
    assert.deepEqual(responseSchema(listBookingSeries, '200'), {
      $ref: '#/components/schemas/BookingSeriesListResponse',
    });
    bookingSeriesListResponseSchema.parse(responseExample(listBookingSeries, '200'));
    assert.equal(createBookingSeries?.operationId, 'createBookingSeries');
    assert.deepEqual(requestSchema(createBookingSeries), {
      $ref: '#/components/schemas/CreateBookingSeriesRequest',
    });
    assert.equal(createBookingSeries?.requestBody?.required, true);
    assert.equal(createBookingSeries?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createBookingSeries, '201'), {
      $ref: '#/components/schemas/BookingSeriesMutationResponse',
    });
    createBookingSeriesRequestSchema.parse(requestExample(createBookingSeries));
    createBookingSeriesResponseSchema.parse(responseExample(createBookingSeries, '201'));
    assert.equal(getBookingSeries?.operationId, 'getBookingSeries');
    assert.deepEqual(responseSchema(getBookingSeries, '200'), {
      $ref: '#/components/schemas/BookingSeriesResponse',
    });
    bookingSeriesResponseSchema.parse(responseExample(getBookingSeries, '200'));
    const bookingSeriesMutations = [
      {
        operation: updateBookingSeries,
        operationId: 'updateBookingSeries',
        requestRef: 'UpdateBookingSeriesRequest',
        parseRequest: updateBookingSeriesRequestSchema,
        parseResponse: updateBookingSeriesResponseSchema,
      },
      {
        operation: cancelBookingSeries,
        operationId: 'cancelBookingSeries',
        requestRef: 'CancelBookingSeriesRequest',
        parseRequest: cancelBookingSeriesRequestSchema,
        parseResponse: cancelBookingSeriesResponseSchema,
      },
      {
        operation: pauseBookingSeries,
        operationId: 'pauseBookingSeries',
        requestRef: 'PauseBookingSeriesRequest',
        parseRequest: pauseBookingSeriesRequestSchema,
        parseResponse: pauseBookingSeriesResponseSchema,
      },
      {
        operation: resumeBookingSeries,
        operationId: 'resumeBookingSeries',
        requestRef: 'ResumeBookingSeriesRequest',
        parseRequest: resumeBookingSeriesRequestSchema,
        parseResponse: resumeBookingSeriesResponseSchema,
      },
    ];
    for (const mutation of bookingSeriesMutations) {
      assert.equal(mutation.operation?.operationId, mutation.operationId);
      assert.equal(mutation.operation?.requestBody?.required, true);
      assert.deepEqual(requestSchema(mutation.operation), {
        $ref: `#/components/schemas/${mutation.requestRef}`,
      });
      assert.deepEqual(responseSchema(mutation.operation, '200'), {
        $ref: '#/components/schemas/BookingSeriesMutationResponse',
      });
      assert.equal(mutation.operation?.responses?.['201'], undefined);
      mutation.parseRequest.parse(requestExample(mutation.operation));
      mutation.parseResponse.parse(responseExample(mutation.operation, '200'));
    }
    assert.deepEqual(payload.components.schemas.CreateBookingSeriesRequest.required, [
      'coachUserId',
      'athleteIds',
      'bookedByUserId',
      'occurrences',
      'location',
      'serviceType',
    ]);
    assert.deepEqual(payload.components.schemas.BookingSeriesMutationResponse.required, [
      'series',
      'bookings',
      'requestId',
    ]);
    assert.equal(listCancellationRecords?.operationId, 'listCancellationRecords');
    assert.equal(
      listCancellationRecords?.parameters?.some(
        (parameter) => parameter.in === 'query' && parameter.name === 'coachId',
      ),
      true,
    );
    assert.deepEqual(responseSchema(listCancellationRecords, '200'), {
      $ref: '#/components/schemas/CancellationRecordListResponse',
    });
    assert.equal(getCancellationRecord?.operationId, 'getCancellationRecord');
    assert.deepEqual(responseSchema(getCancellationRecord, '200'), {
      $ref: '#/components/schemas/CancellationRecordLookupResponse',
    });
    assert.deepEqual(payload.components.schemas.CancellationRecord.required, [
      'id',
      'bookingId',
      'cancelledBy',
      'cancelledAt',
      'reason',
      'reasonCategory',
      'note',
      'refundAmount',
      'refundPercentage',
      'hoursBeforeSession',
      'coachId',
    ]);
    assert.equal(
      (
        responseExample(listCancellationRecords, '200') as {
          records?: Array<{ refundAmount?: number }>;
        }
      ).records?.[0]?.refundAmount,
      35,
    );
    assert.equal(
      (
        responseExample(getCancellationRecord, '200') as {
          record?: { cancelledBy?: string } | null;
        }
      ).record?.cancelledBy,
      'parent',
    );
    assert.equal(workAssignmentHistory?.operationId, 'getWorkAssignmentHistory');
    assert.equal(workAssignmentHistory?.summary, 'Get Work Assignment History');
    assert.equal(workAssignmentHistory?.['x-clubroom-effect'], 'get history');
    assert.deepEqual(responseSchema(workAssignmentHistory, '200'), {
      $ref: '#/components/schemas/WorkAssignmentHistoryResponse',
    });
    assert.deepEqual(payload.components.schemas.WorkAssignmentHistoryResponse.required, [
      'clubId',
      'assignmentId',
      'events',
      'total',
      'truncated',
      'requestId',
    ]);
    assert.equal(listClubs?.operationId, 'listVisibleClubs');
    assert.deepEqual(responseSchema(listClubs, '200'), {
      $ref: '#/components/schemas/ClubListResponse',
    });
    assert.equal(createClub?.operationId, 'createClub');
    assert.deepEqual(requestSchema(createClub), {
      $ref: '#/components/schemas/ClubCreateRequest',
    });
    assert.equal(createClub?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createClub, '201'), {
      $ref: '#/components/schemas/ClubCreateResponse',
    });
    assert.equal(resolveClubJoinCode?.operationId, 'resolveClubJoinCode');
    const clubJoinCodeParameter = resolveClubJoinCode?.parameters?.find(
      (parameter) => parameter.in === 'query' && parameter.name === 'code',
    );
    assert.equal(clubJoinCodeParameter?.required, true);
    assert.deepEqual(clubJoinCodeParameter?.schema, {
      type: 'string',
      minLength: 4,
    });
    assert.deepEqual(responseSchema(resolveClubJoinCode, '200'), {
      $ref: '#/components/schemas/ResolveClubJoinCodeResponse',
    });
    resolveClubJoinCodeResponseSchema.parse(responseExample(resolveClubJoinCode, '200'));
    assert.equal(joinClubWithCode?.operationId, 'joinClubWithCode');
    assert.deepEqual(requestSchema(joinClubWithCode), {
      $ref: '#/components/schemas/JoinClubRequest',
    });
    assert.equal(joinClubWithCode?.requestBody?.required, true);
    assert.deepEqual(responseSchema(joinClubWithCode, '200'), {
      $ref: '#/components/schemas/JoinClubAlreadyMemberResponse',
    });
    assert.deepEqual(responseSchema(joinClubWithCode, '201'), {
      $ref: '#/components/schemas/JoinClubJoinedResponse',
    });
    assert.deepEqual(responseSchema(joinClubWithCode, '202'), {
      $ref: '#/components/schemas/JoinClubInvitePendingResponse',
    });
    joinClubRequestSchema.parse(requestExample(joinClubWithCode));
    for (const status of ['200', '201', '202']) {
      joinClubResponseSchema.parse(responseExample(joinClubWithCode, status));
    }
    assert.equal(payload.components.schemas.JoinClubRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.JoinClubResponse.oneOf, [
      { $ref: '#/components/schemas/JoinClubJoinedResponse' },
      { $ref: '#/components/schemas/JoinClubInvitePendingResponse' },
      { $ref: '#/components/schemas/JoinClubAlreadyMemberResponse' },
    ]);
    assert.equal(getClub?.operationId, 'getClub');
    assert.deepEqual(responseSchema(getClub, '200'), {
      $ref: '#/components/schemas/ClubResponse',
    });
    assert.equal(updateClub?.operationId, 'updateClub');
    assert.deepEqual(requestSchema(updateClub), {
      $ref: '#/components/schemas/ClubUpdateRequest',
    });
    assert.deepEqual(responseSchema(updateClub, '200'), {
      $ref: '#/components/schemas/ClubUpdateResponse',
    });
    assert.equal(payload.components.schemas.ClubUpdateRequest.minProperties, 1);
    assert.deepEqual(payload.components.schemas.ClubRecord.properties?.squads?.items, {
      $ref: '#/components/schemas/ClubSquadReference',
    });
    assert.equal(payload.components.schemas.ClubRecord.properties?.memberships, undefined);
    assert.ok(payload.components.schemas.ClubRecord.required?.includes('memberCount'));
    assert.ok(payload.components.schemas.ClubRecord.required?.includes('coachCount'));
    assert.ok(payload.components.schemas.ClubRecord.required?.includes('viewerGovernance'));
    assert.equal(listClubSquads?.operationId, 'listClubSquads');
    assert.deepEqual(responseSchema(listClubSquads, '200'), {
      $ref: '#/components/schemas/ClubSquadListResponse',
    });
    assert.equal(createClubSquad?.operationId, 'createClubSquad');
    assert.equal(createClubSquad?.requestBody?.required, true);
    assert.deepEqual(requestSchema(createClubSquad), {
      $ref: '#/components/schemas/ClubSquadCreateRequest',
    });
    assert.equal(createClubSquad?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createClubSquad, '201'), {
      $ref: '#/components/schemas/ClubSquadResponse',
    });
    assert.equal(getClubSquad?.operationId, 'getClubSquad');
    assert.deepEqual(responseSchema(getClubSquad, '200'), {
      $ref: '#/components/schemas/ClubSquadResponse',
    });
    assert.equal(updateClubSquad?.operationId, 'updateClubSquad');
    assert.deepEqual(requestSchema(updateClubSquad), {
      $ref: '#/components/schemas/ClubSquadUpdateRequest',
    });
    assert.deepEqual(responseSchema(updateClubSquad, '200'), {
      $ref: '#/components/schemas/ClubSquadResponse',
    });
    assert.equal(archiveClubSquad?.operationId, 'archiveClubSquad');
    assert.equal(archiveClubSquad?.responses?.['200'], undefined);
    assert.deepEqual(archiveClubSquad?.responses?.['204'], {
      description: 'Squad archived.',
    });
    assert.equal(setSquadMember?.operationId, 'setSquadMember');
    assert.equal(setSquadMember?.requestBody, undefined);
    assert.deepEqual(responseSchema(setSquadMember, '200'), {
      $ref: '#/components/schemas/ClubMemberResponse',
    });
    assert.equal(
      (
        responseExample(setSquadMember, '200') as {
          member?: { squadIds?: string[] };
        }
      ).member?.squadIds?.includes('sqd_123'),
      true,
    );
    assert.equal(removeSquadMember?.operationId, 'removeSquadMember');
    assert.equal(removeSquadMember?.requestBody, undefined);
    assert.deepEqual(responseSchema(removeSquadMember, '200'), {
      $ref: '#/components/schemas/ClubMemberResponse',
    });
    assert.deepEqual(
      (
        responseExample(removeSquadMember, '200') as {
          member?: { squadIds?: string[] };
        }
      ).member?.squadIds,
      [],
    );
    assert.equal(listClubEvents?.operationId, 'listClubEvents');
    assert.equal(listClubEvents?.requestBody, undefined);
    assert.deepEqual(responseSchema(listClubEvents, '200'), {
      $ref: '#/components/schemas/ClubEventListResponse',
    });
    assert.equal(
      (
        responseExample(listClubEvents, '200') as {
          events?: Array<{
            currentParticipants?: number;
            timeZone?: string;
            attendees?: unknown;
          }>;
        }
      ).events?.[0]?.currentParticipants,
      22,
    );
    assert.equal(
      (
        responseExample(listClubEvents, '200') as {
          events?: Array<{ timeZone?: string }>;
        }
      ).events?.[0]?.timeZone,
      'Europe/London',
    );
    assert.equal(
      'attendees' in
        ((responseExample(listClubEvents, '200') as { events?: object[] }).events?.[0] ?? {}),
      false,
    );
    assert.equal(createClubEvent?.operationId, 'createClubEvent');
    assert.deepEqual(requestSchema(createClubEvent), {
      $ref: '#/components/schemas/CreateClubEventRequest',
    });
    assert.equal(createClubEvent?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createClubEvent, '201'), {
      $ref: '#/components/schemas/ClubEventResponse',
    });
    assert.equal(
      (
        responseExample(createClubEvent, '201') as {
          event?: { status?: string; currentParticipants?: number };
        }
      ).event?.status,
      'DRAFT',
    );
    assert.equal(payload.components.schemas.CreateClubEventRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.ClubEvent.additionalProperties, false);
    assert.equal(payload.components.schemas.ClubEvent.required?.includes('timeZone'), true);
    assert.equal(payload.components.schemas.ClubEvent.properties?.attendees, undefined);
    assert.equal(listClubMatches?.operationId, 'listClubMatches');
    assert.equal(listClubMatches?.requestBody, undefined);
    assert.deepEqual(responseSchema(listClubMatches, '200'), {
      $ref: '#/components/schemas/ClubMatchListResponse',
    });
    assert.deepEqual(
      listClubMatches?.parameters
        ?.filter((parameter) => parameter.in === 'query')
        .map((parameter) => parameter.name),
      ['status', 'limit'],
    );
    listClubMatchesResponseSchema.parse(responseExample(listClubMatches, '200'));
    assert.equal(createClubMatch?.operationId, 'createClubMatch');
    assert.deepEqual(requestSchema(createClubMatch), {
      $ref: '#/components/schemas/CreateClubMatchRequest',
    });
    assert.equal(createClubMatch?.requestBody?.required, true);
    assert.equal(createClubMatch?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createClubMatch, '201'), {
      $ref: '#/components/schemas/ClubMatchResponse',
    });
    createClubMatchRequestSchema.parse(requestExample(createClubMatch));
    clubMatchResponseSchema.parse(responseExample(createClubMatch, '201'));
    assert.equal(importClubMatches?.operationId, 'importClubMatches');
    assert.deepEqual(requestSchema(importClubMatches), {
      $ref: '#/components/schemas/ImportClubMatchesRequest',
    });
    assert.equal(importClubMatches?.requestBody?.required, true);
    assert.deepEqual(responseSchema(importClubMatches, '200'), {
      $ref: '#/components/schemas/ImportClubMatchesResponse',
    });
    assert.deepEqual(responseSchema(importClubMatches, '201'), {
      $ref: '#/components/schemas/ImportClubMatchesResponse',
    });
    importClubMatchesRequestSchema.parse(requestExample(importClubMatches));
    importClubMatchesResponseSchema.parse(responseExample(importClubMatches, '200'));
    importClubMatchesResponseSchema.parse(responseExample(importClubMatches, '201'));
    assert.equal(payload.components.schemas.CreateClubMatchRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.ImportClubMatchItem.additionalProperties, false);
    assert.equal(payload.components.schemas.ClubMatch.additionalProperties, false);
    assert.equal(payload.components.schemas.ClubMatch.required?.includes('timeZone'), true);
    assert.equal(payload.components.schemas.CreateClubMatchRequest.properties?.timeZone, undefined);
    assert.equal(payload.components.schemas.ImportClubMatchItem.properties?.timeZone, undefined);
    assert.equal(payload.components.schemas.ClubSquad.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.ClubSquad.required, [
      'id',
      'clubId',
      'name',
      'memberCount',
    ]);
    assert.equal(payload.components.schemas.ClubSquad.properties?.meetLocation, undefined);
    assert.equal(payload.components.schemas.ClubSquadUpdateRequest.minProperties, 1);
    assert.equal(payload.components.schemas.ClubSquadUpdateRequest.additionalProperties, false);
    assert.equal(listClubScheduleActivities?.operationId, 'listClubScheduleActivities');
    assert.deepEqual(responseSchema(listClubScheduleActivities, '200'), {
      $ref: '#/components/schemas/ClubScheduleResponse',
    });
    assert.equal(getClubScheduleActivity?.operationId, 'getClubScheduleActivity');
    assert.deepEqual(responseSchema(getClubScheduleActivity, '200'), {
      $ref: '#/components/schemas/ClubActivityDetailResponse',
    });
    assert.equal(getClubOwnerDashboard?.operationId, 'getClubOwnerDashboard');
    assert.equal(getClubOwnerDashboard?.['x-clubroom-effect'], 'get owner dashboard');
    assert.deepEqual(responseSchema(getClubOwnerDashboard, '200'), {
      $ref: '#/components/schemas/OwnerDashboardResponse',
    });
    ownerDashboardResponseSchema.parse(responseExample(getClubOwnerDashboard, '200'));
    assert.equal(payload.components.schemas.OwnerDashboardResponse.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.OwnerDashboardResponse.required, [
      'club',
      'viewerMembership',
      'privilegedAdminAccess',
      'summary',
      'finance',
      'unassignedWork',
      'coachHealth',
      'completionQueue',
      'supportIssues',
      'clubId',
      'requestId',
    ]);
    assertStaffingConsoleOpenApi(payload);
    assertHeadCoachOpenApi(payload);
    assert.deepEqual(payload.components.schemas.ClubScheduleActivitySource.enum, [
      'club_event',
      'group_session',
      'match',
    ]);
    assert.deepEqual(payload.components.schemas.ClubScheduleActivityStatus.enum, [
      'scheduled',
      'full',
      'in_progress',
      'cancelled',
      'completed',
    ]);
    assert.deepEqual(payload.components.schemas.ClubScheduleParticipationMode.enum, [
      'none',
      'rsvp',
      'registration',
      'availability',
    ]);
    assert.ok(payload.components.schemas.ClubScheduleActivity.required?.includes('clubId'));
    assert.deepEqual(payload.components.schemas.ClubScheduleResponse.required, [
      'clubId',
      'activities',
      'total',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.ClubActivityDetailResponse.required, [
      'clubId',
      'activity',
      'seedVersion',
      'requestId',
    ]);
    const clubScheduleActivityExample = (
      responseExample(getClubScheduleActivity, '200') as { activity?: unknown } | undefined
    )?.activity;
    assert.deepEqual(responseExample(listClubScheduleActivities, '200'), {
      clubId: 'clb_123',
      activities: [clubScheduleActivityExample],
      total: 1,
      seedVersion: null,
      requestId: 'req_123',
    });
    assert.equal(getClubBranding?.operationId, 'getClubBranding');
    assert.deepEqual(responseSchema(getClubBranding, '200'), {
      $ref: '#/components/schemas/ClubBrandingResponse',
    });
    assert.equal(updateClubBranding?.operationId, 'updateClubBranding');
    assert.deepEqual(requestSchema(updateClubBranding), {
      $ref: '#/components/schemas/ClubBrandingUpdateRequest',
    });
    assert.equal(updateClubBranding?.requestBody?.required, true);
    assert.deepEqual(responseSchema(updateClubBranding, '200'), {
      $ref: '#/components/schemas/ClubBrandingResponse',
    });
    assert.equal(payload.components.schemas.ClubBrandingUpdateRequest.minProperties, 1);
    assert.deepEqual(payload.components.schemas.ClubBrandingResponse.required, [
      'branding',
      'requestId',
    ]);
    assert.equal(listClubIntegrations?.operationId, 'listClubIntegrations');
    assert.deepEqual(responseSchema(listClubIntegrations, '200'), {
      $ref: '#/components/schemas/ClubIntegrationListResponse',
    });
    assert.equal(createClubIntegration?.operationId, 'createClubIntegration');
    assert.deepEqual(requestSchema(createClubIntegration), {
      $ref: '#/components/schemas/ClubIntegrationCreateRequest',
    });
    assert.equal(createClubIntegration?.requestBody?.required, true);
    assert.equal(createClubIntegration?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createClubIntegration, '201'), {
      $ref: '#/components/schemas/ClubIntegrationMutationResponse',
    });
    assert.equal(updateClubIntegration?.operationId, 'updateClubIntegration');
    assert.deepEqual(requestSchema(updateClubIntegration), {
      $ref: '#/components/schemas/ClubIntegrationUpdateRequest',
    });
    assert.deepEqual(responseSchema(updateClubIntegration, '200'), {
      $ref: '#/components/schemas/ClubIntegrationMutationResponse',
    });
    assert.deepEqual(payload.components.schemas.ClubIntegrationCreateRequest.required, [
      'provider',
    ]);
    assert.equal(
      payload.components.schemas.ClubIntegrationCreateRequest.additionalProperties,
      false,
    );
    assert.deepEqual(payload.components.schemas.ClubIntegrationUpdateRequest.required, [
      'provider',
    ]);
    assert.equal(payload.components.schemas.ClubIntegrationUpdateRequest.minProperties, 2);
    assert.deepEqual(payload.components.schemas.ClubIntegrationStatus.enum, [
      'DISCONNECTED',
      'CONNECTED',
      'NEEDS_REAUTH',
      'DISABLED',
    ]);
    assert.match(
      payload.components.schemas.ClubIntegrationMetadata.description ?? '',
      /credential-looking keys/i,
    );
    assert.equal(listCommunityGroups?.operationId, 'listCommunityGroups');
    assert.deepEqual(responseSchema(listCommunityGroups, '200'), {
      $ref: '#/components/schemas/CommunityGroupListResponse',
    });
    assert.equal(createCommunityGroup?.operationId, 'createCommunityGroup');
    assert.deepEqual(requestSchema(createCommunityGroup), {
      $ref: '#/components/schemas/CommunityGroupCreateRequest',
    });
    assert.equal(createCommunityGroup?.requestBody?.required, true);
    assert.equal(createCommunityGroup?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createCommunityGroup, '201'), {
      $ref: '#/components/schemas/CommunityGroupResponse',
    });
    for (const operation of [joinCommunityGroup, leaveCommunityGroup]) {
      assert.equal(operation?.requestBody, undefined);
      assert.equal(operation?.responses?.['201'], undefined);
      assert.deepEqual(responseSchema(operation, '200'), {
        $ref: '#/components/schemas/CommunityGroupResponse',
      });
    }
    assert.equal(joinCommunityGroup?.operationId, 'joinCommunityGroup');
    assert.equal(leaveCommunityGroup?.operationId, 'leaveCommunityGroup');
    assert.equal(
      (
        responseExample(joinCommunityGroup, '200') as {
          group?: { memberships?: unknown[] };
        }
      ).group?.memberships?.length,
      2,
    );
    assert.deepEqual(payload.components.schemas.CommunityGroupCreateRequest.required, ['name']);
    assert.deepEqual(payload.components.schemas.CommunityGroupListResponse.required, [
      'groups',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupResponse.required, [
      'group',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupMembership.required, [
      'id',
      'communityGroupId',
      'userId',
      'role',
      'active',
      'createdByUserId',
      'updatedByUserId',
      'version',
      'createdAt',
      'updatedAt',
      'deletedAt',
    ]);
    assert.equal(createCommunityGroupJoinRequest?.operationId, 'createCommunityGroupJoinRequest');
    assert.equal(createCommunityGroupJoinRequest?.requestBody?.required, false);
    assert.deepEqual(requestSchema(createCommunityGroupJoinRequest), {
      $ref: '#/components/schemas/CommunityGroupJoinRequestCreateRequest',
    });
    assert.equal(createCommunityGroupJoinRequest?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createCommunityGroupJoinRequest, '201'), {
      $ref: '#/components/schemas/CommunityGroupJoinRequestResponse',
    });
    assert.equal(listCommunityGroupJoinRequests?.operationId, 'listCommunityGroupJoinRequests');
    assert.deepEqual(responseSchema(listCommunityGroupJoinRequests, '200'), {
      $ref: '#/components/schemas/CommunityGroupJoinRequestListResponse',
    });
    assert.equal(approveCommunityGroupJoinRequest?.operationId, 'approveCommunityGroupJoinRequest');
    assert.equal(approveCommunityGroupJoinRequest?.requestBody, undefined);
    assert.equal(approveCommunityGroupJoinRequest?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(approveCommunityGroupJoinRequest, '200'), {
      $ref: '#/components/schemas/CommunityGroupJoinRequestApprovalResponse',
    });
    assert.equal(rejectCommunityGroupJoinRequest?.operationId, 'rejectCommunityGroupJoinRequest');
    assert.equal(rejectCommunityGroupJoinRequest?.requestBody, undefined);
    assert.equal(rejectCommunityGroupJoinRequest?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(rejectCommunityGroupJoinRequest, '200'), {
      $ref: '#/components/schemas/CommunityGroupJoinRequestResponse',
    });
    assert.deepEqual(payload.components.schemas.CommunityGroupJoinRequest.required, [
      'id',
      'groupId',
      'groupName',
      'requesterId',
      'requesterName',
      'requestedRole',
      'isCoach',
      'status',
      'createdAt',
      'respondedAt',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupJoinRequestStatus.enum, [
      'PENDING',
      'ACCEPTED',
      'DECLINED',
    ]);
    assert.equal(createCommunityGroupInvite?.operationId, 'createCommunityGroupInvite');
    assert.deepEqual(createCommunityGroupInvite?.tags, ['Community']);
    assert.equal(createCommunityGroupInvite?.requestBody?.required, true);
    assert.deepEqual(requestSchema(createCommunityGroupInvite), {
      $ref: '#/components/schemas/CommunityGroupInviteCreateRequest',
    });
    assert.equal(createCommunityGroupInvite?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createCommunityGroupInvite, '201'), {
      $ref: '#/components/schemas/CommunityGroupInviteResponse',
    });
    assert.equal(listMyCommunityGroupInvites?.operationId, 'listMyCommunityGroupInvites');
    assert.deepEqual(responseSchema(listMyCommunityGroupInvites, '200'), {
      $ref: '#/components/schemas/CommunityGroupInviteListResponse',
    });
    assert.equal(acceptCommunityGroupInvite?.operationId, 'acceptCommunityGroupInvite');
    assert.equal(acceptCommunityGroupInvite?.requestBody, undefined);
    assert.equal(acceptCommunityGroupInvite?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(acceptCommunityGroupInvite, '200'), {
      $ref: '#/components/schemas/CommunityGroupInviteAcceptanceResponse',
    });
    assert.equal(declineCommunityGroupInvite?.operationId, 'declineCommunityGroupInvite');
    assert.equal(declineCommunityGroupInvite?.requestBody, undefined);
    assert.equal(declineCommunityGroupInvite?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(declineCommunityGroupInvite, '200'), {
      $ref: '#/components/schemas/CommunityGroupInviteResponse',
    });
    assert.deepEqual(payload.components.schemas.CommunityGroupInviteCreateRequest.required, [
      'inviteeUserId',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupInvite.required, [
      'id',
      'groupId',
      'inviterId',
      'inviteeId',
      'status',
      'createdAt',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupInviteStatus.enum, [
      'PENDING',
      'ACCEPTED',
      'DECLINED',
    ]);
    assert.equal(addCommunityGroupMember?.operationId, 'addCommunityGroupMember');
    assert.deepEqual(requestSchema(addCommunityGroupMember), {
      $ref: '#/components/schemas/CommunityGroupMemberAddRequest',
    });
    assert.equal(addCommunityGroupMember?.requestBody?.required, true);
    assert.equal(addCommunityGroupMember?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(addCommunityGroupMember, '200'), {
      $ref: '#/components/schemas/CommunityGroupResponse',
    });
    assert.equal(updateCommunityGroupMemberRole?.operationId, 'updateCommunityGroupMemberRole');
    assert.deepEqual(requestSchema(updateCommunityGroupMemberRole), {
      $ref: '#/components/schemas/CommunityGroupMemberRoleUpdateRequest',
    });
    assert.equal(updateCommunityGroupMemberRole?.requestBody?.required, true);
    assert.deepEqual(responseSchema(updateCommunityGroupMemberRole, '200'), {
      $ref: '#/components/schemas/CommunityGroupResponse',
    });
    assert.equal(transferCommunityGroupOwnership?.operationId, 'transferCommunityGroupOwnership');
    assert.equal(transferCommunityGroupOwnership?.requestBody, undefined);
    assert.equal(transferCommunityGroupOwnership?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(transferCommunityGroupOwnership, '200'), {
      $ref: '#/components/schemas/CommunityGroupResponse',
    });
    assert.equal(removeCommunityGroupMember?.operationId, 'removeCommunityGroupMember');
    assert.equal(removeCommunityGroupMember?.requestBody, undefined);
    assert.equal(removeCommunityGroupMember?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(removeCommunityGroupMember, '200'), {
      $ref: '#/components/schemas/CommunityGroupResponse',
    });
    assert.equal(archiveCommunityGroup?.operationId, 'archiveCommunityGroup');
    assert.equal(archiveCommunityGroup?.requestBody, undefined);
    assert.equal(archiveCommunityGroup?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(archiveCommunityGroup, '200'), {
      $ref: '#/components/schemas/CommunityGroupResponse',
    });
    assert.deepEqual(payload.components.schemas.CommunityGroupMemberAddRequest.required, [
      'memberUserId',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupMemberRoleUpdateRequest.required, [
      'role',
    ]);
    assert.deepEqual(payload.components.schemas.CommunityGroupAssignableRole.enum, [
      'ADMIN',
      'MODERATOR',
      'MEMBER',
    ]);
    assert.equal(readFollowRelationships?.operationId, 'readFollowRelationships');
    assert.deepEqual(
      readFollowRelationships?.parameters
        ?.filter((parameter) => parameter.in === 'query')
        .map((parameter) => [parameter.name, parameter.required]),
      [
        ['followerId', false],
        ['followingId', false],
        ['targetUserId', false],
      ],
    );
    assert.deepEqual(responseSchema(readFollowRelationships, '200'), {
      $ref: '#/components/schemas/FollowReadResponse',
    });
    assert.deepEqual(payload.components.schemas.FollowReadResponse.oneOf, [
      { $ref: '#/components/schemas/FollowListResponse' },
      { $ref: '#/components/schemas/FollowStatusResponse' },
    ]);
    assert.equal(createFollow?.operationId, 'createFollow');
    assert.deepEqual(requestSchema(createFollow), {
      $ref: '#/components/schemas/FollowCreateRequest',
    });
    assert.equal(createFollow?.requestBody?.required, true);
    assert.equal(createFollow?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createFollow, '201'), {
      $ref: '#/components/schemas/FollowCreateResponse',
    });
    assert.equal(
      updateFollowNotificationPreferences?.operationId,
      'updateFollowNotificationPreferences',
    );
    assert.equal(
      updateFollowNotificationPreferences?.parameters?.find(
        (parameter) => parameter.name === 'followingId',
      )?.required,
      true,
    );
    assert.deepEqual(requestSchema(updateFollowNotificationPreferences), {
      $ref: '#/components/schemas/FollowPreferenceUpdateRequest',
    });
    assert.deepEqual(responseSchema(updateFollowNotificationPreferences, '200'), {
      $ref: '#/components/schemas/FollowPreferenceMutationResponse',
    });
    assert.equal(payload.components.schemas.FollowPreferenceUpdateRequest.minProperties, 1);
    assert.equal(
      payload.components.schemas.FollowPreferenceUpdateRequest.additionalProperties,
      false,
    );
    assert.equal(removeFollow?.operationId, 'removeFollow');
    assert.equal(removeFollow?.requestBody, undefined);
    assert.equal(
      removeFollow?.parameters?.find((parameter) => parameter.name === 'followingId')?.required,
      true,
    );
    assert.deepEqual(responseSchema(removeFollow, '200'), {
      $ref: '#/components/schemas/FollowRemovalResponse',
    });
    assert.equal(listFollowRequests?.operationId, 'listFollowRequests');
    assert.equal(
      listFollowRequests?.parameters?.find((parameter) => parameter.name === 'targetId')?.required,
      false,
    );
    assert.deepEqual(responseSchema(listFollowRequests, '200'), {
      $ref: '#/components/schemas/FollowRequestListResponse',
    });
    assert.equal(createFollowRequest?.operationId, 'createFollowRequest');
    assert.deepEqual(requestSchema(createFollowRequest), {
      $ref: '#/components/schemas/FollowRequestCreateRequest',
    });
    assert.deepEqual(responseSchema(createFollowRequest, '200'), {
      $ref: '#/components/schemas/FollowRequestMutationResponse',
    });
    assert.deepEqual(responseSchema(createFollowRequest, '201'), {
      $ref: '#/components/schemas/FollowRequestMutationResponse',
    });
    assert.equal(respondToFollowRequest?.operationId, 'respondToFollowRequest');
    assert.deepEqual(requestSchema(respondToFollowRequest), {
      $ref: '#/components/schemas/FollowRequestDecisionRequest',
    });
    assert.deepEqual(responseSchema(respondToFollowRequest, '200'), {
      $ref: '#/components/schemas/FollowRequestDecisionResponse',
    });
    assert.deepEqual(payload.components.schemas.FollowRequestDecision.enum, [
      'ACCEPTED',
      'DECLINED',
    ]);
    assert.equal(listPosts?.operationId, 'listPosts');
    assert.deepEqual(responseSchema(listPosts, '200'), {
      $ref: '#/components/schemas/PostListResponse',
    });
    assert.equal(createPost?.operationId, 'createPost');
    assert.deepEqual(requestSchema(createPost), {
      $ref: '#/components/schemas/PostCreateRequest',
    });
    assert.equal(createPost?.requestBody?.required, true);
    assert.equal(createPost?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createPost, '201'), {
      $ref: '#/components/schemas/PostResponse',
    });
    assert.equal(getPost?.operationId, 'getPost');
    assert.deepEqual(responseSchema(getPost, '200'), {
      $ref: '#/components/schemas/PostResponse',
    });
    assert.equal(togglePostReaction?.operationId, 'togglePostReaction');
    assert.equal(togglePostReaction?.requestBody, undefined);
    assert.equal(togglePostReaction?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(togglePostReaction, '200'), {
      $ref: '#/components/schemas/PostResponse',
    });
    assert.equal(setPostPin?.operationId, 'setPostPin');
    assert.deepEqual(requestSchema(setPostPin), {
      $ref: '#/components/schemas/PostPinRequest',
    });
    assert.equal(setPostPin?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(setPostPin, '200'), {
      $ref: '#/components/schemas/PostResponse',
    });
    assert.deepEqual(payload.components.schemas.PostCreateRequest.required, ['content']);
    assert.deepEqual(payload.components.schemas.PostListResponse.required, [
      'posts',
      'seedVersion',
      'requestId',
    ]);
    assert.equal(payload.components.schemas.PostClientMetadata.additionalProperties, true);
    assert.equal(
      payload.components.schemas.Post.properties?.attachmentsJson?.anyOf?.some(
        (schema) => schema.type === 'array',
      ),
      true,
    );
    assert.equal(
      (
        responseExample(createPost, '201') as {
          post?: { attachmentsJson?: { attachments?: Array<{ mediaObjectId?: string }> } };
        }
      ).post?.attachmentsJson?.attachments?.[0]?.mediaObjectId,
      'med_123',
    );
    assert.equal(
      (
        responseExample(togglePostReaction, '200') as {
          post?: { likedByCurrentUser?: boolean; likes?: string[] };
        }
      ).post?.likedByCurrentUser,
      true,
    );
    assert.equal(listPostComments?.operationId, 'listPostComments');
    assert.deepEqual(responseSchema(listPostComments, '200'), {
      $ref: '#/components/schemas/PostCommentListResponse',
    });
    assert.equal(createPostComment?.operationId, 'createPostComment');
    assert.deepEqual(requestSchema(createPostComment), {
      $ref: '#/components/schemas/PostCommentCreateRequest',
    });
    assert.equal(createPostComment?.requestBody?.required, true);
    assert.equal(createPostComment?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createPostComment, '201'), {
      $ref: '#/components/schemas/PostCommentResponse',
    });
    assert.equal(getPostComment?.operationId, 'getPostComment');
    assert.deepEqual(responseSchema(getPostComment, '200'), {
      $ref: '#/components/schemas/PostCommentResponse',
    });
    assert.equal(removePostComment?.operationId, 'removePostComment');
    assert.equal(removePostComment?.requestBody, undefined);
    assert.equal(removePostComment?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(removePostComment, '200'), {
      $ref: '#/components/schemas/PostCommentResponse',
    });
    assert.equal(togglePostCommentReaction?.operationId, 'togglePostCommentReaction');
    assert.equal(togglePostCommentReaction?.requestBody, undefined);
    assert.equal(togglePostCommentReaction?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(togglePostCommentReaction, '200'), {
      $ref: '#/components/schemas/PostCommentResponse',
    });
    assert.deepEqual(payload.components.schemas.PostCommentCreateRequest.required, ['content']);
    assert.equal(payload.components.schemas.PostCommentCreateRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.PostCommentListResponse.required, [
      'comments',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.PostCommentResponse.required, [
      'comment',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.PostComment.required, [
      'id',
      'postId',
      'authorUserId',
      'parentCommentId',
      'content',
      'isDeleted',
      'deletedAt',
      'createdAt',
      'updatedAt',
      'author',
      'likesCount',
      'likedByCurrentUser',
      'likes',
    ]);
    assert.equal(
      (
        responseExample(removePostComment, '200') as {
          comment?: { isDeleted?: boolean; content?: string };
        }
      ).comment?.isDeleted,
      true,
    );
    assert.deepEqual(
      (
        responseExample(togglePostCommentReaction, '200') as {
          comment?: { likedByCurrentUser?: boolean; likes?: string[] };
        }
      ).comment?.likes,
      ['usr_member_456'],
    );
    assert.equal(listMessageThreads?.operationId, 'listMessageThreads');
    assert.deepEqual(responseSchema(listMessageThreads, '200'), {
      $ref: '#/components/schemas/MessageThreadListResponse',
    });
    assert.equal(sendCommunityGroupMessage?.operationId, 'sendCommunityGroupMessage');
    assert.deepEqual(requestSchema(sendCommunityGroupMessage), {
      $ref: '#/components/schemas/MessageCreateRequest',
    });
    assert.equal(sendCommunityGroupMessage?.requestBody?.required, true);
    assert.equal(sendCommunityGroupMessage?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(sendCommunityGroupMessage, '201'), {
      $ref: '#/components/schemas/MessageMutationResponse',
    });
    assert.equal(markCommunityGroupMessagesRead?.operationId, 'markCommunityGroupMessagesRead');
    assert.equal(markCommunityGroupMessagesRead?.requestBody, undefined);
    assert.equal(markCommunityGroupMessagesRead?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(markCommunityGroupMessagesRead, '200'), {
      $ref: '#/components/schemas/NullableMessageThreadResponse',
    });
    assert.equal(sendMessageThreadMessage?.operationId, 'sendMessageThreadMessage');
    assert.deepEqual(requestSchema(sendMessageThreadMessage), {
      $ref: '#/components/schemas/MessageCreateRequest',
    });
    assert.equal(sendMessageThreadMessage?.requestBody?.required, true);
    assert.equal(sendMessageThreadMessage?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(sendMessageThreadMessage, '201'), {
      $ref: '#/components/schemas/MessageMutationResponse',
    });
    assert.equal(markMessageThreadRead?.operationId, 'markMessageThreadRead');
    assert.equal(markMessageThreadRead?.requestBody, undefined);
    assert.equal(markMessageThreadRead?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(markMessageThreadRead, '200'), {
      $ref: '#/components/schemas/MessageThreadResponse',
    });
    assert.equal(removeMessage?.operationId, 'removeMessage');
    assert.equal(removeMessage?.requestBody, undefined);
    assert.equal(removeMessage?.responses?.['201'], undefined);
    assert.deepEqual(responseSchema(removeMessage, '200'), {
      $ref: '#/components/schemas/MessageMutationResponse',
    });
    assert.deepEqual(payload.components.schemas.MessageCreateRequest.required, ['body']);
    assert.equal(payload.components.schemas.MessageCreateRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.MessageThreadListResponse.required, [
      'threads',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.MessageMutationResponse.required, [
      'message',
      'thread',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.MessageThread.required, [
      'id',
      'threadType',
      'clubId',
      'communityGroupId',
      'groupSessionId',
      'bookingId',
      'title',
      'lastMessageAt',
      'createdByUserId',
      'updatedByUserId',
      'version',
      'createdAt',
      'updatedAt',
      'deletedAt',
      'participants',
      'messages',
    ]);
    assert.equal(
      payload.components.schemas.Message.properties?.attachmentsJson?.anyOf?.some(
        (schema) => schema.type === 'array',
      ),
      true,
    );
    assert.equal(
      (
        responseExample(removeMessage, '200') as {
          message?: { content?: string; deletedAt?: string | null };
        }
      ).message?.content,
      '[deleted]',
    );
    assert.equal(
      (
        responseExample(markCommunityGroupMessagesRead, '200') as {
          thread?: { threadType?: string } | null;
        }
      ).thread?.threadType,
      'GROUP',
    );
    assert.equal(listNotifications?.operationId, 'listNotifications');
    assert.deepEqual(responseSchema(listNotifications, '200'), {
      $ref: '#/components/schemas/NotificationListResponse',
    });
    assert.equal(updateNotificationPreferences?.operationId, 'updateNotificationPreferences');
    assert.deepEqual(requestSchema(updateNotificationPreferences), {
      $ref: '#/components/schemas/NotificationPreferenceUpdateRequest',
    });
    assert.equal(updateNotificationPreferences?.requestBody?.required, true);
    assert.deepEqual(responseSchema(updateNotificationPreferences, '200'), {
      $ref: '#/components/schemas/NotificationPreferenceMutationResponse',
    });
    for (const [operation, operationId, response] of [
      [markAllNotificationsRead, 'markAllNotificationsRead', 'NotificationBulkMutationResponse'],
      [dismissAllNotifications, 'dismissAllNotifications', 'NotificationBulkMutationResponse'],
      [markNotificationRead, 'markNotificationRead', 'NotificationMutationResponse'],
      [dismissNotification, 'dismissNotification', 'NotificationMutationResponse'],
    ] as const) {
      assert.equal(operation?.operationId, operationId);
      assert.equal(operation?.requestBody, undefined);
      assert.equal(operation?.responses?.['201'], undefined);
      assert.deepEqual(responseSchema(operation, '200'), {
        $ref: `#/components/schemas/${response}`,
      });
    }
    assert.equal(
      payload.components.schemas.NotificationPreferenceUpdateRequest.additionalProperties,
      false,
    );
    assert.deepEqual(payload.components.schemas.NotificationListResponse.required, [
      'notifications',
      'preferences',
      'mutedSources',
      'quietHours',
      'unreadCount',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.NotificationMutationResponse.required, [
      'notification',
      'seedVersion',
      'requestId',
    ]);
    assert.deepEqual(payload.components.schemas.NotificationBulkMutationResponse.required, [
      'notifications',
      'unreadCount',
      'seedVersion',
      'requestId',
    ]);
    assert.equal(
      payload.components.schemas.NotificationQuietHoursInput.properties?.timezone?.description,
      'Valid IANA time zone identifier.',
    );
    assert.equal(
      (
        responseExample(markNotificationRead, '200') as {
          notification?: { status?: string; readAt?: string | null };
        }
      ).notification?.status,
      'READ',
    );
    assert.equal(
      (
        responseExample(dismissNotification, '200') as {
          notification?: { status?: string; dismissedAt?: string | null };
        }
      ).notification?.status,
      'DISMISSED',
    );
    assert.equal(listClubInviteCodes?.operationId, 'listClubInviteCodes');
    assert.deepEqual(responseSchema(listClubInviteCodes, '200'), {
      $ref: '#/components/schemas/ClubInviteCodesResponse',
    });
    assert.equal(createClubInviteCode?.operationId, 'createClubInviteCode');
    assert.deepEqual(requestSchema(createClubInviteCode), {
      $ref: '#/components/schemas/CreateClubInviteCodeRequest',
    });
    assert.equal(createClubInviteCode?.requestBody?.required, true);
    assert.deepEqual(responseSchema(createClubInviteCode, '201'), {
      $ref: '#/components/schemas/ClubInviteCodeResponse',
    });
    assert.equal(createClubInviteCode?.responses?.['200'], undefined);
    assert.equal(revokeClubInviteCode?.operationId, 'revokeClubInviteCode');
    assert.equal(revokeClubInviteCode?.requestBody, undefined);
    assert.equal(revokeClubInviteCode?.responses?.['200'], undefined);
    assert.equal(revokeClubInviteCode?.responses?.['201'], undefined);
    assert.equal(
      (revokeClubInviteCode?.responses?.['204'] as { description?: string } | undefined)
        ?.description,
      'Invite code revoked.',
    );
    assert.equal(revokeClubInviteCode?.['x-clubroom-effect'], 'revoke invite code');
    assert.deepEqual((payload.components.schemas.ClubInviteRole as { enum?: string[] }).enum, [
      'MEMBER',
      'COACH',
      'ADMIN',
    ]);
    assert.deepEqual(payload.components.schemas.CreateClubInviteCodeRequest.required, ['role']);
    assert.equal(
      payload.components.schemas.CreateClubInviteCodeRequest.additionalProperties,
      false,
    );
    assert.equal(createClubInvites?.operationId, 'createClubInvites');
    assert.deepEqual(requestSchema(createClubInvites), {
      $ref: '#/components/schemas/CreateClubInvitesRequest',
    });
    assert.equal(createClubInvites?.requestBody?.required, true);
    assert.equal(createClubInvites?.responses?.['200'], undefined);
    assert.deepEqual(responseSchema(createClubInvites, '201'), {
      $ref: '#/components/schemas/CreateClubInvitesResponse',
    });
    createClubInvitesRequestSchema.parse(requestExample(createClubInvites));
    createClubInvitesResponseSchema.parse(responseExample(createClubInvites, '201'));
    assert.equal(listMyClubInvites?.operationId, 'listMyClubInvites');
    assert.deepEqual(responseSchema(listMyClubInvites, '200'), {
      $ref: '#/components/schemas/ClubInvitesResponse',
    });
    clubInvitesResponseSchema.parse(responseExample(listMyClubInvites, '200'));
    assert.equal(respondToClubInvite?.operationId, 'respondToClubInvite');
    assert.deepEqual(requestSchema(respondToClubInvite), {
      $ref: '#/components/schemas/RespondToClubInviteRequest',
    });
    assert.equal(respondToClubInvite?.requestBody?.required, true);
    assert.deepEqual(responseSchema(respondToClubInvite, '200'), {
      $ref: '#/components/schemas/RespondToClubInviteResponse',
    });
    assert.equal(respondToClubInvite?.responses?.['201'], undefined);
    respondToClubInviteRequestSchema.parse(requestExample(respondToClubInvite));
    respondToClubInviteResponseSchema.parse(responseExample(respondToClubInvite, '200'));
    assert.equal(payload.components.schemas.CreateClubInvitesRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.RespondToClubInviteResponse.required, [
      'invite',
      'membership',
      'club',
      'requestId',
    ]);
    assert.deepEqual(responseSchema(clubMembers, '200'), {
      $ref: '#/components/schemas/ClubMemberListResponse',
    });
    assert.deepEqual(responseSchema(clubMemberRemovals, '200'), {
      $ref: '#/components/schemas/ClubMemberRemovalListResponse',
    });
    assert.deepEqual(requestSchema(leaveClub), {
      $ref: '#/components/schemas/ClubMemberSelfLeaveRequest',
    });
    assert.equal(leaveClub?.requestBody?.required, false);
    assert.deepEqual(responseSchema(leaveClub, '200'), {
      $ref: '#/components/schemas/ClubMemberRemovalResponse',
    });
    assert.equal(Boolean(leaveClub?.responses?.['201']), false);
    assert.deepEqual(requestSchema(updateClubMemberRole), {
      $ref: '#/components/schemas/ClubMemberRoleUpdateRequest',
    });
    assert.equal(updateClubMemberRole?.requestBody?.required, true);
    assert.deepEqual(responseSchema(updateClubMemberRole, '200'), {
      $ref: '#/components/schemas/ClubMemberResponse',
    });
    assert.deepEqual(requestSchema(removeClubMember), {
      $ref: '#/components/schemas/ClubMemberRemovalRequest',
    });
    assert.equal(removeClubMember?.requestBody?.required, false);
    assert.deepEqual(responseSchema(removeClubMember, '200'), {
      $ref: '#/components/schemas/ClubMemberRemovalResponse',
    });
    assert.equal(removeClubMember?.['x-clubroom-effect'], 'remove');
    assert.deepEqual(requestSchema(banClubMember), {
      $ref: '#/components/schemas/ClubMemberBanRequest',
    });
    assert.equal(banClubMember?.requestBody?.required, true);
    assert.deepEqual(responseSchema(banClubMember, '200'), {
      $ref: '#/components/schemas/ClubMemberRemovalResponse',
    });
    assert.equal(Boolean(banClubMember?.responses?.['201']), false);
    assert.equal(restoreClubMember?.requestBody, undefined);
    assert.deepEqual(responseSchema(restoreClubMember, '200'), {
      $ref: '#/components/schemas/ClubMemberResponse',
    });
    assert.equal(Boolean(restoreClubMember?.responses?.['201']), false);
    assert.deepEqual(responseSchema(safeguardingIncidents, '200'), {
      $ref: '#/components/schemas/SafeguardingIncidentListResponse',
    });
    assert.deepEqual(safeguardingIncidents?.tags, ['Trust & Safety']);
    const reportedBy = safeguardingIncidents?.parameters?.find(
      (parameter) => parameter.name === 'reportedBy',
    );
    assert.equal((reportedBy?.schema as { default?: string } | undefined)?.default, 'me');
    assert.deepEqual(requestSchema(createSafeguardingIncident), {
      $ref: '#/components/schemas/CreateSafeguardingIncidentRequest',
    });
    assert.equal(createSafeguardingIncident?.requestBody?.required, true);
    assert.deepEqual(responseSchema(createSafeguardingIncident, '201'), {
      $ref: '#/components/schemas/SafeguardingIncidentResponse',
    });
    assert.equal(Boolean(createSafeguardingIncident?.responses?.['200']), false);
    assert.deepEqual(responseSchema(safeguardingIncident, '200'), {
      $ref: '#/components/schemas/SafeguardingIncidentResponse',
    });
    assert.deepEqual(requestSchema(addSafeguardingAction), {
      $ref: '#/components/schemas/CreateSafeguardingActionRequest',
    });
    assert.equal(addSafeguardingAction?.requestBody?.required, true);
    assert.deepEqual(responseSchema(addSafeguardingAction, '201'), {
      $ref: '#/components/schemas/SafeguardingActionResponse',
    });
    assert.equal(Boolean(addSafeguardingAction?.responses?.['200']), false);
    assert.deepEqual(responseSchema(reports, '200'), {
      $ref: '#/components/schemas/ReportListResponse',
    });
    assert.deepEqual(requestSchema(createReport), {
      $ref: '#/components/schemas/CreateReportRequest',
    });
    assert.deepEqual(responseSchema(createReport, '201'), {
      $ref: '#/components/schemas/ReportMutationResponse',
    });
    assert.equal(Boolean(createReport?.responses?.['200']), false);
    assert.deepEqual(responseSchema(blocks, '200'), {
      $ref: '#/components/schemas/BlockListResponse',
    });
    const targetUserId = blocks?.parameters?.find((parameter) => parameter.name === 'targetUserId');
    assert.equal(targetUserId?.required, false);
    assert.deepEqual(requestSchema(createBlock), {
      $ref: '#/components/schemas/BlockUserRequest',
    });
    assert.deepEqual(responseSchema(createBlock, '201'), {
      $ref: '#/components/schemas/BlockMutationResponse',
    });
    assert.equal(Boolean(createBlock?.responses?.['200']), false);
    assert.equal(removeBlock?.operationId, 'unblockUser');
    assert.equal(removeBlock?.summary, 'Unblock User');
    assert.equal(removeBlock?.['x-clubroom-effect'], 'unblock');
    assert.deepEqual(responseSchema(removeBlock, '200'), {
      $ref: '#/components/schemas/BlockMutationResponse',
    });
    const blockedUserId = removeBlock?.parameters?.find(
      (parameter) => parameter.name === 'blockedUserId',
    );
    assert.equal(blockedUserId?.required, false);
    assert.deepEqual(requestSchema(markGroupAttendance), {
      $ref: '#/components/schemas/MarkGroupSessionAttendanceRequest',
    });
    assert.equal(markGroupAttendance?.requestBody?.required, true);
    assert.deepEqual(responseSchema(markGroupAttendance, '200'), {
      $ref: '#/components/schemas/GroupSessionRegistrationMutationResponse',
    });
    assert.deepEqual(markGroupAttendance?.responses?.['503'], {
      $ref: '#/components/responses/ServiceUnavailable',
    });
    assert.deepEqual(responseSchema(getGroupSessionRoster, '200'), {
      $ref: '#/components/schemas/GroupSessionRosterResponse',
    });
    assert.deepEqual(payload.components.schemas.GroupSessionRosterResponse.required, [
      'session',
      'registrations',
      'total',
      'occurrenceDate',
      'requestId',
    ]);
    assert.deepEqual(requestSchema(completeGroupSession), {
      $ref: '#/components/schemas/CompleteGroupSessionRequest',
    });
    assert.equal(completeGroupSession?.requestBody?.required, true);
    assert.deepEqual(responseSchema(completeGroupSession, '200'), {
      $ref: '#/components/schemas/GroupSessionCompletionResponse',
    });
    assert.deepEqual(completeGroupSession?.responses?.['503'], {
      $ref: '#/components/responses/ServiceUnavailable',
    });
    assert.deepEqual(login?.responses?.['400'], { $ref: '#/components/responses/BadRequest' });
    assert.deepEqual(login?.responses?.['401'], { $ref: '#/components/responses/Unauthorized' });
    assert.equal(Boolean(login?.responses?.['403']), false);
    assert.equal(Boolean(login?.responses?.['409']), false);
    assert.deepEqual(requestSchema(login), { $ref: '#/components/schemas/AuthLoginRequest' });
    assert.deepEqual(responseSchema(login, '200'), {
      $ref: '#/components/schemas/AuthLoginResponse',
    });
    assert.equal(Boolean(login?.responses?.['201']), false);
    assert.ok(login?.requestBody?.content?.['application/json']?.examples?.example?.value);
    assert.deepEqual(requestSchema(register), { $ref: '#/components/schemas/AuthRegisterRequest' });
    assert.deepEqual(responseSchema(register, '201'), {
      $ref: '#/components/schemas/AuthRegisterResponse',
    });
    assert.equal(Boolean(register?.responses?.['200']), false);
    assert.equal(Boolean(register?.responses?.['409']), false);
    assert.deepEqual(requestSchema(refresh), { $ref: '#/components/schemas/AuthRefreshRequest' });
    assert.deepEqual(responseSchema(refresh, '200'), {
      $ref: '#/components/schemas/AuthTokenResponse',
    });
    assert.deepEqual(refresh?.responses?.['401'], { $ref: '#/components/responses/Unauthorized' });
    assert.equal(Boolean(refresh?.responses?.['201']), false);
    assert.equal(Boolean(refresh?.responses?.['409']), false);
    assert.equal(Boolean(logout?.requestBody), false);
    assert.equal(
      (logout?.responses?.['204'] as OpenApiResponse | undefined)?.description,
      'Current session revoked when present.',
    );
    assert.equal(Boolean(logout?.responses?.['200']), false);
    assert.equal(Boolean(logout?.responses?.['201']), false);
    assert.equal(Boolean(logout?.responses?.['409']), false);
    assert.deepEqual(requestSchema(revokeSession), {
      $ref: '#/components/schemas/AuthRevokeRequest',
    });
    assert.equal(revokeSession?.requestBody?.required, false);
    assert.equal(
      (revokeSession?.responses?.['204'] as OpenApiResponse | undefined)?.description,
      'Current session or provided refresh token revoked when present.',
    );
    assert.equal(Boolean(revokeSession?.responses?.['200']), false);
    assert.equal(Boolean(revokeSession?.responses?.['201']), false);
    assert.equal(Boolean(revokeSession?.responses?.['409']), false);
    assert.deepEqual(responseSchema(authMe, '200'), {
      $ref: '#/components/schemas/AuthProfileResponse',
    });
    assert.deepEqual(requestSchema(authMePatch), {
      $ref: '#/components/schemas/AuthProfilePatchRequest',
    });
    assert.deepEqual(responseSchema(authMePatch, '200'), {
      $ref: '#/components/schemas/AuthProfileResponse',
    });
    assert.equal(Boolean(authMePatch?.responses?.['201']), false);
    assert.equal(getActiveUserSummary?.operationId, 'getActiveUserSummary');
    assert.deepEqual(responseSchema(getActiveUserSummary, '200'), {
      $ref: '#/components/schemas/AdminUserSummaryResponse',
    });
    assert.equal(payload.components.schemas.AdminUserSummary.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.AdminUserSummary.required, [
      'total',
      'coaches',
      'athletes',
      'parents',
    ]);
    assert.equal(payload.components.schemas.AdminUserSummaryResponse.additionalProperties, false);
    adminUserSummaryResponseSchema.parse(responseExample(getActiveUserSummary, '200'));
    assert.equal(searchVisibleUsers?.operationId, 'searchVisibleUsers');
    assert.deepEqual(responseSchema(searchVisibleUsers, '200'), {
      $ref: '#/components/schemas/UserSearchResponse',
    });
    const userSearchText = searchVisibleUsers?.parameters?.find(
      (parameter) => parameter.name === 'q',
    );
    const userSearchLimit = searchVisibleUsers?.parameters?.find(
      (parameter) => parameter.name === 'limit',
    );
    assert.equal(userSearchText?.in, 'query');
    assert.equal(userSearchText?.required, true);
    assert.equal((userSearchText?.schema as { minLength?: number }).minLength, 2);
    assert.equal((userSearchLimit?.schema as { maximum?: number }).maximum, 20);
    assert.equal(getVisibleUserProfile?.operationId, 'getVisibleUserProfile');
    assert.deepEqual(responseSchema(getVisibleUserProfile, '200'), {
      $ref: '#/components/schemas/UserProfileResponse',
    });
    assert.equal(payload.components.schemas.UserDirectoryEntry.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.UserDirectoryEntry.required, [
      'id',
      'name',
      'role',
    ]);
    assert.equal(payload.components.schemas.UserDirectoryEntry.properties?.dateOfBirth, undefined);
    assert.equal(payload.components.schemas.UserSearchResponse.additionalProperties, false);
    assert.equal(payload.components.schemas.UserProfileResponse.additionalProperties, false);
    userSearchResponseSchema.parse(responseExample(searchVisibleUsers, '200'));
    userProfileResponseSchema.parse(responseExample(getVisibleUserProfile, '200'));
    assert.equal(getAthleteAnalytics?.operationId, 'getAthleteAnalytics');
    assert.deepEqual(responseSchema(getAthleteAnalytics, '200'), {
      $ref: '#/components/schemas/AthleteAnalyticsResponse',
    });
    const athleteAnalyticsPeriod = getAthleteAnalytics?.parameters?.find(
      (parameter) => parameter.name === 'period',
    );
    assert.deepEqual(athleteAnalyticsPeriod?.schema, {
      type: 'string',
      enum: ['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'],
      default: 'MONTH',
    });
    assert.equal(payload.components.schemas.AthleteAnalytics.additionalProperties, false);
    assert.equal(payload.components.schemas.AthleteAnalyticsResponse.additionalProperties, false);
    athleteAnalyticsResponseSchema.parse(responseExample(getAthleteAnalytics, '200'));
    assert.equal(getAthleteSkillHistory?.operationId, 'getAthleteSkillHistory');
    assert.deepEqual(responseSchema(getAthleteSkillHistory, '200'), {
      $ref: '#/components/schemas/AthleteSkillHistoryResponse',
    });
    const athleteSkillName = getAthleteSkillHistory?.parameters?.find(
      (parameter) => parameter.name === 'skillName',
    );
    assert.deepEqual(athleteSkillName?.schema, {
      type: 'string',
      minLength: 1,
      maxLength: 120,
    });
    assert.equal(
      payload.components.schemas.AthleteSkillHistoryResponse.additionalProperties,
      false,
    );
    athleteSkillHistoryResponseSchema.parse(responseExample(getAthleteSkillHistory, '200'));
    assert.equal(recordAthleteSkillUpdate?.operationId, 'recordAthleteSkillUpdate');
    assert.deepEqual(requestSchema(recordAthleteSkillUpdate), {
      $ref: '#/components/schemas/AthleteSkillUpdateRequest',
    });
    assert.deepEqual(responseSchema(recordAthleteSkillUpdate, '200'), {
      $ref: '#/components/schemas/AthleteSkillUpdateResponse',
    });
    assert.deepEqual(responseSchema(recordAthleteSkillUpdate, '201'), {
      $ref: '#/components/schemas/AthleteSkillUpdateResponse',
    });
    assert.equal(payload.components.schemas.AthleteSkillUpdateRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.AthleteSkillUpdateResponse.additionalProperties, false);
    athleteSkillUpdateRequestSchema.parse(requestExample(recordAthleteSkillUpdate));
    athleteSkillUpdateResponseSchema.parse(responseExample(recordAthleteSkillUpdate, '200'));
    athleteSkillUpdateResponseSchema.parse(responseExample(recordAthleteSkillUpdate, '201'));
    assert.equal(listAthletePracticeLogs?.operationId, 'listAthletePracticeLogs');
    assert.deepEqual(responseSchema(listAthletePracticeLogs, '200'), {
      $ref: '#/components/schemas/PracticeLogListResponse',
    });
    assert.deepEqual(
      listAthletePracticeLogs?.parameters?.find((parameter) => parameter.name === 'since')?.schema,
      { type: 'string', format: 'date' },
    );
    assert.deepEqual(
      listAthletePracticeLogs?.parameters?.find((parameter) => parameter.name === 'limit')?.schema,
      { type: 'integer', minimum: 1, maximum: 100, default: 100 },
    );
    assert.equal(payload.components.schemas.PracticeLogEntry.additionalProperties, false);
    assert.equal(payload.components.schemas.PracticeLogListResponse.additionalProperties, false);
    practiceLogListResponseSchema.parse(responseExample(listAthletePracticeLogs, '200'));
    assert.equal(getTodayAthletePracticeLog?.operationId, 'getTodayAthletePracticeLog');
    assert.deepEqual(responseSchema(getTodayAthletePracticeLog, '200'), {
      $ref: '#/components/schemas/PracticeLogTodayResponse',
    });
    assert.equal(payload.components.schemas.PracticeLogTodayResponse.additionalProperties, false);
    practiceLogTodayResponseSchema.parse(responseExample(getTodayAthletePracticeLog, '200'));
    assert.equal(recordAthletePractice?.operationId, 'recordAthletePractice');
    assert.deepEqual(requestSchema(recordAthletePractice), {
      $ref: '#/components/schemas/PracticeLogCreateRequest',
    });
    assert.deepEqual(responseSchema(recordAthletePractice, '200'), {
      $ref: '#/components/schemas/PracticeLogMutationResponse',
    });
    assert.deepEqual(responseSchema(recordAthletePractice, '201'), {
      $ref: '#/components/schemas/PracticeLogMutationResponse',
    });
    assert.equal(payload.components.schemas.PracticeLogCreateRequest.additionalProperties, false);
    assert.equal(
      payload.components.schemas.PracticeLogMutationResponse.additionalProperties,
      false,
    );
    practiceLogCreateRequestSchema.parse(requestExample(recordAthletePractice));
    practiceLogMutationResponseSchema.parse(responseExample(recordAthletePractice, '200'));
    practiceLogMutationResponseSchema.parse(responseExample(recordAthletePractice, '201'));
    assert.deepEqual(requestSchema(forgotPassword), {
      $ref: '#/components/schemas/ForgotPasswordRequest',
    });
    assert.deepEqual(responseSchema(forgotPassword, '200'), {
      $ref: '#/components/schemas/PasswordResetDebugResponse',
    });
    assert.equal(
      (forgotPassword?.responses?.['204'] as OpenApiResponse | undefined)?.description,
      'Password reset request accepted without account enumeration. This is the normal production response.',
    );
    assert.equal(Boolean(forgotPassword?.responses?.['201']), false);
    assert.equal(Boolean(forgotPassword?.responses?.['409']), false);
    assert.deepEqual(requestSchema(resetPassword), {
      $ref: '#/components/schemas/ResetPasswordRequest',
    });
    assert.equal(
      (resetPassword?.responses?.['204'] as OpenApiResponse | undefined)?.description,
      'Password reset completed; active sessions are revoked.',
    );
    assert.equal(Boolean(resetPassword?.responses?.['200']), false);
    assert.equal(Boolean(resetPassword?.responses?.['201']), false);
    assert.equal(Boolean(resetPassword?.responses?.['409']), false);
    assert.deepEqual(requestSchema(verifyEmail), {
      $ref: '#/components/schemas/VerifyEmailRequest',
    });
    assert.deepEqual(responseSchema(verifyEmail, '200'), {
      $ref: '#/components/schemas/AuthProfileResponse',
    });
    assert.equal(Boolean(verifyEmail?.responses?.['201']), false);
    assert.equal(Boolean(verifyEmail?.responses?.['409']), false);
    assert.deepEqual(responseSchema(checkEmail, '200'), {
      $ref: '#/components/schemas/EmailAvailabilityResponse',
    });
    const emailParameter = checkEmail?.parameters?.find((parameter) => parameter.name === 'email');
    assert.equal(emailParameter?.in, 'query');
    assert.equal(emailParameter?.required, true);
    assert.deepEqual(responseSchema(earnings, '200'), {
      $ref: '#/components/schemas/CoachEarningsResponse',
    });
    const earningsPeriod = earnings?.parameters?.find((parameter) => parameter.name === 'period');
    assert.deepEqual((earningsPeriod?.schema as { enum?: string[] } | undefined)?.enum, [
      'week',
      'month',
      'year',
    ]);
    assert.deepEqual(responseSchema(payoutMethods, '200'), {
      $ref: '#/components/schemas/PayoutMethodsResponse',
    });
    assert.deepEqual(requestSchema(createPayoutMethod), {
      $ref: '#/components/schemas/PayoutMethodCreateRequest',
    });
    assert.deepEqual(responseSchema(createPayoutMethod, '200'), {
      $ref: '#/components/schemas/PayoutMethodsResponse',
    });
    assert.equal(Boolean(createPayoutMethod?.responses?.['201']), false);
    assert.equal(payload.components.schemas.PayoutMethod.properties?.sortCode, undefined);
    assert.deepEqual(responseSchema(removePayoutMethod, '200'), {
      $ref: '#/components/schemas/PayoutMethodsResponse',
    });
    assert.equal(defaultPayoutMethod?.requestBody, undefined);
    assert.deepEqual(responseSchema(defaultPayoutMethod, '200'), {
      $ref: '#/components/schemas/PayoutMethodsResponse',
    });
    assert.deepEqual(responseSchema(withdrawals, '200'), {
      $ref: '#/components/schemas/WithdrawalsResponse',
    });
    const withdrawalStatus = withdrawals?.parameters?.find(
      (parameter) => parameter.name === 'status',
    );
    assert.deepEqual((withdrawalStatus?.schema as { enum?: string[] } | undefined)?.enum, [
      'pending',
    ]);
    assert.deepEqual(requestSchema(requestWithdrawal), {
      $ref: '#/components/schemas/WithdrawalRequest',
    });
    assert.deepEqual(responseSchema(requestWithdrawal, '200'), {
      $ref: '#/components/schemas/WithdrawalsResponse',
    });
    assert.equal(Boolean(requestWithdrawal?.responses?.['201']), false);
    assert.equal(cancelWithdrawal?.requestBody, undefined);
    assert.deepEqual(responseSchema(cancelWithdrawal, '200'), {
      $ref: '#/components/schemas/WithdrawalsResponse',
    });
    assert.equal(Boolean(cancelWithdrawal?.responses?.['201']), false);
    assert.equal(completeWithdrawal?.requestBody, undefined);
    assert.deepEqual(responseSchema(completeWithdrawal, '200'), {
      $ref: '#/components/schemas/WithdrawalsResponse',
    });
    assert.equal(completeWithdrawal?.['x-clubroom-effect'], 'simulate complete');
    assert.equal(Boolean(completeWithdrawal?.responses?.['201']), false);
    assert.deepEqual(requestSchema(createPaymentSession), {
      $ref: '#/components/schemas/InvoicePaymentCreateRequest',
    });
    assert.deepEqual(responseSchema(createPaymentSession, '200'), {
      $ref: '#/components/schemas/InvoicePaymentSessionResponse',
    });
    assert.deepEqual(responseSchema(createPaymentSession, '201'), {
      $ref: '#/components/schemas/InvoicePaymentSessionResponse',
    });
    assert.deepEqual(
      (hostedPayment?.responses?.['200'] as OpenApiResponse | undefined)?.content?.['text/html']
        ?.schema,
      { type: 'string' },
    );
    const paymentToken = hostedPayment?.parameters?.find((parameter) => parameter.name === 'token');
    assert.equal(paymentToken?.in, 'query');
    assert.equal(paymentToken?.required, true);
    assert.deepEqual(requestSchema(completePayment), {
      $ref: '#/components/schemas/SimulatedPaymentCompleteRequest',
    });
    assert.deepEqual(responseSchema(completePayment, '200'), {
      $ref: '#/components/schemas/SimulatedPaymentCompleteResponse',
    });
    assert.equal(Boolean(completePayment?.responses?.['201']), false);
    assert.equal(Boolean(completePayment?.responses?.['409']), false);
    assert.deepEqual((payload.components.schemas.SimulatedProvider as { enum?: string[] }).enum, [
      'simulated',
    ]);
    assert.match(
      String(
        (payload.components.schemas.SimulatedProvider as { description?: string }).description,
      ),
      /No real funds/i,
    );
    for (const [route, method] of [
      ['/v1/auth/login', 'post'],
      ['/v1/auth/register', 'post'],
      ['/v1/auth/refresh', 'post'],
      ['/v1/auth/forgot-password', 'post'],
      ['/v1/auth/reset-password', 'post'],
      ['/v1/auth/verify-email', 'post'],
      ['/v1/auth/me', 'get'],
      ['/v1/auth/me', 'patch'],
      ['/v1/me/sessions', 'get'],
      ['/v1/me/sessions/revoke-all', 'post'],
      ['/v1/me/sessions/{sessionId}/revoke', 'post'],
    ] as const) {
      const operation = payload.paths[route]?.[method] as { description?: string } | undefined;
      assert.doesNotMatch(
        operation?.description ?? '',
        /scaffold/i,
        `${method.toUpperCase()} ${route}`,
      );
    }
    assert.equal(
      payload.tags.some((tag) => tag.name === 'API'),
      false,
    );
    assert.ok(payload.components.securitySchemes.bearerAuth);
    assert.ok(payload.paths['/v1/auth/login']?.post);
    assert.ok(payload.paths['/v1/auth/me']?.get);
    assert.ok(payload.paths['/v1/athletes/{athleteId}/self-assessments']?.get);
    assert.equal(badgeSeen?.operationId, 'markBadgeAwardSeen');
    assert.equal(badgeSeen?.summary, 'Mark Badge Award Seen');
    assert.equal(listAthleteInjuries?.operationId, 'listAthleteInjuries');
    assert.deepEqual(responseSchema(listAthleteInjuries, '200'), {
      $ref: '#/components/schemas/InjuriesResponse',
    });
    assert.equal(createAthleteInjury?.operationId, 'createAthleteInjury');
    assert.deepEqual(requestSchema(createAthleteInjury), {
      $ref: '#/components/schemas/CreateInjuryRequest',
    });
    assert.deepEqual(responseSchema(createAthleteInjury, '201'), {
      $ref: '#/components/schemas/InjuryRecord',
    });
    assert.equal(createAthleteInjury?.responses?.['200'], undefined);
    assert.equal(getInjuryRecord?.operationId, 'getInjuryRecord');
    assert.deepEqual(responseSchema(getInjuryRecord, '200'), {
      $ref: '#/components/schemas/InjuryRecord',
    });
    assert.equal(updateInjuryRecord?.operationId, 'updateInjuryRecord');
    assert.deepEqual(requestSchema(updateInjuryRecord), {
      $ref: '#/components/schemas/UpdateInjuryRequest',
    });
    assert.deepEqual(responseSchema(updateInjuryRecord, '200'), {
      $ref: '#/components/schemas/InjuryRecord',
    });
    assert.equal(updateInjuryRecord?.responses?.['201'], undefined);
    assert.equal(payload.components.schemas.CreateInjuryRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.UpdateInjuryRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.UpdateInjuryRequest.minProperties, 1);
    assert.equal(payload.components.schemas.UpdateInjuryRequest.properties?.resolvedAt, undefined);
    assert.equal(payload.components.schemas.InjuryRecord.additionalProperties, false);
    assert.equal(payload.components.schemas.InjuriesResponse.additionalProperties, false);
    assert.equal(getAthleteMedical?.operationId, 'getAthleteMedicalRecord');
    assert.deepEqual(responseSchema(getAthleteMedical, '200'), {
      $ref: '#/components/schemas/MedicalRecordResponse',
    });
    assert.equal(updateAthleteMedical?.operationId, 'updateAthleteMedicalRecord');
    assert.deepEqual(requestSchema(updateAthleteMedical), {
      $ref: '#/components/schemas/UpdateMedicalRecordRequest',
    });
    assert.deepEqual(responseSchema(updateAthleteMedical, '200'), {
      $ref: '#/components/schemas/MedicalRecordResponse',
    });
    assert.equal(updateAthleteMedical?.responses?.['201'], undefined);
    assert.equal(listAthleteEmergencyContacts?.operationId, 'listAthleteEmergencyContacts');
    assert.deepEqual(responseSchema(listAthleteEmergencyContacts, '200'), {
      $ref: '#/components/schemas/EmergencyContactsResponse',
    });
    assert.equal(replaceAthleteEmergencyContacts?.operationId, 'replaceAthleteEmergencyContacts');
    assert.deepEqual(requestSchema(replaceAthleteEmergencyContacts), {
      $ref: '#/components/schemas/UpdateEmergencyContactsRequest',
    });
    assert.deepEqual(responseSchema(replaceAthleteEmergencyContacts, '200'), {
      $ref: '#/components/schemas/EmergencyContactsResponse',
    });
    assert.equal(replaceAthleteEmergencyContacts?.responses?.['201'], undefined);
    assert.equal(listAthleteConsents?.operationId, 'listAthleteConsents');
    assert.deepEqual(responseSchema(listAthleteConsents, '200'), {
      $ref: '#/components/schemas/ConsentsResponse',
    });
    assert.equal(replaceAthleteConsents?.operationId, 'replaceAthleteConsents');
    assert.deepEqual(requestSchema(replaceAthleteConsents), {
      $ref: '#/components/schemas/UpsertConsentsRequest',
    });
    assert.deepEqual(responseSchema(replaceAthleteConsents, '200'), {
      $ref: '#/components/schemas/ConsentsResponse',
    });
    assert.equal(replaceAthleteConsents?.responses?.['201'], undefined);
    assert.equal(payload.components.schemas.UpdateMedicalRecordRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.UpdateMedicalRecordRequest.minProperties, 1);
    assert.equal(
      payload.components.schemas.UpdateEmergencyContactsRequest.additionalProperties,
      false,
    );
    assert.equal(payload.components.schemas.EmergencyContactInput.additionalProperties, false);
    assert.equal(payload.components.schemas.UpsertConsentsRequest.additionalProperties, false);
    assert.equal(
      payload.components.schemas.UpsertConsentsRequest.properties?.consents?.maxItems,
      4,
    );
    assert.equal(payload.components.schemas.ConsentRecord.additionalProperties, false);
    assert.equal(listVideos?.operationId, 'listVideos');
    assert.deepEqual(
      listVideos?.parameters
        ?.filter((parameter) => parameter.in === 'query')
        .map((parameter) => parameter.name),
      ['coachId', 'athleteId'],
    );
    assert.deepEqual(responseSchema(listVideos, '200'), {
      $ref: '#/components/schemas/VideoListResponse',
    });
    assert.equal(createVideo?.operationId, 'createVideo');
    assert.deepEqual(requestSchema(createVideo), {
      $ref: '#/components/schemas/VideoCreateRequest',
    });
    assert.deepEqual(responseSchema(createVideo, '201'), {
      $ref: '#/components/schemas/VideoResponse',
    });
    assert.equal(createVideo?.responses?.['200'], undefined);
    assert.equal(getVideo?.operationId, 'getVideo');
    assert.deepEqual(responseSchema(getVideo, '200'), {
      $ref: '#/components/schemas/VideoResponse',
    });
    assert.equal(updateVideo?.operationId, 'updateVideo');
    assert.deepEqual(requestSchema(updateVideo), {
      $ref: '#/components/schemas/VideoUpdateRequest',
    });
    assert.deepEqual(responseSchema(updateVideo, '200'), {
      $ref: '#/components/schemas/VideoResponse',
    });
    assert.equal(updateVideo?.responses?.['201'], undefined);
    assert.equal(updateVideoSharing?.operationId, 'updateVideoSharing');
    assert.deepEqual(requestSchema(updateVideoSharing), {
      $ref: '#/components/schemas/VideoSharingUpdateRequest',
    });
    assert.deepEqual(responseSchema(updateVideoSharing, '200'), {
      $ref: '#/components/schemas/VideoResponse',
    });
    assert.equal(createVideoAnnotation?.operationId, 'createVideoAnnotation');
    assert.deepEqual(requestSchema(createVideoAnnotation), {
      $ref: '#/components/schemas/VideoAnnotationRequest',
    });
    assert.deepEqual(responseSchema(createVideoAnnotation, '201'), {
      $ref: '#/components/schemas/VideoAnnotationResponse',
    });
    assert.equal(createVideoAnnotation?.responses?.['200'], undefined);
    assert.equal(videoAnnotationUpdate?.operationId, 'updateVideoAnnotation');
    assert.equal(videoAnnotationUpdate?.summary, 'Update Video Annotation');
    assert.deepEqual(requestSchema(videoAnnotationUpdate), {
      $ref: '#/components/schemas/VideoAnnotationRequest',
    });
    assert.deepEqual(responseSchema(videoAnnotationUpdate, '200'), {
      $ref: '#/components/schemas/VideoAnnotationResponse',
    });
    assert.equal(videoAnnotationUpdate?.responses?.['201'], undefined);
    assert.equal(payload.components.schemas.VideoCreateRequest.additionalProperties, false);
    assert.equal(payload.components.schemas.VideoUpdateRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.VideoUpdateRequest.anyOf, [
      { required: ['title'] },
      { required: ['description'] },
    ]);
    assert.equal(payload.components.schemas.VideoAnnotationRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.VideoAnnotationRequest.required, [
      'timestamp',
      'label',
      'type',
    ]);
    assert.equal(videoArchive?.operationId, 'archiveVideo');
    assert.equal(videoArchive?.summary, 'Archive Video');
    assert.equal(videoArchive?.['x-clubroom-effect'], 'archive');
    assert.equal(initializePrivateUpload?.operationId, 'initializePrivateUpload');
    assert.equal(initializePrivateUpload?.summary, 'Initialize Private Upload');
    assert.equal(initializePrivateUpload?.['x-clubroom-effect'], 'initialize upload');
    assert.deepEqual(requestSchema(initializePrivateUpload), {
      $ref: '#/components/schemas/UploadInitRequest',
    });
    assert.equal(initializePrivateUpload?.requestBody?.required, true);
    assert.deepEqual(responseSchema(initializePrivateUpload, '201'), {
      $ref: '#/components/schemas/UploadInitResponse',
    });
    assert.equal(initializePrivateUpload?.responses?.['200'], undefined);
    assert.deepEqual(payload.components.schemas.UploadInitRequest.required, [
      'contentType',
      'fileName',
      'sizeBytes',
    ]);
    assert.equal(payload.components.schemas.UploadInitRequest.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.UploadInitHeaders.required, ['content-type']);
    assert.equal(payload.components.schemas.UploadInitHeaders.additionalProperties, false);
    assert.deepEqual(payload.components.schemas.UploadInitResponse.required, [
      'uploadSessionId',
      'mediaObjectId',
      'uploadMethod',
      'uploadUrl',
      'uploadHeaders',
      'expiresAt',
      'storageKey',
      'bucketName',
      'requestId',
    ]);
    assert.equal(completeUpload?.operationId, 'completeUpload');
    assert.deepEqual(responseSchema(completeUpload, '202'), {
      $ref: '#/components/schemas/UploadCompleteResponse',
    });
    assert.equal(recordUploadScanResult?.operationId, 'recordUploadScanResult');
    assert.equal(recordUploadScanResult?.summary, 'Record Upload Scan Result');
    assert.equal(recordUploadScanResult?.['x-clubroom-effect'], 'record scan result');
    assert.deepEqual(recordUploadScanResult?.security, [
      { bearerAuth: [] },
      { uploadScanResultTokenAuth: [] },
    ]);
    const uploadScanResultTokenAuth = payload.components.securitySchemes
      .uploadScanResultTokenAuth as { name?: string } | undefined;
    assert.equal(uploadScanResultTokenAuth?.name, 'x-clubroom-upload-scan-token');
    assert.deepEqual(recordUploadScanResult?.requestBody?.content?.['application/json']?.schema, {
      $ref: '#/components/schemas/UploadScanResultInput',
    });
    assert.ok(
      recordUploadScanResult?.requestBody?.content?.['application/json']?.examples?.example?.value,
    );
    assert.deepEqual(recordUploadScanResult?.responses?.['201'], {
      description: 'Created response.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UploadScanResultResponse' },
          examples: {
            example: {
              value: {
                scanResult: {
                  id: 'msr_123',
                  uploadSessionId: 'ups_123',
                  mediaObjectId: 'med_123',
                  sourceResultId: 'scan_01JZKQ6ZQ87ZFYF5W2M39Y6M6S',
                  scanAttemptId: 'sat_01JZKQ7EAKDXH84S2B5WZZQJQ6',
                  verdict: 'CLEAN',
                  scanner: 'clamav-private-worker',
                  objectSizeBytes: 128000,
                  objectETag: '"487bd7b7f0f77f47"',
                  sha256Hex: 'a'.repeat(64),
                  sealedStorageKey: `uploads/sealed/${'a'.repeat(64)}.mp4`,
                  scannedAt: '2026-07-28T18:20:00.000Z',
                  replayed: false,
                },
                requestId: 'req_123',
              },
            },
          },
        },
      },
    });
    assert.equal(Boolean(recordUploadScanResult?.responses?.['200']), true);
    assert.deepEqual(payload.components.schemas.UploadScanResultInput.required, [
      'mediaObjectId',
      'verdict',
      'scanner',
    ]);
    assert.deepEqual(payload.components.schemas.UploadScanResultResponse.required, [
      'scanResult',
      'requestId',
    ]);
    assert.deepEqual(accountSessions?.tags, ['Account']);
    assert.deepEqual(revokeAccountSession?.tags, ['Account']);
    assert.deepEqual(revokeAllAccountSessions?.tags, ['Account']);
    assert.equal(deleteOperations.length > 0, true);
    assert.equal(
      deleteOperations.every(
        (operation) =>
          Boolean(operation['x-clubroom-effect']) &&
          !String(operation.operationId ?? '')
            .toLowerCase()
            .includes('delete') &&
          !String(operation.summary ?? '')
            .toLowerCase()
            .includes('delete'),
      ),
      true,
    );
    assert.equal(operationIds.length, operations.length);
    assert.equal(new Set(operationIds).size, operationIds.length);
    assert.equal(
      operationIds.some((operationId) => /^(get|post|patch|put|delete)_v1_/.test(operationId)),
      false,
    );
    assert.deepEqual(login?.security, []);
  });

  it('serves Swagger UI at /v1/docs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/docs',
    });

    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /text\/html/);
    assert.match(res.body, /SwaggerUIBundle/);
    assert.match(res.body, /OpenAPI 3\.1 rendered with Swagger UI/);
    assert.match(res.body, /Current contract major/);
    assert.match(res.body, /at least 180 days notice/);
    assert.match(res.body, /Google AIP conformance is not claimed/);
    assert.match(res.body, /x-clubroom-effect/);
    assert.match(res.body, /\/v1\/openapi\.json/);
  });

  it('hides OpenAPI documentation in production unless explicitly enabled', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFlag = process.env.API_OPENAPI_ENABLED;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.API_OPENAPI_ENABLED;

      const disabled = await app.inject({
        method: 'GET',
        url: '/v1/openapi.json',
      });
      assert.equal(disabled.statusCode, 404);

      process.env.API_OPENAPI_ENABLED = '1';
      const enabled = await app.inject({
        method: 'GET',
        url: '/v1/openapi.json',
      });
      assert.equal(enabled.statusCode, 200);
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      if (originalFlag === undefined) {
        delete process.env.API_OPENAPI_ENABLED;
      } else {
        process.env.API_OPENAPI_ENABLED = originalFlag;
      }
    }
  });
});
