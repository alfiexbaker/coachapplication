#!/usr/bin/env node
/* eslint-disable no-console */

const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const INVENTORY_PATH = 'docs/backend-api/ROUTE_INVENTORY_V1.md';
const OUTPUT_PATH = 'apps/api/src/generated/openapi.ts';

const allowedMethods = new Set(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']);
const documentedStatuses = new Set(['implemented']);
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
  'withdraw',
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
  ['/v1/coaches/search', 'coach search'],
  ['/v1/users/search', 'user search'],
]);

const routeTagOverrides = new Map([
  ['/v1/docs', 'Platform'],
  ['/v1/openapi.json', 'Platform'],
  ['/v1/ready', 'Platform'],
  ['/v1/health', 'Platform'],
  ['/v1/meta/version', 'Platform'],
  ['/v1/meta/seed-health', 'Platform'],
  ['/v1/me/sessions', 'Account'],
  ['/v1/me/sessions/revoke-all', 'Account'],
  ['/v1/me/sessions/:sessionId/revoke', 'Account'],
]);

const routeTagBySegment = new Map([
  ['auth', 'Auth'],
  ['me', 'Account'],
  ['families', 'Family'],
  ['guardian-invites', 'Family'],
  ['athletes', 'Athletes'],
  ['badge-definitions', 'Progress'],
  ['badge-awards', 'Progress'],
  ['injuries', 'Athlete Health'],
  ['safeguarding', 'Trust & Safety'],
  ['blocks', 'Trust & Safety'],
  ['bookings', 'Bookings'],
  ['booking-step-analytics', 'Bookings'],
  ['booking-series', 'Bookings'],
  ['cancellation-records', 'Bookings'],
  ['coach-observations', 'Progress'],
  ['group-sessions', 'Group Sessions'],
  ['group-session-registrations', 'Group Sessions'],
  ['session-rsvps', 'Group Sessions'],
  ['invites', 'Invites'],
  ['invite-rsvps', 'Invites'],
  ['events', 'Events'],
  ['organizers', 'Events'],
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
  ['access-grants', 'Trust & Safety'],
  ['retention-runs', 'Trust & Safety'],
  ['trust', 'Trust & Safety'],
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
  ['reports', 'Trust & Safety'],
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

function responseRef(name) {
  return { $ref: `#/components/responses/${name}` };
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
    ? [...segments]
        .reverse()
        .find((segment) => !isPathParamSegment(segment) && !customActionSegments.has(segment))
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

function rowMentionsFailsClosed(row) {
  return [row.contracts, row.authz, row.uiAnchors, row.notes]
    .map((value) => cleanCell(value).toLowerCase())
    .some((value) => value.includes('fails closed') || value.includes('fail closed'));
}

function responseMap(method, row, openApiPath, isPublic) {
  const mutates = ['POST', 'PATCH', 'PUT'].includes(method);
  const hasPathTarget = openApiPath.includes('{');
  const responses = {
    400: responseRef('BadRequest'),
    ...(isPublic ? {} : { 401: responseRef('Unauthorized'), 403: responseRef('Forbidden') }),
    ...(hasPathTarget ? { 404: responseRef('NotFound') } : {}),
    ...(mutates ? { 409: responseRef('Conflict') } : {}),
    429: responseRef('RateLimited'),
    500: responseRef('InternalServerError'),
    default: responseRef('DefaultError'),
  };

  if (rowMentionsFailsClosed(row) || openApiPath === '/v1/ready') {
    responses['503'] = responseRef('ServiceUnavailable');
  }

  if (method === 'DELETE' && deleteHasNoResponseBody(row)) {
    responses['204'] = {
      description: 'No-content response when this route removes or archives a resource.',
    };
    return responses;
  }

  responses['200'] = {
    description:
      'Successful response. See the route contract and implementation for payload shape.',
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

function jsonResponse(schemaName, description = 'Successful response.', example) {
  return {
    description,
    content: {
      'application/json': {
        schema: schemaRef(schemaName),
        ...(example
          ? {
              examples: {
                example: {
                  value: example,
                },
              },
            }
          : {}),
      },
    },
  };
}

function errorResponse(description, status, code, detail) {
  return {
    description,
    content: {
      'application/problem+json': {
        schema: schemaRef('ErrorResponse'),
        examples: {
          problem: {
            value: {
              type: `https://api.clubroom.local/errors/${code.toLowerCase().replace(/_/g, '-')}`,
              title: description.replace(/\.$/, ''),
              status,
              code,
              detail,
              requestId: 'req_123',
            },
          },
        },
      },
    },
  };
}

function jsonRequestBody(schemaName, required = true, example) {
  return {
    required,
    content: {
      'application/json': {
        schema: schemaRef(schemaName),
        ...(example
          ? {
              examples: {
                example: {
                  value: example,
                },
              },
            }
          : {}),
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

const videoCoachIdQueryParameter = {
  name: 'coachId',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    minLength: 1,
  },
  description: 'Owning coach user id. Provide exactly one of coachId or athleteId.',
};

const videoAthleteIdQueryParameter = {
  ...optionalAthleteIdQueryParameter,
  description: 'Linked athlete id. Provide exactly one of coachId or athleteId.',
};

const clubIdQueryParameter = {
  name: 'clubId',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    minLength: 1,
  },
  description: 'Club identifier. Mutually exclusive with communityGroupId.',
};

const clubJoinCodeQueryParameter = {
  name: 'code',
  in: 'query',
  required: true,
  schema: {
    type: 'string',
    minLength: 4,
  },
  description: 'Club invite code.',
};

const communityGroupIdQueryParameter = {
  name: 'communityGroupId',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    minLength: 1,
  },
  description: 'Community group identifier. Mutually exclusive with clubId.',
};

const followingOnlyQueryParameter = {
  name: 'followingOnly',
  in: 'query',
  required: false,
  schema: {
    type: 'boolean',
    default: false,
  },
  description:
    'When true, returns readable personal/BOTH posts authored by active followed users. This filter does not grant additional visibility.',
};

const coachSearchQueryParameter = {
  name: 'query',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    maxLength: 100,
  },
  description: 'Text search across public coach profile fields and active offerings.',
};

const userSearchTextQueryParameter = {
  name: 'q',
  in: 'query',
  required: true,
  schema: {
    type: 'string',
    minLength: 2,
    maxLength: 120,
  },
  description:
    'Name/location search, or an exact email lookup for invitation-safe discovery. Raw query text is not written to audit metadata.',
};

const userSearchLimitQueryParameter = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 20,
  },
  description: 'Maximum privacy-filtered users to return.',
};

const coachSearchPriceMinParameter = {
  name: 'priceMin',
  in: 'query',
  required: false,
  schema: {
    type: 'number',
    minimum: 0,
    maximum: 10000,
  },
  description: 'Minimum GBP price per session.',
};

const coachSearchPriceMaxParameter = {
  name: 'priceMax',
  in: 'query',
  required: false,
  schema: {
    type: 'number',
    minimum: 0,
    maximum: 10000,
  },
  description: 'Maximum GBP price per session.',
};

const coachSearchRatingParameter = {
  name: 'rating',
  in: 'query',
  required: false,
  schema: {
    type: 'number',
    minimum: 0,
    maximum: 5,
  },
  description: 'Minimum completed public-review rating aggregate.',
};

const coachSearchLatParameter = {
  name: 'lat',
  in: 'query',
  required: false,
  schema: {
    type: 'number',
    minimum: -90,
    maximum: 90,
  },
  description: 'Search origin latitude. Required with lng for distance filtering or distance sort.',
};

const coachSearchLngParameter = {
  name: 'lng',
  in: 'query',
  required: false,
  schema: {
    type: 'number',
    minimum: -180,
    maximum: 180,
  },
  description:
    'Search origin longitude. Required with lat for distance filtering or distance sort.',
};

const coachSearchRadiusKmParameter = {
  name: 'radiusKm',
  in: 'query',
  required: false,
  schema: {
    type: 'number',
    minimum: 0,
    maximum: 500,
  },
  description:
    'Maximum distance from the lat/lng origin in kilometres. Uses public coach location coordinates only and never exposes raw addresses.',
};

function stringArrayQueryParameter(name, description) {
  return {
    name,
    in: 'query',
    required: false,
    schema: {
      type: 'array',
      items: {
        type: 'string',
        minLength: 1,
        maxLength: 80,
      },
      maxItems: 20,
    },
    style: 'form',
    explode: true,
    description,
  };
}

const coachSearchSortByParameter = {
  name: 'sortBy',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: ['relevance', 'distance', 'rating', 'price_low', 'price_high', 'reviews'],
    default: 'relevance',
  },
  description: 'Sort order for backend public coach search results.',
};

const pageQueryParameter = {
  name: 'page',
  in: 'query',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 1000,
    default: 1,
  },
  description: 'Page number.',
};

const pageSizeQueryParameter = {
  name: 'pageSize',
  in: 'query',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 100,
    default: 20,
  },
  description: 'Page size.',
};

const emailAvailabilityQueryParameter = {
  name: 'email',
  in: 'query',
  required: true,
  schema: {
    type: 'string',
    format: 'email',
    maxLength: 254,
  },
  description: 'Email address to check for account registration.',
};

const paymentAttemptTokenQueryParameter = {
  name: 'token',
  in: 'query',
  required: true,
  schema: {
    type: 'string',
    minLength: 20,
  },
  description:
    'Signed simulated payment attempt token generated by /v1/invoices/{invoiceId}/payments.',
};

const earningsPeriodQueryParameter = {
  name: 'period',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: ['week', 'month', 'year'],
    default: 'month',
  },
  description: 'Earnings period used for summary calculations.',
};

const athleteAnalyticsPeriodQueryParameter = {
  name: 'period',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: ['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'],
    default: 'MONTH',
  },
  description: 'Aggregation window for athlete progress analytics.',
};

const athleteSkillNameQueryParameter = {
  name: 'skillName',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    minLength: 1,
    maxLength: 120,
  },
  description: 'Optional exact skill name or code filter.',
};

const practiceLogSinceQueryParameter = {
  name: 'since',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    format: 'date',
  },
  description: 'Return practice logs on or after this local calendar date.',
};

const practiceLogLimitQueryParameter = {
  ...limitQueryParameter,
  schema: {
    ...limitQueryParameter.schema,
    default: 100,
  },
};

const practiceLogEntryExample = {
  id: 'plog_123',
  athleteId: 'ath_123',
  authorUserId: 'usr_parent-123',
  dateKey: '2026-07-14',
  minutes: 45,
  note: 'Ball mastery and wall passing.',
  createdAt: '2026-07-14T18:30:00.000Z',
  updatedAt: '2026-07-14T18:45:00.000Z',
};

const practiceLogMutationResponseExample = {
  athleteId: 'ath_123',
  log: practiceLogEntryExample,
  addedMinutes: 15,
  created: false,
  replayed: false,
  timeZone: 'Europe/London',
  seedVersion: null,
  requestId: 'req_123',
};

const athleteSkillUpdateResponseExample = {
  athleteId: 'ath_123',
  skillAssessment: {
    id: 'ska_123',
    athleteId: 'ath_123',
    skillDefinitionId: 'skd_123',
    assessorUserId: 'usr_coach',
    score: 8,
    notes: 'Cleaner tempo in possession.',
    bookingId: 'bok_123',
    assessedAt: '2026-07-14T18:30:00.000Z',
    createdAt: '2026-07-14T18:30:00.000Z',
  },
  skillDefinition: {
    id: 'skd_123',
    code: 'PASSING',
    name: 'Passing',
    category: 'Technical',
    description: 'Passing definition created from coach skill update.',
    active: true,
    createdAt: '2026-07-14T18:30:00.000Z',
    updatedAt: '2026-07-14T18:30:00.000Z',
  },
  previousScore: 7,
  score: 8,
  replayed: false,
  seedVersion: null,
  requestId: 'req_123',
};

const earningsLimitQueryParameter = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 100,
  },
  description: 'Maximum earning transactions to return.',
};

const withdrawalStatusQueryParameter = {
  name: 'status',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: ['pending'],
  },
  description: 'When set to pending, returns pending and processing simulated withdrawals only.',
};

const bookingStatusQueryParameter = {
  name: 'status',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: [
      'PENDING',
      'AWAITING_CONFIRMATION',
      'CONFIRMED',
      'AWAITING_COMPLETION',
      'COMPLETED',
      'CANCELLED',
      'DECLINED',
      'WITHDRAWN',
      'EXPIRED',
    ],
  },
  description: 'Optional exact booking status filter.',
};

const clubMatchStatusQueryParameter = {
  name: 'status',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: ['SCHEDULED', 'LINEUP_SET', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  },
  description: 'Optional exact match status filter.',
};

const clubMatchLimitQueryParameter = {
  name: 'limit',
  in: 'query',
  required: false,
  schema: {
    type: 'integer',
    minimum: 1,
    maximum: 50,
  },
  description: 'Maximum matches to return.',
};

const cancellationRecordsCoachIdQueryParameter = {
  name: 'coachId',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    pattern: '^usr_[A-Za-z0-9-]+$',
  },
  description:
    'Optional coach scope. Non-admin callers still only receive cancellation records they are authorized to read.',
};

const completionRosterQueryParameter = {
  name: 'forCompletion',
  in: 'query',
  required: false,
  schema: {
    type: 'boolean',
    default: false,
  },
  description:
    'When true, returns the earliest ended occurrence without completion proof and the roster active when it started.',
};

const safeguardingStatusQueryParameter = {
  name: 'status',
  in: 'query',
  required: false,
  style: 'form',
  explode: true,
  schema: {
    type: 'array',
    minItems: 1,
    maxItems: 3,
    items: schemaRef('SafeguardingIncidentStatus'),
  },
  description: 'Optional repeated or comma-separated incident status filter.',
};

const safeguardingReportedByQueryParameter = {
  name: 'reportedBy',
  in: 'query',
  required: false,
  schema: {
    type: 'string',
    enum: ['me', 'any'],
    default: 'me',
  },
  description:
    'Defaults to incidents reported by the actor. Broad any-reporter reads require athlete scope or privileged administration.',
};

const safeguardingLimitQueryParameter = {
  ...limitQueryParameter,
  schema: {
    ...limitQueryParameter.schema,
    default: 50,
  },
};

const blockTargetUserIdQueryParameter = {
  name: 'targetUserId',
  in: 'query',
  required: false,
  schema: { type: 'string', minLength: 1 },
  description: 'User whose pairwise block relationship should be returned.',
};

const blockedUserIdQueryParameter = {
  name: 'blockedUserId',
  in: 'query',
  required: false,
  schema: { type: 'string', minLength: 1 },
  description:
    'User to unblock. Either blockedUserId or targetUserId is required; the backend soft-removes the actor-owned block row.',
};

const legacyUnblockTargetUserIdQueryParameter = {
  ...blockTargetUserIdQueryParameter,
  description:
    'Compatibility alias for blockedUserId on unblock requests. New clients should use blockedUserId.',
};

const followFollowerIdQueryParameter = {
  name: 'followerId',
  in: 'query',
  required: false,
  schema: { type: 'string', minLength: 1 },
  description:
    'When used alone, lists users followed by this user. Non-admin callers may only pass their own user ID. When paired with followingId, reads one relationship.',
};

const followFollowingIdQueryParameter = {
  name: 'followingId',
  in: 'query',
  required: false,
  schema: { type: 'string', minLength: 1 },
  description:
    'When used alone, lists followers of this user. When paired with followerId, reads one relationship.',
};

const followTargetUserIdQueryParameter = {
  name: 'targetUserId',
  in: 'query',
  required: false,
  schema: { type: 'string', minLength: 1 },
  description: 'Returns whether the authenticated actor follows this user.',
};

const requiredFollowFollowingIdQueryParameter = {
  ...followFollowingIdQueryParameter,
  required: true,
  description: 'Target user for notification-preference updates or soft unfollow.',
};

const followRequestTargetIdQueryParameter = {
  name: 'targetId',
  in: 'query',
  required: false,
  schema: { type: 'string', minLength: 1 },
  description:
    "When present, returns the authenticated requester's pending outgoing request to this target; otherwise returns pending incoming requests for the actor.",
};

const clubMemberExample = {
  userId: 'usr_member_123',
  userName: 'Alex Morgan',
  userPhotoUrl: null,
  role: 'COACH',
  status: 'active',
  joinedAt: '2026-07-01T09:00:00.000Z',
  squadIds: ['sqd_123'],
};

const clubEventRsvpSummaryExample = {
  going: 18,
  maybe: 3,
  notGoing: 2,
  totalGuests: 4,
};

const clubEventExample = {
  id: 'evt_123',
  clubId: 'clb_123',
  createdBy: 'usr_coach_123',
  title: 'End of season presentation',
  description: 'Awards, player recognition, and family updates.',
  eventType: 'PRESENTATION',
  date: '2026-08-22',
  startDate: '2026-08-22',
  startTime: '17:30',
  endTime: '19:00',
  timeZone: 'Europe/London',
  venue: 'Main Club Ground',
  location: 'Main Club Ground',
  isVirtual: false,
  targetAudience: 'ALL',
  squadIds: [],
  athleteIds: [],
  allClub: true,
  maxAttendees: 120,
  maxParticipants: 120,
  currentParticipants: 22,
  price: 0,
  currency: 'GBP',
  rsvpRequired: true,
  rsvpDeadline: '2026-08-20T00:00:00.000Z',
  rsvpSummary: clubEventRsvpSummaryExample,
  status: 'PUBLISHED',
  createdAt: '2026-08-01T09:00:00.000Z',
};

const clubMatchExample = {
  id: 'mat_123',
  clubId: 'clb_123',
  squadId: 'sqd_123',
  coachId: 'usr_coach_123',
  title: 'Clubroom FC v Riverside Athletic',
  matchType: 'LEAGUE',
  opponent: 'Riverside Athletic',
  isHome: true,
  date: '2026-08-22',
  kickoffTime: '14:00',
  timeZone: 'Europe/London',
  meetTime: '13:15',
  venue: 'Main Club Ground',
  address: '1 Stadium Way, London',
  maxPlayers: 16,
  selectedPlayers: [
    {
      athleteId: 'ath_123',
      parentId: 'usr_parent_123',
      status: 'AVAILABLE',
      responseAt: '2026-08-18T10:00:00.000Z',
    },
  ],
  status: 'SCHEDULED',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  notes: 'Blue home kit.',
};

const clubMemberRemovalExample = {
  id: 'clr_123',
  clubId: 'clb_123',
  userId: 'usr_member_123',
  userName: 'Alex Morgan',
  userRole: 'COACH',
  reason: 'SEASON_END',
  customReason: null,
  removedBy: 'usr_owner_123',
  removedByName: 'Club Owner',
  removedAt: '2026-07-31T19:30:00.000Z',
  originalMembership: {
    id: 'clm_123',
    clubId: 'clb_123',
    userId: 'usr_member_123',
    role: 'COACH',
    active: true,
    createdAt: '2026-07-01T09:00:00.000Z',
    updatedAt: '2026-07-01T09:00:00.000Z',
  },
};

const safeguardingActionExample = {
  id: 'sga_123',
  incidentId: 'sgi_123',
  actionType: 'contacted_guardian',
  notes: 'Guardian contacted and follow-up agreed.',
  performedByUserId: 'usr_safeguarding_123',
  createdAt: '2026-07-31T19:45:00.000Z',
};

const safeguardingIncidentExample = {
  id: 'sgi_123',
  athleteId: 'ath_123',
  bookingId: 'bkg_123',
  category: 'booking_issue_safety',
  severity: 'high',
  status: 'in_review',
  summary: 'Safeguarding follow-up required after session.',
  details: 'Reporter requested a confidential follow-up from the safeguarding team.',
  reportedByUserId: 'usr_reporter_123',
  createdAt: '2026-07-31T19:30:00.000Z',
  updatedAt: '2026-07-31T19:45:00.000Z',
  actions: [safeguardingActionExample],
};

const reportExample = {
  id: 'sgi_report_123',
  reportedUserId: 'usr_reported_123',
  reportedByUserId: 'usr_reporter_123',
  type: 'safety_concern',
  description: 'Unsafe conduct reported after a direct-message exchange.',
  context: 'message',
  createdAt: '2026-07-31T20:00:00.000Z',
  status: 'pending',
};

const blockStatusExample = {
  relationship: 'blocked_by_actor',
  blocked: true,
  blockerId: 'usr_actor_123',
  blockedId: 'usr_blocked_123',
};

const userBlockExample = {
  id: 'ubl_123',
  blockerUserId: 'usr_actor_123',
  blockedUserId: 'usr_blocked_123',
  createdAt: '2026-07-31T20:00:00.000Z',
  updatedAt: '2026-07-31T20:00:00.000Z',
};

const blockedUserSummaryExample = {
  id: 'usr_blocked_123',
  name: 'Jordan Reed',
  blockedAt: '2026-07-31T20:00:00.000Z',
};

const followExample = {
  id: 'ufl_123',
  followerId: 'usr_parent_123',
  followerType: 'USER',
  followingId: 'usr_coach_123',
  followingType: 'COACH',
  createdAt: '2026-08-01T10:00:00.000Z',
  notifyOnPost: true,
  notifyOnSession: false,
};

const followListResponseExample = {
  follows: [followExample],
  followerIds: ['usr_parent_123'],
  followingIds: ['usr_coach_123'],
  total: 1,
  dataVersion: null,
  requestId: 'req_123',
};

const followRequestExample = {
  id: 'ufr_123',
  requesterId: 'usr_parent_123',
  targetId: 'usr_coach_123',
  status: 'PENDING',
  message: 'Can we connect?',
  createdAt: '2026-08-01T10:05:00.000Z',
};

const adminUserSummaryExample = {
  summary: {
    total: 41,
    coaches: 12,
    athletes: 18,
    parents: 9,
  },
  seedVersion: null,
  requestId: 'req_123',
};

const userDirectoryEntryExample = {
  id: 'usr_coach-123',
  name: 'Amelia Shaw',
  email: 'amelia.shaw@example.test',
  avatar: 'https://cdn.example.test/avatars/usr_coach-123.jpg',
  postcode: 'SW1A 1AA',
  role: 'COACH',
};

const bookingExample = {
  id: 'bok_123',
  coachUserId: 'usr_coach-123',
  clubId: 'clb_123',
  bookedByUserId: 'usr_parent-123',
  recurringSeriesId: null,
  groupSessionId: null,
  status: 'AWAITING_CONFIRMATION',
  scheduledAt: '2026-08-15T10:00:00.000Z',
  durationMinutes: 60,
  location: 'Riverside Training Ground',
  serviceType: 'one_to_one',
  sessionTemplateId: null,
  objectives: ['First touch', 'Scanning before receiving'],
  notes: 'Please meet at pitch two.',
  priceMinor: 3500,
  currency: 'GBP',
  participants: [
    {
      athleteId: 'ath_123',
      guardianUserId: 'usr_parent-123',
      status: 'pending',
    },
  ],
  version: 1,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  cancelledAt: null,
  requestExpiresAt: '2026-08-02T09:00:00.000Z',
  requestResolvedAt: null,
  requestResolutionReason: null,
};

const confirmedBookingExample = {
  ...bookingExample,
  status: 'CONFIRMED',
  version: 2,
  updatedAt: '2026-08-01T09:15:00.000Z',
  requestResolvedAt: '2026-08-01T09:15:00.000Z',
};

const bookingSeriesExample = {
  id: 'rec_123',
  coachUserId: 'usr_coach-123',
  bookedByUserId: 'usr_parent-123',
  athleteIds: ['ath_123'],
  frequency: 'WEEKLY',
  patternLabel: 'Saturday development block',
  status: 'ACTIVE',
  startDate: '2026-08-15T10:00:00.000Z',
  endDate: '2026-08-22T10:00:00.000Z',
  bookingIds: ['bok_series-1', 'bok_series-2'],
  scheduledDates: ['2026-08-15T10:00:00.000Z', '2026-08-22T10:00:00.000Z'],
  durationMinutes: 60,
  location: 'Riverside Training Ground',
  serviceType: 'one_to_one',
  objectives: ['First touch', 'Scanning before receiving'],
  priceMinor: 3500,
  totalPriceMinor: 7000,
  currency: 'GBP',
  version: 1,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
};

const bookingSeriesBookingsExample = [
  {
    ...bookingExample,
    id: 'bok_series-1',
    recurringSeriesId: 'rec_123',
    scheduledAt: '2026-08-15T10:00:00.000Z',
  },
  {
    ...bookingExample,
    id: 'bok_series-2',
    recurringSeriesId: 'rec_123',
    scheduledAt: '2026-08-22T10:00:00.000Z',
  },
];

const bookingSeriesMutationExample = {
  series: bookingSeriesExample,
  bookings: bookingSeriesBookingsExample,
  requestId: 'req_123',
};

const cancellationRecordExample = {
  id: 'cancel_bok_123',
  bookingId: 'bok_123',
  cancelledBy: 'parent',
  cancelledAt: '2026-08-10T08:00:00.000Z',
  reason: 'Family illness',
  reasonCategory: 'Family illness',
  note: 'Parent warned the coach early.',
  refundAmount: 35,
  refundPercentage: 70,
  hoursBeforeSession: 26,
  coachId: 'usr_coach-123',
  familyId: 'fam_123',
};

const workAssignmentHistoryEventExample = {
  id: 'aev_123',
  action: 'REASSIGNED',
  timestamp: '2026-07-31T20:15:00.000Z',
  actorUserId: 'usr_manager_123',
  actorName: 'Alex Morgan',
  actorRole: 'COACH',
  fromCoachId: 'usr_coach_123',
  toCoachId: 'usr_manager_123',
};

const clubBrandingExample = {
  clubId: 'clb_123',
  name: 'Riverside FC',
  tagline: 'Football for the whole community',
  badgeUrl: 'https://cdn.clubroom.test/clubs/clb_123/badge.png',
  coverPhotoUrl: 'https://cdn.clubroom.test/clubs/clb_123/cover.png',
  primaryColor: '#0F172A',
  secondaryColor: '#1C8C5E',
  updatedAt: '2026-07-31T20:15:00.000Z',
};

const clubIntegrationExample = {
  id: 'cint_123',
  clubId: 'clb_123',
  provider: 'MATCHDAY',
  status: 'DISCONNECTED',
  displayName: 'Matchday import',
  externalAccountId: 'club-123',
  metadataJson: {
    importMode: 'manual',
  },
  createdByUserId: 'usr_owner_123',
  updatedByUserId: 'usr_owner_123',
  createdAt: '2026-08-01T11:00:00.000Z',
  updatedAt: '2026-08-01T11:00:00.000Z',
};

const clubSummaryExample = {
  id: 'clb_123',
  name: 'Riverside FC',
  city: 'Manchester',
  country: 'UK',
  tagline: 'Football for the whole community',
  slug: 'riverside-fc-clb123',
  visibility: 'private',
  joinPolicy: 'INVITE_ONLY',
  commercialMode: 'COACH_OWNED',
  createdByUserId: 'usr_owner_123',
  inviteCode: 'RIVER-MEMBER-1234',
};

const clubMembershipExample = {
  id: 'cmb_123',
  clubId: 'clb_123',
  userId: 'usr_owner_123',
  role: 'OWNER',
  active: true,
  createdAt: '2026-07-31T20:15:00.000Z',
  updatedAt: '2026-07-31T20:15:00.000Z',
};

const clubSquadExample = {
  id: 'sqd_123',
  clubId: 'clb_123',
  name: 'U14 Development',
  level: 'U14',
  memberCount: 18,
  primaryCoach: 'usr_coach_123',
};

const clubScheduleActivityExample = {
  id: 'club_activity:club_event:evt_123',
  source: 'club_event',
  sourceEntityId: 'evt_123',
  clubId: 'clb_123',
  title: 'End of season presentation',
  description: 'Awards and club update for members and families.',
  startsAt: '2026-08-15T18:00:00.000Z',
  endsAt: '2026-08-15T20:00:00.000Z',
  status: 'scheduled',
  kind: 'informational',
  typeLabel: 'Presentation',
  participationMode: 'rsvp',
  participationLabel: 'RSVP',
  accessScope: 'club',
  accessLabel: 'Whole club',
  audienceLabel: 'Whole club',
  locationLabel: 'Clubhouse',
  isVirtual: false,
  price: 0,
  currency: 'GBP',
  squadIds: [],
  allowsExternalRegistration: false,
};

const clubGovernanceExample = {
  role: 'OWNER',
  isStaff: true,
  isOversightRole: true,
  canManageMembers: true,
  canManageAssignments: true,
  canReassignAssignments: true,
  canViewCommercialMode: true,
  canEditCommercialMode: true,
  capabilities: {
    view_org_dashboard: 'org',
    edit_org_profile: 'org',
    manage_staff_and_invites: 'org',
    create_org_sessions: 'org',
    assign_session_coach: 'org',
    reassign_session_coach: 'org',
    set_org_pricing_rules: 'org',
    override_coach_org_pricing: 'org',
    view_org_revenue: 'org',
    manage_coach_payouts: 'org',
    view_program_attendance: 'org',
    view_athlete_health_flags: 'org',
    view_safeguarding_escalations: 'org',
    post_as_org: 'org',
    view_own_work_queue: 'own',
  },
  visibility: {
    finance: 'org',
    athlete_development: 'org',
    medical: 'org',
    safeguarding: 'org',
  },
};

const visibleClubExample = {
  ...clubSummaryExample,
  memberCount: 24,
  coachCount: 5,
  viewerMembership: clubMembershipExample,
  squads: [{ id: 'sqd_123' }],
  viewerGovernance: clubGovernanceExample,
};

const staffingWorkExample = {
  offeringId: 'gse_123',
  title: 'U14 technical session',
  scheduledAt: '2026-08-08T18:00:00.000Z',
  location: 'Pitch 2',
  isVirtual: false,
  status: 'active',
  sessionType: 'group',
  currentParticipants: 8,
  maxParticipants: 14,
  createdByUserId: 'usr_owner_123',
  createdByName: 'Morgan Price',
  assigneeCoachId: 'usr_coach_123',
  assigneeCoachName: 'Alex Morgan',
  linkedBookingCount: 8,
  isRecurring: false,
};

const staffingConsoleExample = {
  club: {
    id: 'clb_123',
    name: 'Riverside FC',
  },
  viewerMembership: {
    clubId: 'clb_123',
    userId: 'usr_owner_123',
    role: 'OWNER',
    status: 'active',
  },
  privilegedAdminAccess: false,
  canManageAssignments: true,
  staff: [
    {
      userId: 'usr_coach_123',
      label: 'Alex Morgan',
      role: 'COACH',
      status: 'active',
      canTakeAssignments: true,
      upcomingLoad: 1,
      nextSessionAt: '2026-08-08T18:00:00.000Z',
    },
  ],
  unassignedWork: [
    {
      ...staffingWorkExample,
      offeringId: 'gse_456',
      title: 'U16 recovery session',
      scheduledAt: null,
      location: null,
      currentParticipants: 0,
      createdByName: null,
      assigneeCoachId: null,
      assigneeCoachName: null,
      linkedBookingCount: 0,
    },
  ],
  assignedWork: [staffingWorkExample],
  summary: {
    activeOrgSessions: 2,
    upcomingAssignedLoad: 1,
    unassignedCount: 1,
  },
  clubId: 'clb_123',
  requestId: 'req_123',
};

const ownerDashboardExample = {
  club: staffingConsoleExample.club,
  viewerMembership: staffingConsoleExample.viewerMembership,
  privilegedAdminAccess: false,
  summary: {
    activeStaffCount: 5,
    activeOrgSessions: 8,
    liveBookingCount: 18,
    unassignedCount: 1,
    awaitingCompletionCount: 2,
    overdueCompletionCount: 1,
    watchAthleteCount: 2,
    overdueFollowUpCount: 1,
    supportIssueCount: 1,
  },
  finance: {
    openTotal: 150,
    orgCreditOpen: 150,
    coachCollectedOpen: 0,
    collectedTotal: 420,
    writtenOffTotal: 20,
    overdueCount: 1,
    owedCount: 3,
    note: 'Finance summary is derived from backend invoices linked to club bookings. Provider payouts remain simulated.',
  },
  unassignedWork: staffingConsoleExample.unassignedWork,
  coachHealth: [
    {
      coachId: 'usr_coach_123',
      coachName: 'Alex Morgan',
      role: 'COACH',
      squadNames: ['Under 14s'],
      completionCount: 12,
      overdueCompletionCount: 1,
      watchAthleteCount: 2,
      overdueFollowUpCount: 1,
      openTaskCount: 2,
      sessionNoteExpectationCount: 1,
      requiredFollowUpCount: 1,
      latestCoachActionAt: '2026-08-01T18:20:00.000Z',
    },
  ],
  completionQueue: [
    {
      bookingId: 'bkg_123',
      offeringId: 'gse_456',
      coachId: 'usr_coach_123',
      coachName: 'Alex Morgan',
      athleteName: 'Sam Taylor',
      service: 'U14 technical session',
      scheduledAt: '2026-07-30T18:00:00.000Z',
      dueAt: '2026-07-31T18:00:00.000Z',
      overdue: true,
      squadId: 'sqd_123',
      squadName: 'Under 14s',
    },
  ],
  supportIssues: [
    {
      id: 'saf_123',
      bookingId: 'bkg_123',
      status: 'reviewed',
      category: 'booking_issue_safety',
      description: 'Family requested a safeguarding follow-up.',
      createdAt: '2026-07-31T19:00:00.000Z',
      scheduledAt: '2026-07-30T18:00:00.000Z',
      sessionTitle: 'U14 technical session',
      athleteLabel: 'Sam Taylor',
      supportLabel: 'Riverside FC',
      deliveredByLabel: 'Alex Morgan',
    },
  ],
  clubId: 'clb_123',
  requestId: 'req_123',
};

const headCoachTaskExample = {
  id: 'hct_123',
  clubId: 'clb_123',
  coachId: 'usr_coach_123',
  coachName: 'Alex Morgan',
  type: 'required_follow_up',
  status: 'open',
  title: 'Follow up with Sam Taylor',
  details: 'Confirm the return-to-training plan with the family.',
  dueAt: '2026-08-03T18:00:00.000Z',
  athleteId: 'ath_123',
  athleteName: 'Sam Taylor',
  bookingId: 'bkg_123',
  offeringId: 'gse_456',
  squadId: 'sqd_123',
  createdAt: '2026-08-01T19:00:00.000Z',
  updatedAt: '2026-08-01T19:00:00.000Z',
  createdByUserId: 'usr_head_coach_123',
};

const headCoachStandardExample = {
  id: 'hcs_123',
  clubId: 'clb_123',
  category: 'session_notes',
  title: 'Session notes within 24 hours',
  description: 'Assigned coaches record completion notes by the following evening.',
  active: true,
  createdAt: '2026-08-01T19:00:00.000Z',
  updatedAt: '2026-08-01T19:00:00.000Z',
  createdByUserId: 'usr_head_coach_123',
};

const headCoachOversightExample = {
  club: {
    id: 'clb_123',
    name: 'Riverside FC',
    city: 'Manchester',
    tagline: 'Football for the whole community',
    badgeUrl: 'https://cdn.clubroom.test/clubs/clb_123/badge.png',
    coverPhotoUrl: 'https://cdn.clubroom.test/clubs/clb_123/cover.png',
    memberCount: 24,
    coachCount: 5,
    squadCount: 3,
    ownerId: 'usr_owner_123',
  },
  viewerMembership: {
    clubId: 'clb_123',
    userId: 'usr_head_coach_123',
    role: 'HEAD_COACH',
    status: 'active',
    squadIds: ['sqd_123'],
  },
  scope: {
    type: 'assigned_squads',
    squadIds: ['sqd_123'],
    label: 'Assigned squads',
  },
  squads: [
    {
      id: 'sqd_123',
      clubId: 'clb_123',
      name: 'Under 14s',
      ageBandLabel: 'U14',
      memberCount: 16,
      ownerCoachId: 'usr_coach_123',
      ownerCoachName: 'Alex Morgan',
      nextSessionAt: '2026-08-08T18:00:00.000Z',
    },
  ],
  coachHealth: ownerDashboardExample.coachHealth,
  completionQueue: ownerDashboardExample.completionQueue,
  watchlist: [
    {
      athleteId: 'ath_123',
      athleteName: 'Sam Taylor',
      coachId: 'usr_coach_123',
      coachName: 'Alex Morgan',
      risk: 'watch',
      pendingCount: 1,
      overdueCount: 0,
      dueSoonCount: 1,
      recommendedAction: 'Follow-up is due soon; confirm the coach action plan.',
      nextDueAt: '2026-08-03T18:00:00.000Z',
      latestCoachActionAt: '2026-08-01T19:00:00.000Z',
      attentionScore: 3,
      taskIds: ['hct_123'],
      squadId: 'sqd_123',
      squadName: 'Under 14s',
    },
  ],
  tasks: [headCoachTaskExample],
  standards: [headCoachStandardExample],
  summary: {
    coachCount: 1,
    squadCount: 1,
    awaitingCompletionCount: 1,
    overdueCompletionCount: 1,
    watchAthleteCount: 1,
    overdueFollowUpCount: 0,
    openTaskCount: 1,
    activeStandardCount: 1,
  },
  clubId: 'clb_123',
  requestId: 'req_123',
};

const headCoachTaskRequired = [
  'id',
  'clubId',
  'coachId',
  'coachName',
  'type',
  'status',
  'title',
  'dueAt',
  'createdAt',
  'updatedAt',
  'createdByUserId',
];

const headCoachTaskProperties = {
  id: { type: 'string' },
  clubId: { type: 'string' },
  coachId: { type: 'string' },
  coachName: { type: 'string' },
  type: schemaRef('HeadCoachTaskType'),
  status: schemaRef('HeadCoachTaskStatus'),
  title: { type: 'string' },
  details: { type: 'string' },
  dueAt: {
    anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
  },
  athleteId: { type: 'string' },
  athleteName: { type: 'string' },
  bookingId: { type: 'string' },
  offeringId: { type: 'string' },
  squadId: { type: 'string' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
  createdByUserId: { type: 'string' },
  completedAt: { type: 'string', format: 'date-time' },
  completedByUserId: { type: 'string' },
};

const headCoachStandardRequired = [
  'id',
  'clubId',
  'category',
  'title',
  'active',
  'createdAt',
  'updatedAt',
  'createdByUserId',
];

const headCoachStandardProperties = {
  id: { type: 'string' },
  clubId: { type: 'string' },
  category: schemaRef('HeadCoachStandardCategory'),
  title: { type: 'string' },
  description: { type: 'string' },
  active: { type: 'boolean' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
  createdByUserId: { type: 'string' },
};

const clubInviteCodeExample = {
  id: 'cinv_123',
  clubId: 'clb_123',
  code: 'RIVER-MEMBER-1234',
  role: 'MEMBER',
  createdByUserId: 'usr_owner_123',
  createdAt: '2026-07-31T20:15:00.000Z',
  expiresAt: '2027-07-31T20:15:00.000Z',
  remainingUses: 999,
};

const clubJoinPreviewExample = {
  clubId: clubSummaryExample.id,
  clubName: clubSummaryExample.name,
  clubSlug: clubSummaryExample.slug,
  visibility: clubSummaryExample.visibility,
  joinPolicy: clubSummaryExample.joinPolicy,
  inviteCode: clubInviteCodeExample.code,
  role: clubInviteCodeExample.role,
  joinFlow: 'direct_join',
  expiresAt: clubInviteCodeExample.expiresAt,
  alreadyMember: false,
};

const pendingClubInviteExample = {
  id: 'inv_club_staff_123',
  clubId: clubSummaryExample.id,
  clubName: clubSummaryExample.name,
  targetUserId: 'usr_coach_456',
  targetKind: 'user',
  inviteCode: 'RIVER-COACH-1234',
  role: 'COACH',
  invitedByUserId: 'usr_owner_123',
  invitedByLabel: 'Club staff',
  status: 'pending',
  createdAt: '2026-08-01T12:00:00.000Z',
  expiresAt: '2026-08-31T12:00:00.000Z',
  respondedAt: null,
};

const clubSummaryRequired = [
  'id',
  'name',
  'city',
  'country',
  'tagline',
  'slug',
  'visibility',
  'joinPolicy',
  'commercialMode',
  'inviteCode',
];

const nullableStringSchema = {
  anyOf: [{ type: 'string' }, { type: 'null' }],
};

const clubSummaryProperties = {
  id: { type: 'string' },
  name: { type: 'string', minLength: 1, maxLength: 100 },
  city: nullableStringSchema,
  country: nullableStringSchema,
  tagline: nullableStringSchema,
  slug: nullableStringSchema,
  visibility: {
    anyOf: [{ type: 'string', enum: ['private', 'public'] }, { type: 'null' }],
  },
  joinPolicy: {
    type: 'string',
    enum: ['INVITE_ONLY', 'REQUEST_TO_JOIN', 'OPEN'],
  },
  commercialMode: {
    anyOf: [{ type: 'string', enum: ['COACH_OWNED', 'ORG_OWNED'] }, { type: 'null' }],
  },
  createdByUserId: { type: 'string' },
  inviteCode: nullableStringSchema,
};

const clubCapabilityNames = [
  'view_org_dashboard',
  'edit_org_profile',
  'manage_staff_and_invites',
  'create_org_sessions',
  'assign_session_coach',
  'reassign_session_coach',
  'set_org_pricing_rules',
  'override_coach_org_pricing',
  'view_org_revenue',
  'manage_coach_payouts',
  'view_program_attendance',
  'view_athlete_health_flags',
  'view_safeguarding_escalations',
  'post_as_org',
  'view_own_work_queue',
];

const clubVisibilityAreaNames = ['finance', 'athlete_development', 'medical', 'safeguarding'];

const communityGroupOwnerMembershipExample = {
  id: 'cgm_123',
  communityGroupId: 'cgrp_123',
  userId: 'usr_owner_123',
  role: 'OWNER',
  active: true,
  createdByUserId: 'usr_owner_123',
  updatedByUserId: 'usr_owner_123',
  version: 1,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  deletedAt: null,
};

const communityGroupMemberMembershipExample = {
  ...communityGroupOwnerMembershipExample,
  id: 'cgm_456',
  userId: 'usr_member_456',
  role: 'MEMBER',
  createdByUserId: 'usr_member_456',
  updatedByUserId: 'usr_member_456',
};

const communityGroupExample = {
  id: 'cgrp_123',
  groupType: 'GENERAL',
  clubId: null,
  squadId: null,
  ownerUserId: 'usr_owner_123',
  name: 'Parent Support',
  description: 'A public group for parents and guardians.',
  visibility: 'PUBLIC',
  createdByUserId: 'usr_owner_123',
  updatedByUserId: 'usr_owner_123',
  version: 1,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  deletedAt: null,
  deletedByUserId: null,
  memberships: [communityGroupOwnerMembershipExample],
};

const communityGroupResponseExample = {
  group: communityGroupExample,
  seedVersion: null,
  requestId: 'req_123',
};

const communityGroupJoinRequestExample = {
  id: 'cgjr_123',
  groupId: 'cgrp_123',
  groupName: 'Parent Support',
  requesterId: 'usr_member_456',
  requesterName: 'Sam Taylor',
  requestedRole: 'MEMBER',
  isCoach: false,
  status: 'PENDING',
  createdAt: '2026-08-01T09:15:00.000Z',
  respondedAt: null,
};

const communityGroupJoinRequestResponseExample = {
  request: communityGroupJoinRequestExample,
  seedVersion: null,
  requestId: 'req_123',
};

const communityGroupInviteExample = {
  id: 'cgi_123',
  groupId: 'cgrp_123',
  groupName: 'Parent Support',
  inviterId: 'usr_owner_123',
  inviterName: 'Alex Morgan',
  inviteeId: 'usr_member_456',
  inviteeName: 'Sam Taylor',
  status: 'PENDING',
  createdAt: '2026-08-01T09:20:00.000Z',
  respondedAt: null,
};

const communityGroupInviteResponseExample = {
  invite: communityGroupInviteExample,
  seedVersion: null,
  requestId: 'req_123',
};

const postAuthorExample = {
  id: 'usr_coach_123',
  name: 'Alex Morgan',
  avatarUrl: null,
};

const postMediaAttachmentExample = {
  id: 'med_123',
  mediaObjectId: 'med_123',
  type: 'photo',
  title: 'Training photo',
  subtitle: 'image/jpeg',
  contentType: 'image/jpeg',
  originalFileName: 'training-update.jpg',
};

const postExample = {
  id: 'pst_123',
  authorUserId: 'usr_coach_123',
  clubId: 'clb_123',
  communityGroupId: null,
  visibility: 'CLUB',
  content: 'Saturday training starts at 10:00.',
  attachmentsJson: {
    title: 'Training update',
    postType: 'announcement',
    postAs: 'club',
    feedType: 'CLUB',
    audience: 'club',
    audienceLabel: 'Club-wide',
    attachments: [postMediaAttachmentExample],
  },
  commentsCount: 0,
  reactionsCount: 0,
  createdByUserId: 'usr_coach_123',
  updatedByUserId: 'usr_coach_123',
  version: 1,
  createdAt: '2026-08-01T09:00:00.000Z',
  updatedAt: '2026-08-01T09:00:00.000Z',
  deletedAt: null,
  deletedByUserId: null,
  likedByCurrentUser: false,
  likes: [],
  author: postAuthorExample,
};

const postResponseExample = {
  post: postExample,
  seedVersion: null,
  requestId: 'req_123',
};

const likedPostExample = {
  ...postExample,
  reactionsCount: 1,
  likedByCurrentUser: true,
  likes: ['usr_member_456'],
  version: 2,
  updatedByUserId: 'usr_member_456',
  updatedAt: '2026-08-01T09:05:00.000Z',
  reactions: [
    {
      id: 'prx_123',
      postId: 'pst_123',
      userId: 'usr_member_456',
      reaction: 'LIKE',
      createdAt: '2026-08-01T09:05:00.000Z',
    },
  ],
};

const postCommentExample = {
  id: 'cmt_123',
  postId: 'pst_123',
  authorUserId: 'usr_member_456',
  parentCommentId: null,
  content: 'Looking forward to training.',
  isDeleted: false,
  deletedAt: null,
  createdAt: '2026-08-01T09:15:00.000Z',
  updatedAt: '2026-08-01T09:15:00.000Z',
  author: {
    id: 'usr_member_456',
    name: 'Sam Taylor',
    avatarUrl: null,
  },
  likesCount: 0,
  likedByCurrentUser: false,
  likes: [],
};

const postCommentResponseExample = {
  comment: postCommentExample,
  seedVersion: null,
  requestId: 'req_123',
};

const postCommentReplyExample = {
  ...postCommentExample,
  id: 'cmt_456',
  authorUserId: 'usr_coach_123',
  parentCommentId: 'cmt_123',
  content: 'See you there.',
  createdAt: '2026-08-01T09:20:00.000Z',
  updatedAt: '2026-08-01T09:20:00.000Z',
  author: postAuthorExample,
};

const likedPostCommentExample = {
  ...postCommentExample,
  likesCount: 1,
  likedByCurrentUser: true,
  likes: ['usr_member_456'],
};

const removedPostCommentExample = {
  ...postCommentExample,
  content: '[deleted]',
  isDeleted: true,
  deletedAt: '2026-08-01T09:25:00.000Z',
  updatedAt: '2026-08-01T09:25:00.000Z',
};

const messageReceiptExample = {
  id: 'mrc_123',
  messageId: 'msg_123',
  userId: 'usr_member_456',
  deliveredAt: '2026-08-01T10:00:00.000Z',
  readAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

const messageExample = {
  id: 'msg_123',
  messageThreadId: 'thr_123',
  senderUserId: 'usr_coach_123',
  content: 'Training starts at 10:00 on Saturday.',
  attachmentsJson: [postMediaAttachmentExample],
  editedAt: null,
  deletedAt: null,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  receipts: [
    {
      ...messageReceiptExample,
      id: 'mrc_sender_123',
      userId: 'usr_coach_123',
      readAt: '2026-08-01T10:00:00.000Z',
    },
    messageReceiptExample,
  ],
};

const messageThreadExample = {
  id: 'thr_123',
  threadType: 'DIRECT',
  clubId: null,
  communityGroupId: null,
  groupSessionId: null,
  bookingId: 'bkg_123',
  title: 'Saturday training',
  lastMessageAt: '2026-08-01T10:00:00.000Z',
  createdByUserId: 'usr_coach_123',
  updatedByUserId: 'usr_coach_123',
  version: 2,
  createdAt: '2026-08-01T09:30:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  deletedAt: null,
  participants: [
    {
      id: 'mpr_coach_123',
      messageThreadId: 'thr_123',
      userId: 'usr_coach_123',
      role: 'COACH',
      lastReadAt: '2026-08-01T10:00:00.000Z',
      muted: false,
      joinedAt: '2026-08-01T09:30:00.000Z',
      leftAt: null,
    },
    {
      id: 'mpr_member_123',
      messageThreadId: 'thr_123',
      userId: 'usr_member_456',
      role: 'PARENT',
      lastReadAt: null,
      muted: false,
      joinedAt: '2026-08-01T09:30:00.000Z',
      leftAt: null,
    },
  ],
  messages: [messageExample],
};

const groupMessageExample = {
  ...messageExample,
  id: 'msg_group_123',
  messageThreadId: 'thr_group_123',
  receipts: messageExample.receipts.map((receipt) => ({
    ...receipt,
    messageId: 'msg_group_123',
  })),
};

const groupMessageThreadExample = {
  ...messageThreadExample,
  id: 'thr_group_123',
  threadType: 'GROUP',
  communityGroupId: 'cgrp_123',
  bookingId: null,
  title: 'Parent Support',
  participants: messageThreadExample.participants.map((participant) => ({
    ...participant,
    messageThreadId: 'thr_group_123',
  })),
  messages: [groupMessageExample],
};

const messageMutationResponseExample = {
  message: messageExample,
  thread: messageThreadExample,
  seedVersion: null,
  requestId: 'req_123',
};

const groupMessageMutationResponseExample = {
  message: groupMessageExample,
  thread: groupMessageThreadExample,
  seedVersion: null,
  requestId: 'req_123',
};

const readMessageThreadExample = {
  ...messageThreadExample,
  participants: messageThreadExample.participants.map((participant) =>
    participant.userId === 'usr_member_456'
      ? { ...participant, lastReadAt: '2026-08-01T10:05:00.000Z' }
      : participant,
  ),
  messages: [
    {
      ...messageExample,
      receipts: messageExample.receipts.map((receipt) =>
        receipt.userId === 'usr_member_456'
          ? { ...receipt, readAt: '2026-08-01T10:05:00.000Z' }
          : receipt,
      ),
    },
  ],
};

const removedMessageMutationResponseExample = {
  ...messageMutationResponseExample,
  message: {
    ...messageExample,
    content: '[deleted]',
    deletedAt: '2026-08-01T10:10:00.000Z',
    updatedAt: '2026-08-01T10:10:00.000Z',
  },
  thread: {
    ...messageThreadExample,
    lastMessageAt: null,
    version: 3,
    updatedAt: '2026-08-01T10:10:00.000Z',
    messages: [],
  },
};

const videoAnnotationExample = {
  id: 'van_123',
  timestamp: 18,
  label: 'Body position',
  note: 'Receive on the back foot.',
  type: 'IMPROVEMENT',
  createdBy: 'usr_coach_123',
  createdAt: '2026-08-01T10:30:00.000Z',
  updatedAt: '2026-08-01T10:35:00.000Z',
};

const videoExample = {
  id: 'vid_123',
  coachUserId: 'usr_coach_123',
  athleteId: 'ath_123',
  title: 'Technical Review',
  description: 'First-touch review from the Saturday session.',
  visibility: 'PRIVATE',
  sharedWithUserIds: [],
  sourceContextType: 'booking',
  sourceContextId: 'bkg_123',
  mediaObjectId: 'med_123',
  uploadStatus: 'READY',
  playbackUrl: 'https://storage.example.invalid/private/video.mp4?X-Amz-Signature=redacted',
  playbackExpiresAt: '2026-08-01T10:45:00.000Z',
  thumbnailUrl: 'https://storage.example.invalid/private/video.mp4?X-Amz-Signature=redacted',
  durationMs: 92000,
  fileSizeBytes: 128000,
  contentType: 'video/mp4',
  createdAt: '2026-08-01T10:30:00.000Z',
  updatedAt: '2026-08-01T10:35:00.000Z',
  annotations: [videoAnnotationExample],
};

const injuryExample = {
  id: 'inj_123',
  athleteId: 'ath_123',
  title: 'Left ankle sprain',
  type: 'LEFT_ANKLE',
  severity: 'medium',
  status: 'recovering',
  reportedAt: '2026-08-01T10:30:00.000Z',
  expectedRecoveryDate: '2026-08-15T10:30:00.000Z',
  resolvedAt: null,
  notes: 'Continue progressive loading and reassess before contact training.',
  createdByUserId: 'usr_parent_123',
  createdAt: '2026-08-01T10:30:00.000Z',
  updatedAt: '2026-08-04T09:15:00.000Z',
};

const medicalRecordExample = {
  athleteId: 'ath_123',
  conditions: ['Asthma'],
  allergies: ['Peanuts'],
  medications: ['Salbutamol inhaler'],
  restrictions: ['Keep inhaler pitch-side'],
  doctorName: 'Dr Morgan',
  doctorPhone: '+442071234567',
  insuranceProvider: null,
  insuranceNumber: null,
  emergencyNotes: 'Use the blue inhaler when symptoms begin.',
  senNotes: null,
  updatedAt: '2026-08-01T10:30:00.000Z',
  updatedByUserId: 'usr_parent_123',
};

const emergencyContactExample = {
  id: 'emc_123',
  name: 'Alex Morgan',
  relationship: 'Parent',
  phone: '+447700900123',
  isPrimary: true,
  canPickup: true,
};

const consentRecordsExample = [
  {
    type: 'PHOTO',
    granted: true,
    grantedAt: '2026-08-01T10:30:00.000Z',
    grantedBy: 'Alex Morgan',
  },
  { type: 'VIDEO', granted: false, grantedBy: 'Alex Morgan' },
  { type: 'SOCIAL_MEDIA', granted: false, grantedBy: 'Alex Morgan' },
  {
    type: 'EMERGENCY_TREATMENT',
    granted: true,
    grantedAt: '2026-08-01T10:30:00.000Z',
    grantedBy: 'Alex Morgan',
  },
];

const notificationExample = {
  id: 'ntf_123',
  userId: 'usr_parent_123',
  type: 'BOOKING_CONFIRMED',
  title: 'Booking confirmed',
  body: 'Saturday training is confirmed.',
  status: 'UNREAD',
  sourceType: 'booking',
  sourceId: 'bkg_123',
  deepLink: '/bookings/bkg_123',
  metadataJson: { bookingId: 'bkg_123' },
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
  readAt: null,
  dismissedAt: null,
};

const notificationPreferenceExample = {
  userId: 'usr_parent_123',
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  settingsJson: {
    typePreferences: {
      MESSAGE_RECEIVED: { enabled: true, channels: ['PUSH', 'EMAIL'] },
    },
  },
  createdAt: '2026-07-01T09:00:00.000Z',
  updatedAt: '2026-08-01T10:05:00.000Z',
};

const mutedSourceExample = {
  id: 'mut_123',
  userId: 'usr_parent_123',
  sourceType: 'coach',
  sourceId: 'usr_coach_123',
  reason: 'Too many updates',
  mutedAt: '2026-08-01T10:05:00.000Z',
  unmutedAt: null,
};

const quietHoursExample = {
  userId: 'usr_parent_123',
  enabled: true,
  startTimeLocal: '22:00',
  endTimeLocal: '07:00',
  timeZone: 'Europe/London',
  createdAt: '2026-07-01T09:00:00.000Z',
  updatedAt: '2026-08-01T10:05:00.000Z',
};

const notificationListResponseExample = {
  notifications: [notificationExample],
  preferences: notificationPreferenceExample,
  mutedSources: [mutedSourceExample],
  quietHours: quietHoursExample,
  unreadCount: 1,
  seedVersion: null,
  requestId: 'req_123',
};

const readNotificationExample = {
  ...notificationExample,
  status: 'READ',
  readAt: '2026-08-01T10:06:00.000Z',
  updatedAt: '2026-08-01T10:06:00.000Z',
};

const dismissedNotificationExample = {
  ...notificationExample,
  status: 'DISMISSED',
  dismissedAt: '2026-08-01T10:07:00.000Z',
  updatedAt: '2026-08-01T10:07:00.000Z',
};

const operationOverrides = new Map([
  [
    'GET /v1/meta/version',
    {
      tag: 'Platform',
      summary: 'Get API Version',
      operationId: 'getApiVersion',
      effect: 'get version',
      responseSchema: 'ApiVersionResponse',
      responseExample: {
        service: 'clubroom-api',
        version: '0.1.0',
        apiVersion: 'v1',
        apiStatus: 'preview',
        minimumDeprecationDays: 180,
        apiDataBackend: 'db',
        marketplaceSeedEnabled: false,
      },
    },
  ],
  [
    'GET /v1/reports',
    {
      tag: 'Trust & Safety',
      summary: 'List My Reports',
      operationId: 'listMyReports',
      effect: 'list',
      responseSchema: 'ReportListResponse',
      responseExample: {
        reports: [reportExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/reports',
    {
      tag: 'Trust & Safety',
      summary: 'Create User Report',
      operationId: 'createUserReport',
      effect: 'report',
      requestSchema: 'CreateReportRequest',
      requestExample: {
        reportedUserId: 'usr_reported_123',
        type: 'safety_concern',
        description: 'Unsafe conduct reported after a direct-message exchange.',
        context: 'message',
      },
      createdResponseSchema: 'ReportMutationResponse',
      createdResponseExample: {
        report: reportExample,
        autoBlocked: true,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/blocks',
    {
      tag: 'Trust & Safety',
      summary: 'List Blocked Users',
      operationId: 'listBlockedUsers',
      effect: 'list',
      parameters: [blockTargetUserIdQueryParameter],
      responseSchema: 'BlockListResponse',
      responseExample: {
        blocks: [userBlockExample],
        blockedUserIds: ['usr_blocked_123'],
        blockedUsers: [blockedUserSummaryExample],
        total: 1,
        status: blockStatusExample,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/blocks',
    {
      tag: 'Trust & Safety',
      summary: 'Block User',
      operationId: 'blockUser',
      effect: 'block',
      requestSchema: 'BlockUserRequest',
      requestExample: { blockedUserId: 'usr_blocked_123' },
      createdResponseSchema: 'BlockMutationResponse',
      createdResponseExample: {
        status: blockStatusExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'DELETE /v1/blocks',
    {
      tag: 'Trust & Safety',
      summary: 'Unblock User',
      operationId: 'unblockUser',
      effect: 'unblock',
      parameters: [blockedUserIdQueryParameter, legacyUnblockTargetUserIdQueryParameter],
      responseSchema: 'BlockMutationResponse',
      responseExample: {
        status: {
          relationship: 'none',
          blocked: false,
          blockerId: null,
          blockedId: null,
        },
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/safeguarding/incidents',
    {
      tag: 'Trust & Safety',
      summary: 'List Safeguarding Incidents',
      operationId: 'listSafeguardingIncidents',
      effect: 'list',
      parameters: [
        optionalAthleteIdQueryParameter,
        safeguardingStatusQueryParameter,
        safeguardingReportedByQueryParameter,
        safeguardingLimitQueryParameter,
      ],
      responseSchema: 'SafeguardingIncidentListResponse',
      responseExample: {
        incidents: [safeguardingIncidentExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/safeguarding/incidents',
    {
      tag: 'Trust & Safety',
      summary: 'Create Safeguarding Incident',
      operationId: 'createSafeguardingIncident',
      effect: 'create',
      requestSchema: 'CreateSafeguardingIncidentRequest',
      requestExample: {
        athleteId: 'ath_123',
        bookingId: 'bkg_123',
        category: 'booking_issue_safety',
        severity: 'high',
        summary: 'Safeguarding follow-up required after session.',
        details: 'Reporter requested a confidential follow-up from the safeguarding team.',
      },
      createdResponseSchema: 'SafeguardingIncidentResponse',
      createdResponseExample: safeguardingIncidentExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/safeguarding/incidents/{incidentId}',
    {
      tag: 'Trust & Safety',
      summary: 'Get Safeguarding Incident',
      operationId: 'getSafeguardingIncident',
      effect: 'get',
      responseSchema: 'SafeguardingIncidentResponse',
      responseExample: safeguardingIncidentExample,
    },
  ],
  [
    'POST /v1/safeguarding/incidents/{incidentId}/actions',
    {
      tag: 'Trust & Safety',
      summary: 'Add Safeguarding Incident Action',
      operationId: 'addSafeguardingIncidentAction',
      effect: 'add action',
      requestSchema: 'CreateSafeguardingActionRequest',
      requestExample: {
        actionType: 'contacted_guardian',
        notes: 'Guardian contacted and follow-up agreed.',
      },
      createdResponseSchema: 'SafeguardingActionResponse',
      createdResponseExample: safeguardingActionExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/clubs',
    {
      tag: 'Clubs',
      summary: 'List Visible Clubs',
      operationId: 'listVisibleClubs',
      effect: 'list',
      responseSchema: 'ClubListResponse',
      responseExample: {
        clubs: [visibleClubExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs',
    {
      tag: 'Clubs',
      summary: 'Create Club',
      operationId: 'createClub',
      effect: 'create',
      requestSchema: 'ClubCreateRequest',
      requestExample: {
        name: 'Riverside FC',
        city: 'Manchester',
        country: 'UK',
        tagline: 'Football for the whole community',
        visibility: 'private',
        joinPolicy: 'INVITE_ONLY',
        commercialMode: 'COACH_OWNED',
        firstStaffRole: 'COACH',
      },
      createdResponseSchema: 'ClubCreateResponse',
      createdResponseExample: {
        club: clubSummaryExample,
        membership: clubMembershipExample,
        primaryInvite: clubInviteCodeExample,
        firstStaffInvite: {
          ...clubInviteCodeExample,
          id: 'cinv_staff_123',
          code: 'RIVER-COACH-1234',
          role: 'COACH',
          remainingUses: 25,
        },
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/clubs/{clubId}',
    {
      tag: 'Clubs',
      summary: 'Get Club',
      operationId: 'getClub',
      effect: 'get',
      responseSchema: 'ClubResponse',
      responseExample: {
        club: visibleClubExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}',
    {
      tag: 'Clubs',
      summary: 'Update Club',
      operationId: 'updateClub',
      effect: 'update',
      requestSchema: 'ClubUpdateRequest',
      requestExample: {
        tagline: 'Football for the whole community',
        visibility: 'public',
        joinPolicy: 'REQUEST_TO_JOIN',
      },
      responseSchema: 'ClubUpdateResponse',
      responseExample: {
        club: {
          ...visibleClubExample,
          visibility: 'public',
          joinPolicy: 'REQUEST_TO_JOIN',
        },
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/squads',
    {
      tag: 'Squads',
      summary: 'List Club Squads',
      operationId: 'listClubSquads',
      effect: 'list',
      responseSchema: 'ClubSquadListResponse',
      responseExample: {
        clubId: clubSquadExample.clubId,
        squads: [clubSquadExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/squads',
    {
      tag: 'Squads',
      summary: 'Create Club Squad',
      operationId: 'createClubSquad',
      effect: 'create',
      requestSchema: 'ClubSquadCreateRequest',
      requestExample: {
        name: clubSquadExample.name,
        ageGroup: clubSquadExample.level,
      },
      createdResponseSchema: 'ClubSquadResponse',
      createdResponseExample: {
        squad: clubSquadExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/squads/{squadId}',
    {
      tag: 'Squads',
      summary: 'Get Club Squad',
      operationId: 'getClubSquad',
      effect: 'get',
      responseSchema: 'ClubSquadResponse',
      responseExample: {
        squad: clubSquadExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}/squads/{squadId}',
    {
      tag: 'Squads',
      summary: 'Update Club Squad',
      operationId: 'updateClubSquad',
      effect: 'update',
      requestSchema: 'ClubSquadUpdateRequest',
      requestExample: {
        name: 'U14 Performance',
        skillLevel: 'Performance',
      },
      responseSchema: 'ClubSquadResponse',
      responseExample: {
        squad: {
          ...clubSquadExample,
          name: 'U14 Performance',
          level: 'Performance',
        },
        requestId: 'req_123',
      },
    },
  ],
  [
    'DELETE /v1/clubs/{clubId}/squads/{squadId}',
    {
      tag: 'Squads',
      summary: 'Archive Club Squad',
      operationId: 'archiveClubSquad',
      effect: 'archive',
      omitRequestBody: true,
      noContentResponse: 'Squad archived.',
      omitOkResponse: true,
      omitCreatedResponse: true,
    },
  ],
  [
    'PUT /v1/clubs/{clubId}/squads/{squadId}/members/{userId}',
    {
      tag: 'Squads',
      summary: 'Add Club Member To Squad',
      operationId: 'setSquadMember',
      effect: 'add member',
      omitRequestBody: true,
      responseSchema: 'ClubMemberResponse',
      responseExample: {
        member: clubMemberExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'DELETE /v1/clubs/{clubId}/squads/{squadId}/members/{userId}',
    {
      tag: 'Squads',
      summary: 'Remove Club Member From Squad',
      operationId: 'removeSquadMember',
      effect: 'remove member',
      omitRequestBody: true,
      responseSchema: 'ClubMemberResponse',
      responseExample: {
        member: {
          ...clubMemberExample,
          squadIds: [],
        },
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/events',
    {
      tag: 'Events',
      summary: 'List Club Events',
      operationId: 'listClubEvents',
      effect: 'list events',
      responseSchema: 'ClubEventListResponse',
      responseExample: {
        clubId: 'clb_123',
        events: [clubEventExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/events',
    {
      tag: 'Events',
      summary: 'Create Club Event Draft',
      operationId: 'createClubEvent',
      effect: 'create event draft',
      requestSchema: 'CreateClubEventRequest',
      requestExample: {
        title: 'End of season presentation',
        description: 'Awards, player recognition, and family updates.',
        eventType: 'PRESENTATION',
        date: '2026-08-22',
        startTime: '17:30',
        endTime: '19:00',
        venue: 'Main Club Ground',
        targetAudience: 'ALL',
        maxAttendees: 120,
        price: 0,
        currency: 'GBP',
        rsvpRequired: true,
        rsvpDeadline: '2026-08-20',
      },
      createdResponseSchema: 'ClubEventResponse',
      createdResponseExample: {
        event: {
          ...clubEventExample,
          currentParticipants: 0,
          rsvpSummary: {
            going: 0,
            maybe: 0,
            notGoing: 0,
            totalGuests: 0,
          },
          status: 'DRAFT',
        },
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/clubs/{clubId}/matches',
    {
      tag: 'Matches',
      summary: 'List Club Matches',
      operationId: 'listClubMatches',
      effect: 'list matches',
      parameters: [clubMatchStatusQueryParameter, clubMatchLimitQueryParameter],
      responseSchema: 'ClubMatchListResponse',
      responseExample: {
        clubId: 'clb_123',
        matches: [clubMatchExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/matches',
    {
      tag: 'Matches',
      summary: 'Create Club Match',
      operationId: 'createClubMatch',
      effect: 'create match',
      requestSchema: 'CreateClubMatchRequest',
      requestExample: {
        squadId: 'sqd_123',
        title: 'Clubroom FC v Riverside Athletic',
        matchType: 'LEAGUE',
        opponent: 'Riverside Athletic',
        isHome: true,
        date: '2026-08-22',
        kickoffTime: '14:00',
        meetTime: '13:15',
        venue: 'Main Club Ground',
        address: '1 Stadium Way, London',
        maxPlayers: 16,
        notes: 'Blue home kit.',
      },
      createdResponseSchema: 'ClubMatchResponse',
      createdResponseExample: {
        match: {
          ...clubMatchExample,
          selectedPlayers: [],
          status: 'SCHEDULED',
        },
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'POST /v1/clubs/{clubId}/matches/import',
    {
      tag: 'Matches',
      summary: 'Import Club Matches',
      operationId: 'importClubMatches',
      effect: 'import matches',
      requestSchema: 'ImportClubMatchesRequest',
      requestExample: {
        source: 'league_csv',
        matches: [
          {
            externalId: 'fixture-2026-08-22-001',
            squadId: 'sqd_123',
            matchType: 'LEAGUE',
            opponent: 'Riverside Athletic',
            isHome: true,
            date: '2026-08-22',
            kickoffTime: '14:00',
            meetTime: '13:15',
            venue: 'Main Club Ground',
            maxPlayers: 16,
          },
        ],
      },
      responseSchema: 'ImportClubMatchesResponse',
      responseExample: {
        clubId: 'clb_123',
        imported: [],
        skipped: [
          {
            source: 'league_csv',
            externalId: 'fixture-2026-08-22-001',
            matchId: 'mat_123',
            reason: 'already_imported',
          },
        ],
        total: 1,
        requestId: 'req_123',
      },
      createdResponseSchema: 'ImportClubMatchesResponse',
      createdResponseExample: {
        clubId: 'clb_123',
        imported: [clubMatchExample],
        skipped: [],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/schedule',
    {
      tag: 'Clubs',
      summary: 'List Club Schedule Activities',
      operationId: 'listClubScheduleActivities',
      effect: 'list schedule activities',
      responseSchema: 'ClubScheduleResponse',
      responseExample: {
        clubId: 'clb_123',
        activities: [clubScheduleActivityExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/staffing-console',
    {
      tag: 'Clubs',
      summary: 'List Club Staffing Console',
      operationId: 'listClubStaffingConsole',
      effect: 'list staffing console',
      responseSchema: 'StaffingConsoleResponse',
      responseExample: staffingConsoleExample,
    },
  ],
  [
    'GET /v1/clubs/{clubId}/owner-dashboard',
    {
      tag: 'Clubs',
      summary: 'Get Club Owner Dashboard',
      operationId: 'getClubOwnerDashboard',
      effect: 'get owner dashboard',
      responseSchema: 'OwnerDashboardResponse',
      responseExample: ownerDashboardExample,
    },
  ],
  [
    'GET /v1/clubs/{clubId}/head-coach/oversight',
    {
      tag: 'Clubs',
      summary: 'Get Head Coach Oversight',
      operationId: 'listHeadCoachOversight',
      effect: 'get head coach oversight',
      responseSchema: 'HeadCoachOversightResponse',
      responseExample: headCoachOversightExample,
    },
  ],
  [
    'POST /v1/clubs/{clubId}/head-coach/tasks',
    {
      tag: 'Clubs',
      summary: 'Create Head Coach Task',
      operationId: 'createHeadCoachTask',
      effect: 'create head coach task',
      requestSchema: 'CreateHeadCoachTaskRequest',
      requestExample: {
        coachId: 'usr_coach_123',
        type: 'required_follow_up',
        dueAt: '2026-08-03T18:00:00.000Z',
        athleteId: 'ath_123',
        athleteName: 'Sam Taylor',
        bookingId: 'bkg_123',
        title: 'Follow up with Sam Taylor',
        details: 'Confirm the return-to-training plan with the family.',
      },
      createdResponseSchema: 'HeadCoachTaskResponse',
      createdResponseExample: {
        ...headCoachTaskExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}/head-coach/tasks/{taskId}',
    {
      tag: 'Clubs',
      summary: 'Update Head Coach Task',
      operationId: 'updateHeadCoachTask',
      effect: 'update head coach task',
      requestSchema: 'UpdateHeadCoachTaskRequest',
      requestExample: { status: 'done' },
      responseSchema: 'HeadCoachTaskResponse',
      responseExample: {
        ...headCoachTaskExample,
        status: 'done',
        completedAt: '2026-08-01T20:00:00.000Z',
        completedByUserId: 'usr_head_coach_123',
        updatedAt: '2026-08-01T20:00:00.000Z',
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/head-coach/standards',
    {
      tag: 'Clubs',
      summary: 'Create Head Coach Standard',
      operationId: 'createHeadCoachStandard',
      effect: 'create head coach standard',
      requestSchema: 'CreateHeadCoachStandardRequest',
      requestExample: {
        title: 'Session notes within 24 hours',
        description: 'Assigned coaches record completion notes by the following evening.',
        category: 'session_notes',
      },
      createdResponseSchema: 'HeadCoachStandardResponse',
      createdResponseExample: {
        ...headCoachStandardExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}/head-coach/standards/{standardId}',
    {
      tag: 'Clubs',
      summary: 'Update Head Coach Standard',
      operationId: 'updateHeadCoachStandard',
      effect: 'update head coach standard',
      requestSchema: 'UpdateHeadCoachStandardRequest',
      requestExample: { active: false },
      responseSchema: 'HeadCoachStandardResponse',
      responseExample: {
        ...headCoachStandardExample,
        active: false,
        updatedAt: '2026-08-01T20:00:00.000Z',
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/schedule/{activityId}',
    {
      tag: 'Clubs',
      summary: 'Get Club Schedule Activity',
      operationId: 'getClubScheduleActivity',
      effect: 'get schedule activity',
      responseSchema: 'ClubActivityDetailResponse',
      responseExample: {
        clubId: 'clb_123',
        activity: clubScheduleActivityExample,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/invite-codes',
    {
      tag: 'Clubs',
      summary: 'List Club Invite Codes',
      operationId: 'listClubInviteCodes',
      effect: 'list invite codes',
      responseSchema: 'ClubInviteCodesResponse',
      responseExample: {
        inviteCodes: [clubInviteCodeExample],
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/invite-codes',
    {
      tag: 'Clubs',
      summary: 'Create Club Invite Code',
      operationId: 'createClubInviteCode',
      effect: 'create invite code',
      requestSchema: 'CreateClubInviteCodeRequest',
      requestExample: { role: 'MEMBER' },
      createdResponseSchema: 'ClubInviteCodeResponse',
      createdResponseExample: {
        inviteCode: clubInviteCodeExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'DELETE /v1/clubs/{clubId}/invite-codes/{code}',
    {
      tag: 'Clubs',
      summary: 'Revoke Club Invite Code',
      operationId: 'revokeClubInviteCode',
      effect: 'revoke invite code',
      omitRequestBody: true,
      noContentResponse: 'Invite code revoked.',
      omitOkResponse: true,
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/clubs/{clubId}/invites',
    {
      tag: 'Clubs',
      summary: 'Create Club Invites',
      operationId: 'createClubInvites',
      effect: 'create club invites',
      requestSchema: 'CreateClubInvitesRequest',
      requestExample: {
        targetUserIds: ['usr_coach_456'],
        role: 'COACH',
      },
      createdResponseSchema: 'CreateClubInvitesResponse',
      createdResponseExample: {
        invites: [pendingClubInviteExample],
        total: 1,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/clubs/invites',
    {
      tag: 'Clubs',
      summary: 'List My Club Invites',
      operationId: 'listMyClubInvites',
      effect: 'list club invites',
      responseSchema: 'ClubInvitesResponse',
      responseExample: {
        invites: [pendingClubInviteExample],
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/invites/{inviteId}/respond',
    {
      tag: 'Clubs',
      summary: 'Respond To Club Invite',
      operationId: 'respondToClubInvite',
      effect: 'respond to club invite',
      requestSchema: 'RespondToClubInviteRequest',
      requestExample: { response: 'accepted' },
      responseSchema: 'RespondToClubInviteResponse',
      responseExample: {
        invite: {
          ...pendingClubInviteExample,
          status: 'accepted',
          respondedAt: '2026-08-02T12:30:00.000Z',
        },
        membership: {
          ...clubMembershipExample,
          userId: pendingClubInviteExample.targetUserId,
          role: pendingClubInviteExample.role,
        },
        club: clubSummaryExample,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/clubs/join/resolve',
    {
      tag: 'Clubs',
      summary: 'Resolve Club Join Code',
      operationId: 'resolveClubJoinCode',
      effect: 'resolve join code',
      parameters: [clubJoinCodeQueryParameter],
      responseSchema: 'ResolveClubJoinCodeResponse',
      responseExample: {
        preview: clubJoinPreviewExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/join',
    {
      tag: 'Clubs',
      summary: 'Join Club With Code',
      operationId: 'joinClubWithCode',
      effect: 'join',
      requestSchema: 'JoinClubRequest',
      requestExample: {
        code: clubInviteCodeExample.code,
      },
      responseSchema: 'JoinClubAlreadyMemberResponse',
      responseExample: {
        outcome: 'already_member',
        club: clubSummaryExample,
        membership: {
          ...clubMembershipExample,
          userId: 'usr_member_123',
          role: 'MEMBER',
        },
        invite: null,
        requestId: 'req_123',
      },
      createdResponseSchema: 'JoinClubJoinedResponse',
      createdResponseExample: {
        outcome: 'joined',
        club: clubSummaryExample,
        membership: {
          ...clubMembershipExample,
          userId: 'usr_member_123',
          role: 'MEMBER',
        },
        invite: null,
        requestId: 'req_123',
      },
      acceptedResponseSchema: 'JoinClubInvitePendingResponse',
      acceptedResponseExample: {
        outcome: 'invite_pending',
        club: {
          ...clubSummaryExample,
          inviteCode: pendingClubInviteExample.inviteCode,
        },
        membership: null,
        invite: pendingClubInviteExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/branding',
    {
      tag: 'Clubs',
      summary: 'Get Club Branding',
      operationId: 'getClubBranding',
      effect: 'get',
      responseSchema: 'ClubBrandingResponse',
      responseExample: {
        branding: clubBrandingExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'PUT /v1/clubs/{clubId}/branding',
    {
      tag: 'Clubs',
      summary: 'Update Club Branding',
      operationId: 'updateClubBranding',
      effect: 'update',
      requestSchema: 'ClubBrandingUpdateRequest',
      requestExample: {
        tagline: 'Football for the whole community',
        primaryColor: '#0F172A',
        secondaryColor: '#1C8C5E',
      },
      responseSchema: 'ClubBrandingResponse',
      responseExample: {
        branding: clubBrandingExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/integrations',
    {
      tag: 'Clubs',
      summary: 'List Club Integrations',
      operationId: 'listClubIntegrations',
      effect: 'list integrations',
      responseSchema: 'ClubIntegrationListResponse',
      responseExample: {
        clubId: 'clb_123',
        integrations: [clubIntegrationExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/integrations',
    {
      tag: 'Clubs',
      summary: 'Create Club Integration',
      operationId: 'createClubIntegration',
      effect: 'create integration',
      requestSchema: 'ClubIntegrationCreateRequest',
      requestExample: {
        provider: 'matchday',
        status: 'DISCONNECTED',
        displayName: 'Matchday import',
        externalAccountId: 'club-123',
        metadataJson: {
          importMode: 'manual',
        },
      },
      createdResponseSchema: 'ClubIntegrationMutationResponse',
      createdResponseExample: {
        integration: clubIntegrationExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}/integrations',
    {
      tag: 'Clubs',
      summary: 'Update Club Integration',
      operationId: 'updateClubIntegration',
      effect: 'update integration',
      requestSchema: 'ClubIntegrationUpdateRequest',
      requestExample: {
        provider: 'MATCHDAY',
        status: 'NEEDS_REAUTH',
        displayName: 'Matchday sync',
      },
      responseSchema: 'ClubIntegrationMutationResponse',
      responseExample: {
        integration: {
          ...clubIntegrationExample,
          status: 'NEEDS_REAUTH',
          displayName: 'Matchday sync',
          updatedAt: '2026-08-01T11:10:00.000Z',
        },
        requestId: 'req_123',
      },
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}/work-assignments/{assignmentId}',
    {
      tag: 'Clubs',
      summary: 'Update Club Work Assignment',
      operationId: 'updateClubWorkAssignment',
      effect: 'update work assignment',
      requestSchema: 'WorkAssignmentUpdateRequest',
      requestExample: {
        assigneeCoachId: 'usr_coach_123',
      },
      responseSchema: 'WorkAssignmentUpdateResponse',
      responseExample: {
        clubId: 'clb_123',
        assignmentId: 'gse_123',
        previousCoachUserId: 'usr_coach_456',
        assigneeCoachId: 'usr_coach_123',
        updatedBookingIds: ['book_123'],
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/work-assignments/{assignmentId}/history',
    {
      tag: 'Clubs',
      summary: 'Get Work Assignment History',
      operationId: 'getWorkAssignmentHistory',
      effect: 'get history',
      responseSchema: 'WorkAssignmentHistoryResponse',
      responseExample: {
        clubId: 'clb_123',
        assignmentId: 'gse_123',
        events: [workAssignmentHistoryEventExample],
        total: 1,
        truncated: false,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/members',
    {
      tag: 'Clubs',
      summary: 'List Club Members',
      operationId: 'listClubMembers',
      effect: 'list',
      responseSchema: 'ClubMemberListResponse',
      responseExample: {
        clubId: 'clb_123',
        members: [clubMemberExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/clubs/{clubId}/members/removals',
    {
      tag: 'Clubs',
      summary: 'List Club Member Removal History',
      operationId: 'listClubMemberRemovals',
      effect: 'list',
      responseSchema: 'ClubMemberRemovalListResponse',
      responseExample: {
        clubId: 'clb_123',
        removals: [clubMemberRemovalExample],
        total: 1,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/members/me/leave',
    {
      tag: 'Clubs',
      summary: 'Leave Club',
      operationId: 'leaveClub',
      effect: 'leave',
      requestSchema: 'ClubMemberSelfLeaveRequest',
      requestRequired: false,
      requestExample: {
        reason: 'LEFT_CLUB',
        customReason: 'Moving to another area.',
      },
      responseSchema: 'ClubMemberRemovalResponse',
      responseExample: {
        removal: clubMemberRemovalExample,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'PATCH /v1/clubs/{clubId}/members/{userId}/role',
    {
      tag: 'Clubs',
      summary: 'Update Club Member Role',
      operationId: 'updateClubMemberRole',
      effect: 'update role',
      requestSchema: 'ClubMemberRoleUpdateRequest',
      requestExample: { role: 'HEAD_COACH' },
      responseSchema: 'ClubMemberResponse',
      responseExample: {
        member: { ...clubMemberExample, role: 'HEAD_COACH' },
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'DELETE /v1/clubs/{clubId}/members/{userId}',
    {
      tag: 'Clubs',
      summary: 'Remove Club Member',
      operationId: 'removeClubMember',
      effect: 'remove',
      requestSchema: 'ClubMemberRemovalRequest',
      requestRequired: false,
      requestExample: {
        reason: 'SEASON_END',
        customReason: 'End-of-season roster review.',
      },
      responseSchema: 'ClubMemberRemovalResponse',
      responseExample: {
        removal: clubMemberRemovalExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/clubs/{clubId}/members/{userId}/ban',
    {
      tag: 'Clubs',
      summary: 'Ban Club Member',
      operationId: 'banClubMember',
      effect: 'ban',
      requestSchema: 'ClubMemberBanRequest',
      requestExample: { reason: 'Repeated safeguarding policy breaches.' },
      responseSchema: 'ClubMemberRemovalResponse',
      responseExample: {
        removal: {
          ...clubMemberRemovalExample,
          reason: 'CONDUCT',
          customReason: 'Repeated safeguarding policy breaches.',
        },
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/clubs/{clubId}/members/removals/{removalId}/restore',
    {
      tag: 'Clubs',
      summary: 'Restore Removed Club Member',
      operationId: 'restoreRemovedClubMember',
      effect: 'restore',
      omitRequestBody: true,
      responseSchema: 'ClubMemberResponse',
      responseExample: {
        member: clubMemberExample,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/bookings',
    {
      tag: 'Bookings',
      summary: 'List Visible Bookings',
      operationId: 'listBookings',
      effect: 'list',
      parameters: [bookingStatusQueryParameter],
      responseSchema: 'BookingListResponse',
      responseExample: {
        bookings: [bookingExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/bookings',
    {
      tag: 'Bookings',
      summary: 'Create Booking Request',
      operationId: 'createBooking',
      effect: 'create',
      requestSchema: 'CreateBookingRequest',
      requestExample: {
        coachUserId: 'usr_coach-123',
        clubId: 'clb_123',
        athleteIds: ['ath_123'],
        bookedByUserId: 'usr_parent-123',
        scheduledAt: '2026-08-15T10:00:00.000Z',
        durationMinutes: 60,
        location: 'Riverside Training Ground',
        serviceType: 'one_to_one',
        objectives: ['First touch', 'Scanning before receiving'],
        notes: 'Please meet at pitch two.',
        priceMinor: 3500,
        currency: 'GBP',
        idempotencyKey: 'create-booking-request-123',
      },
      createdResponseSchema: 'BookingResponse',
      createdResponseExample: bookingExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/bookings/{bookingId}',
    {
      tag: 'Bookings',
      summary: 'Get Booking',
      operationId: 'getBooking',
      effect: 'get',
      responseSchema: 'BookingResponse',
      responseExample: bookingExample,
    },
  ],
  [
    'PATCH /v1/bookings/{bookingId}',
    {
      tag: 'Bookings',
      summary: 'Update Booking Details',
      operationId: 'updateBooking',
      effect: 'update',
      requestSchema: 'UpdateBookingRequest',
      requestExample: {
        location: 'Riverside Indoor Centre',
        expectedVersion: 1,
        idempotencyKey: 'update-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: {
        ...bookingExample,
        location: 'Riverside Indoor Centre',
        version: 2,
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/bookings/{bookingId}/cancel',
    {
      tag: 'Bookings',
      summary: 'Cancel Confirmed Booking',
      operationId: 'cancelBooking',
      effect: 'cancel',
      requestSchema: 'CancelBookingRequest',
      requestExample: {
        reason: 'Athlete is unavailable.',
        expectedVersion: 2,
        idempotencyKey: 'cancel-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: {
        ...confirmedBookingExample,
        status: 'CANCELLED',
        version: 3,
        cancelledAt: '2026-08-10T12:00:00.000Z',
        updatedAt: '2026-08-10T12:00:00.000Z',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/bookings/{bookingId}/reopen',
    {
      tag: 'Bookings',
      summary: 'Reopen Booking',
      operationId: 'reopenBooking',
      effect: 'reopen',
      requestSchema: 'ReopenBookingRequest',
      requestRequired: false,
      requestExample: {
        note: 'Reopened after resolving the scheduling issue.',
        expectedVersion: 3,
        idempotencyKey: 'reopen-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: confirmedBookingExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/bookings/{bookingId}/confirm',
    {
      tag: 'Bookings',
      summary: 'Confirm Booking Request',
      operationId: 'confirmBooking',
      effect: 'confirm',
      requestSchema: 'ConfirmBookingRequest',
      requestRequired: false,
      requestExample: {
        note: 'Confirmed by the assigned coach.',
        expectedVersion: 1,
        idempotencyKey: 'confirm-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: confirmedBookingExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/bookings/{bookingId}/decline',
    {
      tag: 'Bookings',
      summary: 'Decline Booking Request',
      operationId: 'declineBookingRequest',
      effect: 'decline',
      requestSchema: 'ResolveBookingRequest',
      requestExample: {
        reason: 'The requested time is no longer available.',
        expectedVersion: 1,
        idempotencyKey: 'decline-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: {
        ...bookingExample,
        status: 'DECLINED',
        version: 2,
        requestResolvedAt: '2026-08-01T09:15:00.000Z',
        requestResolutionReason: 'The requested time is no longer available.',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/bookings/{bookingId}/withdraw',
    {
      tag: 'Bookings',
      summary: 'Withdraw Booking Request',
      operationId: 'withdrawBookingRequest',
      effect: 'withdraw',
      requestSchema: 'ResolveBookingRequest',
      requestExample: {
        reason: 'Our plans changed before confirmation.',
        expectedVersion: 1,
        idempotencyKey: 'withdraw-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: {
        ...bookingExample,
        status: 'WITHDRAWN',
        version: 2,
        requestResolvedAt: '2026-08-01T09:15:00.000Z',
        requestResolutionReason: 'Our plans changed before confirmation.',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/bookings/{bookingId}/complete',
    {
      tag: 'Bookings',
      summary: 'Complete Booking',
      operationId: 'completeBooking',
      effect: 'complete',
      requestSchema: 'CompleteBookingRequest',
      requestRequired: false,
      requestExample: {
        note: 'Strong first-touch progress throughout the session.',
        completedAt: '2026-08-15T11:00:00.000Z',
        attendance: [
          {
            athleteId: 'ath_123',
            status: 'ATTENDED',
            effortRating: 5,
          },
        ],
        expectedVersion: 2,
        idempotencyKey: 'complete-booking-request-123',
      },
      responseSchema: 'BookingResponse',
      responseExample: {
        ...confirmedBookingExample,
        status: 'COMPLETED',
        version: 3,
        updatedAt: '2026-08-15T11:00:00.000Z',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/booking-series',
    {
      tag: 'Bookings',
      summary: 'List Visible Booking Series',
      operationId: 'listBookingSeries',
      effect: 'list',
      responseSchema: 'BookingSeriesListResponse',
      responseExample: {
        series: [bookingSeriesExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/booking-series',
    {
      tag: 'Bookings',
      summary: 'Create Booking Series',
      operationId: 'createBookingSeries',
      effect: 'create',
      requestSchema: 'CreateBookingSeriesRequest',
      requestExample: {
        coachUserId: 'usr_coach-123',
        athleteIds: ['ath_123'],
        bookedByUserId: 'usr_parent-123',
        occurrences: [
          {
            scheduledAt: '2026-08-15T10:00:00.000Z',
            durationMinutes: 60,
          },
          {
            scheduledAt: '2026-08-22T10:00:00.000Z',
            durationMinutes: 60,
          },
        ],
        location: 'Riverside Training Ground',
        serviceType: 'one_to_one',
        objectives: ['First touch', 'Scanning before receiving'],
        notes: 'Two-week development block.',
        priceMinor: 3500,
        currency: 'GBP',
        frequency: 'WEEKLY',
        patternLabel: 'Saturday development block',
        idempotencyKey: 'create-booking-series-123',
      },
      createdResponseSchema: 'BookingSeriesMutationResponse',
      createdResponseExample: bookingSeriesMutationExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/booking-series/{seriesId}',
    {
      tag: 'Bookings',
      summary: 'Get Booking Series',
      operationId: 'getBookingSeries',
      effect: 'get',
      responseSchema: 'BookingSeriesResponse',
      responseExample: bookingSeriesExample,
    },
  ],
  [
    'PATCH /v1/booking-series/{seriesId}',
    {
      tag: 'Bookings',
      summary: 'Update Future Booking Series Sessions',
      operationId: 'updateBookingSeries',
      effect: 'update',
      requestSchema: 'UpdateBookingSeriesRequest',
      requestExample: {
        time: '11:30',
        location: 'Riverside Indoor Centre',
        expectedVersion: 1,
        idempotencyKey: 'update-booking-series-123',
      },
      responseSchema: 'BookingSeriesMutationResponse',
      responseExample: {
        ...bookingSeriesMutationExample,
        series: {
          ...bookingSeriesExample,
          location: 'Riverside Indoor Centre',
          version: 2,
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/booking-series/{seriesId}/cancel',
    {
      tag: 'Bookings',
      summary: 'Cancel Future Booking Series Sessions',
      operationId: 'cancelBookingSeries',
      effect: 'cancel',
      requestSchema: 'CancelBookingSeriesRequest',
      requestExample: {
        reason: 'The remaining sessions are no longer required.',
        note: 'Cancel future sessions only.',
        expectedVersion: 1,
        idempotencyKey: 'cancel-booking-series-123',
      },
      responseSchema: 'BookingSeriesMutationResponse',
      responseExample: {
        ...bookingSeriesMutationExample,
        series: {
          ...bookingSeriesExample,
          status: 'CANCELLED',
          version: 2,
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/booking-series/{seriesId}/pause',
    {
      tag: 'Bookings',
      summary: 'Pause Booking Series',
      operationId: 'pauseBookingSeries',
      effect: 'pause',
      requestSchema: 'PauseBookingSeriesRequest',
      requestExample: {
        reason: 'Temporary family availability change.',
        expectedVersion: 1,
        idempotencyKey: 'pause-booking-series-123',
      },
      responseSchema: 'BookingSeriesMutationResponse',
      responseExample: {
        ...bookingSeriesMutationExample,
        series: {
          ...bookingSeriesExample,
          status: 'PAUSED',
          version: 2,
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/booking-series/{seriesId}/resume',
    {
      tag: 'Bookings',
      summary: 'Resume Booking Series',
      operationId: 'resumeBookingSeries',
      effect: 'resume',
      requestSchema: 'ResumeBookingSeriesRequest',
      requestExample: {
        note: 'Resume the remaining future sessions.',
        expectedVersion: 2,
        idempotencyKey: 'resume-booking-series-123',
      },
      responseSchema: 'BookingSeriesMutationResponse',
      responseExample: {
        ...bookingSeriesMutationExample,
        series: {
          ...bookingSeriesExample,
          version: 3,
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/cancellation-records',
    {
      tag: 'Bookings',
      summary: 'List Visible Cancellation Records',
      operationId: 'listCancellationRecords',
      effect: 'list',
      parameters: [cancellationRecordsCoachIdQueryParameter],
      responseSchema: 'CancellationRecordListResponse',
      responseExample: {
        records: [cancellationRecordExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/cancellation-records/{bookingId}',
    {
      tag: 'Bookings',
      summary: 'Get Cancellation Record For Booking',
      operationId: 'getCancellationRecord',
      effect: 'get',
      responseSchema: 'CancellationRecordLookupResponse',
      responseExample: {
        record: cancellationRecordExample,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/group-sessions/{sessionId}/roster',
    {
      tag: 'Group Sessions',
      summary: 'Get Group Session Roster',
      operationId: 'getGroupSessionRoster',
      effect: 'get',
      parameters: [completionRosterQueryParameter],
      responseSchema: 'GroupSessionRosterResponse',
    },
  ],
  [
    'PATCH /v1/group-session-registrations/{registrationId}/attendance',
    {
      tag: 'Group Sessions',
      summary: 'Update Group Session Registration Attendance',
      operationId: 'updateGroupSessionRegistrationAttendance',
      effect: 'update',
      requestSchema: 'MarkGroupSessionAttendanceRequest',
      requestExample: {
        date: '2026-07-29',
        status: 'NO_SHOW',
      },
      responseSchema: 'GroupSessionRegistrationMutationResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/group-sessions/{sessionId}/complete',
    {
      tag: 'Group Sessions',
      summary: 'Complete Group Session Occurrence',
      operationId: 'completeGroupSessionOccurrence',
      effect: 'complete',
      requestSchema: 'CompleteGroupSessionRequest',
      requestExample: {
        occurrenceDate: '2026-07-29',
        attendance: [
          {
            registrationId: 'gsr_123',
            status: 'ATTENDED',
            notes: 'Strong session.',
            effortRating: 4,
          },
        ],
      },
      responseSchema: 'GroupSessionCompletionResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/coaches/me/earnings',
    {
      tag: 'Revenue',
      summary: 'Get Coach Earnings',
      operationId: 'getCoachEarnings',
      effect: 'get',
      parameters: [earningsPeriodQueryParameter, earningsLimitQueryParameter],
      responseSchema: 'CoachEarningsResponse',
    },
  ],
  [
    'GET /v1/coaches/me/payout-methods',
    {
      tag: 'Revenue',
      summary: 'List Simulated Payout Methods',
      operationId: 'listSimulatedPayoutMethods',
      effect: 'list',
      responseSchema: 'PayoutMethodsResponse',
    },
  ],
  [
    'POST /v1/coaches/me/payout-methods',
    {
      tag: 'Revenue',
      summary: 'Create Simulated Payout Method',
      operationId: 'createSimulatedPayoutMethod',
      effect: 'create',
      requestSchema: 'PayoutMethodCreateRequest',
      requestExample: {
        type: 'BANK_ACCOUNT',
        bankName: 'Example Bank',
        accountLastFour: '1234',
        isDefault: true,
        nickname: 'Main payouts',
      },
      responseSchema: 'PayoutMethodsResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'DELETE /v1/coaches/me/payout-methods/{methodId}',
    {
      tag: 'Revenue',
      summary: 'Remove Simulated Payout Method',
      operationId: 'removeSimulatedPayoutMethod',
      effect: 'remove',
      responseSchema: 'PayoutMethodsResponse',
    },
  ],
  [
    'PATCH /v1/coaches/me/payout-methods/{methodId}/default',
    {
      tag: 'Revenue',
      summary: 'Set Default Simulated Payout Method',
      operationId: 'setDefaultSimulatedPayoutMethod',
      effect: 'set default',
      omitRequestBody: true,
      responseSchema: 'PayoutMethodsResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/coaches/me/withdrawals',
    {
      tag: 'Revenue',
      summary: 'List Simulated Withdrawals',
      operationId: 'listSimulatedWithdrawals',
      effect: 'list',
      parameters: [withdrawalStatusQueryParameter],
      responseSchema: 'WithdrawalsResponse',
    },
  ],
  [
    'POST /v1/coaches/me/withdrawals',
    {
      tag: 'Revenue',
      summary: 'Request Simulated Withdrawal',
      operationId: 'requestSimulatedWithdrawal',
      effect: 'request',
      requestSchema: 'WithdrawalRequest',
      requestExample: {
        amount: 25,
        payoutMethodId: 'pm_123',
      },
      responseSchema: 'WithdrawalsResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/coaches/me/withdrawals/{withdrawalId}/cancel',
    {
      tag: 'Revenue',
      summary: 'Cancel Simulated Withdrawal',
      operationId: 'cancelSimulatedWithdrawal',
      effect: 'cancel',
      omitRequestBody: true,
      responseSchema: 'WithdrawalsResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/coaches/me/withdrawals/{withdrawalId}/complete',
    {
      tag: 'Revenue',
      summary: 'Complete Simulated Withdrawal',
      operationId: 'completeSimulatedWithdrawal',
      effect: 'simulate complete',
      omitRequestBody: true,
      responseSchema: 'WithdrawalsResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/invoices/{invoiceId}/payments',
    {
      tag: 'Revenue',
      summary: 'Create Simulated Payment Session',
      operationId: 'createSimulatedPaymentSession',
      effect: 'create',
      requestSchema: 'InvoicePaymentCreateRequest',
      requestExample: {
        method: 'card',
        idempotencyKey: 'payment-session-123',
        returnUrl: 'https://app.example.test/payments/return',
      },
      responseSchema: 'InvoicePaymentSessionResponse',
      createdResponseSchema: 'InvoicePaymentSessionResponse',
    },
  ],
  [
    'GET /v1/payment-attempts/{attemptId}/hosted',
    {
      tag: 'Revenue',
      summary: 'Open Simulated Hosted Payment Page',
      operationId: 'openSimulatedHostedPaymentPage',
      effect: 'open',
      parameters: [paymentAttemptTokenQueryParameter],
      htmlResponse:
        'Hosted simulated payment page. It can mark the invoice paid in Clubroom but wires no real money.',
    },
  ],
  [
    'POST /v1/payment-attempts/{attemptId}/simulated-complete',
    {
      tag: 'Revenue',
      summary: 'Complete Simulated Payment Attempt',
      operationId: 'completeSimulatedPaymentAttempt',
      effect: 'simulate complete',
      requestSchema: 'SimulatedPaymentCompleteRequest',
      requestExample: {
        token: '<signed-simulated-payment-token>',
      },
      responseSchema: 'SimulatedPaymentCompleteResponse',
      responseDescription:
        'Simulated provider completion response. Marks the invoice paid in Clubroom but wires no real money.',
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'GET /v1/auth/check-email',
    {
      tag: 'Auth',
      summary: 'Check Email Availability',
      operationId: 'checkEmailAvailability',
      effect: 'check',
      parameters: [emailAvailabilityQueryParameter],
      responseSchema: 'EmailAvailabilityResponse',
      responseExample: {
        available: true,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/auth/forgot-password',
    {
      tag: 'Auth',
      summary: 'Request Password Reset',
      operationId: 'requestPasswordReset',
      effect: 'request',
      requestSchema: 'ForgotPasswordRequest',
      requestExample: {
        email: 'coach@example.test',
      },
      responseSchema: 'PasswordResetDebugResponse',
      responseDescription:
        'Debug/test response only when API_PASSWORD_RESET_TOKEN_RESPONSE=1 is enabled outside production.',
      noContentResponse:
        'Password reset request accepted without account enumeration. This is the normal production response.',
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'POST /v1/auth/login',
    {
      tag: 'Auth',
      summary: 'Login',
      operationId: 'login',
      effect: 'login',
      requestSchema: 'AuthLoginRequest',
      requestExample: {
        email: 'coach@example.test',
        password: 'correct-password',
      },
      responseSchema: 'AuthLoginResponse',
      responseExample: {
        user: {
          id: 'usr_123',
          email: 'coach@example.test',
          accountType: 'COACH',
          firstName: 'Amelia',
          lastName: 'Shaw',
          isVerified: true,
          onboardingComplete: true,
          createdAt: '2026-07-28T18:20:00.000Z',
          updatedAt: '2026-07-28T18:20:00.000Z',
          roles: ['coach'],
          appRole: 'COACH',
        },
        tokens: {
          accessToken: '<jwt-access-token>',
          refreshToken: '<jwt-refresh-token>',
          expiresAt: 1785263700000,
        },
        requestId: 'req_123',
      },
      responseRefs: {
        401: 'Unauthorized',
      },
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'POST /v1/auth/logout',
    {
      tag: 'Auth',
      summary: 'Logout',
      operationId: 'logout',
      effect: 'logout',
      omitRequestBody: true,
      noContentResponse: 'Current session revoked when present.',
      omitOkResponse: true,
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'GET /v1/auth/me',
    {
      tag: 'Auth',
      summary: 'Get Auth Profile',
      operationId: 'getAuthProfile',
      effect: 'get',
      responseSchema: 'AuthProfileResponse',
    },
  ],
  [
    'PATCH /v1/auth/me',
    {
      tag: 'Auth',
      summary: 'Update Auth Profile',
      operationId: 'updateAuthProfile',
      effect: 'update',
      requestSchema: 'AuthProfilePatchRequest',
      requestExample: {
        city: 'London',
        postcode: 'SW1A 1AA',
        onboardingComplete: true,
      },
      responseSchema: 'AuthProfileResponse',
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/admin/users/summary',
    {
      tag: 'Account',
      summary: 'Get Active User Summary',
      operationId: 'getActiveUserSummary',
      effect: 'read',
      responseSchema: 'AdminUserSummaryResponse',
      responseExample: adminUserSummaryExample,
    },
  ],
  [
    'GET /v1/users/search',
    {
      tag: 'Account',
      summary: 'Search Visible Users',
      operationId: 'searchVisibleUsers',
      effect: 'list',
      parameters: [userSearchTextQueryParameter, userSearchLimitQueryParameter],
      responseSchema: 'UserSearchResponse',
      responseExample: {
        users: [userDirectoryEntryExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/users/{userId}',
    {
      tag: 'Account',
      summary: 'Get Visible User Profile',
      operationId: 'getVisibleUserProfile',
      effect: 'read',
      responseSchema: 'UserProfileResponse',
      responseExample: {
        user: userDirectoryEntryExample,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/auth/refresh',
    {
      tag: 'Auth',
      summary: 'Refresh Session',
      operationId: 'refreshSession',
      effect: 'refresh',
      requestSchema: 'AuthRefreshRequest',
      requestExample: {
        refreshToken: '<jwt-refresh-token>',
      },
      responseSchema: 'AuthTokenResponse',
      responseExample: {
        tokens: {
          accessToken: '<jwt-access-token>',
          refreshToken: '<jwt-refresh-token>',
          expiresAt: 1785263700000,
        },
        requestId: 'req_123',
      },
      responseRefs: {
        401: 'Unauthorized',
      },
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'POST /v1/auth/register',
    {
      tag: 'Auth',
      summary: 'Register',
      operationId: 'register',
      effect: 'register',
      requestSchema: 'AuthRegisterRequest',
      requestExample: {
        email: 'parent@example.test',
        password: 'minimum-six-chars',
        accountType: 'PARENT',
        firstName: 'Olivia',
        lastName: 'Barton',
      },
      createdResponseSchema: 'AuthRegisterResponse',
      createdResponseExample: {
        user: {
          id: 'usr_456',
          email: 'parent@example.test',
          accountType: 'PARENT',
          firstName: 'Olivia',
          lastName: 'Barton',
          isVerified: false,
          onboardingComplete: false,
          createdAt: '2026-07-28T18:20:00.000Z',
          updatedAt: '2026-07-28T18:20:00.000Z',
          roles: ['parent'],
          appRole: 'USER',
        },
        tokens: {
          accessToken: '<jwt-access-token>',
          refreshToken: '<jwt-refresh-token>',
          expiresAt: 1785263700000,
        },
        requestId: 'req_123',
      },
      omitOkResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'POST /v1/auth/reset-password',
    {
      tag: 'Auth',
      summary: 'Reset Password',
      operationId: 'resetPassword',
      effect: 'reset',
      requestSchema: 'ResetPasswordRequest',
      requestExample: {
        token: '<password-reset-token>',
        newPassword: 'new-minimum-six-chars',
      },
      noContentResponse: 'Password reset completed; active sessions are revoked.',
      omitOkResponse: true,
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'POST /v1/auth/revoke',
    {
      tag: 'Auth',
      summary: 'Revoke Session',
      operationId: 'revokeSession',
      effect: 'revoke',
      requestSchema: 'AuthRevokeRequest',
      requestRequired: false,
      requestExample: {
        refreshToken: '<jwt-refresh-token>',
      },
      noContentResponse: 'Current session or provided refresh token revoked when present.',
      omitOkResponse: true,
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'POST /v1/auth/verify-email',
    {
      tag: 'Auth',
      summary: 'Verify Email',
      operationId: 'verifyEmail',
      effect: 'verify',
      requestSchema: 'VerifyEmailRequest',
      requestExample: {
        code: '<email-code>',
      },
      responseSchema: 'AuthProfileResponse',
      omitCreatedResponse: true,
      omitResponses: ['409'],
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/injuries',
    {
      tag: 'Athlete Health',
      summary: 'List Athlete Injuries',
      operationId: 'listAthleteInjuries',
      effect: 'list',
      responseSchema: 'InjuriesResponse',
      responseExample: { athleteId: 'ath_123', injuries: [injuryExample] },
    },
  ],
  [
    'POST /v1/athletes/{athleteId}/injuries',
    {
      tag: 'Athlete Health',
      summary: 'Create Athlete Injury',
      operationId: 'createAthleteInjury',
      effect: 'create',
      requestSchema: 'CreateInjuryRequest',
      requestExample: {
        title: 'Left ankle sprain',
        type: 'LEFT_ANKLE',
        severity: 'medium',
        reportedAt: '2026-08-01T10:30:00.000Z',
        expectedRecoveryDate: '2026-08-15T10:30:00.000Z',
        notes: 'Rolled ankle during training.',
      },
      createdResponseSchema: 'InjuryRecord',
      createdResponseExample: injuryExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/injuries/{injuryId}',
    {
      tag: 'Athlete Health',
      summary: 'Get Injury Record',
      operationId: 'getInjuryRecord',
      effect: 'read',
      responseSchema: 'InjuryRecord',
      responseExample: injuryExample,
    },
  ],
  [
    'PATCH /v1/injuries/{injuryId}',
    {
      tag: 'Athlete Health',
      summary: 'Update Injury Record',
      operationId: 'updateInjuryRecord',
      effect: 'update',
      requestSchema: 'UpdateInjuryRequest',
      requestExample: {
        status: 'recovering',
        notes: 'Continue progressive loading and reassess before contact training.',
      },
      responseSchema: 'InjuryRecord',
      responseExample: injuryExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/medical',
    {
      tag: 'Athlete Health',
      summary: 'Get Athlete Medical Record',
      operationId: 'getAthleteMedicalRecord',
      effect: 'read',
      responseSchema: 'MedicalRecordResponse',
      responseExample: medicalRecordExample,
    },
  ],
  [
    'PATCH /v1/athletes/{athleteId}/medical',
    {
      tag: 'Athlete Health',
      summary: 'Update Athlete Medical Record',
      operationId: 'updateAthleteMedicalRecord',
      effect: 'update',
      requestSchema: 'UpdateMedicalRecordRequest',
      requestExample: {
        conditions: ['Asthma'],
        restrictions: ['Keep inhaler pitch-side'],
        emergencyNotes: 'Use the blue inhaler when symptoms begin.',
      },
      responseSchema: 'MedicalRecordResponse',
      responseExample: medicalRecordExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/emergency-contacts',
    {
      tag: 'Athlete Health',
      summary: 'List Athlete Emergency Contacts',
      operationId: 'listAthleteEmergencyContacts',
      effect: 'list',
      responseSchema: 'EmergencyContactsResponse',
      responseExample: {
        athleteId: 'ath_123',
        contacts: [emergencyContactExample],
        updatedAt: '2026-08-01T10:30:00.000Z',
        updatedByUserId: 'usr_parent_123',
      },
    },
  ],
  [
    'PATCH /v1/athletes/{athleteId}/emergency-contacts',
    {
      tag: 'Athlete Health',
      summary: 'Replace Athlete Emergency Contacts',
      operationId: 'replaceAthleteEmergencyContacts',
      effect: 'replace',
      requestSchema: 'UpdateEmergencyContactsRequest',
      requestExample: { contacts: [emergencyContactExample] },
      responseSchema: 'EmergencyContactsResponse',
      responseExample: {
        athleteId: 'ath_123',
        contacts: [emergencyContactExample],
        updatedAt: '2026-08-01T10:30:00.000Z',
        updatedByUserId: 'usr_parent_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/consents',
    {
      tag: 'Athlete Health',
      summary: 'List Athlete Consents',
      operationId: 'listAthleteConsents',
      effect: 'list',
      responseSchema: 'ConsentsResponse',
      responseExample: {
        athleteId: 'ath_123',
        consents: consentRecordsExample,
        updatedAt: '2026-08-01T10:30:00.000Z',
        updatedByUserId: 'usr_parent_123',
      },
    },
  ],
  [
    'PUT /v1/athletes/{athleteId}/consents',
    {
      tag: 'Athlete Health',
      summary: 'Replace Athlete Consents',
      operationId: 'replaceAthleteConsents',
      effect: 'replace',
      requestSchema: 'UpsertConsentsRequest',
      requestExample: { consents: consentRecordsExample },
      responseSchema: 'ConsentsResponse',
      responseExample: {
        athleteId: 'ath_123',
        consents: consentRecordsExample,
        updatedAt: '2026-08-01T10:30:00.000Z',
        updatedByUserId: 'usr_parent_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/uploads/init',
    {
      tag: 'Media',
      summary: 'Initialize Private Upload',
      operationId: 'initializePrivateUpload',
      effect: 'initialize upload',
      requestSchema: 'UploadInitRequest',
      requestExample: {
        kind: 'VIDEO',
        contentType: 'video/mp4',
        fileName: 'technical-review.mp4',
        sizeBytes: 128000,
        metadata: {
          source: 'session-media',
          sessionId: 'ses_123',
        },
      },
      createdResponseSchema: 'UploadInitResponse',
      createdResponseExample: {
        uploadSessionId: 'ups_123',
        mediaObjectId: 'med_123',
        uploadMethod: 'PUT',
        uploadUrl:
          'https://storage.example.invalid/clubroom-private/uploads/usr_123/ups_123/technical-review.mp4?X-Amz-Signature=redacted',
        uploadHeaders: {
          'content-type': 'video/mp4',
        },
        expiresAt: '2026-08-01T12:15:00.000Z',
        storageKey: 'uploads/usr_123/ups_123/technical-review.mp4',
        bucketName: 'clubroom-private',
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/uploads/{uploadSessionId}',
    {
      tag: 'Media',
      summary: 'Get Upload Status',
      operationId: 'getUploadStatus',
      effect: 'read',
      responseSchema: 'UploadStatusResponse',
      responseDescription: 'Current read-only upload and malware-scan status.',
      responseExample: {
        uploadSessionId: 'ups_123',
        mediaObjectId: 'med_123',
        uploadStatus: 'SCANNING',
        mediaStatus: 'UPLOADED_UNSCANNED',
        scanVerdict: 'PENDING',
        scanner: null,
        scannedAt: null,
        pending: true,
        readyToComplete: false,
        retryAfterMs: 5000,
        errorCode: null,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/uploads/{uploadSessionId}/complete',
    {
      tag: 'Media',
      summary: 'Complete Upload',
      operationId: 'completeUpload',
      effect: 'complete upload',
      requestSchema: 'UploadCompleteInput',
      requestExample: {
        mediaObjectId: 'med_123',
      },
      responseSchema: 'UploadCompleteResponse',
      responseDescription: 'The scanner-verified upload is available.',
      responseExample: {
        uploadSessionId: 'ups_123',
        mediaObjectId: 'med_123',
        mediaStatus: 'AVAILABLE',
        scanVerdict: 'CLEAN',
        scanner: 'clamav:ClamAV 1.5.3',
        scannedAt: '2026-07-28T18:20:00.000Z',
        pending: false,
        retryAfterMs: null,
        seedVersion: null,
        requestId: 'req_123',
      },
      acceptedResponseSchema: 'UploadCompleteResponse',
      acceptedResponseDescription:
        'The upload was handed to the malware scanner and remains unavailable. Retry after retryAfterMs.',
      acceptedResponseExample: {
        uploadSessionId: 'ups_123',
        mediaObjectId: 'med_123',
        mediaStatus: 'UPLOADED_UNSCANNED',
        scanVerdict: 'PENDING',
        scanner: null,
        scannedAt: null,
        pending: true,
        retryAfterMs: 5000,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/uploads/{uploadSessionId}/scan-result',
    {
      tag: 'Media',
      summary: 'Record Upload Scan Result',
      operationId: 'recordUploadScanResult',
      effect: 'record scan result',
      security: [{ bearerAuth: [] }, { uploadScanResultTokenAuth: [] }],
      requestSchema: 'UploadScanResultInput',
      requestExample: {
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
        details: {
          signatureVersion: 'daily-27492',
        },
      },
      createdResponseSchema: 'UploadScanResultResponse',
      responseSchema: 'UploadScanResultResponse',
      createdResponseExample: {
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
      responseDescription:
        'Idempotent replay of an already-recorded scanner result with the same sourceResultId.',
    },
  ],
  [
    'GET /v1/videos',
    {
      tag: 'Media',
      summary: 'List Videos',
      operationId: 'listVideos',
      effect: 'list',
      parameters: [videoCoachIdQueryParameter, videoAthleteIdQueryParameter],
      responseSchema: 'VideoListResponse',
      responseExample: {
        videos: [videoExample],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/videos',
    {
      tag: 'Media',
      summary: 'Create Video',
      operationId: 'createVideo',
      effect: 'create',
      requestSchema: 'VideoCreateRequest',
      requestExample: {
        mediaObjectId: 'med_123',
        athleteIds: ['ath_123'],
        title: 'Technical Review',
        description: 'First-touch review from the Saturday session.',
        bookingId: 'bkg_123',
        durationSeconds: 92,
      },
      createdResponseSchema: 'VideoResponse',
      createdResponseExample: {
        video: videoExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/videos/{videoId}',
    {
      tag: 'Media',
      summary: 'Get Video',
      operationId: 'getVideo',
      effect: 'get',
      responseSchema: 'VideoResponse',
      responseExample: {
        video: videoExample,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'PATCH /v1/videos/{videoId}',
    {
      tag: 'Media',
      summary: 'Update Video',
      operationId: 'updateVideo',
      effect: 'update',
      requestSchema: 'VideoUpdateRequest',
      requestExample: {
        title: 'Technical Review Updated',
      },
      responseSchema: 'VideoResponse',
      responseExample: {
        video: { ...videoExample, title: 'Technical Review Updated' },
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'PATCH /v1/videos/{videoId}/share',
    {
      tag: 'Media',
      summary: 'Update Video Sharing',
      operationId: 'updateVideoSharing',
      effect: 'update sharing',
      requestSchema: 'VideoSharingUpdateRequest',
      requestExample: {
        visibility: 'SHARED',
        recipientUserIds: ['usr_parent_123'],
      },
      responseSchema: 'VideoResponse',
      responseExample: {
        video: {
          ...videoExample,
          visibility: 'SHARED',
          sharedWithUserIds: ['usr_parent_123'],
        },
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/videos/{videoId}/annotations',
    {
      tag: 'Media',
      summary: 'Create Video Annotation',
      operationId: 'createVideoAnnotation',
      effect: 'create annotation',
      requestSchema: 'VideoAnnotationRequest',
      requestExample: {
        timestamp: 18,
        label: 'Body position',
        note: 'Receive on the back foot.',
        type: 'IMPROVEMENT',
      },
      createdResponseSchema: 'VideoAnnotationResponse',
      createdResponseExample: {
        annotation: videoAnnotationExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'PATCH /v1/videos/{videoId}/annotations/{annotationId}',
    {
      tag: 'Media',
      summary: 'Update Video Annotation',
      operationId: 'updateVideoAnnotation',
      effect: 'update annotation',
      requestSchema: 'VideoAnnotationRequest',
      requestExample: {
        timestamp: 18,
        label: 'Body position',
        note: 'Receive on the back foot.',
        type: 'IMPROVEMENT',
      },
      responseSchema: 'VideoAnnotationResponse',
      responseExample: {
        annotation: videoAnnotationExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/community-groups',
    {
      tag: 'Community',
      summary: 'List My Community Groups',
      operationId: 'listCommunityGroups',
      effect: 'list',
      responseSchema: 'CommunityGroupListResponse',
      responseExample: {
        groups: [communityGroupExample],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/community-groups',
    {
      tag: 'Community',
      summary: 'Create Community Group',
      operationId: 'createCommunityGroup',
      effect: 'create',
      requestSchema: 'CommunityGroupCreateRequest',
      requestExample: {
        name: 'Parent Support',
        description: 'A public group for parents and guardians.',
        type: 'GENERAL',
        isPublic: true,
        idempotencyKey: 'community-group-create-123',
      },
      createdResponseSchema: 'CommunityGroupResponse',
      createdResponseExample: communityGroupResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/join',
    {
      tag: 'Community',
      summary: 'Join Public Community Group',
      operationId: 'joinCommunityGroup',
      effect: 'join',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupResponse',
      responseExample: {
        ...communityGroupResponseExample,
        group: {
          ...communityGroupExample,
          memberships: [
            communityGroupOwnerMembershipExample,
            communityGroupMemberMembershipExample,
          ],
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/leave',
    {
      tag: 'Community',
      summary: 'Leave Community Group',
      operationId: 'leaveCommunityGroup',
      effect: 'leave',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupResponse',
      responseExample: communityGroupResponseExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/join-requests',
    {
      tag: 'Community',
      summary: 'Request Community Group Membership',
      operationId: 'createCommunityGroupJoinRequest',
      effect: 'request membership',
      requestSchema: 'CommunityGroupJoinRequestCreateRequest',
      requestRequired: false,
      requestExample: {
        isCoach: false,
      },
      createdResponseSchema: 'CommunityGroupJoinRequestResponse',
      createdResponseExample: communityGroupJoinRequestResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/community-groups/{groupId}/join-requests',
    {
      tag: 'Community',
      summary: 'List Pending Community Group Join Requests',
      operationId: 'listCommunityGroupJoinRequests',
      effect: 'list',
      responseSchema: 'CommunityGroupJoinRequestListResponse',
      responseExample: {
        requests: [communityGroupJoinRequestExample],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/join-requests/{requestId}/approve',
    {
      tag: 'Community',
      summary: 'Approve Community Group Join Request',
      operationId: 'approveCommunityGroupJoinRequest',
      effect: 'approve',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupJoinRequestApprovalResponse',
      responseExample: {
        request: {
          ...communityGroupJoinRequestExample,
          status: 'ACCEPTED',
          respondedAt: '2026-08-01T09:30:00.000Z',
        },
        group: {
          ...communityGroupExample,
          memberships: [
            communityGroupOwnerMembershipExample,
            communityGroupMemberMembershipExample,
          ],
        },
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/join-requests/{requestId}/reject',
    {
      tag: 'Community',
      summary: 'Reject Community Group Join Request',
      operationId: 'rejectCommunityGroupJoinRequest',
      effect: 'reject',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupJoinRequestResponse',
      responseExample: {
        ...communityGroupJoinRequestResponseExample,
        request: {
          ...communityGroupJoinRequestExample,
          status: 'DECLINED',
          respondedAt: '2026-08-01T09:30:00.000Z',
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/invites',
    {
      tag: 'Community',
      summary: 'Invite User To Community Group',
      operationId: 'createCommunityGroupInvite',
      effect: 'invite',
      requestSchema: 'CommunityGroupInviteCreateRequest',
      requestExample: {
        inviteeUserId: 'usr_member_456',
        message: 'Join our parent support group.',
      },
      createdResponseSchema: 'CommunityGroupInviteResponse',
      createdResponseExample: communityGroupInviteResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/me/community-group-invites',
    {
      tag: 'Community',
      summary: 'List My Pending Community Group Invites',
      operationId: 'listMyCommunityGroupInvites',
      effect: 'list',
      responseSchema: 'CommunityGroupInviteListResponse',
      responseExample: {
        invites: [communityGroupInviteExample],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/community-group-invites/{inviteId}/accept',
    {
      tag: 'Community',
      summary: 'Accept Community Group Invite',
      operationId: 'acceptCommunityGroupInvite',
      effect: 'accept',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupInviteAcceptanceResponse',
      responseExample: {
        invite: {
          ...communityGroupInviteExample,
          status: 'ACCEPTED',
          respondedAt: '2026-08-01T09:35:00.000Z',
        },
        group: {
          ...communityGroupExample,
          memberships: [
            communityGroupOwnerMembershipExample,
            communityGroupMemberMembershipExample,
          ],
        },
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-group-invites/{inviteId}/decline',
    {
      tag: 'Community',
      summary: 'Decline Community Group Invite',
      operationId: 'declineCommunityGroupInvite',
      effect: 'decline',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupInviteResponse',
      responseExample: {
        ...communityGroupInviteResponseExample,
        invite: {
          ...communityGroupInviteExample,
          status: 'DECLINED',
          respondedAt: '2026-08-01T09:35:00.000Z',
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/members',
    {
      tag: 'Community',
      summary: 'Add Community Group Member',
      operationId: 'addCommunityGroupMember',
      effect: 'add member',
      requestSchema: 'CommunityGroupMemberAddRequest',
      requestExample: {
        memberUserId: 'usr_member_456',
        role: 'MODERATOR',
      },
      responseSchema: 'CommunityGroupResponse',
      responseExample: {
        ...communityGroupResponseExample,
        group: {
          ...communityGroupExample,
          memberships: [
            communityGroupOwnerMembershipExample,
            {
              ...communityGroupMemberMembershipExample,
              role: 'MODERATOR',
            },
          ],
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'PATCH /v1/community-groups/{groupId}/members/{memberUserId}/role',
    {
      tag: 'Community',
      summary: 'Update Community Group Member Role',
      operationId: 'updateCommunityGroupMemberRole',
      effect: 'update member role',
      requestSchema: 'CommunityGroupMemberRoleUpdateRequest',
      requestExample: {
        role: 'MODERATOR',
      },
      responseSchema: 'CommunityGroupResponse',
      responseExample: {
        ...communityGroupResponseExample,
        group: {
          ...communityGroupExample,
          memberships: [
            communityGroupOwnerMembershipExample,
            {
              ...communityGroupMemberMembershipExample,
              role: 'MODERATOR',
            },
          ],
        },
      },
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/members/{memberUserId}/transfer-ownership',
    {
      tag: 'Community',
      summary: 'Transfer Community Group Ownership',
      operationId: 'transferCommunityGroupOwnership',
      effect: 'transfer ownership',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupResponse',
      responseExample: {
        ...communityGroupResponseExample,
        group: {
          ...communityGroupExample,
          ownerUserId: 'usr_member_456',
          memberships: [
            {
              ...communityGroupOwnerMembershipExample,
              role: 'ADMIN',
            },
            {
              ...communityGroupMemberMembershipExample,
              role: 'OWNER',
            },
          ],
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/members/{memberUserId}/remove',
    {
      tag: 'Community',
      summary: 'Remove Community Group Member',
      operationId: 'removeCommunityGroupMember',
      effect: 'remove member',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupResponse',
      responseExample: communityGroupResponseExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/archive',
    {
      tag: 'Community',
      summary: 'Archive Community Group',
      operationId: 'archiveCommunityGroup',
      effect: 'archive',
      omitRequestBody: true,
      responseSchema: 'CommunityGroupResponse',
      responseExample: {
        ...communityGroupResponseExample,
        group: {
          ...communityGroupExample,
          deletedAt: '2026-08-01T09:40:00.000Z',
          deletedByUserId: 'usr_owner_123',
          memberships: [],
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/follows',
    {
      tag: 'Community',
      summary: 'Read Follow Relationships',
      operationId: 'readFollowRelationships',
      effect: 'read',
      parameters: [
        followFollowerIdQueryParameter,
        followFollowingIdQueryParameter,
        followTargetUserIdQueryParameter,
      ],
      responseSchema: 'FollowReadResponse',
      responseExample: followListResponseExample,
    },
  ],
  [
    'POST /v1/follows',
    {
      tag: 'Community',
      summary: 'Follow User',
      operationId: 'createFollow',
      effect: 'follow',
      requestSchema: 'FollowCreateRequest',
      requestExample: {
        followingId: 'usr_coach_123',
        followingType: 'COACH',
        notifyOnPost: true,
        notifyOnSession: false,
      },
      createdResponseSchema: 'FollowCreateResponse',
      createdResponseExample: {
        follow: followExample,
        requestId: 'req_123',
      },
      omitOkResponse: true,
    },
  ],
  [
    'PATCH /v1/follows',
    {
      tag: 'Community',
      summary: 'Update Follow Notification Preferences',
      operationId: 'updateFollowNotificationPreferences',
      effect: 'update preferences',
      parameters: [requiredFollowFollowingIdQueryParameter],
      requestSchema: 'FollowPreferenceUpdateRequest',
      requestExample: {
        notifyOnPost: true,
        notifyOnSession: false,
      },
      responseSchema: 'FollowPreferenceMutationResponse',
      responseExample: {
        follow: followExample,
        updated: true,
        requestId: 'req_123',
      },
    },
  ],
  [
    'DELETE /v1/follows',
    {
      tag: 'Community',
      summary: 'Unfollow User',
      operationId: 'removeFollow',
      effect: 'remove',
      parameters: [requiredFollowFollowingIdQueryParameter],
      responseSchema: 'FollowRemovalResponse',
      responseExample: {
        follow: followExample,
        removed: true,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/follow-requests',
    {
      tag: 'Community',
      summary: 'List Pending Follow Requests',
      operationId: 'listFollowRequests',
      effect: 'list',
      parameters: [followRequestTargetIdQueryParameter],
      responseSchema: 'FollowRequestListResponse',
      responseExample: {
        requests: [followRequestExample],
        total: 1,
        dataVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/follow-requests',
    {
      tag: 'Community',
      summary: 'Request To Follow User',
      operationId: 'createFollowRequest',
      effect: 'request follow',
      requestSchema: 'FollowRequestCreateRequest',
      requestExample: {
        targetId: 'usr_coach_123',
        message: 'Can we connect?',
      },
      responseSchema: 'FollowRequestMutationResponse',
      responseExample: {
        request: followRequestExample,
        created: false,
        requestId: 'req_123',
      },
      createdResponseSchema: 'FollowRequestMutationResponse',
      createdResponseExample: {
        request: followRequestExample,
        created: true,
        requestId: 'req_123',
      },
    },
  ],
  [
    'PATCH /v1/follow-requests/{requestId}',
    {
      tag: 'Community',
      summary: 'Respond To Follow Request',
      operationId: 'respondToFollowRequest',
      effect: 'respond',
      requestSchema: 'FollowRequestDecisionRequest',
      requestExample: {
        response: 'ACCEPTED',
      },
      responseSchema: 'FollowRequestDecisionResponse',
      responseExample: {
        request: {
          ...followRequestExample,
          status: 'ACCEPTED',
          respondedAt: '2026-08-01T10:10:00.000Z',
        },
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/coaches/search',
    {
      tag: 'Coaches',
      summary: 'Search Coaches',
      operationId: 'searchCoaches',
      effect: 'search',
      parameters: [
        coachSearchQueryParameter,
        coachSearchPriceMinParameter,
        coachSearchPriceMaxParameter,
        coachSearchRatingParameter,
        stringArrayQueryParameter('sports', 'Sports to include. Clubroom is football-only today.'),
        stringArrayQueryParameter('focuses', 'Football focus labels to include.'),
        stringArrayQueryParameter('formats', 'Session formats to include.'),
        stringArrayQueryParameter('languages', 'Coach language names to include.'),
        coachSearchLatParameter,
        coachSearchLngParameter,
        coachSearchRadiusKmParameter,
        coachSearchSortByParameter,
        pageQueryParameter,
        pageSizeQueryParameter,
      ],
    },
  ],
  [
    'GET /v1/posts',
    {
      tag: 'Community',
      summary: 'List Posts',
      operationId: 'listPosts',
      effect: 'list',
      parameters: [
        clubIdQueryParameter,
        communityGroupIdQueryParameter,
        followingOnlyQueryParameter,
      ],
      responseSchema: 'PostListResponse',
      responseExample: {
        posts: [
          {
            ...postExample,
            comments: [],
            reactions: [],
          },
        ],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/posts',
    {
      tag: 'Community',
      summary: 'Create Staff Post',
      operationId: 'createPost',
      effect: 'create',
      requestSchema: 'PostCreateRequest',
      requestExample: {
        clubId: 'clb_123',
        content: 'Saturday training starts at 10:00.',
        visibility: 'CLUB',
        metadata: {
          title: 'Training update',
          postType: 'announcement',
          postAs: 'club',
          feedType: 'CLUB',
          audience: 'club',
          audienceLabel: 'Club-wide',
        },
        attachments: [
          {
            mediaObjectId: 'med_123',
            title: 'Training photo',
          },
        ],
        idempotencyKey: 'staff-post-create-123',
      },
      createdResponseSchema: 'PostResponse',
      createdResponseExample: postResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/posts/{postId}',
    {
      tag: 'Community',
      summary: 'Get Post',
      operationId: 'getPost',
      effect: 'get',
      responseSchema: 'PostResponse',
      responseExample: {
        ...postResponseExample,
        post: {
          ...postExample,
          comments: [],
          reactions: [],
        },
      },
    },
  ],
  [
    'POST /v1/posts/{postId}/reactions/toggle',
    {
      tag: 'Community',
      summary: 'Toggle Post Like',
      operationId: 'togglePostReaction',
      effect: 'toggle reaction',
      omitRequestBody: true,
      responseSchema: 'PostResponse',
      responseExample: {
        ...postResponseExample,
        post: likedPostExample,
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'PATCH /v1/posts/{postId}/pin',
    {
      tag: 'Community',
      summary: 'Set Post Pin State',
      operationId: 'setPostPin',
      effect: 'set pin state',
      requestSchema: 'PostPinRequest',
      requestExample: {
        pinned: true,
      },
      responseSchema: 'PostResponse',
      responseExample: {
        ...postResponseExample,
        post: {
          ...postExample,
          attachmentsJson: {
            ...postExample.attachmentsJson,
            isPinned: true,
            pinnedBy: 'usr_coach_123',
            pinnedAt: '2026-08-01T09:10:00.000Z',
          },
          version: 2,
          updatedAt: '2026-08-01T09:10:00.000Z',
          reactions: [],
        },
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/posts/{postId}/comments',
    {
      tag: 'Community',
      summary: 'List Post Comments',
      operationId: 'listPostComments',
      effect: 'list comments',
      responseSchema: 'PostCommentListResponse',
      responseExample: {
        comments: [postCommentExample, postCommentReplyExample],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/posts/{postId}/comments',
    {
      tag: 'Community',
      summary: 'Create Post Comment',
      operationId: 'createPostComment',
      effect: 'create comment',
      requestSchema: 'PostCommentCreateRequest',
      requestExample: {
        content: 'Looking forward to training.',
        idempotencyKey: 'post-comment-create-123',
      },
      createdResponseSchema: 'PostCommentResponse',
      createdResponseExample: postCommentResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'GET /v1/comments/{commentId}',
    {
      tag: 'Community',
      summary: 'Get Post Comment',
      operationId: 'getPostComment',
      effect: 'get comment',
      responseSchema: 'PostCommentResponse',
      responseExample: postCommentResponseExample,
    },
  ],
  [
    'DELETE /v1/comments/{commentId}',
    {
      tag: 'Community',
      summary: 'Remove Post Comment',
      operationId: 'removePostComment',
      effect: 'soft remove comment',
      omitRequestBody: true,
      responseSchema: 'PostCommentResponse',
      responseExample: {
        ...postCommentResponseExample,
        comment: removedPostCommentExample,
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/comments/{commentId}/reactions/toggle',
    {
      tag: 'Community',
      summary: 'Toggle Post Comment Like',
      operationId: 'togglePostCommentReaction',
      effect: 'toggle comment reaction',
      omitRequestBody: true,
      responseSchema: 'PostCommentResponse',
      responseExample: {
        ...postCommentResponseExample,
        comment: likedPostCommentExample,
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/message-threads',
    {
      tag: 'Messaging',
      summary: 'List My Message Threads',
      operationId: 'listMessageThreads',
      effect: 'list message threads',
      responseSchema: 'MessageThreadListResponse',
      responseExample: {
        threads: [messageThreadExample, groupMessageThreadExample],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/messages',
    {
      tag: 'Messaging',
      summary: 'Send Community Group Message',
      operationId: 'sendCommunityGroupMessage',
      effect: 'send group message',
      requestSchema: 'MessageCreateRequest',
      requestExample: {
        body: 'Training starts at 10:00 on Saturday.',
        attachments: [{ mediaObjectId: 'med_123', title: 'Training photo' }],
        idempotencyKey: 'group-message-create-123',
      },
      createdResponseSchema: 'MessageMutationResponse',
      createdResponseExample: groupMessageMutationResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'POST /v1/community-groups/{groupId}/messages/read',
    {
      tag: 'Messaging',
      summary: 'Mark Community Group Messages Read',
      operationId: 'markCommunityGroupMessagesRead',
      effect: 'mark group messages read',
      omitRequestBody: true,
      responseSchema: 'NullableMessageThreadResponse',
      responseExample: {
        thread: groupMessageThreadExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/message-threads/{threadId}/messages',
    {
      tag: 'Messaging',
      summary: 'Send Message Thread Message',
      operationId: 'sendMessageThreadMessage',
      effect: 'send thread message',
      requestSchema: 'MessageCreateRequest',
      requestExample: {
        body: 'Training starts at 10:00 on Saturday.',
        attachments: [{ mediaObjectId: 'med_123', title: 'Training photo' }],
        idempotencyKey: 'thread-message-create-123',
      },
      createdResponseSchema: 'MessageMutationResponse',
      createdResponseExample: messageMutationResponseExample,
      omitOkResponse: true,
    },
  ],
  [
    'POST /v1/message-threads/{threadId}/read',
    {
      tag: 'Messaging',
      summary: 'Mark Message Thread Read',
      operationId: 'markMessageThreadRead',
      effect: 'mark thread messages read',
      omitRequestBody: true,
      responseSchema: 'MessageThreadResponse',
      responseExample: {
        thread: readMessageThreadExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'DELETE /v1/messages/{messageId}',
    {
      tag: 'Messaging',
      summary: 'Remove Message',
      operationId: 'removeMessage',
      effect: 'soft remove message',
      omitRequestBody: true,
      responseSchema: 'MessageMutationResponse',
      responseExample: removedMessageMutationResponseExample,
      omitCreatedResponse: true,
    },
  ],
  [
    'GET /v1/me/notifications',
    {
      tag: 'Notifications',
      summary: 'List My Notifications',
      operationId: 'listNotifications',
      effect: 'list notifications',
      responseSchema: 'NotificationListResponse',
      responseExample: notificationListResponseExample,
    },
  ],
  [
    'PATCH /v1/me/notifications/preferences',
    {
      tag: 'Notifications',
      summary: 'Update My Notification Preferences',
      operationId: 'updateNotificationPreferences',
      effect: 'update notification preferences',
      requestSchema: 'NotificationPreferenceUpdateRequest',
      requestExample: {
        channels: { push: true, email: true, sms: false },
        quietHours: {
          enabled: true,
          startTime: '22:00',
          endTime: '07:00',
          timezone: 'Europe/London',
        },
        typePreferences: {
          MESSAGE_RECEIVED: { enabled: true, channels: ['PUSH', 'EMAIL'] },
        },
        mutedCoaches: [{ coachId: 'usr_coach_123', reason: 'Too many updates' }],
      },
      responseSchema: 'NotificationPreferenceMutationResponse',
      responseExample: {
        preferences: notificationPreferenceExample,
        mutedSources: [mutedSourceExample],
        quietHours: quietHoursExample,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/me/notifications/read-all',
    {
      tag: 'Notifications',
      summary: 'Mark All My Notifications Read',
      operationId: 'markAllNotificationsRead',
      effect: 'mark all notifications read',
      omitRequestBody: true,
      responseSchema: 'NotificationBulkMutationResponse',
      responseExample: {
        notifications: [readNotificationExample],
        unreadCount: 0,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/me/notifications/dismiss-all',
    {
      tag: 'Notifications',
      summary: 'Dismiss All My Notifications',
      operationId: 'dismissAllNotifications',
      effect: 'dismiss all notifications',
      omitRequestBody: true,
      responseSchema: 'NotificationBulkMutationResponse',
      responseExample: {
        notifications: [dismissedNotificationExample],
        unreadCount: 0,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/me/notifications/{notificationId}/read',
    {
      tag: 'Notifications',
      summary: 'Mark My Notification Read',
      operationId: 'markNotificationRead',
      effect: 'mark notification read',
      omitRequestBody: true,
      responseSchema: 'NotificationMutationResponse',
      responseExample: {
        notification: readNotificationExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'POST /v1/me/notifications/{notificationId}/dismiss',
    {
      tag: 'Notifications',
      summary: 'Dismiss My Notification',
      operationId: 'dismissNotification',
      effect: 'dismiss notification',
      omitRequestBody: true,
      responseSchema: 'NotificationMutationResponse',
      responseExample: {
        notification: dismissedNotificationExample,
        seedVersion: null,
        requestId: 'req_123',
      },
      omitCreatedResponse: true,
    },
  ],
  [
    'PATCH /v1/coaches/{coachId}/verifications/{type}/review',
    {
      tag: 'Verification',
      summary: 'Review Coach Verification',
      operationId: 'reviewCoachVerification',
      effect: 'review',
      requestSchema: 'CoachVerificationReviewInput',
    },
  ],
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
    'GET /v1/athletes/{athleteId}/analytics',
    {
      tag: 'Progress',
      summary: 'Get Athlete Analytics',
      operationId: 'getAthleteAnalytics',
      effect: 'read',
      parameters: [athleteAnalyticsPeriodQueryParameter],
      responseSchema: 'AthleteAnalyticsResponse',
      responseExample: {
        athleteId: 'ath_123',
        analytics: {
          athleteId: 'ath_123',
          period: 'MONTH',
          totalSessions: 0,
          sessionsThisPeriod: 0,
          averageSessionRating: 0,
          attendanceRate: 0,
          skills: [],
          activeGoals: [],
          completedGoals: [],
          improvementRate: 0,
          consistencyScore: 0,
          percentileRank: 0,
        },
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/skills/history',
    {
      tag: 'Progress',
      summary: 'Get Athlete Skill History',
      operationId: 'getAthleteSkillHistory',
      effect: 'read',
      parameters: [athleteSkillNameQueryParameter],
      responseSchema: 'AthleteSkillHistoryResponse',
      responseExample: {
        athleteId: 'ath_123',
        skills: [
          {
            skillName: 'Passing',
            category: 'Technical',
            currentLevel: 72,
            previousLevel: 68,
            changePercent: 5.9,
            averageLevel: 61,
            history: [{ date: '2026-07-14', level: 72 }],
          },
        ],
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/athletes/{athleteId}/skill-updates',
    {
      tag: 'Progress',
      summary: 'Record Athlete Skill Update',
      operationId: 'recordAthleteSkillUpdate',
      effect: 'record',
      requestSchema: 'AthleteSkillUpdateRequest',
      requestExample: {
        skillName: 'Passing',
        score: 8,
        bookingId: 'bok_123',
        notes: 'Cleaner tempo in possession.',
        idempotencyKey: 'skill-update-2026-07-14-passing',
      },
      responseSchema: 'AthleteSkillUpdateResponse',
      createdResponseSchema: 'AthleteSkillUpdateResponse',
      responseExample: athleteSkillUpdateResponseExample,
      createdResponseExample: athleteSkillUpdateResponseExample,
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/practice-logs',
    {
      tag: 'Progress',
      summary: 'List Athlete Practice Logs',
      operationId: 'listAthletePracticeLogs',
      effect: 'read',
      parameters: [practiceLogSinceQueryParameter, practiceLogLimitQueryParameter],
      responseSchema: 'PracticeLogListResponse',
      responseExample: {
        athleteId: 'ath_123',
        logs: [practiceLogEntryExample],
        total: 1,
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'GET /v1/athletes/{athleteId}/practice-logs/today',
    {
      tag: 'Progress',
      summary: "Get Today's Athlete Practice Log",
      operationId: 'getTodayAthletePracticeLog',
      effect: 'read',
      responseSchema: 'PracticeLogTodayResponse',
      responseExample: {
        athleteId: 'ath_123',
        log: practiceLogEntryExample,
        dateKey: '2026-07-14',
        timeZone: 'Europe/London',
        seedVersion: null,
        requestId: 'req_123',
      },
    },
  ],
  [
    'POST /v1/athletes/{athleteId}/practice-logs',
    {
      tag: 'Progress',
      summary: 'Record Athlete Practice',
      operationId: 'recordAthletePractice',
      effect: 'record',
      requestSchema: 'PracticeLogCreateRequest',
      requestExample: {
        minutes: 15,
        note: 'Ball mastery and wall passing.',
        idempotencyKey: 'practice-log-2026-07-14-session-1',
      },
      responseSchema: 'PracticeLogMutationResponse',
      createdResponseSchema: 'PracticeLogMutationResponse',
      responseExample: practiceLogMutationResponseExample,
      createdResponseExample: {
        ...practiceLogMutationResponseExample,
        log: {
          ...practiceLogEntryExample,
          minutes: 15,
          createdAt: '2026-07-14T18:30:00.000Z',
          updatedAt: '2026-07-14T18:30:00.000Z',
        },
        created: true,
      },
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
  const hasRequestBody =
    (mutates || Boolean(override?.requestSchema)) && override?.omitRequestBody !== true;
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
    ...(hasRequestBody
      ? {
          requestBody: override?.requestSchema
            ? jsonRequestBody(
                override.requestSchema,
                override.requestRequired !== false,
                override.requestExample,
              )
            : jsonRequestBody('JsonObject', false),
        }
      : {}),
    security: override?.security ?? (isPublic ? [] : [{ bearerAuth: [] }]),
    responses: responseMap(method, row, openApiPath, isPublic),
    'x-clubroom-effect': effect,
    'x-clubroom-status': cleanCell(row.status) || 'unknown',
  };

  if (override?.responseSchema) {
    operation.responses['200'] = jsonResponse(
      override.responseSchema,
      override.responseDescription ?? 'Successful response.',
      override.responseExample,
    );
  }
  if (override?.createdResponseSchema) {
    operation.responses['201'] = jsonResponse(
      override.createdResponseSchema,
      'Created response.',
      override.createdResponseExample,
    );
  }
  if (override?.acceptedResponseSchema) {
    operation.responses['202'] = jsonResponse(
      override.acceptedResponseSchema,
      override.acceptedResponseDescription ?? 'Accepted for asynchronous processing.',
      override.acceptedResponseExample,
    );
  }
  if (override?.htmlResponse) {
    operation.responses['200'] = {
      description: override.htmlResponse,
      content: {
        'text/html': {
          schema: { type: 'string' },
        },
      },
    };
  }
  if (override?.noContentResponse) {
    operation.responses['204'] = {
      description: override.noContentResponse,
    };
  }
  if (override?.responseRefs) {
    for (const [status, responseName] of Object.entries(override.responseRefs)) {
      operation.responses[status] = responseRef(responseName);
    }
  }
  if (override?.omitOkResponse) {
    delete operation.responses['200'];
  }
  if (override?.omitCreatedResponse) {
    delete operation.responses['201'];
  }
  for (const status of override?.omitResponses ?? []) {
    delete operation.responses[status];
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
        'OpenAPI 3.1 document generated from the canonical Clubroom /v1 route inventory and rendered by Swagger UI. Google AIP conformance is not claimed. The current /v1 contract is preview; breaking changes require a new major path, and stable-version deprecations receive at least 180 days notice with Deprecation and Sunset response headers. Clubroom lifecycle effects are exposed with x-clubroom-effect so HTTP DELETE routes can document remove/archive/dismiss/revoke semantics. Only implemented routes are emitted. Update docs/backend-api/ROUTE_INVENTORY_V1.md first when route truth changes, then regenerate this file.',
    },
    'x-clubroom-api-lifecycle': {
      currentMajor: 'v1',
      status: 'preview',
      breakingChangeStrategy: 'new-major-path',
      minimumDeprecationDays: 180,
      deprecationHeaders: ['Deprecation', 'Sunset', 'Link'],
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
        uploadScanResultTokenAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-clubroom-upload-scan-token',
          description:
            'Server-to-server token for trusted malware scanner callbacks. Configure with API_UPLOAD_SCAN_RESULT_TOKEN and never send it from browser clients.',
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
      responses: {
        BadRequest: errorResponse(
          'Bad request or validation failure.',
          400,
          'VALIDATION_FAILED',
          'Request did not match the route contract.',
        ),
        Unauthorized: errorResponse(
          'Missing, expired, or invalid authentication.',
          401,
          'UNAUTHORIZED',
          'A valid bearer token is required.',
        ),
        Forbidden: errorResponse(
          'Authenticated actor is not allowed to perform this action.',
          403,
          'FORBIDDEN',
          'The current actor does not have access to this resource.',
        ),
        NotFound: errorResponse(
          'Resource was not found or is intentionally hidden from this actor.',
          404,
          'NOT_FOUND',
          'The requested resource was not found.',
        ),
        Conflict: errorResponse(
          'Request conflicts with the current resource state.',
          409,
          'CONFLICT',
          'The requested state transition cannot be applied.',
        ),
        RateLimited: errorResponse(
          'Too many requests.',
          429,
          'RATE_LIMITED',
          'Too many requests. Try again later.',
        ),
        InternalServerError: errorResponse(
          'Unexpected server error.',
          500,
          'INTERNAL_ERROR',
          'An unexpected error occurred.',
        ),
        ServiceUnavailable: errorResponse(
          'Required backend authority is unavailable, so the route fails closed.',
          503,
          'SERVICE_UNAVAILABLE',
          'The required backend authority is temporarily unavailable.',
        ),
        DefaultError: errorResponse('Error response.', 500, 'ERROR', 'The request failed.'),
      },
      schemas: {
        ApiVersionResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'service',
            'version',
            'apiVersion',
            'apiStatus',
            'minimumDeprecationDays',
            'apiDataBackend',
            'marketplaceSeedEnabled',
          ],
          properties: {
            service: { type: 'string', const: 'clubroom-api' },
            version: {
              type: 'string',
              pattern: '^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z.-]+)?$',
            },
            apiVersion: { type: 'string', const: 'v1' },
            apiStatus: {
              type: 'string',
              enum: ['preview', 'stable', 'deprecated'],
            },
            minimumDeprecationDays: { type: 'integer', minimum: 0 },
            apiDataBackend: { type: 'string', enum: ['seed', 'db'] },
            marketplaceSeedEnabled: { type: 'boolean' },
          },
        },
        JsonValue: {
          description:
            'Route-specific JSON payload. The detailed TypeScript/Zod contract is owned by the route implementation and shared contract packages.',
        },
        JsonObject: {
          type: 'object',
          additionalProperties: true,
        },
        ClubRole: {
          type: 'string',
          enum: ['OWNER', 'ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT', 'MEMBER'],
        },
        ClubAccessLevel: {
          type: 'string',
          enum: ['none', 'own', 'assigned', 'scoped', 'limited', 'granted', 'org'],
        },
        ClubGovernanceCapabilities: {
          type: 'object',
          additionalProperties: false,
          required: clubCapabilityNames,
          properties: Object.fromEntries(
            clubCapabilityNames.map((name) => [name, schemaRef('ClubAccessLevel')]),
          ),
        },
        ClubGovernanceVisibility: {
          type: 'object',
          additionalProperties: false,
          required: clubVisibilityAreaNames,
          properties: Object.fromEntries(
            clubVisibilityAreaNames.map((name) => [name, schemaRef('ClubAccessLevel')]),
          ),
        },
        ClubGovernance: {
          type: 'object',
          additionalProperties: false,
          required: [
            'role',
            'isStaff',
            'isOversightRole',
            'canManageMembers',
            'canManageAssignments',
            'canReassignAssignments',
            'canViewCommercialMode',
            'canEditCommercialMode',
            'capabilities',
            'visibility',
          ],
          properties: {
            role: {
              anyOf: [schemaRef('ClubRole'), { type: 'null' }],
            },
            isStaff: { type: 'boolean' },
            isOversightRole: { type: 'boolean' },
            canManageMembers: { type: 'boolean' },
            canManageAssignments: { type: 'boolean' },
            canReassignAssignments: { type: 'boolean' },
            canViewCommercialMode: { type: 'boolean' },
            canEditCommercialMode: { type: 'boolean' },
            capabilities: schemaRef('ClubGovernanceCapabilities'),
            visibility: schemaRef('ClubGovernanceVisibility'),
          },
        },
        ClubSummary: {
          type: 'object',
          additionalProperties: false,
          required: clubSummaryRequired,
          properties: clubSummaryProperties,
        },
        ClubJoinSummary: {
          type: 'object',
          additionalProperties: false,
          required: clubSummaryRequired,
          properties: {
            ...clubSummaryProperties,
            inviteCode: { type: 'string' },
          },
        },
        ClubJoinFlow: {
          type: 'string',
          enum: ['direct_join', 'invite_review'],
        },
        ClubJoinPreview: {
          type: 'object',
          additionalProperties: false,
          required: [
            'clubId',
            'clubName',
            'clubSlug',
            'visibility',
            'joinPolicy',
            'inviteCode',
            'role',
            'joinFlow',
            'expiresAt',
            'alreadyMember',
          ],
          properties: {
            clubId: { type: 'string' },
            clubName: { type: 'string' },
            clubSlug: nullableStringSchema,
            visibility: clubSummaryProperties.visibility,
            joinPolicy: clubSummaryProperties.joinPolicy,
            inviteCode: { type: 'string' },
            role: schemaRef('ClubRole'),
            joinFlow: schemaRef('ClubJoinFlow'),
            expiresAt: { type: 'string', format: 'date-time' },
            alreadyMember: { type: 'boolean' },
          },
        },
        ResolveClubJoinCodeResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['preview', 'requestId'],
          properties: {
            preview: schemaRef('ClubJoinPreview'),
            requestId: { type: 'string' },
          },
        },
        JoinClubRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 4 },
          },
        },
        PendingClubInvite: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'clubName',
            'inviteCode',
            'role',
            'invitedByUserId',
            'invitedByLabel',
            'status',
            'createdAt',
            'expiresAt',
            'respondedAt',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            clubName: { type: 'string' },
            targetUserId: { type: 'string' },
            targetKind: { type: 'string', enum: ['user', 'email'] },
            targetEmailHint: { type: 'string' },
            inviteCode: { type: 'string' },
            role: schemaRef('ClubRole'),
            invitedByUserId: { type: 'string' },
            invitedByLabel: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'accepted', 'declined'] },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            respondedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        CreateClubInvitesRequest: {
          type: 'object',
          additionalProperties: false,
          description:
            'At least one user ID or email is required, with at most 50 targets across both arrays.',
          anyOf: [
            {
              required: ['targetUserIds'],
              properties: {
                targetUserIds: { type: 'array', minItems: 1 },
              },
            },
            {
              required: ['targetEmails'],
              properties: {
                targetEmails: { type: 'array', minItems: 1 },
              },
            },
          ],
          properties: {
            targetUserIds: {
              type: 'array',
              maxItems: 50,
              default: [],
              items: { type: 'string', minLength: 1 },
            },
            targetEmails: {
              type: 'array',
              maxItems: 50,
              default: [],
              items: { type: 'string', format: 'email', maxLength: 254 },
            },
            role: {
              ...schemaRef('ClubInviteRole'),
              default: 'MEMBER',
            },
          },
        },
        ClubInviteEmailDeliverySummary: {
          type: 'object',
          additionalProperties: false,
          required: ['total', 'sent', 'skipped', 'failed', 'providers'],
          properties: {
            total: { type: 'integer', minimum: 0 },
            sent: { type: 'integer', minimum: 0 },
            skipped: { type: 'integer', minimum: 0 },
            failed: { type: 'integer', minimum: 0 },
            providers: {
              type: 'array',
              uniqueItems: true,
              items: {
                type: 'string',
                enum: ['webhook', 'brevo_api', 'smtp', 'dev_outbox', 'none'],
              },
            },
          },
        },
        CreateClubInvitesResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invites', 'total', 'requestId'],
          properties: {
            invites: {
              type: 'array',
              items: schemaRef('PendingClubInvite'),
            },
            total: { type: 'integer', minimum: 0 },
            emailDelivery: schemaRef('ClubInviteEmailDeliverySummary'),
            requestId: { type: 'string' },
          },
        },
        ClubInvitesResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invites', 'requestId'],
          properties: {
            invites: {
              type: 'array',
              items: schemaRef('PendingClubInvite'),
            },
            requestId: { type: 'string' },
          },
        },
        RespondToClubInviteRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['response'],
          properties: {
            response: { type: 'string', enum: ['accepted', 'declined'] },
          },
        },
        RespondToClubInviteResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invite', 'membership', 'club', 'requestId'],
          properties: {
            invite: schemaRef('PendingClubInvite'),
            membership: {
              anyOf: [schemaRef('ClubMembership'), { type: 'null' }],
            },
            club: schemaRef('ClubSummary'),
            requestId: { type: 'string' },
          },
        },
        JoinClubJoinedResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['outcome', 'club', 'membership', 'invite', 'requestId'],
          properties: {
            outcome: { type: 'string', enum: ['joined'] },
            club: schemaRef('ClubJoinSummary'),
            membership: schemaRef('ClubMembership'),
            invite: { type: 'null' },
            requestId: { type: 'string' },
          },
        },
        JoinClubInvitePendingResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['outcome', 'club', 'membership', 'invite', 'requestId'],
          properties: {
            outcome: { type: 'string', enum: ['invite_pending'] },
            club: schemaRef('ClubJoinSummary'),
            membership: { type: 'null' },
            invite: schemaRef('PendingClubInvite'),
            requestId: { type: 'string' },
          },
        },
        JoinClubAlreadyMemberResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['outcome', 'club', 'membership', 'invite', 'requestId'],
          properties: {
            outcome: { type: 'string', enum: ['already_member'] },
            club: schemaRef('ClubJoinSummary'),
            membership: schemaRef('ClubMembership'),
            invite: { type: 'null' },
            requestId: { type: 'string' },
          },
        },
        JoinClubResponse: {
          oneOf: [
            schemaRef('JoinClubJoinedResponse'),
            schemaRef('JoinClubInvitePendingResponse'),
            schemaRef('JoinClubAlreadyMemberResponse'),
          ],
        },
        StaffingClub: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        StaffingMembership: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'userId', 'role', 'status'],
          properties: {
            clubId: { type: 'string' },
            userId: { type: 'string' },
            role: schemaRef('ClubRole'),
            status: { type: 'string', enum: ['active'] },
          },
        },
        StaffingStaffMember: {
          type: 'object',
          additionalProperties: false,
          required: [
            'userId',
            'label',
            'role',
            'status',
            'canTakeAssignments',
            'upcomingLoad',
            'nextSessionAt',
          ],
          properties: {
            userId: { type: 'string' },
            label: { type: 'string' },
            role: schemaRef('ClubRole'),
            status: { type: 'string', enum: ['active'] },
            canTakeAssignments: { type: 'boolean' },
            upcomingLoad: { type: 'integer', minimum: 0 },
            nextSessionAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        StaffingWorkItem: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            offeringId: { type: 'string' },
            title: { type: 'string' },
            scheduledAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            location: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            isVirtual: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['active', 'cancelled', 'completed', 'full'],
            },
            sessionType: { type: 'string', enum: ['group'] },
            currentParticipants: { type: 'integer', minimum: 0 },
            maxParticipants: { type: 'integer', minimum: 0 },
            createdByUserId: { type: 'string' },
            createdByName: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            assigneeCoachId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            assigneeCoachName: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            linkedBookingCount: { type: 'integer', minimum: 0 },
            isRecurring: { type: 'boolean' },
          },
        },
        StaffingSummary: {
          type: 'object',
          additionalProperties: false,
          required: ['activeOrgSessions', 'upcomingAssignedLoad', 'unassignedCount'],
          properties: {
            activeOrgSessions: { type: 'integer', minimum: 0 },
            upcomingAssignedLoad: { type: 'integer', minimum: 0 },
            unassignedCount: { type: 'integer', minimum: 0 },
          },
        },
        StaffingConsoleResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            club: schemaRef('StaffingClub'),
            viewerMembership: {
              anyOf: [schemaRef('StaffingMembership'), { type: 'null' }],
            },
            privilegedAdminAccess: { type: 'boolean' },
            canManageAssignments: { type: 'boolean' },
            staff: {
              type: 'array',
              items: schemaRef('StaffingStaffMember'),
            },
            unassignedWork: {
              type: 'array',
              items: schemaRef('StaffingWorkItem'),
            },
            assignedWork: {
              type: 'array',
              items: schemaRef('StaffingWorkItem'),
            },
            summary: schemaRef('StaffingSummary'),
            clubId: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        OwnerDashboardClub: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name'],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        OwnerDashboardMembership: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'userId', 'role', 'status'],
          properties: {
            clubId: { type: 'string' },
            userId: { type: 'string' },
            role: schemaRef('ClubRole'),
            status: { type: 'string', enum: ['active'] },
          },
        },
        OwnerDashboardSummary: {
          type: 'object',
          additionalProperties: false,
          required: [
            'activeStaffCount',
            'activeOrgSessions',
            'liveBookingCount',
            'unassignedCount',
            'awaitingCompletionCount',
            'overdueCompletionCount',
            'watchAthleteCount',
            'overdueFollowUpCount',
            'supportIssueCount',
          ],
          properties: {
            activeStaffCount: { type: 'integer', minimum: 0 },
            activeOrgSessions: { type: 'integer', minimum: 0 },
            liveBookingCount: { type: 'integer', minimum: 0 },
            unassignedCount: { type: 'integer', minimum: 0 },
            awaitingCompletionCount: { type: 'integer', minimum: 0 },
            overdueCompletionCount: { type: 'integer', minimum: 0 },
            watchAthleteCount: { type: 'integer', minimum: 0 },
            overdueFollowUpCount: { type: 'integer', minimum: 0 },
            supportIssueCount: { type: 'integer', minimum: 0 },
          },
        },
        OwnerDashboardFinanceSummary: {
          type: 'object',
          additionalProperties: false,
          required: [
            'openTotal',
            'orgCreditOpen',
            'coachCollectedOpen',
            'collectedTotal',
            'writtenOffTotal',
            'overdueCount',
            'owedCount',
            'note',
          ],
          properties: {
            openTotal: { type: 'number', minimum: 0 },
            orgCreditOpen: { type: 'number', minimum: 0 },
            coachCollectedOpen: { type: 'number', minimum: 0 },
            collectedTotal: { type: 'number', minimum: 0 },
            writtenOffTotal: { type: 'number', minimum: 0 },
            overdueCount: { type: 'integer', minimum: 0 },
            owedCount: { type: 'integer', minimum: 0 },
            note: { type: 'string' },
          },
        },
        OwnerDashboardWorkItem: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            offeringId: { type: 'string' },
            title: { type: 'string' },
            scheduledAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            location: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            isVirtual: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['active', 'cancelled', 'completed', 'full'],
            },
            sessionType: { type: 'string', enum: ['group'] },
            currentParticipants: { type: 'integer', minimum: 0 },
            maxParticipants: { type: 'integer', minimum: 0 },
            createdByUserId: { type: 'string' },
            createdByName: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            assigneeCoachId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            assigneeCoachName: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            linkedBookingCount: { type: 'integer', minimum: 0 },
            isRecurring: { type: 'boolean' },
          },
        },
        OwnerDashboardCoachHealth: {
          type: 'object',
          additionalProperties: false,
          required: [
            'coachId',
            'coachName',
            'role',
            'squadNames',
            'completionCount',
            'overdueCompletionCount',
            'watchAthleteCount',
            'overdueFollowUpCount',
            'openTaskCount',
            'sessionNoteExpectationCount',
            'requiredFollowUpCount',
            'latestCoachActionAt',
          ],
          properties: {
            coachId: { type: 'string' },
            coachName: { type: 'string' },
            role: schemaRef('ClubRole'),
            squadNames: {
              type: 'array',
              items: { type: 'string' },
            },
            completionCount: { type: 'integer', minimum: 0 },
            overdueCompletionCount: { type: 'integer', minimum: 0 },
            watchAthleteCount: { type: 'integer', minimum: 0 },
            overdueFollowUpCount: { type: 'integer', minimum: 0 },
            openTaskCount: { type: 'integer', minimum: 0 },
            sessionNoteExpectationCount: { type: 'integer', minimum: 0 },
            requiredFollowUpCount: { type: 'integer', minimum: 0 },
            latestCoachActionAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        OwnerDashboardCompletionItem: {
          type: 'object',
          additionalProperties: false,
          required: [
            'bookingId',
            'coachId',
            'coachName',
            'athleteName',
            'service',
            'scheduledAt',
            'dueAt',
            'overdue',
          ],
          properties: {
            bookingId: { type: 'string' },
            offeringId: { type: 'string' },
            coachId: { type: 'string' },
            coachName: { type: 'string' },
            athleteName: { type: 'string' },
            service: { type: 'string' },
            scheduledAt: { type: 'string', format: 'date-time' },
            dueAt: { type: 'string', format: 'date-time' },
            overdue: { type: 'boolean' },
            squadId: { type: 'string' },
            squadName: { type: 'string' },
          },
        },
        OwnerDashboardSupportIssue: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'bookingId',
            'status',
            'category',
            'description',
            'createdAt',
            'sessionTitle',
            'athleteLabel',
            'supportLabel',
            'deliveredByLabel',
          ],
          properties: {
            id: { type: 'string' },
            bookingId: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'reviewed', 'resolved'] },
            category: { type: 'string' },
            description: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            scheduledAt: { type: 'string', format: 'date-time' },
            sessionTitle: { type: 'string' },
            athleteLabel: { type: 'string' },
            supportLabel: { type: 'string' },
            deliveredByLabel: { type: 'string' },
          },
        },
        OwnerDashboardResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            club: schemaRef('StaffingClub'),
            viewerMembership: {
              anyOf: [schemaRef('StaffingMembership'), { type: 'null' }],
            },
            privilegedAdminAccess: { type: 'boolean' },
            summary: schemaRef('OwnerDashboardSummary'),
            finance: schemaRef('OwnerDashboardFinanceSummary'),
            unassignedWork: {
              type: 'array',
              items: schemaRef('StaffingWorkItem'),
            },
            coachHealth: {
              type: 'array',
              items: schemaRef('OwnerDashboardCoachHealth'),
            },
            completionQueue: {
              type: 'array',
              items: schemaRef('OwnerDashboardCompletionItem'),
            },
            supportIssues: {
              type: 'array',
              items: schemaRef('OwnerDashboardSupportIssue'),
            },
            clubId: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        HeadCoachTaskType: {
          type: 'string',
          enum: ['required_follow_up', 'session_note_expectation'],
        },
        HeadCoachTaskStatus: {
          type: 'string',
          enum: ['open', 'done'],
        },
        HeadCoachStandardCategory: {
          type: 'string',
          enum: ['session_notes', 'follow_up', 'program'],
        },
        CreateHeadCoachTaskRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['coachId', 'type'],
          properties: {
            coachId: { type: 'string', minLength: 1 },
            type: schemaRef('HeadCoachTaskType'),
            dueAt: { type: 'string', format: 'date-time' },
            athleteId: { type: 'string', minLength: 1 },
            athleteName: { type: 'string', minLength: 1 },
            bookingId: { type: 'string', minLength: 1 },
            offeringId: { type: 'string', minLength: 1 },
            squadId: { type: 'string', minLength: 1 },
            title: { type: 'string', minLength: 1 },
            details: { type: 'string', minLength: 1 },
          },
        },
        UpdateHeadCoachTaskRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: schemaRef('HeadCoachTaskStatus'),
          },
        },
        CreateHeadCoachStandardRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['title'],
          properties: {
            title: { type: 'string', minLength: 1 },
            description: { type: 'string', minLength: 1 },
            category: schemaRef('HeadCoachStandardCategory'),
          },
        },
        UpdateHeadCoachStandardRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            active: { type: 'boolean' },
          },
        },
        HeadCoachClub: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'name',
            'city',
            'tagline',
            'badgeUrl',
            'coverPhotoUrl',
            'memberCount',
            'coachCount',
            'squadCount',
            'ownerId',
          ],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            city: nullableStringSchema,
            tagline: nullableStringSchema,
            badgeUrl: nullableStringSchema,
            coverPhotoUrl: nullableStringSchema,
            memberCount: { type: 'integer', minimum: 0 },
            coachCount: { type: 'integer', minimum: 0 },
            squadCount: { type: 'integer', minimum: 0 },
            ownerId: nullableStringSchema,
          },
        },
        HeadCoachMembership: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'userId', 'role', 'status', 'squadIds'],
          properties: {
            clubId: { type: 'string' },
            userId: { type: 'string' },
            role: schemaRef('ClubRole'),
            status: { type: 'string', enum: ['active'] },
            squadIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        HeadCoachScope: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'squadIds', 'label'],
          properties: {
            type: { type: 'string', enum: ['club', 'assigned_squads'] },
            squadIds: {
              type: 'array',
              items: { type: 'string' },
            },
            label: { type: 'string' },
          },
        },
        HeadCoachSquad: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'name',
            'ageBandLabel',
            'memberCount',
            'ownerCoachId',
            'ownerCoachName',
            'nextSessionAt',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            name: { type: 'string' },
            ageBandLabel: nullableStringSchema,
            memberCount: { type: 'integer', minimum: 0 },
            ownerCoachId: nullableStringSchema,
            ownerCoachName: nullableStringSchema,
            nextSessionAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        HeadCoachWatchlistItem: {
          type: 'object',
          additionalProperties: false,
          required: [
            'athleteId',
            'athleteName',
            'coachId',
            'coachName',
            'risk',
            'pendingCount',
            'overdueCount',
            'dueSoonCount',
            'recommendedAction',
            'nextDueAt',
            'latestCoachActionAt',
            'attentionScore',
            'taskIds',
          ],
          properties: {
            athleteId: { type: 'string' },
            athleteName: { type: 'string' },
            coachId: { type: 'string' },
            coachName: { type: 'string' },
            risk: { type: 'string', enum: ['high', 'watch', 'stable'] },
            pendingCount: { type: 'integer', minimum: 0 },
            overdueCount: { type: 'integer', minimum: 0 },
            dueSoonCount: { type: 'integer', minimum: 0 },
            recommendedAction: { type: 'string' },
            nextDueAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            latestCoachActionAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            attentionScore: { type: 'integer', minimum: 0 },
            taskIds: {
              type: 'array',
              items: { type: 'string' },
            },
            squadId: { type: 'string' },
            squadName: { type: 'string' },
          },
        },
        HeadCoachTask: {
          type: 'object',
          additionalProperties: false,
          required: headCoachTaskRequired,
          properties: headCoachTaskProperties,
        },
        HeadCoachTaskResponse: {
          type: 'object',
          additionalProperties: false,
          required: [...headCoachTaskRequired, 'requestId'],
          properties: {
            ...headCoachTaskProperties,
            requestId: { type: 'string' },
          },
        },
        HeadCoachStandard: {
          type: 'object',
          additionalProperties: false,
          required: headCoachStandardRequired,
          properties: headCoachStandardProperties,
        },
        HeadCoachStandardResponse: {
          type: 'object',
          additionalProperties: false,
          required: [...headCoachStandardRequired, 'requestId'],
          properties: {
            ...headCoachStandardProperties,
            requestId: { type: 'string' },
          },
        },
        HeadCoachOversightSummary: {
          type: 'object',
          additionalProperties: false,
          required: [
            'coachCount',
            'squadCount',
            'awaitingCompletionCount',
            'overdueCompletionCount',
            'watchAthleteCount',
            'overdueFollowUpCount',
            'openTaskCount',
            'activeStandardCount',
          ],
          properties: {
            coachCount: { type: 'integer', minimum: 0 },
            squadCount: { type: 'integer', minimum: 0 },
            awaitingCompletionCount: { type: 'integer', minimum: 0 },
            overdueCompletionCount: { type: 'integer', minimum: 0 },
            watchAthleteCount: { type: 'integer', minimum: 0 },
            overdueFollowUpCount: { type: 'integer', minimum: 0 },
            openTaskCount: { type: 'integer', minimum: 0 },
            activeStandardCount: { type: 'integer', minimum: 0 },
          },
        },
        HeadCoachOversightResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'club',
            'viewerMembership',
            'scope',
            'squads',
            'coachHealth',
            'completionQueue',
            'watchlist',
            'tasks',
            'standards',
            'summary',
            'clubId',
            'requestId',
          ],
          properties: {
            club: schemaRef('HeadCoachClub'),
            viewerMembership: schemaRef('HeadCoachMembership'),
            scope: schemaRef('HeadCoachScope'),
            squads: {
              type: 'array',
              items: schemaRef('HeadCoachSquad'),
            },
            coachHealth: {
              type: 'array',
              items: schemaRef('OwnerDashboardCoachHealth'),
            },
            completionQueue: {
              type: 'array',
              items: schemaRef('OwnerDashboardCompletionItem'),
            },
            watchlist: {
              type: 'array',
              items: schemaRef('HeadCoachWatchlistItem'),
            },
            tasks: {
              type: 'array',
              items: schemaRef('HeadCoachTask'),
            },
            standards: {
              type: 'array',
              items: schemaRef('HeadCoachStandard'),
            },
            summary: schemaRef('HeadCoachOversightSummary'),
            clubId: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        ClubSquadReference: {
          type: 'object',
          additionalProperties: false,
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        ClubSquad: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'clubId', 'name', 'memberCount'],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            name: { type: 'string' },
            level: { type: 'string' },
            memberCount: { type: 'integer', minimum: 0 },
            primaryCoach: {
              type: 'string',
              description: 'Assigned owner coach user identifier.',
            },
          },
        },
        ClubSquadCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            level: { type: 'string', minLength: 1, maxLength: 100 },
            ageGroup: { type: 'string', minLength: 1, maxLength: 50 },
            skillLevel: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
        ClubSquadUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            level: { type: 'string', minLength: 1, maxLength: 100 },
            ageGroup: { type: 'string', minLength: 1, maxLength: 50 },
            skillLevel: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
        ClubSquadListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'squads', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            squads: {
              type: 'array',
              items: schemaRef('ClubSquad'),
            },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubSquadResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['squad', 'requestId'],
          properties: {
            squad: schemaRef('ClubSquad'),
            requestId: { type: 'string' },
          },
        },
        ClubRecord: {
          type: 'object',
          additionalProperties: false,
          required: [
            ...clubSummaryRequired,
            'memberCount',
            'coachCount',
            'viewerMembership',
            'squads',
            'viewerGovernance',
          ],
          properties: {
            ...clubSummaryProperties,
            memberCount: { type: 'integer', minimum: 0 },
            coachCount: { type: 'integer', minimum: 0 },
            viewerMembership: {
              anyOf: [schemaRef('ClubMembership'), { type: 'null' }],
            },
            squads: {
              type: 'array',
              items: schemaRef('ClubSquadReference'),
            },
            viewerGovernance: schemaRef('ClubGovernance'),
          },
        },
        ClubCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'city'],
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 100 },
            city: { type: 'string', minLength: 2, maxLength: 120 },
            country: { type: 'string', minLength: 2, maxLength: 80 },
            tagline: { type: 'string', maxLength: 160 },
            badge: { type: 'string', maxLength: 20 },
            visibility: {
              type: 'string',
              enum: ['private', 'public'],
              default: 'private',
            },
            joinPolicy: {
              type: 'string',
              enum: ['INVITE_ONLY', 'REQUEST_TO_JOIN', 'OPEN'],
              default: 'INVITE_ONLY',
            },
            commercialMode: {
              type: 'string',
              enum: ['COACH_OWNED', 'ORG_OWNED'],
              default: 'COACH_OWNED',
            },
            firstStaffRole: {
              anyOf: [
                {
                  type: 'string',
                  enum: ['ADMIN', 'HEAD_COACH', 'COACH', 'ASSISTANT'],
                },
                { type: 'null' },
              ],
            },
          },
        },
        ClubUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 3, maxLength: 100 },
            city: { type: 'string', minLength: 2, maxLength: 120 },
            country: {
              anyOf: [{ type: 'string', minLength: 2, maxLength: 80 }, { type: 'null' }],
            },
            tagline: {
              anyOf: [{ type: 'string', maxLength: 160 }, { type: 'null' }],
            },
            visibility: { type: 'string', enum: ['private', 'public'] },
            joinPolicy: {
              type: 'string',
              enum: ['INVITE_ONLY', 'REQUEST_TO_JOIN', 'OPEN'],
            },
            commercialMode: {
              type: 'string',
              enum: ['COACH_OWNED', 'ORG_OWNED'],
            },
          },
        },
        ClubInviteRole: {
          type: 'string',
          enum: ['MEMBER', 'COACH', 'ADMIN'],
        },
        ClubInviteCode: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'code',
            'role',
            'createdByUserId',
            'createdAt',
            'expiresAt',
            'remainingUses',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            code: { type: 'string' },
            role: schemaRef('ClubInviteRole'),
            createdByUserId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            expiresAt: { type: 'string', format: 'date-time' },
            remainingUses: { type: 'integer', minimum: 0 },
          },
        },
        CreateClubInviteCodeRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['role'],
          properties: {
            role: schemaRef('ClubInviteRole'),
          },
        },
        ClubInviteCodesResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteCodes', 'requestId'],
          properties: {
            inviteCodes: {
              type: 'array',
              items: schemaRef('ClubInviteCode'),
            },
            requestId: { type: 'string' },
          },
        },
        ClubInviteCodeResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteCode', 'requestId'],
          properties: {
            inviteCode: schemaRef('ClubInviteCode'),
            requestId: { type: 'string' },
          },
        },
        ClubListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubs', 'total', 'requestId'],
          properties: {
            clubs: {
              type: 'array',
              items: schemaRef('ClubRecord'),
            },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['club', 'requestId'],
          properties: {
            club: schemaRef('ClubRecord'),
            requestId: { type: 'string' },
          },
        },
        ClubUpdateResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['club', 'requestId'],
          properties: {
            club: schemaRef('ClubRecord'),
            requestId: { type: 'string' },
          },
        },
        ClubCreateResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['club', 'membership', 'primaryInvite', 'requestId'],
          properties: {
            club: schemaRef('ClubSummary'),
            membership: schemaRef('ClubMembership'),
            primaryInvite: schemaRef('ClubInviteCode'),
            firstStaffInvite: schemaRef('ClubInviteCode'),
            requestId: { type: 'string' },
          },
        },
        ClubScheduleActivitySource: {
          type: 'string',
          enum: ['club_event', 'group_session', 'match'],
        },
        ClubScheduleActivityStatus: {
          type: 'string',
          enum: ['scheduled', 'full', 'in_progress', 'cancelled', 'completed'],
        },
        ClubScheduleActivityKind: {
          type: 'string',
          enum: ['informational', 'training', 'match'],
        },
        ClubScheduleParticipationMode: {
          type: 'string',
          enum: ['none', 'rsvp', 'registration', 'availability'],
        },
        ClubScheduleAccessScope: {
          type: 'string',
          enum: ['club', 'squad', 'public', 'mixed', 'private'],
        },
        ClubScheduleActivity: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'source',
            'sourceEntityId',
            'clubId',
            'title',
            'startsAt',
            'status',
            'kind',
            'typeLabel',
            'participationMode',
            'participationLabel',
            'accessScope',
            'accessLabel',
            'audienceLabel',
            'locationLabel',
            'isVirtual',
            'squadIds',
            'allowsExternalRegistration',
          ],
          properties: {
            id: {
              type: 'string',
              pattern: '^club_activity:(club_event|group_session|match):.+$',
            },
            source: schemaRef('ClubScheduleActivitySource'),
            sourceEntityId: { type: 'string', minLength: 1 },
            clubId: { type: 'string', minLength: 1 },
            title: { type: 'string', minLength: 1 },
            description: { type: 'string' },
            startsAt: { type: 'string', format: 'date-time' },
            endsAt: { type: 'string', format: 'date-time' },
            status: schemaRef('ClubScheduleActivityStatus'),
            kind: schemaRef('ClubScheduleActivityKind'),
            typeLabel: { type: 'string', minLength: 1 },
            participationMode: schemaRef('ClubScheduleParticipationMode'),
            participationLabel: { type: 'string', minLength: 1 },
            accessScope: schemaRef('ClubScheduleAccessScope'),
            accessLabel: { type: 'string', minLength: 1 },
            audienceLabel: { type: 'string', minLength: 1 },
            locationLabel: { type: 'string', minLength: 1 },
            isVirtual: { type: 'boolean' },
            price: { type: 'number' },
            currency: { type: 'string' },
            squadId: { type: 'string', minLength: 1 },
            squadIds: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
            },
            allowsExternalRegistration: { type: 'boolean' },
            opponent: { type: 'string' },
            homeAwayLabel: { type: 'string', enum: ['Home', 'Away'] },
            resultLabel: { type: 'string' },
          },
        },
        ClubScheduleResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'activities', 'total', 'seedVersion', 'requestId'],
          properties: {
            clubId: { type: 'string', minLength: 1 },
            activities: {
              type: 'array',
              items: schemaRef('ClubScheduleActivity'),
            },
            total: { type: 'integer', minimum: 0 },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Fixture version in explicit seed test mode; null for live DB reads.',
            },
            requestId: { type: 'string' },
          },
        },
        ClubActivityDetailResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'activity', 'seedVersion', 'requestId'],
          properties: {
            clubId: { type: 'string', minLength: 1 },
            activity: schemaRef('ClubScheduleActivity'),
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Fixture version in explicit seed test mode; null for live DB reads.',
            },
            requestId: { type: 'string' },
          },
        },
        ClubBranding: {
          type: 'object',
          additionalProperties: false,
          required: [
            'clubId',
            'name',
            'tagline',
            'badgeUrl',
            'coverPhotoUrl',
            'primaryColor',
            'secondaryColor',
            'updatedAt',
          ],
          properties: {
            clubId: { type: 'string' },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            tagline: { type: 'string', maxLength: 160 },
            badgeUrl: {
              anyOf: [
                { type: 'string', const: '' },
                { type: 'string', format: 'uri', maxLength: 2048 },
              ],
            },
            coverPhotoUrl: {
              anyOf: [
                { type: 'string', const: '' },
                { type: 'string', format: 'uri', maxLength: 2048 },
              ],
            },
            primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            secondaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ClubBrandingUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            tagline: { type: 'string', maxLength: 160 },
            badgeUrl: {
              anyOf: [
                { type: 'string', const: '' },
                { type: 'string', format: 'uri', maxLength: 2048 },
              ],
            },
            coverPhotoUrl: {
              anyOf: [
                { type: 'string', const: '' },
                { type: 'string', format: 'uri', maxLength: 2048 },
              ],
            },
            primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            secondaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          },
        },
        ClubBrandingResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['branding', 'requestId'],
          properties: {
            branding: schemaRef('ClubBranding'),
            requestId: { type: 'string' },
          },
        },
        ClubIntegrationStatus: {
          type: 'string',
          enum: ['DISCONNECTED', 'CONNECTED', 'NEEDS_REAUTH', 'DISABLED'],
        },
        ClubIntegrationMetadata: {
          type: 'object',
          additionalProperties: schemaRef('JsonValue'),
          description:
            'Non-secret provider metadata only. Credential-looking keys, including nested secret, token, password, API-key, private-key, and credential names, are rejected by the API.',
        },
        ClubIntegration: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'provider',
            'status',
            'displayName',
            'externalAccountId',
            'metadataJson',
            'createdByUserId',
            'updatedByUserId',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            provider: { type: 'string', pattern: '^[A-Z0-9_]{2,60}$' },
            status: schemaRef('ClubIntegrationStatus'),
            displayName: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            externalAccountId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            metadataJson: {
              anyOf: [schemaRef('ClubIntegrationMetadata'), { type: 'null' }],
            },
            createdByUserId: { type: 'string' },
            updatedByUserId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ClubIntegrationCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['provider'],
          properties: {
            provider: {
              type: 'string',
              pattern: '^[A-Za-z0-9_]{2,60}$',
              description: 'Trimmed and normalized to uppercase before persistence.',
            },
            status: {
              ...schemaRef('ClubIntegrationStatus'),
              default: 'DISCONNECTED',
            },
            displayName: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 120 }, { type: 'null' }],
            },
            externalAccountId: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 160 }, { type: 'null' }],
            },
            metadataJson: {
              anyOf: [schemaRef('ClubIntegrationMetadata'), { type: 'null' }],
            },
          },
        },
        ClubIntegrationUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['provider'],
          minProperties: 2,
          properties: {
            provider: {
              type: 'string',
              pattern: '^[A-Za-z0-9_]{2,60}$',
              description: 'Selects the integration after uppercase normalization.',
            },
            status: schemaRef('ClubIntegrationStatus'),
            displayName: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 120 }, { type: 'null' }],
            },
            externalAccountId: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 160 }, { type: 'null' }],
            },
            metadataJson: {
              anyOf: [schemaRef('ClubIntegrationMetadata'), { type: 'null' }],
            },
          },
        },
        ClubIntegrationListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'integrations', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            integrations: {
              type: 'array',
              items: schemaRef('ClubIntegration'),
            },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubIntegrationMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['integration', 'requestId'],
          properties: {
            integration: schemaRef('ClubIntegration'),
            requestId: { type: 'string' },
          },
        },
        CommunityGroupType: {
          type: 'string',
          enum: ['GENERAL', 'CLUB', 'SQUAD'],
        },
        CommunityGroupVisibility: {
          type: 'string',
          enum: ['PUBLIC', 'PRIVATE'],
        },
        CommunityGroupMemberRole: {
          type: 'string',
          enum: ['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'],
        },
        CommunityGroupAssignableRole: {
          type: 'string',
          enum: ['ADMIN', 'MODERATOR', 'MEMBER'],
        },
        CommunityGroupMemberAddRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['memberUserId'],
          properties: {
            memberUserId: { type: 'string', minLength: 1 },
            role: schemaRef('CommunityGroupAssignableRole'),
          },
        },
        CommunityGroupMemberRoleUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['role'],
          properties: {
            role: schemaRef('CommunityGroupAssignableRole'),
          },
        },
        CommunityGroupMembership: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            id: { type: 'string' },
            communityGroupId: { type: 'string' },
            userId: { type: 'string' },
            role: schemaRef('CommunityGroupMemberRole'),
            active: { type: 'boolean' },
            createdByUserId: { type: 'string' },
            updatedByUserId: { type: 'string' },
            version: { type: 'integer', minimum: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        CommunityGroup: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'groupType',
            'clubId',
            'squadId',
            'ownerUserId',
            'name',
            'description',
            'visibility',
            'createdByUserId',
            'updatedByUserId',
            'version',
            'createdAt',
            'updatedAt',
            'deletedAt',
            'deletedByUserId',
            'memberships',
          ],
          properties: {
            id: { type: 'string' },
            groupType: schemaRef('CommunityGroupType'),
            clubId: nullableStringSchema,
            squadId: nullableStringSchema,
            ownerUserId: { type: 'string' },
            name: { type: 'string', minLength: 1, maxLength: 120 },
            description: {
              anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }],
            },
            visibility: schemaRef('CommunityGroupVisibility'),
            createdByUserId: { type: 'string' },
            updatedByUserId: { type: 'string' },
            version: { type: 'integer', minimum: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            deletedByUserId: nullableStringSchema,
            memberships: {
              type: 'array',
              items: schemaRef('CommunityGroupMembership'),
            },
          },
        },
        CommunityGroupCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 120 },
            description: { type: 'string', maxLength: 1000 },
            type: schemaRef('CommunityGroupType'),
            clubId: { type: 'string', minLength: 1 },
            squadId: { type: 'string', minLength: 1 },
            isPublic: { type: 'boolean' },
            memberIds: {
              type: 'array',
              maxItems: 200,
              items: { type: 'string', minLength: 1 },
            },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
          },
          allOf: [
            {
              if: {
                required: ['type'],
                properties: { type: { const: 'CLUB' } },
              },
              then: { required: ['clubId'] },
            },
            {
              if: {
                required: ['type'],
                properties: { type: { const: 'GENERAL' } },
              },
              then: { not: { required: ['clubId'] } },
            },
            {
              if: {
                required: ['type'],
                properties: { type: { const: 'SQUAD' } },
              },
              then: {
                required: ['squadId'],
                not: {
                  required: ['isPublic'],
                  properties: { isPublic: { const: true } },
                },
              },
            },
            {
              if: { required: ['squadId'] },
              then: {
                properties: { type: { const: 'SQUAD' } },
              },
            },
          ],
        },
        CommunityGroupListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['groups', 'seedVersion', 'requestId'],
          properties: {
            groups: {
              type: 'array',
              items: schemaRef('CommunityGroup'),
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['group', 'seedVersion', 'requestId'],
          properties: {
            group: schemaRef('CommunityGroup'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupJoinRequestStatus: {
          type: 'string',
          enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
        },
        CommunityGroupJoinRequestCreateRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            isCoach: { type: 'boolean' },
          },
        },
        CommunityGroupJoinRequest: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            id: { type: 'string' },
            groupId: { type: 'string' },
            groupName: { type: 'string' },
            requesterId: { type: 'string' },
            requesterName: { type: 'string' },
            requestedRole: { type: 'string', const: 'MEMBER' },
            isCoach: { type: 'boolean' },
            status: schemaRef('CommunityGroupJoinRequestStatus'),
            createdAt: { type: 'string', format: 'date-time' },
            respondedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        CommunityGroupJoinRequestListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['requests', 'seedVersion', 'requestId'],
          properties: {
            requests: {
              type: 'array',
              items: schemaRef('CommunityGroupJoinRequest'),
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupJoinRequestResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['request', 'seedVersion', 'requestId'],
          properties: {
            request: schemaRef('CommunityGroupJoinRequest'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupJoinRequestApprovalResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['request', 'group', 'seedVersion', 'requestId'],
          properties: {
            request: schemaRef('CommunityGroupJoinRequest'),
            group: schemaRef('CommunityGroup'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupInviteStatus: {
          type: 'string',
          enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
        },
        CommunityGroupInviteCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['inviteeUserId'],
          properties: {
            inviteeUserId: { type: 'string', minLength: 1 },
            message: { type: 'string', maxLength: 500 },
          },
        },
        CommunityGroupInvite: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'groupId', 'inviterId', 'inviteeId', 'status', 'createdAt'],
          properties: {
            id: { type: 'string' },
            groupId: { type: 'string' },
            groupName: { type: 'string' },
            inviterId: { type: 'string' },
            inviterName: { type: 'string' },
            inviteeId: { type: 'string' },
            inviteeName: { type: 'string' },
            status: schemaRef('CommunityGroupInviteStatus'),
            createdAt: { type: 'string', format: 'date-time' },
            respondedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        CommunityGroupInviteListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invites', 'seedVersion', 'requestId'],
          properties: {
            invites: {
              type: 'array',
              items: schemaRef('CommunityGroupInvite'),
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupInviteResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invite', 'seedVersion', 'requestId'],
          properties: {
            invite: schemaRef('CommunityGroupInvite'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        CommunityGroupInviteAcceptanceResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invite', 'group', 'seedVersion', 'requestId'],
          properties: {
            invite: schemaRef('CommunityGroupInvite'),
            group: schemaRef('CommunityGroup'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        PostVisibility: {
          type: 'string',
          enum: ['PUBLIC', 'CLUB', 'GROUP', 'PRIVATE'],
        },
        PostMediaAttachmentProof: {
          type: 'object',
          additionalProperties: false,
          required: ['mediaObjectId'],
          properties: {
            mediaObjectId: { type: 'string', minLength: 1 },
            title: { type: 'string', minLength: 1, maxLength: 120 },
          },
        },
        PostMediaAttachment: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'mediaObjectId', 'type', 'title'],
          properties: {
            id: { type: 'string' },
            mediaObjectId: { type: 'string' },
            type: { type: 'string', enum: ['photo', 'video', 'pdf'] },
            title: { type: 'string' },
            subtitle: { type: 'string' },
            contentType: { type: 'string' },
            originalFileName: { type: 'string' },
          },
        },
        PostClientMetadata: {
          type: 'object',
          description:
            'Optional display metadata. Media must be supplied through attachments. Attachment and pin fields are backend-owned and rejected when supplied by clients.',
          properties: {
            title: { type: 'string' },
            postType: { type: 'string' },
            postAs: { type: 'string', enum: ['club', 'self'] },
            feedType: { type: 'string', enum: ['PERSONAL', 'CLUB', 'BOTH'] },
            audience: { type: 'string', enum: ['club', 'squad', 'staff'] },
            audienceLabel: { type: 'string' },
            squadId: { type: 'string' },
            eventId: { type: 'string' },
            eventDate: { type: 'string' },
            eventLocation: { type: 'string' },
            badgeAwarded: { type: 'string' },
            sessionId: { type: 'string' },
            matchId: { type: 'string' },
            athleteId: { type: 'string' },
            badgeId: { type: 'string' },
            badgeAwardId: { type: 'string' },
          },
          additionalProperties: true,
          not: {
            anyOf: [
              { required: ['attachments'] },
              { required: ['isPinned'] },
              { required: ['pinnedBy'] },
              { required: ['pinnedAt'] },
            ],
          },
        },
        PostMetadata: {
          type: 'object',
          additionalProperties: true,
          properties: {
            title: { type: 'string' },
            postType: { type: 'string' },
            postAs: { type: 'string', enum: ['club', 'self'] },
            feedType: { type: 'string', enum: ['PERSONAL', 'CLUB', 'BOTH'] },
            audience: { type: 'string', enum: ['club', 'squad', 'staff'] },
            audienceLabel: { type: 'string' },
            squadId: { type: 'string' },
            eventId: { type: 'string' },
            eventDate: { type: 'string' },
            eventLocation: { type: 'string' },
            badgeAwarded: { type: 'string' },
            sessionId: { type: 'string' },
            matchId: { type: 'string' },
            athleteId: { type: 'string' },
            badgeId: { type: 'string' },
            badgeAwardId: { type: 'string' },
            attachments: {
              type: 'array',
              maxItems: 5,
              items: schemaRef('PostMediaAttachment'),
            },
            isPinned: { type: 'boolean' },
            pinnedBy: { type: 'string' },
            pinnedAt: { type: 'string', format: 'date-time' },
          },
        },
        PostAuthor: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'avatarUrl'],
          properties: {
            id: { type: 'string' },
            name: nullableStringSchema,
            avatarUrl: nullableStringSchema,
          },
        },
        PostReaction: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'postId', 'userId', 'reaction', 'createdAt'],
          properties: {
            id: { type: 'string' },
            postId: { type: 'string' },
            userId: { type: 'string' },
            reaction: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PostEmbeddedComment: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'postId',
            'authorUserId',
            'parentCommentId',
            'content',
            'isDeleted',
            'deletedAt',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string' },
            postId: { type: 'string' },
            authorUserId: { type: 'string' },
            parentCommentId: nullableStringSchema,
            content: { type: 'string' },
            isDeleted: { type: 'boolean' },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PostComment: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            id: { type: 'string' },
            postId: { type: 'string' },
            authorUserId: { type: 'string' },
            parentCommentId: nullableStringSchema,
            content: { type: 'string', maxLength: 2000 },
            isDeleted: { type: 'boolean' },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            author: schemaRef('PostAuthor'),
            likesCount: { type: 'integer', minimum: 0 },
            likedByCurrentUser: { type: 'boolean' },
            likes: {
              type: 'array',
              maxItems: 1,
              description:
                'Privacy-minimized projection containing only the current actor id when they liked the comment.',
              items: { type: 'string' },
            },
          },
        },
        Post: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'authorUserId',
            'clubId',
            'communityGroupId',
            'visibility',
            'content',
            'attachmentsJson',
            'commentsCount',
            'reactionsCount',
            'createdByUserId',
            'updatedByUserId',
            'version',
            'createdAt',
            'updatedAt',
            'deletedAt',
            'deletedByUserId',
            'likedByCurrentUser',
            'likes',
            'author',
          ],
          properties: {
            id: { type: 'string' },
            authorUserId: { type: 'string' },
            clubId: nullableStringSchema,
            communityGroupId: nullableStringSchema,
            visibility: schemaRef('PostVisibility'),
            content: { type: 'string', minLength: 1, maxLength: 4000 },
            attachmentsJson: {
              anyOf: [
                schemaRef('PostMetadata'),
                {
                  type: 'array',
                  description:
                    'Legacy persisted attachment metadata shape. New API writes return PostMetadata objects.',
                  items: schemaRef('JsonValue'),
                },
                { type: 'null' },
              ],
            },
            commentsCount: { type: 'integer', minimum: 0 },
            reactionsCount: { type: 'integer', minimum: 0 },
            createdByUserId: { type: 'string' },
            updatedByUserId: { type: 'string' },
            version: { type: 'integer', minimum: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            deletedByUserId: nullableStringSchema,
            likedByCurrentUser: { type: 'boolean' },
            likes: {
              type: 'array',
              maxItems: 1,
              description:
                'Privacy-minimized projection containing only the current actor id when they liked the post.',
              items: { type: 'string' },
            },
            author: schemaRef('PostAuthor'),
            comments: {
              type: 'array',
              items: schemaRef('PostEmbeddedComment'),
            },
            reactions: {
              type: 'array',
              items: schemaRef('PostReaction'),
            },
          },
        },
        PostCreateRequest: {
          type: 'object',
          required: ['content'],
          anyOf: [{ required: ['clubId'] }, { required: ['communityGroupId'] }],
          properties: {
            clubId: { type: 'string', minLength: 1 },
            communityGroupId: { type: 'string', minLength: 1 },
            content: { type: 'string', minLength: 1, maxLength: 4000 },
            visibility: schemaRef('PostVisibility'),
            metadata: schemaRef('PostClientMetadata'),
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
            attachments: {
              type: 'array',
              maxItems: 5,
              items: schemaRef('PostMediaAttachmentProof'),
            },
          },
        },
        PostPinRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['pinned'],
          properties: {
            pinned: { type: 'boolean' },
          },
        },
        PostListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['posts', 'seedVersion', 'requestId'],
          properties: {
            posts: {
              type: 'array',
              items: schemaRef('Post'),
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        PostResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['post', 'seedVersion', 'requestId'],
          properties: {
            post: schemaRef('Post'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        PostCommentCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1, maxLength: 2000 },
            parentCommentId: { type: 'string', minLength: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
          },
        },
        PostCommentListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['comments', 'seedVersion', 'requestId'],
          properties: {
            comments: {
              type: 'array',
              items: schemaRef('PostComment'),
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        PostCommentResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['comment', 'seedVersion', 'requestId'],
          properties: {
            comment: schemaRef('PostComment'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        MessageThreadType: {
          type: 'string',
          enum: ['DIRECT', 'GROUP', 'CLUB', 'SESSION'],
        },
        MessageReceipt: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'messageId',
            'userId',
            'deliveredAt',
            'readAt',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string' },
            messageId: { type: 'string' },
            userId: { type: 'string' },
            deliveredAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            readAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MessageParticipant: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'messageThreadId',
            'userId',
            'role',
            'lastReadAt',
            'muted',
            'joinedAt',
            'leftAt',
          ],
          properties: {
            id: { type: 'string' },
            messageThreadId: { type: 'string' },
            userId: { type: 'string' },
            role: nullableStringSchema,
            lastReadAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            muted: { type: 'boolean' },
            joinedAt: { type: 'string', format: 'date-time' },
            leftAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        Message: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'messageThreadId',
            'senderUserId',
            'content',
            'attachmentsJson',
            'editedAt',
            'deletedAt',
            'createdAt',
            'updatedAt',
            'receipts',
          ],
          properties: {
            id: { type: 'string' },
            messageThreadId: { type: 'string' },
            senderUserId: { type: 'string' },
            content: { type: 'string', maxLength: 2000 },
            attachmentsJson: {
              anyOf: [
                {
                  type: 'array',
                  maxItems: 5,
                  items: schemaRef('PostMediaAttachment'),
                },
                { type: 'null' },
              ],
            },
            editedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            receipts: {
              type: 'array',
              items: schemaRef('MessageReceipt'),
            },
          },
        },
        MessageThread: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            id: { type: 'string' },
            threadType: schemaRef('MessageThreadType'),
            clubId: nullableStringSchema,
            communityGroupId: nullableStringSchema,
            groupSessionId: nullableStringSchema,
            bookingId: nullableStringSchema,
            title: nullableStringSchema,
            lastMessageAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            createdByUserId: { type: 'string' },
            updatedByUserId: { type: 'string' },
            version: { type: 'integer', minimum: 1 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            deletedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            participants: {
              type: 'array',
              items: schemaRef('MessageParticipant'),
            },
            messages: {
              type: 'array',
              items: schemaRef('Message'),
            },
          },
        },
        MessageCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['body'],
          properties: {
            body: { type: 'string', minLength: 1, maxLength: 2000 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
            attachments: {
              type: 'array',
              maxItems: 5,
              items: schemaRef('PostMediaAttachmentProof'),
            },
          },
        },
        MessageThreadListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['threads', 'seedVersion', 'requestId'],
          properties: {
            threads: {
              type: 'array',
              items: schemaRef('MessageThread'),
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        MessageMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['message', 'thread', 'seedVersion', 'requestId'],
          properties: {
            message: schemaRef('Message'),
            thread: schemaRef('MessageThread'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        MessageThreadResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['thread', 'seedVersion', 'requestId'],
          properties: {
            thread: schemaRef('MessageThread'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        NullableMessageThreadResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['thread', 'seedVersion', 'requestId'],
          properties: {
            thread: {
              anyOf: [schemaRef('MessageThread'), { type: 'null' }],
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        NotificationStatus: {
          type: 'string',
          enum: ['UNREAD', 'READ', 'DISMISSED'],
        },
        Notification: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'userId',
            'type',
            'title',
            'body',
            'status',
            'sourceType',
            'sourceId',
            'deepLink',
            'metadataJson',
            'createdAt',
            'updatedAt',
            'readAt',
            'dismissedAt',
          ],
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            type: { type: 'string' },
            title: { type: 'string' },
            body: nullableStringSchema,
            status: schemaRef('NotificationStatus'),
            sourceType: nullableStringSchema,
            sourceId: nullableStringSchema,
            deepLink: nullableStringSchema,
            metadataJson: {
              anyOf: [schemaRef('JsonObject'), { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            readAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            dismissedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        NotificationPreference: {
          type: 'object',
          additionalProperties: false,
          required: [
            'userId',
            'pushEnabled',
            'emailEnabled',
            'smsEnabled',
            'settingsJson',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            userId: { type: 'string' },
            pushEnabled: { type: 'boolean' },
            emailEnabled: { type: 'boolean' },
            smsEnabled: { type: 'boolean' },
            settingsJson: {
              anyOf: [schemaRef('JsonObject'), { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        MutedSource: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'userId', 'sourceType', 'sourceId', 'reason', 'mutedAt', 'unmutedAt'],
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            sourceType: { type: 'string' },
            sourceId: { type: 'string' },
            reason: nullableStringSchema,
            mutedAt: { type: 'string', format: 'date-time' },
            unmutedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
          },
        },
        QuietHours: {
          type: 'object',
          additionalProperties: false,
          required: [
            'userId',
            'enabled',
            'startTimeLocal',
            'endTimeLocal',
            'timeZone',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            userId: { type: 'string' },
            enabled: { type: 'boolean' },
            startTimeLocal: nullableStringSchema,
            endTimeLocal: nullableStringSchema,
            timeZone: nullableStringSchema,
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        NotificationChannelSettingsInput: {
          type: 'object',
          additionalProperties: false,
          properties: {
            push: { type: 'boolean' },
            email: { type: 'boolean' },
            sms: { type: 'boolean' },
          },
        },
        NotificationQuietHoursInput: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            startTime: {
              type: 'string',
              pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
            },
            endTime: {
              type: 'string',
              pattern: '^([01]\\d|2[0-3]):[0-5]\\d$',
            },
            timezone: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              description: 'Valid IANA time zone identifier.',
            },
          },
        },
        NotificationTypePreferenceInput: {
          type: 'object',
          additionalProperties: false,
          properties: {
            enabled: { type: 'boolean' },
            channels: {
              type: 'array',
              maxItems: 3,
              items: { type: 'string', enum: ['PUSH', 'EMAIL', 'SMS'] },
            },
          },
        },
        MutedCoachInput: {
          type: 'object',
          additionalProperties: false,
          required: ['coachId'],
          properties: {
            coachId: { type: 'string', minLength: 1 },
            reason: {
              anyOf: [{ type: 'string', maxLength: 240 }, { type: 'null' }],
            },
          },
        },
        NotificationPreferenceUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            channels: schemaRef('NotificationChannelSettingsInput'),
            quietHours: schemaRef('NotificationQuietHoursInput'),
            typePreferences: {
              type: 'object',
              additionalProperties: schemaRef('NotificationTypePreferenceInput'),
            },
            mutedCoaches: {
              type: 'array',
              maxItems: 200,
              items: schemaRef('MutedCoachInput'),
            },
          },
        },
        NotificationListResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'notifications',
            'preferences',
            'mutedSources',
            'quietHours',
            'unreadCount',
            'seedVersion',
            'requestId',
          ],
          properties: {
            notifications: {
              type: 'array',
              items: schemaRef('Notification'),
            },
            preferences: {
              anyOf: [schemaRef('NotificationPreference'), { type: 'null' }],
            },
            mutedSources: {
              type: 'array',
              items: schemaRef('MutedSource'),
            },
            quietHours: {
              anyOf: [schemaRef('QuietHours'), { type: 'null' }],
            },
            unreadCount: { type: 'integer', minimum: 0 },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        NotificationMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['notification', 'seedVersion', 'requestId'],
          properties: {
            notification: schemaRef('Notification'),
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        NotificationBulkMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['notifications', 'unreadCount', 'seedVersion', 'requestId'],
          properties: {
            notifications: {
              type: 'array',
              items: schemaRef('Notification'),
            },
            unreadCount: { type: 'integer', minimum: 0 },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        NotificationPreferenceMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['preferences', 'mutedSources', 'quietHours', 'seedVersion', 'requestId'],
          properties: {
            preferences: schemaRef('NotificationPreference'),
            mutedSources: {
              type: 'array',
              items: schemaRef('MutedSource'),
            },
            quietHours: {
              anyOf: [schemaRef('QuietHours'), { type: 'null' }],
            },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string' },
          },
        },
        WorkAssignmentUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['assigneeCoachId'],
          properties: {
            assigneeCoachId: { type: 'string', minLength: 1 },
          },
        },
        WorkAssignmentUpdateResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'clubId',
            'assignmentId',
            'previousCoachUserId',
            'assigneeCoachId',
            'updatedBookingIds',
            'requestId',
          ],
          properties: {
            clubId: { type: 'string' },
            assignmentId: { type: 'string' },
            previousCoachUserId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            assigneeCoachId: { type: 'string' },
            updatedBookingIds: {
              type: 'array',
              items: { type: 'string' },
            },
            requestId: { type: 'string' },
          },
        },
        WorkAssignmentHistoryAction: {
          type: 'string',
          enum: ['ASSIGNED', 'REASSIGNED', 'UPDATED'],
        },
        WorkAssignmentHistoryActorRole: {
          type: 'string',
          enum: ['COACH', 'USER', 'PARENT', 'ADMIN'],
        },
        WorkAssignmentHistoryEvent: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'action', 'timestamp', 'toCoachId'],
          properties: {
            id: { type: 'string' },
            action: schemaRef('WorkAssignmentHistoryAction'),
            timestamp: { type: 'string', format: 'date-time' },
            actorUserId: { type: 'string' },
            actorName: { type: 'string' },
            actorRole: schemaRef('WorkAssignmentHistoryActorRole'),
            fromCoachId: { type: 'string' },
            toCoachId: { type: 'string' },
          },
        },
        WorkAssignmentHistoryResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'assignmentId', 'events', 'total', 'truncated', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            assignmentId: { type: 'string' },
            events: {
              type: 'array',
              maxItems: 100,
              items: schemaRef('WorkAssignmentHistoryEvent'),
            },
            total: { type: 'integer', minimum: 0, maximum: 100 },
            truncated: {
              type: 'boolean',
              description:
                'True when older successful assignment audit events exist beyond this bounded response.',
            },
            requestId: { type: 'string' },
          },
        },
        ClubMembership: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'clubId', 'userId', 'role', 'active', 'createdAt', 'updatedAt'],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            userId: { type: 'string' },
            role: schemaRef('ClubRole'),
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        ClubMatchType: {
          type: 'string',
          enum: ['FRIENDLY', 'LEAGUE', 'CUP', 'TOURNAMENT'],
        },
        ClubMatchStatus: {
          type: 'string',
          enum: ['SCHEDULED', 'LINEUP_SET', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        },
        ClubMatchPlayerStatus: {
          type: 'string',
          enum: ['INVITED', 'AVAILABLE', 'UNAVAILABLE', 'SELECTED', 'RESERVE'],
        },
        ClubMatchPlayer: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'parentId', 'status'],
          properties: {
            athleteId: { type: 'string' },
            parentId: { type: 'string' },
            status: schemaRef('ClubMatchPlayerStatus'),
            responseAt: { type: 'string', format: 'date-time' },
            parentNote: { type: 'string' },
            position: { type: 'string' },
            jerseyNumber: { type: 'integer', minimum: 0, maximum: 99 },
          },
        },
        ClubMatchResult: {
          type: 'object',
          additionalProperties: false,
          required: ['home', 'away'],
          properties: {
            home: { type: 'integer', minimum: 0, maximum: 99 },
            away: { type: 'integer', minimum: 0, maximum: 99 },
          },
        },
        ClubMatch: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'coachId',
            'title',
            'matchType',
            'opponent',
            'isHome',
            'date',
            'kickoffTime',
            'timeZone',
            'venue',
            'maxPlayers',
            'selectedPlayers',
            'status',
            'createdAt',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            squadId: { type: 'string' },
            coachId: { type: 'string' },
            title: { type: 'string' },
            matchType: schemaRef('ClubMatchType'),
            opponent: { type: 'string' },
            isHome: { type: 'boolean' },
            date: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            kickoffTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            timeZone: {
              type: 'string',
              example: 'Europe/London',
              description: 'Persisted IANA timezone used to interpret and render match wall-clock values.',
            },
            meetTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            venue: { type: 'string' },
            address: { type: 'string' },
            maxPlayers: { type: 'integer', minimum: 1, maximum: 30 },
            selectedPlayers: {
              type: 'array',
              items: schemaRef('ClubMatchPlayer'),
            },
            status: schemaRef('ClubMatchStatus'),
            result: schemaRef('ClubMatchResult'),
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string' },
          },
        },
        ClubMatchListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'matches', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            matches: { type: 'array', items: schemaRef('ClubMatch') },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        CreateClubMatchRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'matchType', 'opponent', 'date', 'kickoffTime', 'venue'],
          properties: {
            squadId: {
              anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }],
            },
            title: { type: 'string', minLength: 2, maxLength: 160 },
            matchType: schemaRef('ClubMatchType'),
            opponent: { type: 'string', minLength: 2, maxLength: 120 },
            isHome: { type: 'boolean', default: true },
            date: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            kickoffTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            meetTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            venue: { type: 'string', minLength: 2, maxLength: 160 },
            address: { type: 'string', maxLength: 240 },
            maxPlayers: { type: 'integer', minimum: 1, maximum: 30, default: 14 },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
        ClubMatchResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['match', 'requestId'],
          properties: {
            match: schemaRef('ClubMatch'),
            requestId: { type: 'string' },
          },
        },
        ImportClubMatchItem: {
          type: 'object',
          additionalProperties: false,
          required: ['opponent', 'date', 'kickoffTime', 'venue'],
          properties: {
            source: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              pattern: '^[A-Za-z0-9_.:-]+$',
            },
            externalId: { type: 'string', minLength: 1, maxLength: 160 },
            squadId: {
              anyOf: [{ type: 'string', minLength: 1 }, { type: 'null' }],
            },
            title: { type: 'string', minLength: 2, maxLength: 160 },
            matchType: { ...schemaRef('ClubMatchType'), default: 'FRIENDLY' },
            opponent: { type: 'string', minLength: 2, maxLength: 120 },
            isHome: { type: 'boolean', default: true },
            date: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            kickoffTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            meetTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            venue: { type: 'string', minLength: 2, maxLength: 160 },
            address: { type: 'string', maxLength: 240 },
            maxPlayers: { type: 'integer', minimum: 1, maximum: 30, default: 14 },
            notes: { type: 'string', maxLength: 1000 },
          },
        },
        ImportClubMatchesRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['matches'],
          properties: {
            source: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              pattern: '^[A-Za-z0-9_.:-]+$',
            },
            matches: {
              type: 'array',
              minItems: 1,
              maxItems: 50,
              items: schemaRef('ImportClubMatchItem'),
            },
          },
        },
        ClubMatchImportSkipped: {
          type: 'object',
          additionalProperties: false,
          required: ['source', 'externalId', 'matchId', 'reason'],
          properties: {
            source: { type: 'string' },
            externalId: { type: 'string' },
            matchId: { type: 'string' },
            reason: { type: 'string', enum: ['already_imported'] },
          },
        },
        ImportClubMatchesResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'imported', 'skipped', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            imported: { type: 'array', items: schemaRef('ClubMatch') },
            skipped: { type: 'array', items: schemaRef('ClubMatchImportSkipped') },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubEventType: {
          type: 'string',
          enum: [
            'TOURNAMENT',
            'SOCIAL',
            'MEETING',
            'PRESENTATION',
            'FUNDRAISER',
            'TRIAL_DAY',
            'TRAINING_CAMP',
            'OTHER',
          ],
        },
        ClubEventTargetAudience: {
          type: 'string',
          enum: ['ALL', 'COACHES', 'PARENTS', 'ATHLETES', 'SQUAD'],
        },
        ClubEventStatus: {
          type: 'string',
          enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
        },
        ClubEventRsvpSummary: {
          type: 'object',
          additionalProperties: false,
          required: ['going', 'maybe', 'notGoing', 'totalGuests'],
          properties: {
            going: { type: 'integer', minimum: 0 },
            maybe: { type: 'integer', minimum: 0 },
            notGoing: { type: 'integer', minimum: 0 },
            totalGuests: { type: 'integer', minimum: 0 },
          },
        },
        CreateClubEventRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'eventType', 'date', 'startTime', 'venue', 'targetAudience'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 180 },
            description: { type: 'string', maxLength: 5000, default: '' },
            eventType: schemaRef('ClubEventType'),
            date: {
              type: 'string',
              format: 'date',
              description: 'Local calendar date in the authenticated creator account time zone.',
            },
            startTime: {
              type: 'string',
              pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$',
              description: 'Local wall-clock time in the authenticated creator account time zone.',
            },
            endTime: {
              type: 'string',
              pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$',
              description: 'Must be after startTime on the same date.',
            },
            venue: { type: 'string', minLength: 1, maxLength: 240 },
            address: { type: 'string', maxLength: 500 },
            isVirtual: { type: 'boolean', default: false },
            meetingLink: { type: 'string', format: 'uri' },
            targetAudience: schemaRef('ClubEventTargetAudience'),
            squadIds: {
              type: 'array',
              items: { type: 'string', minLength: 1 },
              default: [],
            },
            athleteIds: {
              type: 'array',
              maxItems: 200,
              items: { type: 'string', minLength: 1 },
              default: [],
            },
            maxAttendees: { type: 'integer', minimum: 1, maximum: 10000 },
            price: { type: 'number', minimum: 0, maximum: 100000, default: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3, default: 'GBP' },
            rsvpRequired: { type: 'boolean', default: true },
            rsvpDeadline: {
              type: 'string',
              format: 'date',
              description: 'Cannot be after the event date.',
            },
            imageUrl: { type: 'string', format: 'uri' },
          },
        },
        ClubEvent: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'createdBy',
            'title',
            'description',
            'eventType',
            'date',
            'startDate',
            'startTime',
            'timeZone',
            'venue',
            'location',
            'isVirtual',
            'targetAudience',
            'squadIds',
            'athleteIds',
            'allClub',
            'currentParticipants',
            'price',
            'currency',
            'rsvpRequired',
            'rsvpSummary',
            'status',
            'createdAt',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            createdBy: { type: 'string' },
            title: { type: 'string', minLength: 1, maxLength: 180 },
            description: { type: 'string', maxLength: 5000 },
            eventType: schemaRef('ClubEventType'),
            date: { type: 'string', format: 'date' },
            startDate: { type: 'string', format: 'date' },
            startTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            endTime: { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
            timeZone: {
              type: 'string',
              minLength: 1,
              maxLength: 80,
              description: 'IANA timezone used to interpret and display the event schedule.',
            },
            venue: { type: 'string', minLength: 1, maxLength: 240 },
            location: { type: 'string', minLength: 1, maxLength: 240 },
            address: { type: 'string', maxLength: 500 },
            isVirtual: { type: 'boolean' },
            meetingLink: { type: 'string', format: 'uri' },
            targetAudience: schemaRef('ClubEventTargetAudience'),
            squadIds: { type: 'array', items: { type: 'string' } },
            athleteIds: { type: 'array', items: { type: 'string' } },
            allClub: { type: 'boolean' },
            maxAttendees: { type: 'integer', minimum: 1 },
            maxParticipants: { type: 'integer', minimum: 1 },
            currentParticipants: { type: 'integer', minimum: 0 },
            price: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            rsvpRequired: { type: 'boolean' },
            rsvpDeadline: { type: 'string', format: 'date-time' },
            rsvpSummary: schemaRef('ClubEventRsvpSummary'),
            status: schemaRef('ClubEventStatus'),
            imageUrl: { type: 'string', format: 'uri' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        ClubEventListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'events', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            events: { type: 'array', items: schemaRef('ClubEvent') },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubEventResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['event', 'requestId'],
          properties: {
            event: schemaRef('ClubEvent'),
            requestId: { type: 'string' },
          },
        },
        ClubMember: {
          type: 'object',
          additionalProperties: false,
          required: ['userId', 'userName', 'role', 'status', 'joinedAt', 'squadIds'],
          properties: {
            userId: { type: 'string' },
            userName: { type: 'string' },
            userPhotoUrl: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            role: schemaRef('ClubRole'),
            status: {
              type: 'string',
              enum: ['active', 'pending', 'banned'],
            },
            joinedAt: { type: 'string', format: 'date-time' },
            squadIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        ClubMemberRemovalReason: {
          type: 'string',
          enum: ['LEFT_CLUB', 'INACTIVE', 'CONDUCT', 'SEASON_END', 'OTHER'],
        },
        ClubMemberRemovalRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            reason: {
              ...schemaRef('ClubMemberRemovalReason'),
              default: 'OTHER',
            },
            customReason: {
              anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }],
            },
          },
        },
        ClubMemberSelfLeaveRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            reason: {
              ...schemaRef('ClubMemberRemovalReason'),
              default: 'LEFT_CLUB',
            },
            customReason: {
              anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }],
            },
          },
        },
        ClubMemberRoleUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['role'],
          properties: {
            role: schemaRef('ClubRole'),
          },
        },
        ClubMemberBanRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 3, maxLength: 500 },
          },
        },
        ClubMemberRemoval: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'clubId',
            'userId',
            'userName',
            'userRole',
            'reason',
            'removedBy',
            'removedByName',
            'removedAt',
            'originalMembership',
          ],
          properties: {
            id: { type: 'string' },
            clubId: { type: 'string' },
            userId: { type: 'string' },
            userName: { type: 'string' },
            userRole: schemaRef('ClubRole'),
            reason: {
              type: 'string',
              description:
                'Persisted removal reason. Current member-removal inputs use ClubMemberRemovalReason.',
            },
            customReason: {
              anyOf: [{ type: 'string', maxLength: 500 }, { type: 'null' }],
            },
            removedBy: { type: 'string' },
            removedByName: { type: 'string' },
            removedAt: { type: 'string', format: 'date-time' },
            originalMembership: schemaRef('ClubMembership'),
          },
        },
        ClubMemberListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'members', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            members: {
              type: 'array',
              items: schemaRef('ClubMember'),
            },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubMemberRemovalListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['clubId', 'removals', 'total', 'requestId'],
          properties: {
            clubId: { type: 'string' },
            removals: {
              type: 'array',
              items: schemaRef('ClubMemberRemoval'),
            },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ClubMemberResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['member', 'requestId'],
          properties: {
            member: schemaRef('ClubMember'),
            requestId: { type: 'string' },
          },
        },
        ClubMemberRemovalResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['removal', 'requestId'],
          properties: {
            removal: schemaRef('ClubMemberRemoval'),
            requestId: { type: 'string' },
          },
        },
        SafeguardingCategory: {
          type: 'string',
          enum: [
            'session_conduct',
            'injury_followup',
            'medical_concern',
            'booking_issue_safety',
            'other',
          ],
        },
        SafeguardingSeverity: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
        },
        SafeguardingIncidentStatus: {
          type: 'string',
          enum: ['open', 'in_review', 'closed'],
        },
        SafeguardingActionType: {
          type: 'string',
          enum: [
            'note_added',
            'escalated',
            'contacted_guardian',
            'contacted_authority',
            'close_case',
            'reopen_case',
          ],
        },
        CreateSafeguardingIncidentRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['category', 'summary'],
          properties: {
            athleteId: { type: 'string' },
            bookingId: { type: 'string' },
            category: schemaRef('SafeguardingCategory'),
            severity: {
              ...schemaRef('SafeguardingSeverity'),
              default: 'medium',
            },
            summary: { type: 'string', minLength: 1, maxLength: 300 },
            details: { type: 'string', maxLength: 5000 },
          },
        },
        CreateSafeguardingActionRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['actionType', 'notes'],
          properties: {
            actionType: schemaRef('SafeguardingActionType'),
            notes: { type: 'string', minLength: 1, maxLength: 5000 },
          },
        },
        SafeguardingActionResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'incidentId', 'actionType', 'notes', 'performedByUserId', 'createdAt'],
          properties: {
            id: { type: 'string' },
            incidentId: { type: 'string' },
            actionType: schemaRef('SafeguardingActionType'),
            notes: { type: 'string' },
            performedByUserId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SafeguardingIncidentResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            id: { type: 'string' },
            athleteId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            bookingId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            category: schemaRef('SafeguardingCategory'),
            severity: schemaRef('SafeguardingSeverity'),
            status: schemaRef('SafeguardingIncidentStatus'),
            summary: { type: 'string' },
            details: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            reportedByUserId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            actions: {
              type: 'array',
              items: schemaRef('SafeguardingActionResponse'),
            },
          },
        },
        SafeguardingIncidentListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['incidents', 'total'],
          properties: {
            incidents: {
              type: 'array',
              items: schemaRef('SafeguardingIncidentResponse'),
            },
            total: { type: 'integer', minimum: 0 },
            requestId: { type: 'string' },
          },
        },
        ReportType: {
          type: 'string',
          enum: ['inappropriate', 'safety_concern', 'fake_profile', 'spam', 'other'],
        },
        ReportContext: {
          type: 'string',
          enum: ['profile', 'message', 'review'],
        },
        ReportStatus: {
          type: 'string',
          enum: ['pending', 'reviewed', 'resolved'],
        },
        CreateReportRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['reportedUserId', 'type', 'context'],
          properties: {
            reportedUserId: { type: 'string', minLength: 1 },
            type: schemaRef('ReportType'),
            description: { type: 'string', maxLength: 2000 },
            context: schemaRef('ReportContext'),
          },
        },
        Report: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'reportedUserId',
            'reportedByUserId',
            'type',
            'context',
            'createdAt',
            'status',
          ],
          properties: {
            id: { type: 'string' },
            reportedUserId: { type: 'string' },
            reportedByUserId: { type: 'string' },
            type: schemaRef('ReportType'),
            description: { type: 'string' },
            context: schemaRef('ReportContext'),
            createdAt: { type: 'string', format: 'date-time' },
            status: schemaRef('ReportStatus'),
          },
        },
        ReportListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['reports', 'total', 'seedVersion', 'requestId'],
          properties: {
            reports: {
              type: 'array',
              items: schemaRef('Report'),
            },
            total: { type: 'integer', minimum: 0 },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        ReportMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['report', 'autoBlocked', 'requestId'],
          properties: {
            report: schemaRef('Report'),
            autoBlocked: {
              type: 'boolean',
              description:
                'True when the serious report category also created an actor-owned user block.',
            },
            requestId: { type: 'string' },
          },
        },
        BlockRelationship: {
          type: 'string',
          enum: ['none', 'blocked_by_actor', 'blocked_by_target', 'mutual'],
        },
        BlockUserRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['blockedUserId'],
          properties: {
            blockedUserId: { type: 'string', minLength: 1 },
          },
        },
        UserBlock: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'blockerUserId', 'blockedUserId', 'createdAt', 'updatedAt'],
          properties: {
            id: { type: 'string' },
            blockerUserId: { type: 'string' },
            blockedUserId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BlockedUserSummary: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'blockedAt'],
          properties: {
            id: { type: 'string' },
            name: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              description:
                'Display name retained only for an active account; null for unavailable accounts.',
            },
            blockedAt: { type: 'string', format: 'date-time' },
          },
        },
        BlockStatus: {
          type: 'object',
          additionalProperties: false,
          required: ['relationship', 'blocked', 'blockerId', 'blockedId'],
          properties: {
            relationship: schemaRef('BlockRelationship'),
            blocked: { type: 'boolean' },
            blockerId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            blockedId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
          },
        },
        BlockListResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'blocks',
            'blockedUserIds',
            'blockedUsers',
            'total',
            'status',
            'seedVersion',
            'requestId',
          ],
          properties: {
            blocks: {
              type: 'array',
              items: schemaRef('UserBlock'),
            },
            blockedUserIds: {
              type: 'array',
              items: { type: 'string' },
            },
            blockedUsers: {
              type: 'array',
              items: schemaRef('BlockedUserSummary'),
            },
            total: { type: 'integer', minimum: 0 },
            status: {
              anyOf: [schemaRef('BlockStatus'), { type: 'null' }],
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        BlockMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['status', 'requestId'],
          properties: {
            status: schemaRef('BlockStatus'),
            requestId: { type: 'string' },
          },
        },
        FollowActorType: {
          type: 'string',
          enum: ['USER', 'COACH'],
        },
        Follow: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'followerId',
            'followerType',
            'followingId',
            'followingType',
            'createdAt',
            'notifyOnPost',
            'notifyOnSession',
          ],
          properties: {
            id: { type: 'string' },
            followerId: { type: 'string' },
            followerType: schemaRef('FollowActorType'),
            followingId: { type: 'string' },
            followingType: schemaRef('FollowActorType'),
            createdAt: { type: 'string', format: 'date-time' },
            notifyOnPost: { type: 'boolean' },
            notifyOnSession: { type: 'boolean' },
          },
        },
        FollowCreateRequest: {
          type: 'object',
          required: ['followingId'],
          properties: {
            followingId: { type: 'string', minLength: 1 },
            followingType: schemaRef('FollowActorType'),
            notifyOnPost: { type: 'boolean' },
            notifyOnSession: { type: 'boolean' },
          },
        },
        FollowListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['follows', 'followerIds', 'followingIds', 'total', 'dataVersion', 'requestId'],
          properties: {
            follows: {
              type: 'array',
              items: schemaRef('Follow'),
            },
            followerIds: {
              type: 'array',
              items: { type: 'string' },
            },
            followingIds: {
              type: 'array',
              items: { type: 'string' },
            },
            total: { type: 'integer', minimum: 0 },
            dataVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        FollowStatusResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['follow', 'following', 'requestId'],
          properties: {
            follow: {
              anyOf: [schemaRef('Follow'), { type: 'null' }],
            },
            following: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
        FollowReadResponse: {
          oneOf: [schemaRef('FollowListResponse'), schemaRef('FollowStatusResponse')],
        },
        FollowCreateResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['follow', 'requestId'],
          properties: {
            follow: schemaRef('Follow'),
            requestId: { type: 'string' },
          },
        },
        FollowPreferenceUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          properties: {
            notifyOnPost: { type: 'boolean' },
            notifyOnSession: { type: 'boolean' },
          },
        },
        FollowPreferenceMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['follow', 'updated', 'requestId'],
          properties: {
            follow: {
              anyOf: [schemaRef('Follow'), { type: 'null' }],
            },
            updated: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
        FollowRemovalResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['follow', 'removed', 'requestId'],
          properties: {
            follow: {
              anyOf: [schemaRef('Follow'), { type: 'null' }],
            },
            removed: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
        FollowRequestStatus: {
          type: 'string',
          enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
        },
        FollowRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'requesterId', 'targetId', 'status', 'createdAt'],
          properties: {
            id: { type: 'string' },
            requesterId: { type: 'string' },
            targetId: { type: 'string' },
            status: schemaRef('FollowRequestStatus'),
            message: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            respondedAt: { type: 'string', format: 'date-time' },
          },
        },
        FollowRequestListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['requests', 'total', 'dataVersion', 'requestId'],
          properties: {
            requests: {
              type: 'array',
              items: schemaRef('FollowRequest'),
            },
            total: { type: 'integer', minimum: 0 },
            dataVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        FollowRequestCreateRequest: {
          type: 'object',
          required: ['targetId'],
          properties: {
            targetId: { type: 'string', minLength: 1 },
            message: { type: 'string', minLength: 1, maxLength: 500 },
          },
        },
        FollowRequestMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['request', 'created', 'requestId'],
          properties: {
            request: schemaRef('FollowRequest'),
            created: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
        FollowRequestDecision: {
          type: 'string',
          enum: ['ACCEPTED', 'DECLINED'],
        },
        FollowRequestDecisionRequest: {
          type: 'object',
          required: ['response'],
          properties: {
            response: schemaRef('FollowRequestDecision'),
          },
        },
        FollowRequestDecisionResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['request', 'requestId'],
          properties: {
            request: schemaRef('FollowRequest'),
            requestId: { type: 'string' },
          },
        },
        MedicalTermList: {
          type: 'array',
          maxItems: 30,
          items: { type: 'string', minLength: 1, maxLength: 160 },
        },
        InjurySeverity: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
        InjuryStatus: {
          type: 'string',
          enum: ['active', 'recovering', 'resolved'],
        },
        CreateInjuryRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'type', 'severity'],
          description:
            'When both timestamps are supplied, expectedRecoveryDate must not precede reportedAt.',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 120 },
            type: { type: 'string', minLength: 1, maxLength: 80 },
            severity: schemaRef('InjurySeverity'),
            reportedAt: { type: 'string', format: 'date-time' },
            expectedRecoveryDate: { type: 'string', format: 'date-time' },
            notes: { type: 'string', maxLength: 2000 },
          },
        },
        UpdateInjuryRequest: {
          type: 'object',
          additionalProperties: false,
          minProperties: 1,
          description:
            'resolvedAt is server-owned: resolving sets it and reopening clears it. Omitted fields are preserved.',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 120 },
            type: { type: 'string', minLength: 1, maxLength: 80 },
            severity: schemaRef('InjurySeverity'),
            status: schemaRef('InjuryStatus'),
            expectedRecoveryDate: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            notes: {
              anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }],
            },
          },
        },
        InjuryRecord: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'athleteId',
            'title',
            'type',
            'severity',
            'status',
            'reportedAt',
            'expectedRecoveryDate',
            'resolvedAt',
            'notes',
            'createdByUserId',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', pattern: '^inj_[A-Za-z0-9-]+$' },
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            title: { type: 'string' },
            type: { type: 'string' },
            severity: schemaRef('InjurySeverity'),
            status: schemaRef('InjuryStatus'),
            reportedAt: { type: 'string', format: 'date-time' },
            expectedRecoveryDate: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            resolvedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            createdByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        InjuriesResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'injuries'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            injuries: { type: 'array', items: schemaRef('InjuryRecord') },
          },
        },
        UpdateMedicalRecordRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            conditions: schemaRef('MedicalTermList'),
            allergies: schemaRef('MedicalTermList'),
            medications: schemaRef('MedicalTermList'),
            restrictions: schemaRef('MedicalTermList'),
            doctorName: {
              anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }],
            },
            doctorPhone: {
              anyOf: [{ type: 'string', maxLength: 40 }, { type: 'null' }],
            },
            insuranceProvider: {
              anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }],
            },
            insuranceNumber: {
              anyOf: [{ type: 'string', maxLength: 120 }, { type: 'null' }],
            },
            emergencyNotes: {
              anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }],
            },
            senNotes: {
              anyOf: [{ type: 'string', maxLength: 2000 }, { type: 'null' }],
            },
          },
          minProperties: 1,
        },
        MedicalRecordResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'athleteId',
            'conditions',
            'allergies',
            'medications',
            'restrictions',
            'doctorName',
            'doctorPhone',
            'insuranceProvider',
            'insuranceNumber',
            'emergencyNotes',
            'senNotes',
            'updatedAt',
            'updatedByUserId',
          ],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            conditions: { type: 'array', items: { type: 'string' } },
            allergies: { type: 'array', items: { type: 'string' } },
            medications: { type: 'array', items: { type: 'string' } },
            restrictions: { type: 'array', items: { type: 'string' } },
            doctorName: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            doctorPhone: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            insuranceProvider: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            insuranceNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            emergencyNotes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            senNotes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            updatedAt: { type: 'string', format: 'date-time' },
            updatedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
          },
        },
        EmergencyContactInput: {
          type: 'object',
          additionalProperties: false,
          required: ['name', 'relationship', 'phone'],
          properties: {
            id: { type: 'string', pattern: '^emc_[A-Za-z0-9-]+$' },
            name: { type: 'string', minLength: 1, maxLength: 120 },
            relationship: { type: 'string', minLength: 1, maxLength: 80 },
            phone: { type: 'string', minLength: 3, maxLength: 40 },
            email: { type: 'string', format: 'email' },
            isPrimary: { type: 'boolean' },
            canPickup: { type: 'boolean' },
          },
        },
        UpdateEmergencyContactsRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['contacts'],
          properties: {
            contacts: {
              type: 'array',
              maxItems: 10,
              items: schemaRef('EmergencyContactInput'),
            },
          },
        },
        EmergencyContact: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'relationship', 'phone', 'isPrimary', 'canPickup'],
          properties: {
            id: { type: 'string', pattern: '^emc_[A-Za-z0-9-]+$' },
            name: { type: 'string' },
            relationship: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            isPrimary: { type: 'boolean' },
            canPickup: { type: 'boolean' },
          },
        },
        EmergencyContactsResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'contacts', 'updatedAt', 'updatedByUserId'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            contacts: { type: 'array', items: schemaRef('EmergencyContact') },
            updatedAt: { type: 'string', format: 'date-time' },
            updatedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
          },
        },
        ConsentType: {
          type: 'string',
          enum: ['PHOTO', 'VIDEO', 'SOCIAL_MEDIA', 'EMERGENCY_TREATMENT'],
        },
        ConsentRecord: {
          type: 'object',
          additionalProperties: false,
          required: ['type', 'granted', 'grantedBy'],
          properties: {
            type: schemaRef('ConsentType'),
            granted: { type: 'boolean' },
            grantedAt: { type: 'string', format: 'date-time' },
            grantedBy: { type: 'string', maxLength: 120 },
            expiryAt: { type: 'string', format: 'date-time' },
          },
        },
        UpsertConsentsRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['consents'],
          properties: {
            consents: {
              type: 'array',
              maxItems: 4,
              description: 'Each consent type may appear at most once; omitted types are denied.',
              items: schemaRef('ConsentRecord'),
            },
          },
        },
        ConsentsResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'consents', 'updatedAt', 'updatedByUserId'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            consents: { type: 'array', items: schemaRef('ConsentRecord') },
            updatedAt: { type: 'string', format: 'date-time' },
            updatedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
          },
        },
        AuthAccountType: {
          type: 'string',
          enum: ['COACH', 'PARENT', 'ATHLETE'],
        },
        AuthAppRole: {
          type: 'string',
          enum: ['COACH', 'USER', 'ADMIN'],
        },
        AuthTokens: {
          type: 'object',
          additionalProperties: false,
          required: ['accessToken', 'refreshToken', 'expiresAt'],
          properties: {
            accessToken: {
              type: 'string',
              description: 'Bearer JWT access token.',
            },
            refreshToken: {
              type: 'string',
              description: 'JWT refresh token for /v1/auth/refresh.',
            },
            expiresAt: {
              type: 'integer',
              description: 'Access token expiry as a Unix timestamp in milliseconds.',
            },
          },
        },
        AuthUserChildLink: {
          type: 'object',
          additionalProperties: false,
          required: ['childId', 'childName', 'relationshipType', 'addedAt'],
          properties: {
            childId: { type: 'string' },
            childName: { type: 'string' },
            relationshipType: {
              type: 'string',
              enum: ['PARENT_CHILD', 'GUARDIAN'],
            },
            addedAt: { type: 'string', format: 'date-time' },
          },
        },
        AuthUser: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'email',
            'accountType',
            'firstName',
            'lastName',
            'isVerified',
            'onboardingComplete',
            'createdAt',
            'updatedAt',
            'roles',
            'appRole',
          ],
          properties: {
            id: { type: 'string' },
            athleteId: {
              type: 'string',
              description: 'Canonical Athlete.id linked to this user through Athlete.userId.',
            },
            athleteName: {
              type: 'string',
              description: 'Display name of the linked athlete profile.',
            },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', maxLength: 40 },
            accountType: schemaRef('AuthAccountType'),
            firstName: { type: 'string', minLength: 1, maxLength: 80 },
            lastName: { type: 'string', minLength: 1, maxLength: 80 },
            dateOfBirth: { type: 'string' },
            photoUrl: { type: 'string', format: 'uri' },
            addressLine: { type: 'string', maxLength: 160 },
            city: { type: 'string', maxLength: 80 },
            postcode: { type: 'string', maxLength: 24 },
            country: { type: 'string', maxLength: 80 },
            skillLevel: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'] },
            position: { type: 'string', maxLength: 80 },
            sport: { type: 'string', maxLength: 80 },
            goals: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            childrenCount: { type: 'integer', minimum: 0 },
            children: {
              type: 'array',
              items: schemaRef('AuthUserChildLink'),
            },
            hasChildren: { type: 'boolean' },
            isOrganization: { type: 'boolean' },
            organizationName: { type: 'string', maxLength: 120 },
            certifications: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            yearsExperience: { type: 'integer', minimum: 0, maximum: 80 },
            specializations: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            bio: { type: 'string', maxLength: 2000 },
            hourlyRate: { type: 'integer', minimum: 0, maximum: 10000 },
            isVerified: { type: 'boolean' },
            isLive: { type: 'boolean' },
            onboardingComplete: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            roles: {
              type: 'array',
              items: { type: 'string' },
            },
            appRole: schemaRef('AuthAppRole'),
          },
        },
        AuthLoginRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
        AuthRegisterRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['email', 'password', 'accountType', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6, maxLength: 200 },
            phone: { type: 'string', minLength: 3, maxLength: 40 },
            accountType: schemaRef('AuthAccountType'),
            firstName: { type: 'string', minLength: 1, maxLength: 80 },
            lastName: { type: 'string', minLength: 1, maxLength: 80 },
            dateOfBirth: { type: 'string' },
            skillLevel: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'] },
            position: { type: 'string' },
            sport: { type: 'string' },
            isOrganization: { type: 'boolean' },
            organizationName: { type: 'string' },
            inviteCode: { type: 'string' },
          },
        },
        AuthRefreshRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string', minLength: 8 },
          },
        },
        AuthRevokeRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            refreshToken: { type: 'string', minLength: 8 },
          },
        },
        AuthProfilePatchRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            email: { type: 'string', format: 'email', maxLength: 254 },
            firstName: { type: 'string', minLength: 1, maxLength: 80 },
            lastName: { type: 'string', minLength: 1, maxLength: 80 },
            dateOfBirth: { type: 'string' },
            photoUrl: {
              anyOf: [{ type: 'string', format: 'uri' }, { type: 'null' }],
            },
            addressLine: { type: 'string', maxLength: 160 },
            city: { type: 'string', maxLength: 80 },
            postcode: { type: 'string', maxLength: 24 },
            country: { type: 'string', maxLength: 80 },
            skillLevel: { type: 'string', enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ELITE'] },
            position: { type: 'string', maxLength: 80 },
            sport: { type: 'string', maxLength: 80 },
            goals: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            childrenCount: { type: 'integer', minimum: 0 },
            isOrganization: { type: 'boolean' },
            organizationName: { type: 'string', maxLength: 120 },
            certifications: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            yearsExperience: { type: 'integer', minimum: 0, maximum: 80 },
            specializations: {
              type: 'array',
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            bio: { type: 'string', maxLength: 2000 },
            hourlyRate: { type: 'integer', minimum: 0, maximum: 10000 },
            isLive: { type: 'boolean' },
            onboardingComplete: { type: 'boolean' },
            phone: { type: 'string', maxLength: 40 },
          },
        },
        ForgotPasswordRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        PasswordResetDebugResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['resetToken', 'expiresAt', 'requestId'],
          properties: {
            resetToken: {
              type: 'string',
              description:
                'One-use password reset token. Only returned by explicit test/development outbox mode.',
            },
            expiresAt: { type: 'string', format: 'date-time' },
            requestId: { type: 'string' },
          },
        },
        ResetPasswordRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string', minLength: 3 },
            newPassword: { type: 'string', minLength: 6, maxLength: 200 },
          },
        },
        VerifyEmailRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 12 },
          },
        },
        EmailAvailabilityResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['available', 'requestId'],
          properties: {
            available: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
        AuthLoginResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['user', 'tokens', 'requestId'],
          properties: {
            user: schemaRef('AuthUser'),
            tokens: schemaRef('AuthTokens'),
            requestId: { type: 'string' },
          },
        },
        AuthRegisterResponse: {
          allOf: [
            schemaRef('AuthLoginResponse'),
            {
              type: 'object',
              properties: {
                emailVerificationToken: {
                  type: 'string',
                  description:
                    'One-use email verification token. Only returned by explicit test/development outbox mode.',
                },
                emailVerificationExpiresAt: { type: 'string', format: 'date-time' },
              },
            },
          ],
        },
        AuthTokenResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['tokens', 'requestId'],
          properties: {
            tokens: schemaRef('AuthTokens'),
            requestId: { type: 'string' },
          },
        },
        AuthProfileResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['user', 'requestId'],
          properties: {
            user: schemaRef('AuthUser'),
            requestId: { type: 'string' },
          },
        },
        AthleteAnalyticsPeriod: {
          type: 'string',
          enum: ['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'],
        },
        AthleteAnalyticsSkillHistoryEntry: {
          type: 'object',
          additionalProperties: false,
          required: ['date', 'level'],
          properties: {
            date: { type: 'string', format: 'date' },
            level: { type: 'number', minimum: 0, maximum: 100 },
          },
        },
        AthleteAnalyticsSkill: {
          type: 'object',
          additionalProperties: false,
          required: [
            'skillName',
            'category',
            'currentLevel',
            'previousLevel',
            'changePercent',
            'history',
          ],
          properties: {
            skillName: { type: 'string', minLength: 1, maxLength: 120 },
            category: { type: 'string', minLength: 1, maxLength: 120 },
            currentLevel: { type: 'number', minimum: 0, maximum: 100 },
            previousLevel: { type: 'number', minimum: 0, maximum: 100 },
            changePercent: { type: 'number' },
            averageLevel: { type: 'number', minimum: 0, maximum: 100 },
            history: {
              type: 'array',
              minItems: 1,
              items: schemaRef('AthleteAnalyticsSkillHistoryEntry'),
            },
          },
        },
        AthleteAnalyticsGoalMilestone: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'goalId', 'title', 'isCompleted', 'order'],
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 180 },
            goalId: { type: 'string', minLength: 1, maxLength: 180 },
            title: { type: 'string', minLength: 1, maxLength: 180 },
            isCompleted: { type: 'boolean' },
            completedAt: { type: 'string', format: 'date-time' },
            order: { type: 'integer', minimum: 0 },
          },
        },
        AthleteAnalyticsGoal: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'userId',
            'athleteId',
            'title',
            'category',
            'status',
            'progress',
            'milestones',
            'createdBy',
            'createdById',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', minLength: 1, maxLength: 180 },
            userId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            title: { type: 'string', minLength: 1, maxLength: 160 },
            description: { type: 'string', minLength: 1, maxLength: 2000 },
            category: {
              type: 'string',
              enum: ['BALL_SKILLS', 'ATTACKING', 'DEFENDING', 'GAME_SENSE', 'CHARACTER', 'OTHER'],
            },
            targetDate: { type: 'string', minLength: 1, maxLength: 40 },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'],
            },
            progress: { type: 'number', minimum: 0, maximum: 100 },
            milestones: {
              type: 'array',
              items: schemaRef('AthleteAnalyticsGoalMilestone'),
            },
            createdBy: { type: 'string', enum: ['COACH', 'ATHLETE', 'PARENT'] },
            createdById: { type: 'string', minLength: 1, maxLength: 180 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AthleteAnalytics: {
          type: 'object',
          additionalProperties: false,
          required: [
            'athleteId',
            'period',
            'totalSessions',
            'sessionsThisPeriod',
            'averageSessionRating',
            'attendanceRate',
            'skills',
            'activeGoals',
            'completedGoals',
            'improvementRate',
            'consistencyScore',
            'percentileRank',
          ],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            period: schemaRef('AthleteAnalyticsPeriod'),
            totalSessions: { type: 'integer', minimum: 0 },
            sessionsThisPeriod: { type: 'integer', minimum: 0 },
            averageSessionRating: { type: 'number', minimum: 0, maximum: 5 },
            attendanceRate: { type: 'number', minimum: 0, maximum: 100 },
            skills: { type: 'array', items: schemaRef('AthleteAnalyticsSkill') },
            activeGoals: { type: 'array', items: schemaRef('AthleteAnalyticsGoal') },
            completedGoals: { type: 'array', items: schemaRef('AthleteAnalyticsGoal') },
            improvementRate: { type: 'number', minimum: 0, maximum: 100 },
            consistencyScore: { type: 'number', minimum: 0, maximum: 100 },
            percentileRank: { type: 'number', minimum: 0, maximum: 100 },
            lastSessionDate: { type: 'string', format: 'date' },
          },
        },
        AthleteAnalyticsResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'analytics', 'seedVersion', 'requestId'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            analytics: schemaRef('AthleteAnalytics'),
            seedVersion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        AthleteSkillHistoryResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'skills', 'seedVersion', 'requestId'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            skills: {
              type: 'array',
              items: schemaRef('AthleteAnalyticsSkill'),
            },
            seedVersion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        PracticeLogCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['minutes', 'idempotencyKey'],
          properties: {
            minutes: { type: 'integer', minimum: 1, maximum: 1440 },
            note: { type: 'string', minLength: 1, maxLength: 1000 },
            dateKey: { type: 'string', format: 'date' },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
          },
        },
        PracticeLogEntry: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'athleteId',
            'authorUserId',
            'dateKey',
            'minutes',
            'note',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', pattern: '^plog_[A-Za-z0-9-]+$' },
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            authorUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            dateKey: { type: 'string', format: 'date' },
            minutes: { type: 'integer', minimum: 1, maximum: 1440 },
            note: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 1000 }, { type: 'null' }],
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        PracticeLogListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'logs', 'total', 'seedVersion', 'requestId'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            logs: {
              type: 'array',
              maxItems: 100,
              items: schemaRef('PracticeLogEntry'),
            },
            total: { type: 'integer', minimum: 0 },
            seedVersion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        PracticeLogTodayResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'log', 'dateKey', 'timeZone', 'seedVersion', 'requestId'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            log: {
              anyOf: [schemaRef('PracticeLogEntry'), { type: 'null' }],
            },
            dateKey: { type: 'string', format: 'date' },
            timeZone: { type: 'string', minLength: 1, maxLength: 80 },
            seedVersion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        PracticeLogMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'athleteId',
            'log',
            'addedMinutes',
            'created',
            'replayed',
            'timeZone',
            'seedVersion',
            'requestId',
          ],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            log: schemaRef('PracticeLogEntry'),
            addedMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
            created: { type: 'boolean' },
            replayed: { type: 'boolean' },
            timeZone: { type: 'string', minLength: 1, maxLength: 80 },
            seedVersion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        AthleteSkillUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['skillName', 'score', 'idempotencyKey'],
          not: { required: ['bookingId', 'sessionId'] },
          properties: {
            skillName: { type: 'string', minLength: 1, maxLength: 120 },
            score: { type: 'integer', minimum: 1, maximum: 10 },
            bookingId: { type: 'string', minLength: 1, maxLength: 120 },
            sessionId: { type: 'string', minLength: 1, maxLength: 120 },
            assessedAt: { type: 'string', format: 'date-time' },
            notes: { type: 'string', minLength: 1, maxLength: 1000 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
          },
        },
        AthleteSkillAssessment: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'athleteId',
            'skillDefinitionId',
            'assessorUserId',
            'score',
            'notes',
            'bookingId',
            'assessedAt',
            'createdAt',
          ],
          properties: {
            id: { type: 'string', pattern: '^ska_[A-Za-z0-9-]+$' },
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            skillDefinitionId: { type: 'string', pattern: '^skd_[A-Za-z0-9-]+$' },
            assessorUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            score: { type: 'integer', minimum: 1, maximum: 10 },
            notes: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 1000 }, { type: 'null' }],
            },
            bookingId: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 120 }, { type: 'null' }],
            },
            assessedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AthleteSkillDefinition: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'code',
            'name',
            'category',
            'description',
            'active',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', pattern: '^skd_[A-Za-z0-9-]+$' },
            code: { type: 'string', pattern: '^[A-Z0-9_]+$', minLength: 1, maxLength: 120 },
            name: { type: 'string', minLength: 1, maxLength: 120 },
            category: { type: 'string', minLength: 1, maxLength: 120 },
            description: {
              anyOf: [{ type: 'string', minLength: 1, maxLength: 500 }, { type: 'null' }],
            },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AthleteSkillUpdateResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'athleteId',
            'skillAssessment',
            'skillDefinition',
            'previousScore',
            'score',
            'replayed',
            'seedVersion',
            'requestId',
          ],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            skillAssessment: schemaRef('AthleteSkillAssessment'),
            skillDefinition: schemaRef('AthleteSkillDefinition'),
            previousScore: {
              anyOf: [{ type: 'integer', minimum: 1, maximum: 10 }, { type: 'null' }],
            },
            score: { type: 'integer', minimum: 1, maximum: 10 },
            replayed: { type: 'boolean' },
            seedVersion: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        UserDirectoryRole: {
          type: 'string',
          enum: ['COACH', 'PARENT', 'ADMIN', 'USER'],
        },
        AdminUserSummary: {
          type: 'object',
          additionalProperties: false,
          required: ['total', 'coaches', 'athletes', 'parents'],
          properties: {
            total: { type: 'integer', minimum: 0 },
            coaches: { type: 'integer', minimum: 0 },
            athletes: { type: 'integer', minimum: 0 },
            parents: { type: 'integer', minimum: 0 },
          },
        },
        AdminUserSummaryResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['summary', 'seedVersion', 'requestId'],
          properties: {
            summary: schemaRef('AdminUserSummary'),
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        UserDirectoryEntry: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'name', 'role'],
          description:
            'Privacy-filtered user projection. Email and postcode are relationship/query dependent; date of birth is never returned.',
          properties: {
            id: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            name: { type: 'string', minLength: 1, maxLength: 160 },
            email: { type: 'string', format: 'email', maxLength: 320 },
            avatar: { type: 'string', minLength: 1, maxLength: 4096 },
            postcode: { type: 'string', minLength: 1, maxLength: 32 },
            role: schemaRef('UserDirectoryRole'),
          },
        },
        UserSearchResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['users', 'total', 'seedVersion', 'requestId'],
          properties: {
            users: {
              type: 'array',
              maxItems: 20,
              items: schemaRef('UserDirectoryEntry'),
            },
            total: { type: 'integer', minimum: 0, maximum: 20 },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        UserProfileResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['user', 'seedVersion', 'requestId'],
          properties: {
            user: schemaRef('UserDirectoryEntry'),
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        BookingStatus: {
          type: 'string',
          enum: [
            'PENDING',
            'AWAITING_CONFIRMATION',
            'CONFIRMED',
            'AWAITING_COMPLETION',
            'COMPLETED',
            'CANCELLED',
            'DECLINED',
            'WITHDRAWN',
            'EXPIRED',
          ],
        },
        CreateBookingRequest: {
          type: 'object',
          additionalProperties: false,
          required: [
            'coachUserId',
            'athleteIds',
            'bookedByUserId',
            'scheduledAt',
            'durationMinutes',
            'location',
            'serviceType',
          ],
          properties: {
            coachUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            clubId: { type: 'string', minLength: 1, maxLength: 160 },
            athleteIds: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              items: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            },
            bookedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            scheduledAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
            location: { type: 'string', minLength: 1, maxLength: 200 },
            serviceType: { type: 'string', minLength: 1, maxLength: 80 },
            sessionTemplateId: { type: 'string' },
            objectives: {
              type: 'array',
              maxItems: 20,
              items: { type: 'string', minLength: 1, maxLength: 120 },
              default: [],
            },
            notes: { type: 'string', maxLength: 2000 },
            priceMinor: { type: 'integer', minimum: 0 },
            currency: { type: 'string', enum: ['GBP'], default: 'GBP' },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        UpdateBookingRequest: {
          type: 'object',
          additionalProperties: false,
          anyOf: [
            { required: ['scheduledAt'] },
            { required: ['durationMinutes'] },
            { required: ['location'] },
            { required: ['serviceType'] },
            { required: ['objectives'] },
            { required: ['notes'] },
            { required: ['priceMinor'] },
            { required: ['currency'] },
          ],
          properties: {
            scheduledAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
            location: { type: 'string', minLength: 1, maxLength: 200 },
            serviceType: { type: 'string', minLength: 1, maxLength: 80 },
            objectives: {
              type: 'array',
              maxItems: 20,
              items: { type: 'string', minLength: 1, maxLength: 120 },
            },
            notes: { type: 'string', maxLength: 2000 },
            priceMinor: { type: 'integer', minimum: 0 },
            currency: { type: 'string', enum: ['GBP'] },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        CancelBookingRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 1, maxLength: 200 },
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        ReopenBookingRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        ConfirmBookingRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        ResolveBookingRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 1, maxLength: 200 },
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        BookingCompletionAttendanceInput: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'status'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            status: { type: 'string', enum: ['ATTENDED', 'NO_SHOW'] },
            notes: { type: 'string', maxLength: 1000 },
            effortRating: { type: 'integer', minimum: 1, maximum: 5 },
          },
        },
        CompleteBookingRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            note: { type: 'string', maxLength: 1000 },
            completedAt: { type: 'string', format: 'date-time' },
            attendance: {
              type: 'array',
              maxItems: 50,
              items: schemaRef('BookingCompletionAttendanceInput'),
            },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        BookingParticipant: {
          type: 'object',
          additionalProperties: false,
          required: ['athleteId', 'status'],
          properties: {
            athleteId: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            guardianUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            status: { type: 'string', enum: ['confirmed', 'pending', 'cancelled'] },
          },
        },
        BookingResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'coachUserId',
            'status',
            'scheduledAt',
            'durationMinutes',
            'location',
            'objectives',
            'currency',
            'participants',
            'version',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', pattern: '^bok_[A-Za-z0-9-]+$' },
            coachUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            clubId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            bookedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            recurringSeriesId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            groupSessionId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            status: schemaRef('BookingStatus'),
            scheduledAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer' },
            location: { type: 'string' },
            serviceType: { type: 'string' },
            sessionTemplateId: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            objectives: { type: 'array', items: { type: 'string' } },
            notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
            priceMinor: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
            currency: { type: 'string' },
            participants: { type: 'array', items: schemaRef('BookingParticipant') },
            version: { type: 'integer', minimum: 0 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            cancelledAt: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
            requestExpiresAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            requestResolvedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            requestResolutionReason: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
          },
        },
        BookingListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['bookings', 'total', 'requestId'],
          properties: {
            bookings: { type: 'array', items: schemaRef('BookingResponse') },
            total: { type: 'integer', minimum: 0 },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string', minLength: 1 },
          },
        },
        BookingSeriesFrequency: {
          type: 'string',
          enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'],
        },
        CreateBookingSeriesOccurrence: {
          type: 'object',
          additionalProperties: false,
          required: ['scheduledAt', 'durationMinutes'],
          properties: {
            scheduledAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
            location: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
        CreateBookingSeriesRequest: {
          type: 'object',
          additionalProperties: false,
          required: [
            'coachUserId',
            'athleteIds',
            'bookedByUserId',
            'occurrences',
            'location',
            'serviceType',
          ],
          properties: {
            coachUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            athleteIds: {
              type: 'array',
              minItems: 1,
              maxItems: 20,
              items: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            },
            bookedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            occurrences: {
              type: 'array',
              minItems: 1,
              maxItems: 52,
              items: schemaRef('CreateBookingSeriesOccurrence'),
            },
            location: { type: 'string', minLength: 1, maxLength: 200 },
            serviceType: { type: 'string', minLength: 1, maxLength: 80 },
            sessionTemplateId: { type: 'string' },
            objectives: {
              type: 'array',
              maxItems: 20,
              items: { type: 'string', minLength: 1, maxLength: 120 },
              default: [],
            },
            notes: { type: 'string', maxLength: 2000 },
            priceMinor: { type: 'integer', minimum: 0 },
            currency: { type: 'string', enum: ['GBP'], default: 'GBP' },
            frequency: { ...schemaRef('BookingSeriesFrequency'), default: 'CUSTOM' },
            patternLabel: { type: 'string', minLength: 1, maxLength: 160 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        CancelBookingSeriesRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['reason'],
          properties: {
            reason: { type: 'string', minLength: 1, maxLength: 200 },
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        PauseBookingSeriesRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            reason: { type: 'string', maxLength: 200 },
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        ResumeBookingSeriesRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            note: { type: 'string', maxLength: 1000 },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        UpdateBookingSeriesRequest: {
          type: 'object',
          additionalProperties: false,
          anyOf: [
            { required: ['coachUserId'] },
            { required: ['time'] },
            { required: ['durationMinutes'] },
            { required: ['location'] },
            { required: ['notes'] },
            { required: ['endDate'] },
          ],
          properties: {
            coachUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
            durationMinutes: { type: 'integer', minimum: 15, maximum: 480 },
            location: { type: 'string', minLength: 1, maxLength: 200 },
            notes: { type: 'string', maxLength: 2000 },
            endDate: { type: 'string', format: 'date-time' },
            expectedVersion: { type: 'integer', minimum: 1 },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 200 },
          },
        },
        BookingSeriesResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'coachUserId',
            'bookedByUserId',
            'athleteIds',
            'frequency',
            'status',
            'startDate',
            'endDate',
            'bookingIds',
            'scheduledDates',
            'objectives',
            'currency',
            'version',
            'createdAt',
            'updatedAt',
          ],
          properties: {
            id: { type: 'string', pattern: '^rec_[A-Za-z0-9-]+$' },
            coachUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            bookedByUserId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            athleteIds: {
              type: 'array',
              items: { type: 'string', pattern: '^ath_[A-Za-z0-9-]+$' },
            },
            frequency: schemaRef('BookingSeriesFrequency'),
            patternLabel: nullableStringSchema,
            status: {
              type: 'string',
              enum: ['ACTIVE', 'PARTIAL', 'PAUSED', 'COMPLETED', 'CANCELLED'],
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            bookingIds: {
              type: 'array',
              items: { type: 'string', pattern: '^bok_[A-Za-z0-9-]+$' },
            },
            scheduledDates: {
              type: 'array',
              items: { type: 'string', format: 'date-time' },
              default: [],
            },
            durationMinutes: {
              anyOf: [{ type: 'integer' }, { type: 'null' }],
            },
            location: nullableStringSchema,
            serviceType: nullableStringSchema,
            objectives: { type: 'array', items: { type: 'string' }, default: [] },
            priceMinor: {
              anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
            },
            totalPriceMinor: {
              anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
            },
            currency: { type: 'string', default: 'GBP' },
            version: { type: 'integer', minimum: 0 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        BookingSeriesListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['series', 'total', 'requestId'],
          properties: {
            series: { type: 'array', items: schemaRef('BookingSeriesResponse') },
            total: { type: 'integer', minimum: 0 },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string', minLength: 1 },
          },
        },
        BookingSeriesMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['series', 'bookings', 'requestId'],
          properties: {
            series: schemaRef('BookingSeriesResponse'),
            bookings: { type: 'array', items: schemaRef('BookingResponse') },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        CancellationRecord: {
          type: 'object',
          additionalProperties: false,
          required: [
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
          ],
          properties: {
            id: { type: 'string', minLength: 1 },
            bookingId: { type: 'string', pattern: '^bok_[A-Za-z0-9-]+$' },
            cancelledBy: { type: 'string', enum: ['coach', 'parent'] },
            cancelledAt: { type: 'string', format: 'date-time' },
            reason: { type: 'string' },
            reasonCategory: { type: 'string' },
            note: { type: 'string' },
            refundAmount: { type: 'number', minimum: 0 },
            refundPercentage: { type: 'number', minimum: 0, maximum: 100 },
            hoursBeforeSession: { type: 'number', minimum: 0 },
            coachId: { type: 'string', pattern: '^usr_[A-Za-z0-9-]+$' },
            familyId: { type: 'string', minLength: 1 },
          },
        },
        CancellationRecordListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['records', 'total', 'seedVersion', 'requestId'],
          properties: {
            records: { type: 'array', items: schemaRef('CancellationRecord') },
            total: { type: 'integer', minimum: 0 },
            seedVersion: nullableStringSchema,
            requestId: { type: 'string', minLength: 1 },
          },
        },
        CancellationRecordLookupResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['record', 'requestId'],
          properties: {
            record: {
              anyOf: [schemaRef('CancellationRecord'), { type: 'null' }],
            },
            requestId: { type: 'string', minLength: 1 },
          },
        },
        GroupSessionCompletionAttendanceInput: {
          type: 'object',
          additionalProperties: false,
          required: ['registrationId', 'status'],
          properties: {
            registrationId: { type: 'string', minLength: 1 },
            status: { type: 'string', enum: ['ATTENDED', 'NO_SHOW'] },
            notes: { type: 'string', maxLength: 1000 },
            effortRating: { type: 'integer', minimum: 1, maximum: 5 },
          },
        },
        CompleteGroupSessionRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['occurrenceDate', 'attendance'],
          properties: {
            occurrenceDate: { type: 'string', format: 'date' },
            attendance: {
              type: 'array',
              maxItems: 200,
              items: schemaRef('GroupSessionCompletionAttendanceInput'),
            },
          },
        },
        MarkGroupSessionAttendanceRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['date'],
          properties: {
            date: { type: 'string', format: 'date' },
            status: {
              oneOf: [{ type: 'string', enum: ['ATTENDED', 'NO_SHOW'] }, { type: 'null' }],
              description:
                'Explicit attendance state. Use null to preserve the prior proof as CLEARED.',
            },
            attended: {
              type: 'boolean',
              deprecated: true,
              description:
                'Legacy compatibility field. true records ATTENDED and false clears attendance.',
            },
          },
          oneOf: [
            { required: ['status'], not: { required: ['attended'] } },
            { required: ['attended'], not: { required: ['status'] } },
          ],
        },
        GroupSessionRegistrationMutationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['registration', 'requestId'],
          properties: {
            registration: schemaRef('JsonObject'),
            seedVersion: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        GroupSessionRosterResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['session', 'registrations', 'total', 'occurrenceDate', 'requestId'],
          properties: {
            session: schemaRef('JsonObject'),
            registrations: {
              type: 'array',
              items: schemaRef('JsonObject'),
            },
            total: { type: 'integer', minimum: 0 },
            occurrenceDate: {
              oneOf: [{ type: 'string', format: 'date' }, { type: 'null' }],
            },
            seedVersion: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        GroupSessionCompletionResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['groupSession', 'registrations', 'occurrenceDate', 'requestId'],
          properties: {
            groupSession: schemaRef('JsonObject'),
            registrations: {
              type: 'array',
              items: schemaRef('JsonObject'),
            },
            occurrenceDate: { type: 'string', format: 'date' },
            seedVersion: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        SimulatedProvider: {
          type: 'string',
          enum: ['simulated'],
          description:
            'API-backed simulated provider used for staging/demo money flows. No real funds are wired.',
        },
        PayoutMethodType: {
          type: 'string',
          enum: ['BANK_ACCOUNT', 'PAYPAL', 'STRIPE'],
        },
        WithdrawalStatus: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'],
        },
        PayoutMethod: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'coachId', 'type', 'isDefault', 'isVerified', 'createdAt'],
          properties: {
            id: { type: 'string' },
            coachId: { type: 'string' },
            type: schemaRef('PayoutMethodType'),
            isDefault: { type: 'boolean' },
            isVerified: { type: 'boolean' },
            bankName: { type: 'string', maxLength: 120 },
            accountLastFour: {
              type: 'string',
              pattern: '^\\d{4}$',
              description: 'Only the final four account digits are returned.',
            },
            paypalEmail: { type: 'string', format: 'email', maxLength: 254 },
            stripeAccountId: { type: 'string', maxLength: 120 },
            nickname: { type: 'string', maxLength: 80 },
            createdAt: { type: 'string', format: 'date-time' },
            verifiedAt: { type: 'string', format: 'date-time' },
          },
        },
        PayoutMethodCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: {
            type: schemaRef('PayoutMethodType'),
            isDefault: { type: 'boolean' },
            bankName: { type: 'string', minLength: 1, maxLength: 120 },
            accountLastFour: { type: 'string', pattern: '^\\d{4}$' },
            sortCode: {
              type: 'string',
              minLength: 1,
              maxLength: 24,
              description:
                'Request-only setup field. Raw sort code is not returned by payout method responses.',
            },
            paypalEmail: { type: 'string', format: 'email', maxLength: 254 },
            stripeAccountId: { type: 'string', minLength: 1, maxLength: 120 },
            nickname: { type: 'string', minLength: 1, maxLength: 80 },
          },
        },
        PayoutMethodsResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['payoutMethods', 'total', 'provider', 'providerConfigured', 'requestId'],
          properties: {
            payoutMethod: schemaRef('PayoutMethod'),
            payoutMethods: {
              type: 'array',
              items: schemaRef('PayoutMethod'),
            },
            total: { type: 'integer', minimum: 0 },
            provider: schemaRef('SimulatedProvider'),
            providerConfigured: {
              type: 'boolean',
              enum: [false],
              description: 'False until a real payout provider adapter and webhook path exist.',
            },
            requestId: { type: 'string' },
          },
        },
        Withdrawal: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'coachId',
            'amount',
            'currency',
            'fee',
            'netAmount',
            'payoutMethodId',
            'payoutMethod',
            'status',
            'requestedAt',
          ],
          properties: {
            id: { type: 'string' },
            coachId: { type: 'string' },
            amount: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            fee: { type: 'number', minimum: 0 },
            netAmount: { type: 'number', minimum: 0 },
            payoutMethodId: { type: 'string' },
            payoutMethod: schemaRef('PayoutMethodType'),
            status: schemaRef('WithdrawalStatus'),
            requestedAt: { type: 'string', format: 'date-time' },
            processedAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
            failureReason: { type: 'string' },
            reference: {
              type: 'string',
              description: 'Simulated payout reference, not a bank transfer confirmation.',
            },
          },
        },
        WithdrawalRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['amount', 'payoutMethodId'],
          properties: {
            amount: { type: 'number', minimum: 0.01, maximum: 1000000, multipleOf: 0.01 },
            payoutMethodId: { type: 'string', minLength: 1 },
          },
        },
        WithdrawalsResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'withdrawals',
            'total',
            'status',
            'provider',
            'providerConfigured',
            'requestId',
          ],
          properties: {
            withdrawal: schemaRef('Withdrawal'),
            withdrawals: {
              type: 'array',
              items: schemaRef('Withdrawal'),
            },
            total: { type: 'integer', minimum: 0 },
            status: { type: 'string', enum: ['all', 'pending'] },
            provider: schemaRef('SimulatedProvider'),
            providerConfigured: {
              type: 'boolean',
              enum: [false],
              description: 'False until a real payout provider adapter and webhook path exist.',
            },
            requestId: { type: 'string' },
          },
        },
        EarningTransaction: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'coachId',
            'type',
            'amount',
            'currency',
            'status',
            'description',
            'createdAt',
          ],
          properties: {
            id: { type: 'string' },
            coachId: { type: 'string' },
            type: {
              type: 'string',
              enum: ['SESSION_PAYMENT', 'REFUND', 'WITHDRAWAL', 'ADJUSTMENT', 'PLATFORM_FEE'],
            },
            amount: { type: 'number' },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
            description: { type: 'string' },
            bookingId: { type: 'string' },
            sessionDate: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
            completedAt: { type: 'string', format: 'date-time' },
          },
        },
        CoachEarnings: {
          type: 'object',
          additionalProperties: false,
          required: [
            'coachId',
            'availableBalance',
            'pendingBalance',
            'totalEarned',
            'totalWithdrawn',
            'totalSessions',
            'averageSessionValue',
            'thisWeek',
            'thisMonth',
            'lastMonth',
            'recentTransactions',
            'pendingWithdrawals',
            'payoutMethods',
            'platformFeePercent',
            'currency',
            'updatedAt',
          ],
          properties: {
            coachId: { type: 'string' },
            availableBalance: { type: 'number' },
            pendingBalance: { type: 'number' },
            totalEarned: { type: 'number' },
            totalWithdrawn: { type: 'number' },
            totalSessions: { type: 'integer', minimum: 0 },
            averageSessionValue: { type: 'number' },
            thisWeek: { type: 'number' },
            thisMonth: { type: 'number' },
            lastMonth: { type: 'number' },
            recentTransactions: {
              type: 'array',
              items: schemaRef('EarningTransaction'),
            },
            pendingWithdrawals: {
              type: 'array',
              items: schemaRef('Withdrawal'),
            },
            payoutMethods: {
              type: 'array',
              items: schemaRef('PayoutMethod'),
            },
            defaultPayoutMethodId: { type: 'string' },
            platformFeePercent: { type: 'number', minimum: 0, maximum: 100 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CoachEarningsCalculation: {
          type: 'object',
          additionalProperties: false,
          required: ['period', 'gross', 'fees', 'net'],
          properties: {
            period: { type: 'string', enum: ['week', 'month', 'year'] },
            gross: { type: 'number' },
            fees: { type: 'number' },
            net: { type: 'number' },
          },
        },
        CoachEarningsSummary: {
          type: 'object',
          additionalProperties: true,
          description:
            'Route-owned calculated earnings summary. The response also includes the normalized CoachEarnings snapshot.',
        },
        CoachEarningsResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['earnings', 'summary', 'calculation', 'requestId'],
          properties: {
            earnings: schemaRef('CoachEarnings'),
            summary: schemaRef('CoachEarningsSummary'),
            calculation: schemaRef('CoachEarningsCalculation'),
            requestId: { type: 'string' },
          },
        },
        PaymentNextAction: {
          type: 'object',
          additionalProperties: false,
          required: ['type'],
          properties: {
            type: { type: 'string', enum: ['open_url', 'none'] },
            url: { type: 'string' },
            method: { type: 'string', enum: ['GET'] },
          },
        },
        InvoicePaymentCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['idempotencyKey'],
          properties: {
            amountMinor: { type: 'integer', minimum: 1 },
            method: {
              type: 'string',
              enum: ['bank_transfer', 'card'],
              default: 'bank_transfer',
            },
            idempotencyKey: { type: 'string', minLength: 8, maxLength: 120 },
            returnUrl: { type: 'string', format: 'uri' },
            cancelUrl: { type: 'string', format: 'uri' },
          },
        },
        InvoicePaymentSession: {
          type: 'object',
          additionalProperties: false,
          required: ['attemptId', 'provider', 'status', 'amountMinor', 'currency', 'nextAction'],
          properties: {
            attemptId: { type: 'string' },
            provider: schemaRef('SimulatedProvider'),
            status: {
              type: 'string',
              enum: ['PENDING', 'ACTION_REQUIRED', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELED'],
            },
            amountMinor: { type: 'integer', minimum: 1 },
            currency: { type: 'string', minLength: 3, maxLength: 3 },
            expiresAt: { type: 'string', format: 'date-time' },
            nextAction: schemaRef('PaymentNextAction'),
          },
        },
        InvoicePaymentSessionResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invoiceId', 'invoiceStatus', 'paymentSession', 'requestId'],
          properties: {
            invoiceId: { type: 'string' },
            invoiceStatus: {
              type: 'string',
              enum: ['DRAFT', 'SENT', 'PAID', 'VOID', 'WRITTEN_OFF'],
            },
            paymentSession: schemaRef('InvoicePaymentSession'),
            requestId: { type: 'string' },
          },
        },
        SimulatedPaymentCompleteRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 20 },
          },
        },
        SimulatedPaymentCompleteResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['invoiceId', 'invoiceStatus', 'attemptId', 'alreadyCompleted', 'requestId'],
          properties: {
            invoiceId: { type: 'string' },
            invoiceStatus: { type: 'string', enum: ['PAID'] },
            attemptId: { type: 'string' },
            alreadyCompleted: { type: 'boolean' },
            requestId: { type: 'string' },
          },
        },
        CoachVerificationReviewInput: {
          type: 'object',
          additionalProperties: false,
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['APPROVED', 'REJECTED', 'EXPIRED'],
            },
            expiresAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            notes: {
              anyOf: [{ type: 'string', maxLength: 1000 }, { type: 'null' }],
            },
            verificationId: {
              type: 'string',
              minLength: 1,
            },
          },
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
          required: ['id', 'mediaObjectId', 'uri', 'thumbnailUri', 'capturedAt', 'width', 'height'],
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
          required: ['id', 'mediaObjectId', 'uri', 'thumbnailUri', 'capturedAt', 'duration'],
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
        VideoVisibility: {
          type: 'string',
          enum: ['PRIVATE', 'SHARED'],
        },
        VideoUploadStatus: {
          type: 'string',
          enum: ['UPLOADING', 'PROCESSING', 'READY', 'FAILED'],
        },
        VideoAnnotationType: {
          type: 'string',
          enum: ['HIGHLIGHT', 'IMPROVEMENT', 'TECHNIQUE', 'GENERAL'],
        },
        VideoAnnotationRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['timestamp', 'label', 'type'],
          properties: {
            timestamp: { type: 'integer', minimum: 0, maximum: 3600 },
            label: { type: 'string', minLength: 1, maxLength: 120 },
            note: { type: 'string', maxLength: 500 },
            type: schemaRef('VideoAnnotationType'),
          },
        },
        VideoAnnotation: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'timestamp', 'label', 'type'],
          properties: {
            id: { type: 'string' },
            timestamp: { type: 'integer', minimum: 0, maximum: 3600 },
            label: { type: 'string' },
            note: { type: 'string' },
            type: schemaRef('VideoAnnotationType'),
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        VideoCreateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['mediaObjectId'],
          properties: {
            mediaObjectId: { type: 'string', minLength: 1 },
            athleteIds: {
              type: 'array',
              maxItems: 1,
              items: { type: 'string', minLength: 1 },
              default: [],
            },
            title: { type: 'string', maxLength: 120 },
            description: { type: 'string', maxLength: 1000 },
            sessionId: { type: 'string', minLength: 1 },
            bookingId: { type: 'string', minLength: 1 },
            durationSeconds: { type: 'integer', minimum: 0, maximum: 3600 },
          },
          not: {
            required: ['sessionId', 'bookingId'],
          },
        },
        VideoUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string', maxLength: 120 },
            description: { type: 'string', maxLength: 1000 },
          },
          anyOf: [{ required: ['title'] }, { required: ['description'] }],
        },
        VideoSharingUpdateRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['visibility'],
          properties: {
            visibility: schemaRef('VideoVisibility'),
            recipientUserIds: {
              type: 'array',
              maxItems: 20,
              items: { type: 'string', minLength: 1 },
            },
          },
        },
        Video: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'title',
            'visibility',
            'sharedWithUserIds',
            'mediaObjectId',
            'uploadStatus',
            'playbackUrl',
            'thumbnailUrl',
            'durationMs',
            'fileSizeBytes',
            'contentType',
            'createdAt',
            'annotations',
          ],
          properties: {
            id: { type: 'string' },
            coachUserId: { type: 'string' },
            athleteId: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            visibility: schemaRef('VideoVisibility'),
            sharedWithUserIds: {
              type: 'array',
              items: { type: 'string' },
            },
            sourceContextType: { type: 'string' },
            sourceContextId: { type: 'string' },
            mediaObjectId: { type: 'string' },
            uploadStatus: schemaRef('VideoUploadStatus'),
            playbackUrl: { type: 'string' },
            playbackExpiresAt: { type: 'string', format: 'date-time' },
            thumbnailUrl: { type: 'string' },
            durationMs: { type: 'integer', minimum: 0 },
            fileSizeBytes: { type: 'integer', minimum: 0 },
            contentType: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            annotations: {
              type: 'array',
              items: schemaRef('VideoAnnotation'),
            },
          },
        },
        VideoResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['video', 'seedVersion', 'requestId'],
          properties: {
            video: schemaRef('Video'),
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        VideoListResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['videos', 'seedVersion', 'requestId'],
          properties: {
            videos: {
              type: 'array',
              items: schemaRef('Video'),
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        VideoAnnotationResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['annotation', 'seedVersion', 'requestId'],
          properties: {
            annotation: schemaRef('VideoAnnotation'),
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        UploadInitKind: {
          type: 'string',
          enum: ['VIDEO', 'IMAGE', 'DOCUMENT'],
        },
        UploadInitRequest: {
          type: 'object',
          additionalProperties: false,
          required: ['contentType', 'fileName', 'sizeBytes'],
          properties: {
            kind: {
              ...schemaRef('UploadInitKind'),
              default: 'VIDEO',
            },
            contentType: { type: 'string', minLength: 3, maxLength: 120 },
            fileName: { type: 'string', minLength: 1, maxLength: 260 },
            sizeBytes: {
              type: 'integer',
              minimum: 1,
              maximum: 2000000000,
            },
            metadata: schemaRef('JsonObject'),
          },
        },
        UploadInitHeaders: {
          type: 'object',
          additionalProperties: false,
          required: ['content-type'],
          properties: {
            'content-type': { type: 'string', minLength: 3, maxLength: 120 },
          },
        },
        UploadInitResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'uploadSessionId',
            'mediaObjectId',
            'uploadMethod',
            'uploadUrl',
            'uploadHeaders',
            'expiresAt',
            'storageKey',
            'bucketName',
            'requestId',
          ],
          properties: {
            uploadSessionId: { type: 'string' },
            mediaObjectId: { type: 'string' },
            uploadMethod: { type: 'string', enum: ['PUT'] },
            uploadUrl: { type: 'string', format: 'uri' },
            uploadHeaders: schemaRef('UploadInitHeaders'),
            expiresAt: { type: 'string', format: 'date-time' },
            storageKey: { type: 'string' },
            bucketName: { type: 'string' },
            requestId: { type: 'string' },
            seedVersion: {
              oneOf: [{ type: 'string' }, { type: 'null' }],
              description: 'Present only in explicit seed/test mode.',
            },
          },
        },
        UploadCompleteInput: {
          type: 'object',
          additionalProperties: false,
          required: ['mediaObjectId'],
          properties: {
            mediaObjectId: { type: 'string', minLength: 1 },
            sha256Hex: {
              type: 'string',
              pattern: '^[a-fA-F0-9]{64}$',
              description:
                'Optional client checksum assertion. Availability is always bound to the scanner-computed digest.',
            },
          },
        },
        UploadCompleteResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'uploadSessionId',
            'mediaObjectId',
            'mediaStatus',
            'scanVerdict',
            'scanner',
            'scannedAt',
            'pending',
            'retryAfterMs',
            'seedVersion',
            'requestId',
          ],
          properties: {
            uploadSessionId: { type: 'string' },
            mediaObjectId: { type: 'string' },
            mediaStatus: {
              type: 'string',
              enum: ['UPLOADED_UNSCANNED', 'AVAILABLE'],
            },
            scanVerdict: {
              type: 'string',
              enum: ['PENDING', 'ERROR', 'CLEAN'],
            },
            scanner: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            scannedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            pending: { type: 'boolean' },
            retryAfterMs: {
              anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        UploadStatusResponse: {
          type: 'object',
          additionalProperties: false,
          required: [
            'uploadSessionId',
            'mediaObjectId',
            'uploadStatus',
            'mediaStatus',
            'scanVerdict',
            'scanner',
            'scannedAt',
            'pending',
            'readyToComplete',
            'retryAfterMs',
            'errorCode',
            'seedVersion',
            'requestId',
          ],
          properties: {
            uploadSessionId: { type: 'string' },
            mediaObjectId: { type: 'string' },
            uploadStatus: { type: 'string' },
            mediaStatus: { type: 'string' },
            scanVerdict: {
              type: 'string',
              enum: ['PENDING', 'ERROR', 'CLEAN', 'INFECTED'],
            },
            scanner: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            scannedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            pending: { type: 'boolean' },
            readyToComplete: { type: 'boolean' },
            retryAfterMs: {
              anyOf: [{ type: 'integer', minimum: 0 }, { type: 'null' }],
            },
            errorCode: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            seedVersion: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            requestId: { type: 'string' },
          },
        },
        UploadScanResultInput: {
          type: 'object',
          additionalProperties: false,
          required: ['mediaObjectId', 'verdict', 'scanner'],
          properties: {
            mediaObjectId: { type: 'string', minLength: 1 },
            sourceResultId: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description:
                'Stable scanner-generated result id. Reusing it with the same payload is an idempotent replay; changing the payload returns 409.',
            },
            scanAttemptId: {
              type: 'string',
              minLength: 1,
              maxLength: 200,
              description:
                'Active scanner lease attempt. Required for scanner-token callbacks and rejected after lease expiry or reclaim.',
            },
            verdict: {
              type: 'string',
              enum: ['CLEAN', 'INFECTED', 'ERROR'],
              description:
                'Completion verdict from the trusted scanner. PENDING is created by upload init and is not accepted by this operation.',
            },
            scanner: { type: 'string', minLength: 1, maxLength: 120 },
            objectSizeBytes: {
              type: 'integer',
              minimum: 1,
              maximum: 2000000000,
            },
            objectETag: { type: 'string', minLength: 1, maxLength: 240 },
            sha256Hex: {
              type: 'string',
              pattern: '^[a-fA-F0-9]{64}$',
            },
            sealedStorageKey: {
              type: 'string',
              minLength: 1,
              maxLength: 1024,
              description:
                'Server-only storage key containing the exact bytes scanned. Required for CLEAN and rejected for other verdicts.',
            },
            scannedAt: { type: 'string', format: 'date-time', maxLength: 80 },
            details: {
              type: 'object',
              additionalProperties: true,
              description:
                'Bounded scanner metadata. Serialized request details must be 8 KB or smaller.',
            },
          },
          examples: [
            {
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
              details: {
                signatureVersion: 'daily-27492',
              },
            },
          ],
        },
        UploadScanResultRecord: {
          type: 'object',
          additionalProperties: false,
          required: [
            'id',
            'uploadSessionId',
            'mediaObjectId',
            'sourceResultId',
            'scanAttemptId',
            'verdict',
            'scanner',
            'objectSizeBytes',
            'objectETag',
            'sha256Hex',
            'sealedStorageKey',
            'scannedAt',
            'replayed',
          ],
          properties: {
            id: { type: 'string' },
            uploadSessionId: { type: 'string' },
            mediaObjectId: { type: 'string' },
            sourceResultId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            scanAttemptId: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            verdict: { type: 'string', enum: ['PENDING', 'CLEAN', 'INFECTED', 'ERROR'] },
            scanner: { type: 'string' },
            objectSizeBytes: {
              anyOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }],
            },
            objectETag: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            sha256Hex: {
              anyOf: [{ type: 'string', pattern: '^[a-f0-9]{64}$' }, { type: 'null' }],
            },
            sealedStorageKey: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
            },
            scannedAt: {
              anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
            },
            replayed: { type: 'boolean' },
          },
        },
        UploadScanResultResponse: {
          type: 'object',
          additionalProperties: false,
          required: ['scanResult', 'requestId'],
          properties: {
            scanResult: schemaRef('UploadScanResultRecord'),
            requestId: { type: 'string' },
          },
          examples: [
            {
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
          ],
        },
        ErrorResponse: {
          type: 'object',
          additionalProperties: true,
          required: ['type', 'title', 'status', 'code', 'detail', 'requestId'],
          properties: {
            type: { type: 'string' },
            title: { type: 'string' },
            status: { type: 'integer', minimum: 400, maximum: 599 },
            code: { type: 'string' },
            detail: { type: 'string' },
            requestId: { type: 'string' },
            details: { description: 'Optional route-specific diagnostic details.' },
            issues: {
              type: 'array',
              description: 'Optional validation issues, usually from Zod.',
              items: { type: 'object', additionalProperties: true },
            },
            error: { type: 'string', deprecated: true },
            message: { type: 'string', deprecated: true },
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
