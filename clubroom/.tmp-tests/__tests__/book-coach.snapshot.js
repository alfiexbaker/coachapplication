"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const node_assert_1 = __importDefault(require("node:assert"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_test_1 = __importDefault(require("node:test"));
const booking_types_1 = require("../constants/booking-types");
const snapshotPath = (0, node_path_1.join)(process.cwd(), '__tests__', '__snapshots__', 'book-coach.availability.json');
const snapshot = JSON.parse((0, node_fs_1.readFileSync)(snapshotPath, 'utf-8'));
(0, node_test_1.default)('book coach availability stays consistent', () => {
    const current = (0, booking_types_1.buildAvailability)().map((day, index) => ({
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
    node_assert_1.default.deepStrictEqual(current, snapshot.availability);
});
(0, node_test_1.default)('service pricing snapshot stays aligned', () => {
    const current = booking_types_1.SERVICES.map((service) => ({
        id: service.id,
        title: service.title,
        priceLabel: (0, booking_types_1.formatServicePrice)(service),
        capacity: service.capacity ?? null,
        spotsLeft: service.spotsLeft ?? null,
    }));
    node_assert_1.default.deepStrictEqual(current, snapshot.services);
});
