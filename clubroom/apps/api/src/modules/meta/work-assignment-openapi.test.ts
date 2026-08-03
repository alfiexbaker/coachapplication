import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import {
  workAssignmentUpdateRequestSchema,
  workAssignmentUpdateResponseSchema,
} from '@clubroom/shared-contracts';
import { buildApp } from '../../app.js';

type JsonSchema = {
  $ref?: string;
  additionalProperties?: boolean;
  required?: string[];
};

type JsonContent = {
  schema?: JsonSchema;
  examples?: Record<string, { value?: unknown }>;
};

type WorkAssignmentOperation = {
  operationId?: string;
  requestBody?: {
    required?: boolean;
    content?: { 'application/json'?: JsonContent };
  };
  responses?: Record<
    string,
    { content?: { 'application/json'?: JsonContent } } | undefined
  >;
  'x-clubroom-effect'?: string;
};

type OpenApiPayload = {
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, JsonSchema> };
};

const app = buildApp();

after(async () => {
  await app.close();
});

describe('work assignment OpenAPI contract', () => {
  it('publishes the strict request and persisted mutation response', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/openapi.json' });
    assert.equal(response.statusCode, 200);

    const payload = response.json() as OpenApiPayload;
    const operation = payload.paths[
      '/v1/clubs/{clubId}/work-assignments/{assignmentId}'
    ]?.patch as WorkAssignmentOperation | undefined;
    const requestContent = operation?.requestBody?.content?.['application/json'];
    const responseContent = operation?.responses?.['200']?.content?.['application/json'];

    assert.equal(operation?.operationId, 'updateClubWorkAssignment');
    assert.equal(operation?.['x-clubroom-effect'], 'update work assignment');
    assert.equal(operation?.requestBody?.required, true);
    assert.deepEqual(requestContent?.schema, {
      $ref: '#/components/schemas/WorkAssignmentUpdateRequest',
    });
    assert.deepEqual(responseContent?.schema, {
      $ref: '#/components/schemas/WorkAssignmentUpdateResponse',
    });
    workAssignmentUpdateRequestSchema.parse(requestContent?.examples?.example?.value);
    workAssignmentUpdateResponseSchema.parse(responseContent?.examples?.example?.value);
    assert.equal(payload.components.schemas.WorkAssignmentUpdateRequest?.additionalProperties, false);
    assert.equal(
      payload.components.schemas.WorkAssignmentUpdateResponse?.additionalProperties,
      false,
    );
    assert.deepEqual(payload.components.schemas.WorkAssignmentUpdateResponse?.required, [
      'clubId',
      'assignmentId',
      'previousCoachUserId',
      'assigneeCoachId',
      'updatedBookingIds',
      'requestId',
    ]);
  });
});
