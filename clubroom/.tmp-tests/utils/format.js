"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTimeRange = exports.formatTime = exports.formatFullDate = exports.formatMonthDay = exports.formatWeekday = exports.formatGBP = exports.formatNextAvailability = exports.formatDistance = exports.formatPriceRange = void 0;
exports.toDateStr = toDateStr;
const shortWeekdayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });
const shortMonthDayFormatter = new Intl.DateTimeFormat('en-GB', { month: 'short', day: 'numeric' });
const longDateFormatter = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
});
const toDate = (value) => (value instanceof Date ? value : new Date(value));
/**
 * Canonical YYYY-MM-DD date string formatter (LOCAL time).
 *
 * Use this **everywhere** you need a date-only string for storage, lookup,
 * comparison, or display keys. Never call `.toISOString().split('T')[0]`
 * directly — it returns UTC and silently shifts dates near midnight.
 */
function toDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
const formatPriceRange = (price) => `£${price.minUsd.toLocaleString()}–£${price.maxUsd.toLocaleString()} / ${price.unitLabel}`;
exports.formatPriceRange = formatPriceRange;
const formatDistance = (distanceMiles) => `${distanceMiles.toFixed(1)} mi away`;
exports.formatDistance = formatDistance;
const formatNextAvailability = (isoString) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};
exports.formatNextAvailability = formatNextAvailability;
// Currency formatting helper
const formatGBP = (amount) => `£${amount.toLocaleString('en-GB')}`;
exports.formatGBP = formatGBP;
const formatWeekday = (value) => shortWeekdayFormatter.format(toDate(value));
exports.formatWeekday = formatWeekday;
const formatMonthDay = (value) => shortMonthDayFormatter.format(toDate(value));
exports.formatMonthDay = formatMonthDay;
const formatFullDate = (value) => longDateFormatter.format(toDate(value));
exports.formatFullDate = formatFullDate;
const formatTime = (value) => timeFormatter.format(toDate(value));
exports.formatTime = formatTime;
const formatTimeRange = (start, durationMinutes) => {
    const startDate = toDate(start);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
    return `${(0, exports.formatTime)(startDate)} – ${(0, exports.formatTime)(endDate)}`;
};
exports.formatTimeRange = formatTimeRange;
