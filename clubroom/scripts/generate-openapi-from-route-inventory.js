#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const INVENTORY_PATH = 'docs/backend-api/ROUTE_INVENTORY_V1.md';
const OUTPUT_PATH = 'apps/api/src/generated/openapi.ts';

const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
const documentedStatuses = new Set(['implemented', 'scaffolded']);
const methodOrder = ['get', 'post', 'patch', 'put', 'delete'];
const ignoredResourceSegments = new Set(['v1', 'me', 'admin', 'meta']);
const irregularSegmentWords = new Map([
  ['analytics', 'analytics'],
  ['checkins', 'check in'],
  ['children', 'child'],
  ['coaches', 'coach'],
  ['earnings', 'earnings'],
  ['rsvps', 'RSVP'],
  ['series', 'series'],
  ['status', 'status'],
  ['stats', 'stats'],
]);
const customActionSegments = new Set([
  'accept',
  'ban',
  'cancel',
  'check-email',
  'complete',
  'confirm',
  'decline',
  'dismiss',
  'dismiss-all',
  'dispatch',
  'follow-up',
  'forgot-password',
  'generate',
  'invite',
  'login',
  'logout',
  'mark-paid',
  'mark-unpaid',
  'pause',
  'publish',
  'read',
  'read-all',
  'refresh',
  'register',
  'remind',
  'reopen',
  'respond',
  'reset-password',
  'restore',
  'resume',
  'revoke',
  'revoke-all',
  'simulated-complete',
  'snooze',
  'toggle',
  'verify-email',
  'void',
  'write-off',
]);
const customActionEffects = new Map([
  ['check-email', 'check'],
  ['dismiss-all', 'dismiss all'],
  ['mark-paid', 'mark paid'],
  ['mark-unpaid', 'mark unpaid'],
  ['read', 'mark read'],
  ['read-all', 'mark all read'],
  ['simulated-complete', 'simulate complete'],
]);
const resourceLabelOverrides = new Map([
  ['/v1/auth/check-email', 'email availability'],
  ['/v1/auth/me', 'auth profile'],
  ['/v1/blocks', 'blocked user'],
  ['/v1/follows', 'follow relationship'],
  ['/v1/coaches/me/offerings', 'coach self offering'],
  ['/v1/coaches/offerings', 'coach offering catalog'],
  ['/v1/users/search', 'user search'],
]);

const routeTagOverrides = new Map([
  ['/v1/docs', 'Platform'],
  ['/v1/openapi.json', 'Platform'],
  ['/v1/ready', 'Platform'],
  ['/v1/health', 'Platform'],
  ['/v1/meta/version', 'Platform'],
  ['/v1/meta/seed-health', 'Platform'],
]);

const routeTagBySegment = new Map([
  ['auth', 'Auth'],
  ['me', 'Account'],
  ['families', 'Family'],
  ['guardian-invites', 'Family'],
  ['athletes', 'Athletes'],
  ['badge-awards', 'Progress'],
  ['injuries', 'Athlete Health'],
  ['safeguarding', 'Safeguarding'],
  ['blocks', 'Trust Ops'],
  ['bookings', 'Bookings'],
  ['booking-series', 'Bookings'],
  ['cancellation-records', 'Bookings'],
  ['coach-observations', 'Progress'],
  ['group-sessions', 'Group Sessions'],
  ['group-session-registrations', 'Group Sessions'],
  ['session-rsvps', 'Group Sessions'],
  ['invites', 'Invites'],
  ['invite-rsvps', 'Invites'],
  ['events', 'Events'],
  ['matches', 'Matches'],
  ['clubs', 'Clubs'],
  ['squads', 'Squads'],
  ['coaches', 'Coaches'],
  ['availability', 'Scheduling'],
  ['availability-overrides', 'Scheduling'],
  ['availability-templates', 'Scheduling'],
  ['scheduling-rules', 'Scheduling'],
  ['session-templates', 'Scheduling'],
  ['offerings', 'Coaches'],
  ['verification-status', 'Verification'],
  ['verifications', 'Verification'],
  ['payout-methods', 'Revenue'],
  ['withdrawals', 'Revenue'],
  ['earnings', 'Revenue'],
  ['invoices', 'Revenue'],
  ['payment-attempts', 'Revenue'],
  ['reconciler', 'Revenue'],
  ['access-grants', 'Trust Ops'],
  ['retention-runs', 'Trust Ops'],
  ['trust', 'Trust Ops'],
  ['privacy-settings', 'Account'],
  ['notifications', 'Notifications'],
  ['posts', 'Community'],
  ['comments', 'Community'],
  ['community-groups', 'Community'],
  ['community-group-invites', 'Community'],
  ['follow-requests', 'Community'],
  ['follows', 'Community'],
  ['message-threads', 'Messaging'],
  ['messages', 'Messaging'],
  ['reports', 'Trust Ops'],
  ['uploads', 'Media'],
  ['videos', 'Media'],
  ['session-media', 'Media'],
  ['drills', 'Progress'],
  ['drill-assignments', 'Progress'],
  ['session-feedback', 'Progress'],
  ['sessions', 'Progress'],
  ['goals', 'Progress'],
  ['milestones', 'Progress'],
  ['progress-challenges', 'Progress'],
  ['practice-logs', 'Progress'],
  ['practice-tasks', 'Progress'],
  ['self-assessment-prompts', 'Progress'],
  ['self-assessments', 'Progress'],
  ['challenges', 'Progress'],
  ['trial-offerings', 'Coaches'],
  ['users', 'Account'],
]);

const publicRouteKeys = new Set([
  'GET /v1/health',
  'GET /v1/ready',
  'GET /v1/meta/version',
  'GET /v1/openapi.json',
  'GET /v1/docs',
  'POST /v1/auth/login',
  'POST /v1/auth/register',
  'POST /v1/auth/refresh',
  'POST /v1/auth/forgot-password',
  'POST /v1/auth/reset-password',
  'GET /v1/auth/check-email',
  'GET /v1/payment-attempts/{attemptId}/hosted',
  'POST /v1/payment-attempts/{attemptId}/simulated-complete',
]);

function schemaRef(name) {
  return { $ref: `#/components/schemas/${name}` };
}

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
    return [];
  }

  const cells = [];
  let cell = '';
  let inCode = false;
  let escaped = false;

  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const char = trimmed[index];
    if (char === '`' && !escaped) {
      inCode = !inCode;
    }
    if (char === '|' && !inCode && !escaped) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += char;
    escaped = char === '\\' && !escaped;
    if (char !== '\\') {
      escaped = false;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function cleanCell(value) {
  return String(value ?? '')
    .replace(/<br\s*\/?>/gi, '; ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\\\|/g, '|')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeHeader(header) {
  const normalized = cleanCell(header).toLowerCase();
  if (normalized === 'route') return 'route';
  if (normalized === 'method') return 'method';
  if (normalized === 'status') return 'status';
  if (normalized.startsWith('contract')) return 'contracts';
  if (normalized === 'authz') return 'authz';
  if (normalized === 'ui anchors') return 'uiAnchors';
  if (normalized === 'notes') return 'notes';
  return normalized.replace(/[^a-z0-9]+([a-z0-9])/g, (_, letter) => letter.toUpperCase());
}

function toOpenApiPath(route) {
  return route.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function pathParameters(openApiPath) {
  const names = [...openApiPath.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  return [...new Set(names)].map((name) => ({
    name,
    in: 'path',
    required: true,
    schema: { type: 'string' },
    description: `Path parameter: ${name}.`,
  }));
}

function titleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function camelCase(value) {
  const words = value
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((word, index) => {
      const lowered = word.toLowerCase();
      return index === 0 ? lowered : `${lowered.slice(0, 1).toUpperCase()}${lowered.slice(1)}`;
    })
    .join('');
}

function isPathParamSegment(segment) {
  return segment.startsWith('{') && segment.endsWith('}');
}

function singularizeWord(word) {
  const irregular = irregularSegmentWords.get(word);
  if (irregular) return irregular;
  if (word === 'auth') {
    return 'auth';
  }
  if (word.endsWith('ies')) {
    return `${word.slice(0, -3)}y`;
  }
  if (word.endsWith('ses')) {
    return word.slice(0, -2);
  }
  if (/(ches|shes|xes|zes)$/.test(word)) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
}

function wordsForSegment(segment) {
  const normalized = segment
    .replace(/[{}]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();
  if (!normalized) {
    return '';
  }
  return normalized.split(/\s+/).map(singularizeWord).join(' ');
}

function pathSegments(openApiPath) {
  return openApiPath.split('/').filter(Boolean);
}

function tagForRoute(route, fallbackTag) {
  const override = routeTagOverrides.get(route);
  if (override) return override;

  const segments = route
    .split('/')
    .filter(Boolean)
    .filter((segment) => !segment.startsWith(':'));

  const domainSegments = segments.filter((segment) => segment !== 'v1');
  if (domainSegments[0] === 'auth') {
    return 'Auth';
  }

  for (const segment of [...domainSegments].reverse()) {
    const tag = routeTagBySegment.get(segment);
    if (tag) return tag;
  }

  return fallbackTag && !fallbackTag.includes('/') ? fallbackTag : 'API';
}

function lastResourceSegment(openApiPath) {
  const segments = pathSegments(openApiPath);
  const lastNonParam = [...segments].reverse().find((segment) => !isPathParamSegment(segment));
  const target = customActionSegments.has(lastNonParam ?? '')
    ? [...segments].reverse().find(
        (segment) => !isPathParamSegment(segment) && !customActionSegments.has(segment),
      )
    : lastNonParam;
  return target ?? 'resource';
}

function resourceLabel(openApiPath) {
  const segments = pathSegments(openApiPath);
  const lastSegment = segments[segments.length - 1] ?? '';
  const override = resourceLabelOverrides.get(openApiPath);

  if (override) {
    return override;
  }

  if (segments.includes('auth') && lastSegment === 'me') {
    return 'auth profile';
  }

  const resourceSegments = segments
    .filter((segment) => !isPathParamSegment(segment))
    .filter((segment) => !ignoredResourceSegments.has(segment))
    .filter((segment) => !customActionSegments.has(segment))
    .slice(-2)
    .map(wordsForSegment)
    .filter(Boolean);

  if (!resourceSegments.length) {
    return wordsForSegment(lastResourceSegment(openApiPath)) || 'resource';
  }

  if (resourceSegments.length === 2 && resourceSegments[0] === resourceSegments[1]) {
    return resourceSegments[1];
  }

  return resourceSegments.join(' ');
}

function rowSearchText(row) {
  return [row.status, row.contracts, row.authz, row.uiAnchors, row.notes]
    .map(cleanCell)
    .join(' ')
    .toLowerCase();
}

function effectForOperation(method, row, openApiPath) {
  const text = rowSearchText(row);
  const segments = pathSegments(openApiPath);
  const lastSegment = segments.findLast((segment) => !isPathParamSegment(segment)) ?? '';

  if (customActionSegments.has(lastSegment) && !(method === 'GET' && lastSegment === 'join')) {
    return customActionEffects.get(lastSegment) ?? lastSegment.replace(/-/g, ' ');
  }

  if (method === 'DELETE') {
    if (
      text.includes('archive') ||
      text.includes('archives') ||
      text.includes('archived') ||
      text.includes('archiving')
    ) {
      return 'archive';
    }
    if (text.includes('revoke')) return 'revoke';
    if (text.includes('dismiss')) return 'dismiss';
    return 'remove';
  }

  if (method === 'GET') {
    const endsWithParam = isPathParamSegment(segments[segments.length - 1] ?? '');
    return endsWithParam || lastSegment === 'me' ? 'get' : 'list';
  }
  if (method === 'POST') return 'create';
  if (method === 'PATCH') return 'update';
  if (method === 'PUT') return 'set';
  return method.toLowerCase();
}

function operationSummary(method, row, openApiPath) {
  const effect = effectForOperation(method, row, openApiPath);
  const resource = resourceLabel(openApiPath);

  return titleCase(`${effect} ${resource}`);
}

function operationId(method, row, openApiPath) {
  return camelCase(operationSummary(method, row, openApiPath));
}

function descriptionFromRow(row) {
  const lines = [
    ['Status', row.status],
    ['Contract(s)', row.contracts],
    ['AuthZ', row.authz],
    ['UI anchors', row.uiAnchors],
    ['Notes', row.notes],
  ].flatMap(([label, value]) => {
    const cleaned = cleanCell(value);
    return cleaned ? [`**${label}:** ${cleaned}`] : [];
  });

  lines.push(`**Source:** \`${INVENTORY_PATH}\``);
  return lines.join('\n\n');
}

function deleteHasNoResponseBody(row) {
  const contracts = cleanCell(row.contracts).toLowerCase();
  return contracts === 'none' || contracts.includes('no body');
}

function responseMap(method, row) {
  const responses = {
    default: {
      description: 'Error response.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorResponse' },
        },
      },
    },
  };

  if (method === 'DELETE' && deleteHasNoResponseBody(row)) {
    responses['204'] = {
      description: 'No-content response when this route removes or archives a resource.',
    };
    return responses;
  }

  responses['200'] = {
    description: 'Successful response. See the route contract and implementation for payload shape.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/JsonValue' },
      },
    },
  };

  if (method === 'POST') {
    responses['201'] = {
      description: 'Created response when this route creates a resource.',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/JsonValue' },
        },
      },
    };
  }

  return responses;
}

function jsonResponse(schemaName, description = 'Successful response.') {
  return {
    description,
    content: {
      'application/json': {
        schema: schemaRef(schemaName),
      },
    },
  };
}

function jsonRequestBody(schemaName, required = true) {
  return {
    required,
    content: {
      'application/json': {
        schema: schemaRef(schemaName),
      },
    },
  };
}

const viewerRoleQueryParameter = {
  name: 'viewerRole',
  in: 'query',
  required: false,
  schema: schemaRef('ViewerRole'),
  description:
    'Visibility filter for feedback content. Parent and athlete views exclude coach-only private notes.',
};

const limitQueryParameter = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 100,
  },
  description: 'Maximum records to return.',
};

const sessionIdQueryParameter = {
  name: 'sessionId',
  in: 'query',
  required: true,
  schema: {
    type: 'string',
    minLength: 1,
  },
  description: 'Session or booking identifier.',
};

const athleteIdQueryParameter = {
  name: 'athleteId',
  in: 'query',
  required: true,
  schema: {
    type: 'string',
    minLength: 1,
  },
  description: 'Athlete identifier.',
};

const optionalAthleteIdQueryParameter = {
  ...athleteIdQueryParameter,
  required: false,
};

const operationOverrides = new Map([
  [
    'DELETE /v1/coaches/me/availability/overrides/{overrideId}',
    {
      tag: 'Scheduling',
      summary: 'Remove Own Availability Override',
      operationId: 'removeOwnAvailabilityOverride',
      effect: 'remove',
    },
  ],
  [
    'DELETE /v1/coaches/me/availability/templates/{templateId}',
    {
      tag: 'Scheduling',
      summary: 'Remove Own Availability Template',
      operationId: 'removeOwnAvailabilityTemplate',
      effect: 'remove',
    },
  ],
  [
    'GET /v1/bookings/{bookingId}/session-note',
    {
      tag: 'Bookings',
      summary: 'Get Booking Session Note',
      operationId: 'getBookingSessionNote',
      effect: 'get',
      responseSchema: 'BookingSessionNoteResponse',
    },
  ],
  [
    'PUT /v1/bookings/{bookingId}/session-note',
    {
      tag: 'Bookings',
      summary: 'Save Booking Session Note',
      operationId: 'saveBookingSessionNote',
      effect: 'set',
      requestSchema: 'BookingSessionNoteInput',
      responseSchema: 'BookingSessionNoteResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/session-feedback',
    {
      tag: 'Progress',
      parameters: [viewerRoleQueryParameter, limitQueryParameter],
      responseSchema: 'SessionFeedbackListResponse',
    },
  ],
  [
    'POST /v1/badge-awards/{awardId}/seen',
    {
      tag: 'Progress',
      summary: 'Mark Badge Award Seen',
      operationId: 'markBadgeAwardSeen',
      effect: 'mark seen',
    },
  ],
  [
    'GET /v1/session-feedback',
    {
      tag: 'Progress',
      summary: 'Get Session Feedback',
      operationId: 'getSessionFeedback',
      effect: 'get',
      parameters: [sessionIdQueryParameter, viewerRoleQueryParameter],
      responseSchema: 'SessionFeedbackResponse',
    },
  ],
  [
    'POST /v1/session-feedback',
    {
      tag: 'Progress',
      summary: 'Create Or Update Session Feedback',
      operationId: 'upsertSessionFeedback',
      effect: 'upsert',
      requestSchema: 'SessionFeedbackInput',
      responseSchema: 'SessionFeedbackResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/session-media',
    {
      tag: 'Progress',
      summary: 'Get Session Media',
      operationId: 'getSessionMedia',
      effect: 'get',
      parameters: [sessionIdQueryParameter, athleteIdQueryParameter],
      responseSchema: 'SessionMediaResponse',
    },
  ],
  [
    'PUT /v1/session-media',
    {
      tag: 'Progress',
      summary: 'Save Session Media',
      operationId: 'saveSessionMedia',
      effect: 'set',
      requestSchema: 'SessionMediaSaveInput',
      responseSchema: 'SessionMediaResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'DELETE /v1/session-media/assets/{assetId}',
    {
      tag: 'Progress',
      summary: 'Remove Session Media Asset',
      operationId: 'removeSessionMediaAsset',
      effect: 'remove',
      responseSchema: 'SessionMediaResponse',
    },
  ],
  [
    'GET /v1/sessions/{sessionId}/media',
    {
      tag: 'Progress',
      summary: 'List Session Media',
      operationId: 'listSessionMediaForSession',
      effect: 'list',
      parameters: [optionalAthleteIdQueryParameter],
      responseSchema: 'SessionMediaListResponse',
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/session-media',
    {
      tag: 'Progress',
      summary: 'List Athlete Session Media',
      operationId: 'listAthleteSessionMedia',
      effect: 'list',
      responseSchema: 'SessionMediaListResponse',
    },
  ],
]);

function createOperation(row, method, route, tag) {
  const openApiPath = toOpenApiPath(route);
  const lowerMethod = method.toLowerCase();
  const operationKey = `${method} ${openApiPath}`;
  const override = operationOverrides.get(operationKey);
  const isPublic = publicRouteKeys.has(`${method} ${openApiPath}`);
  const mutates = ['POST', 'PATCH', 'PUT'].includes(method);
  const parameters = pathParameters(openApiPath);
  const effect = override?.effect ?? effectForOperation(method, row, openApiPath);

  if (!isPublic) {
    parameters.push({ $ref: '#/components/parameters/ActingRoleHeader' });
  }
  if (override?.parameters) {
    parameters.push(...override.parameters);
  }

  const operation = {
    tags: [override?.tag ?? tag],
    summary: override?.summary ?? operationSummary(method, row, openApiPath),
    description: descriptionFromRow(row),
    operationId: override?.operationId ?? operationId(method, row, openApiPath),
    ...(parameters.length ? { parameters } : {}),
    ...(mutates
      ? {
          requestBody: override?.requestSchema
            ? jsonRequestBody(override.requestSchema)
            : jsonRequestBody('JsonObject', false),
        }
      : {}),
    security: isPublic ? [] : [{ bearerAuth: [] }],
    responses: responseMap(method, row),
    'x-clubroom-effect': effect,
    'x-clubroom-status': cleanCell(row.status) || 'unknown',
  };

  if (override?.responseSchema) {
    operation.responses['200'] = jsonResponse(override.responseSchema);
  }
  if (override?.omitCreatedResponse) {
    delete operation.responses['201'];
  }

  return operation;
}

function metadataWeight(row) {
  return (
    [row.status, row.contracts, row.authz, row.uiAnchors, row.notes].filter(Boolean).length * 1000 +
    descriptionFromRow(row).length
  );
}

function parseInventory(markdown) {
  const paths = {};
  const weights = {};
  const tags = new Map();
  let currentTag = 'Current Core Routes';
  let headers = [];
  let operationCount = 0;

  for (const line of markdown.split('\n')) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      currentTag = cleanCell(heading[1]);
      headers = [];
      continue;
    }

    const cells = splitMarkdownRow(line);
    if (!cells.length || isSeparatorRow(cells)) {
      continue;
    }

    const normalizedHeaders = cells.map(normalizeHeader);
    if (normalizedHeaders.includes('route') && normalizedHeaders.includes('method')) {
      headers = normalizedHeaders;
      continue;
    }

    if (!headers.length) {
      continue;
    }

    const row = headers.reduce((acc, header, index) => {
      acc[header] = cleanCell(cells[index] ?? '');
      return acc;
    }, {});

    const route = row.route;
    if (!route?.startsWith('/v1')) {
      continue;
    }

    if (!documentedStatuses.has(cleanCell(row.status).toLowerCase())) {
      continue;
    }

    const methods = cleanCell(row.method)
      .split(/[\/,\s]+/)
      .map((method) => method.toUpperCase())
      .filter((method) => allowedMethods.has(method));

    for (const method of methods) {
      const openApiPath = toOpenApiPath(route);
      const lowerMethod = method.toLowerCase();
      const operation = createOperation(row, method, route, tagForRoute(route, currentTag));
      const weight = metadataWeight(row);

      paths[openApiPath] ??= {};
      weights[openApiPath] ??= {};

      if ((weights[openApiPath][lowerMethod] ?? -1) > weight) {
        continue;
      }

      paths[openApiPath][lowerMethod] = operation;
      weights[openApiPath][lowerMethod] = weight;
      const operationTag = operation.tags?.[0] ?? currentTag;
      if (!tags.has(operationTag)) {
        tags.set(operationTag, { name: operationTag });
      }
      operationCount += 1;
    }
  }

  return { paths, tags: [...tags.values()], operationCount };
}

function sortPaths(paths) {
  return Object.fromEntries(
    Object.entries(paths)
      .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
      .map(([pathKey, operations]) => [
        pathKey,
        Object.fromEntries(
          Object.entries(operations).sort(
            ([methodA], [methodB]) => methodOrder.indexOf(methodA) - methodOrder.indexOf(methodB),
          ),
        ),
      ]),
  );
}

function uniqueOperationId(baseId, method, openApiPath, index) {
  const suffix = pathSegments(openApiPath)
    .map((segment) => {
      if (!isPathParamSegment(segment)) {
        return wordsForSegment(segment);
      }
      return `by ${wordsForSegment(segment)}`;
    })
    .filter(Boolean)
    .join(' ');

  const suffixId = camelCase(`${method} ${suffix} ${index > 1 ? index : ''}`);
  return `${baseId}${suffixId.slice(0, 1).toUpperCase()}${suffixId.slice(1)}`;
}

function ensureUniqueOperationIds(paths) {
  const seen = new Set();
  const collisionCounts = new Map();

  for (const [openApiPath, operations] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      const baseId = operation.operationId;
      if (!baseId || !seen.has(baseId)) {
        if (baseId) {
          seen.add(baseId);
        }
        continue;
      }

      const collisionCount = (collisionCounts.get(baseId) ?? 0) + 1;
      collisionCounts.set(baseId, collisionCount);
      let candidate = uniqueOperationId(baseId, method, openApiPath, collisionCount);
      let suffix = collisionCount;

      while (seen.has(candidate)) {
        suffix += 1;
        candidate = uniqueOperationId(baseId, method, openApiPath, suffix);
      }

      operation.operationId = candidate;
      seen.add(candidate);
    }
  }

  return paths;
}

function buildDocument(markdown) {
  const { paths, tags, operationCount } = parseInventory(markdown);
  if (operationCount === 0) {
    throw new Error(`No /v1 routes were parsed from ${INVENTORY_PATH}`);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Clubroom API',
      version: '0.1.0',
      description:
        'OpenAPI 3.1 document generated from the canonical Clubroom /v1 route inventory and rendered by Swagger UI. Google AIP conformance is not claimed. Clubroom lifecycle effects are exposed with x-clubroom-effect so HTTP DELETE routes can document remove/archive/dismiss/revoke semantics. Update docs/backend-api/ROUTE_INVENTORY_V1.md first when route truth changes, then regenerate this file.',
    },
    servers: [
      {
        url: '/',
        description: 'Current API host',
      },
    ],
    tags,
    paths: ensureUniqueOperationIds(sortPaths(paths)),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      parameters: {
        ActingRoleHeader: {
          name: 'x-acting-role',
          in: 'header',
          required: false,
          schema: { type: 'string' },
          description: 'Optional role selector for authenticated multi-role users.',
        },
      },
      schemas: {
        JsonValue: {
          description:
            'Route-specific JSON payload. The detailed TypeScript/Zod contract is owned by the route implementation and shared contract packages.',
        },
        JsonObject: {
          type: 'object',
          additionalProperties: true,
        },
        ViewerRole: {
          type: 'string',
          enum: ['coach', 'parent', 'athlete'],
        },
        SessionMediaPhotoInput: {
          type: 'object',
          required: ['kind', 'mediaObjectId', 'capturedAt'],
          properties: {
            id: { type: 'string', minLength: 1 },
            kind: { type: 'string', enum: ['photo'] },
            mediaObjectId: { type: 'string', minLength: 1 },
            thumbnailMediaObjectId: { type: 'string', minLength: 1 },
            width: { type: 'integer', minimum: 0 },
            height: { type: 'integer', minimum: 0 },
            capturedAt: { type: 'string', minLength: 1 },
          },
        },
        SessionMediaVideoInput: {
          type: 'object',
          required: ['kind', 'mediaObjectId', 'capturedAt'],
          properties: {
            id: { type: 'string', minLength: 1 },
            kind: { type: 'string', enum: ['video'] },
            mediaObjectId: { type: 'string', minLength: 1 },
            thumbnailMediaObjectId: { type: 'string', minLength: 1 },
            duration: { type: 'number', minimum: 0 },
            capturedAt: { type: 'string', minLength: 1 },
          },
        },
        SessionMediaSaveInput: {
          type: 'object',
          required: ['sessionId', 'athleteId', 'coachId'],
          properties: {
            sessionId: { type: 'string', minLength: 1 },
            athleteId: { type: 'string', minLength: 1 },
            coachId: { type: 'string', minLength: 1 },
            photos: {
              type: 'array',
              maxItems: 3,
              items: schemaRef('SessionMediaPhotoInput'),
              default: [],
            },
            video: {
              anyOf: [schemaRef('SessionMediaVideoInput'), { type: 'null' }],
              default: null,
            },
          },
        },
        SessionMediaPhoto: {
          type: 'object',
          required: [
            'id',
            'mediaObjectId',
            'uri',
            'thumbnailUri',
            'capturedAt',
            'width',
            'height',
          ],
          properties: {
            id: { type: 'string' },
            mediaObjectId: { type: 'string' },
            thumbnailMediaObjectId: { type: 'string' },
            uri: { type: 'string' },
            thumbnailUri: { type: 'string' },
            capturedAt: { type: 'string' },
            width: { type: 'integer', minimum: 0 },
            height: { type: 'integer', minimum: 0 },
          },
        },
        SessionMediaVideo: {
          type: 'object',
          required: [
            'id',
            'mediaObjectId',
            'uri',
            'thumbnailUri',
            'capturedAt',
            'duration',
          ],
          properties: {
            id: { type: 'string' },
            mediaObjectId: { type: 'string' },
            thumbnailMediaObjectId: { type: 'string' },
            uri: { type: 'string' },
            thumbnailUri: { type: 'string' },
            capturedAt: { type: 'string' },
            duration: { type: 'number', minimum: 0 },
          },
        },
        SessionMedia: {
          type: 'object',
          required: ['sessionId', 'athleteId', 'coachId', 'photos', 'video', 'createdAt'],
          properties: {
            sessionId: { type: 'string' },
            athleteId: { type: 'string' },
            coachId: { type: 'string' },
            photos: {
              type: 'array',
              items: schemaRef('SessionMediaPhoto'),
            },
            video: {
              anyOf: [schemaRef('SessionMediaVideo'), { type: 'null' }],
            },
            createdAt: { type: 'string' },
          },
        },
        SessionMediaResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['media', 'requestId'],
          properties: {
            media: {
              anyOf: [schemaRef('SessionMedia'), { type: 'null' }],
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        SessionMediaListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['media', 'requestId'],
          properties: {
            media: {
              type: 'array',
              items: schemaRef('SessionMedia'),
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        SessionFeedbackVisibility: {
          type: 'string',
          enum: ['coach_only', 'parent', 'athlete'],
        },
        SessionFeedbackSkillRating: {
          type: 'object',
          required: ['skill', 'rating'],
          properties: {
            skill: { type: 'string', minLength: 1, maxLength: 120 },
            rating: { type: 'number', minimum: 1, maximum: 10 },
            previousRating: { type: 'number', minimum: 1, maximum: 10 },
          },
        },
        SessionFeedbackInput: {
          type: 'object',
          required: ['sessionId', 'coachId', 'coachName', 'athleteId', 'athleteName'],
          properties: {
            sessionId: { type: 'string', minLength: 1 },
            bookingId: { type: 'string', minLength: 1 },
            sessionTemplateId: { type: 'string', minLength: 1 },
            sessionTemplateName: { type: 'string', maxLength: 160 },
            sessionTitle: { type: 'string', maxLength: 200 },
            coachId: { type: 'string', minLength: 1 },
            coachName: { type: 'string', minLength: 1, maxLength: 160 },
            athleteId: { type: 'string', minLength: 1 },
            athleteName: { type: 'string', minLength: 1, maxLength: 160 },
            privateNotes: { type: 'string', maxLength: 4000 },
            publicSummary: { type: 'string', maxLength: 4000, default: '' },
            skillsWorkedOn: {
              type: 'array',
              maxItems: 50,
              items: { type: 'string', minLength: 1, maxLength: 120 },
              default: [],
            },
            skillRatings: {
              type: 'array',
              maxItems: 100,
              items: schemaRef('SessionFeedbackSkillRating'),
              default: [],
            },
            improvements: { type: 'string', maxLength: 4000, default: '' },
            homework: { type: 'string', maxLength: 4000, default: '' },
            effortRating: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
            overallPerformance: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
            videoClipUrls: {
              type: 'array',
              maxItems: 50,
              items: { type: 'string', minLength: 1, maxLength: 2048 },
            },
            photoUrls: {
              type: 'array',
              maxItems: 50,
              items: { type: 'string', minLength: 1, maxLength: 2048 },
            },
            badgeAwarded: { type: 'string', maxLength: 160 },
            visibility: schemaRef('SessionFeedbackVisibility'),
            fourCorners: {
              type: 'object',
              additionalProperties: { type: 'number' },
            },
            positionPlayed: { type: 'string', maxLength: 120 },
            positionsPlayed: {
              type: 'array',
              maxItems: 8,
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            subSkillRatings: {
              type: 'array',
              maxItems: 100,
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
        SessionFeedback: {
          allOf: [
            schemaRef('SessionFeedbackInput'),
            {
              type: 'object',
              required: ['id', 'sessionId', 'coachId', 'athleteId', 'createdAt', 'visibility'],
              properties: {
                id: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        SessionFeedbackResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['feedback', 'requestId'],
          properties: {
            feedback: {
              anyOf: [schemaRef('SessionFeedback'), { type: 'null' }],
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        SessionFeedbackListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['feedback', 'requestId'],
          properties: {
            feedback: {
              type: 'array',
              items: schemaRef('SessionFeedback'),
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        BookingSessionNoteInput: {
          type: 'object',
          required: ['summary'],
          properties: {
            summary: { type: 'string', maxLength: 4000 },
            focus: {
              type: 'array',
              maxItems: 24,
              items: { type: 'string', minLength: 1, maxLength: 120 },
              default: [],
            },
            improvements: { type: 'string', maxLength: 4000, default: '' },
            homework: { type: 'string', maxLength: 4000, default: '' },
            effort: { type: 'integer', minimum: 1, maximum: 5, default: 3 },
            attendance: { type: 'string', maxLength: 160, default: '' },
            videoUrls: {
              type: 'array',
              maxItems: 24,
              items: { type: 'string', minLength: 1, maxLength: 2048 },
            },
            imageUrls: {
              type: 'array',
              maxItems: 24,
              items: { type: 'string', minLength: 1, maxLength: 2048 },
            },
          },
        },
        BookingSessionNote: {
          allOf: [
            schemaRef('BookingSessionNoteInput'),
            {
              type: 'object',
              required: ['id', 'bookingId', 'athleteId', 'updatedAt'],
              properties: {
                id: { type: 'string' },
                bookingId: { type: 'string' },
                athleteId: { type: 'string' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        BookingSessionNoteResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['note', 'requestId'],
          properties: {
            note: {
              anyOf: [schemaRef('BookingSessionNote'), { type: 'null' }],
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          additionalProperties: true,
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    'x-clubroom-source': {
      routeInventory: INVENTORY_PATH,
      generator: 'scripts/generate-openapi-from-route-inventory.js',
    },
  };
}

const document = buildDocument(readFileSync(resolve(INVENTORY_PATH), 'utf8'));
const output = `/* eslint-disable */\n// Generated by scripts/generate-openapi-from-route-inventory.js. Do not edit by hand.\n\nexport const openApiDocument: Record<string, unknown> = ${JSON.stringify(document, null, 2)};\n`;

mkdirSync(dirname(resolve(OUTPUT_PATH)), { recursive: true });
writeFileSync(resolve(OUTPUT_PATH), output);
console.log(
  `Generated ${Object.values(document.paths).reduce((sum, pathItem) => sum + Object.keys(pathItem).length, 0)} operations in ${OUTPUT_PATH}`,
);
