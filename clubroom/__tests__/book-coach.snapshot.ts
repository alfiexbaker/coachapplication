// @ts-nocheck
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { buildAvailability, formatServicePrice, SERVICES } from '../constants/booking-types';

const snapshotPath = join(process.cwd(), '__tests__', '__snapshots__', 'book-coach.availability.json');
const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8')) as {
  availability: { dayIndex: number; slots: { templateId: string; title: string; focus: string; durationMinutes: number; serviceType: string; tag: string }[] }[];
  services: { id: string; title: string; priceLabel: string; capacity: number | null; spotsLeft: number | null }[];
};

test('book coach availability stays consistent', () => {
  const current = buildAvailability().map((day, index) => ({
    dayIndex: index,
    slots: day.slots.map((slot) => ({
      templateId: slot.templateId,
      title: slot.title,
      focus: slot.focus,
      durationMinutes: slot.durationMinutes,
      serviceType: slot.serviceType,
      tag: slot.tag,
    })),
  }));

  assert.deepStrictEqual(current, snapshot.availability);
});

test('service pricing snapshot stays aligned', () => {
  const current = SERVICES.map((service) => ({
    id: service.id,
    title: service.title,
    priceLabel: formatServicePrice(service),
    capacity: service.capacity ?? null,
    spotsLeft: service.spotsLeft ?? null,
  }));

  assert.deepStrictEqual(current, snapshot.services);
  });
