import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { apiClient } from '@/services/api-client';
import { sessionTemplateService } from '@/services/session-template-service';

describe('sessionTemplateService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_TEMPLATES);
  });

  it('seeds default templates for a coach (happy path)', async () => {
    const templates = await sessionTemplateService.getTemplates('coach_templates_1');
    assert.ok(templates.length > 0);
    assert.ok(templates.every((item) => item.coachId === 'coach_templates_1'));
  });

  it('returns null for unknown template id (empty path)', async () => {
    const template = await sessionTemplateService.getTemplate('template_missing');
    assert.equal(template, null);
  });

  it('saves and deletes a template', async () => {
    const saved = await sessionTemplateService.saveTemplate({
      coachId: 'coach_templates_2',
      name: 'Extra Session',
      type: 'small-group',
      duration: 75,
      capacity: 6,
      defaultPrice: 40,
      description: 'Extra mixed session',
      skillsFocus: ['Passing'],
    });
    assert.ok(saved.id);

    const fetched = await sessionTemplateService.getTemplate(saved.id);
    assert.equal(fetched?.id, saved.id);

    await sessionTemplateService.deleteTemplate(saved.id);
    const afterDelete = await sessionTemplateService.getTemplate(saved.id);
    assert.equal(afterDelete, null);
  });
});
