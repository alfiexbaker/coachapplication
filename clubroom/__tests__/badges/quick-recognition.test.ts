/**
 * Quick Recognition Tests
 *
 * Tests for recognition templates and quick recognition award flow.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { RECOGNITION_TEMPLATES, getTemplatesForCategory } from '../../constants/recognition-templates';
import { badgeService } from '../../services/badge-service';
import { apiClient } from '../../services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { eventBus, ServiceEvents } from '../../services/event-bus';
import type { BadgeCategory } from '@/constants/types';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('recognition templates', () => {
  test('all 16 templates have unique IDs', () => {
    assert.equal(RECOGNITION_TEMPLATES.length, 16);
    const ids = RECOGNITION_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 16, 'Template IDs must be unique');
  });

  test('each category has exactly 4 templates', () => {
    const categories: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];
    for (const cat of categories) {
      const templates = getTemplatesForCategory(cat);
      assert.equal(templates.length, 4, `${cat} should have 4 templates`);
    }
  });

  test('every template has non-empty label and message', () => {
    for (const t of RECOGNITION_TEMPLATES) {
      assert.ok(t.label.length > 0, `Template ${t.id} label is empty`);
      assert.ok(t.message.length > 0, `Template ${t.id} message is empty`);
    }
  });

  test('getTemplatesForCategory returns correct category', () => {
    const techTemplates = getTemplatesForCategory('technical');
    assert.ok(techTemplates.every((t) => t.category === 'technical'));
  });
});

describe('findBadgeForCategory', () => {
  test('returns a badge definition for each category', () => {
    const categories: BadgeCategory[] = ['technical', 'physical', 'psychological', 'social'];
    for (const cat of categories) {
      const badge = badgeService.findBadgeForCategory(cat);
      assert.ok(badge, `No badge found for category: ${cat}`);
      assert.equal(badge.category, cat);
    }
  });
});

describe('quick recognition award flow', () => {
  beforeEach(async () => {
    await apiClient.set(STORAGE_KEYS.BADGE_AWARDS, []);
    eventBus.clearAll();
  });

  test('awarding via template produces correct badge award', async () => {
    const template = getTemplatesForCategory('technical')[0];
    const badge = badgeService.findBadgeForCategory(template.category);
    assert.ok(badge);

    const athleteId = `athlete_${rid()}`;
    const coachId = `coach_${rid()}`;
    const sessionId = `session_${rid()}`;

    const result = await badgeService.awardBadge({
      badgeId: badge.id,
      athleteId,
      coachId,
      sessionId,
      reason: template.message,
      visibility: 'supporters',
      overrideCooldown: false,
    });

    assert.ok(result.success, 'Award should succeed');
    assert.equal(result.data.reason, template.message);
    assert.equal(result.data.badgeId, badge.id);
    assert.equal(result.data.visibility, 'supporters');
    assert.equal(result.data.athleteId, athleteId);
    assert.equal(result.data.coachId, coachId);
    assert.equal(result.data.sessionId, sessionId);
  });

  test('custom note is included when provided', async () => {
    const template = getTemplatesForCategory('social')[0];
    const badge = badgeService.findBadgeForCategory(template.category);
    assert.ok(badge);

    const athleteId = `athlete_${rid()}`;

    const result = await badgeService.awardBadge({
      badgeId: badge.id,
      athleteId,
      coachId: `coach_${rid()}`,
      reason: template.message,
      note: 'Excellent leadership during rondos',
      visibility: 'supporters',
      overrideCooldown: false,
    });

    assert.ok(result.success);
    assert.equal(result.data.note, 'Excellent leadership during rondos');
  });

  test('cooldown error is surfaced on second award within 7 days', async () => {
    const badge = badgeService.findBadgeForCategory('physical');
    assert.ok(badge);

    const athleteId = `athlete_${rid()}`;
    const coachId = `coach_${rid()}`;

    // First award
    const first = await badgeService.awardBadge({
      badgeId: badge.id,
      athleteId,
      coachId,
      reason: 'Great work rate.',
      visibility: 'supporters',
      overrideCooldown: false,
    });
    assert.ok(first.success);

    // Second award — should hit cooldown
    const second = await badgeService.awardBadge({
      badgeId: badge.id,
      athleteId,
      coachId,
      reason: 'Strong performance.',
      visibility: 'supporters',
      overrideCooldown: false,
    });
    assert.ok(!second.success, 'Second award should fail due to cooldown');
    assert.ok(second.error.message.includes('Cooldown'));
  });

  test('BADGE_EARNED event fires on successful award', async () => {
    const badge = badgeService.findBadgeForCategory('psychological');
    assert.ok(badge);

    let emitted = false;
    eventBus.on(ServiceEvents.BADGE_EARNED, () => {
      emitted = true;
    });

    const result = await badgeService.awardBadge({
      badgeId: badge.id,
      athleteId: `athlete_${rid()}`,
      coachId: `coach_${rid()}`,
      reason: 'Showed great focus.',
      visibility: 'supporters',
      overrideCooldown: false,
    });

    assert.ok(result.success);
    assert.ok(emitted, 'BADGE_EARNED event should have been emitted');
  });
});
