"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICES = exports.FOOTBALL_OBJECTIVES = void 0;
exports.buildAvailability = buildAvailability;
exports.formatServicePrice = formatServicePrice;
exports.resolveCoachAndProfile = resolveCoachAndProfile;
const mock_data_1 = require("./mock-data");
exports.FOOTBALL_OBJECTIVES = [
    'Dribbling',
    'Passing',
    'Defending',
    'Finishing',
    'Goalkeeping',
    'Conditioning',
];
exports.SERVICES = [
    {
        id: '1-on-1',
        title: '1-on-1 Training',
        description: 'Personalized coaching session',
        price: 50,
        icon: 'person',
    },
    {
        id: 'small-group',
        title: 'Small Group',
        description: 'Train with others (max 8)',
        price: 30,
        capacity: 8,
        spotsLeft: 5,
        icon: 'people',
    },
    {
        id: 'team',
        title: 'Team Session',
        description: 'Full pitch team training',
        price: 150,
        icon: 'football',
    },
];
const SLOT_LIBRARY = {
    morning_1on1: {
        id: 'morning_1on1',
        title: '1-on-1 Training',
        focus: 'Personalized skill development',
        startHour: 9,
        startMinute: 0,
        durationMinutes: 60,
        tag: 'Popular',
        serviceType: '1-on-1',
    },
    morning_group: {
        id: 'morning_group',
        title: 'Small Group Training',
        focus: 'Ball control & passing',
        startHour: 10,
        startMinute: 30,
        durationMinutes: 90,
        tag: '5/8 spots',
        serviceType: 'small-group',
    },
    afternoon_1on1: {
        id: 'afternoon_1on1',
        title: '1-on-1 Training',
        focus: 'Technical skills',
        startHour: 14,
        startMinute: 0,
        durationMinutes: 90,
        tag: 'Extended',
        serviceType: '1-on-1',
    },
    evening_1on1: {
        id: 'evening_1on1',
        title: '1-on-1 Training',
        focus: 'Match preparation',
        startHour: 18,
        startMinute: 0,
        durationMinutes: 60,
        tag: 'Match Prep',
        serviceType: '1-on-1',
    },
    evening_group: {
        id: 'evening_group',
        title: 'Group Session',
        focus: 'Passing & positioning drills',
        startHour: 19,
        startMinute: 0,
        durationMinutes: 60,
        tag: '3/8 spots',
        serviceType: 'small-group',
    },
};
const WEEK_BLUEPRINT = [
    ['morning_1on1', 'afternoon_1on1'],
    ['morning_1on1', 'morning_group', 'evening_1on1'],
    ['afternoon_1on1'],
    ['morning_1on1', 'afternoon_1on1', 'evening_group'],
    ['morning_1on1', 'evening_1on1'],
    ['afternoon_1on1', 'evening_group'],
    ['morning_group'],
];
function buildAvailability() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return WEEK_BLUEPRINT.map((templates, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() + index);
        const iso = date.toISOString();
        const slots = templates.map((templateId, slotIndex) => {
            const template = SLOT_LIBRARY[templateId];
            const start = new Date(date);
            start.setHours(template.startHour, template.startMinute, 0, 0);
            return {
                id: `${iso}-${slotIndex}`,
                templateId,
                title: template.title,
                focus: template.focus,
                start,
                durationMinutes: template.durationMinutes,
                tag: template.tag,
                serviceType: template.serviceType,
            };
        });
        return { id: iso, date, slots };
    });
}
function formatServicePrice(service) {
    const rate = (0, mock_data_1.formatGBP)(service.price);
    return service.id !== 'team' ? `${rate}/hr` : rate;
}
function resolveCoachAndProfile(coachId) {
    const coach = (0, mock_data_1.getUserById)(coachId);
    const coachProfile = coach ? (0, mock_data_1.getCoachProfile)(coach.id) : null;
    return { coach, coachProfile };
}
