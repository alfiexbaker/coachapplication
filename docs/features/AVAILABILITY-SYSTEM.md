# Availability System

> Complete documentation for coach availability management, templates, overrides, and scheduling rules.

---

## Overview

The availability system allows coaches to:
- Define recurring weekly availability templates
- Block specific dates or add custom hours
- Set booking rules (buffer time, advance notice)
- Generate available time slots for booking

---

## Feature Summary

| Feature | Status | Description |
|---------|--------|-------------|
| Availability Templates | Complete | Recurring weekly schedules |
| Date Overrides | Complete | Block dates, custom hours |
| Scheduling Rules | Complete | Buffer time, advance notice |
| Quick Presets | Complete | Common schedule patterns |
| Multi-Day Setup | Complete | Set whole week at once |
| Slot Generation | Complete | Compute available times |

---

## Screens & Routes

| Screen | Route | Purpose |
|--------|-------|---------|
| Availability Hub | `/(tabs)/availability` | Main availability dashboard |
| Calendar View | `/availability/calendar` | Visual calendar picker |
| Add Template | `/availability/add-template` | Create new template |
| Edit Template | `/availability/edit-template` | Update existing template |
| Block Date | `/availability/block-date` | Block specific dates |
| Scheduling Rules | `/availability/scheduling-rules` | Configure booking rules |

---

## Availability Templates

### Template Structure

```typescript
interface AvailabilityTemplate {
  id: string;
  coachId: string;

  // Schedule
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0 = Sunday
  startTime: string;                      // "16:00"
  endTime: string;                        // "19:00"

  // Behavior
  isRecurring: boolean;
  isActive: boolean;

  // Capacity
  maxConcurrent: number;                  // Parallel bookings allowed

  // Location
  location?: string;
  locationLabel?: string;

  // Metadata
  createdAt: string;
  updatedAt?: string;
}
```

### Template UI

```
┌─────────────────────────────────────────────────────────────────┐
│                    Availability Templates                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Monday                                           [Edit] │  │
│   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │  │
│   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │  │
│   │  4:00 PM ─────────────────────────────── 7:00 PM        │  │
│   │  📍 Hyde Park                                           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Wednesday                                        [Edit] │  │
│   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │  │
│   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │  │
│   │  4:00 PM ─────────────────────────────── 7:00 PM        │  │
│   │  📍 Hyde Park                                           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Saturday                                         [Edit] │  │
│   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━        │  │
│   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░         │  │
│   │  9:00 AM ─────────────────────────────── 2:00 PM        │  │
│   │  📍 Hyde Park                                           │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                    [+ Add Availability]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Presets

Pre-defined schedule patterns:

| Preset | Days | Hours |
|--------|------|-------|
| Weekday Evenings | Mon-Fri | 4:00 PM - 8:00 PM |
| Weekend Mornings | Sat-Sun | 9:00 AM - 1:00 PM |
| After School | Mon-Fri | 3:30 PM - 6:30 PM |
| Full Weekdays | Mon-Fri | 9:00 AM - 5:00 PM |

### Multi-Day Setup

Set availability for entire week at once:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Set Weekly Availability                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Select days:                                                  │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│   │ Sun │ │ Mon │ │ Tue │ │ Wed │ │ Thu │ │ Fri │ │ Sat │     │
│   │     │ │ [✓] │ │ [✓] │ │ [✓] │ │ [✓] │ │ [✓] │ │     │     │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │
│                                                                 │
│   Time range:                                                   │
│   Start: [4:00 PM]          End: [8:00 PM]                     │
│                                                                 │
│   Location:                                                     │
│   [Hyde Park, London                              ▼]            │
│                                                                 │
│                      [Apply to Selected Days]                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Date Overrides

### Override Types

```typescript
interface AvailabilityOverride {
  id: string;
  coachId: string;
  date: string;                     // "2026-01-20" (specific date)

  // Override Type
  type: 'BLOCKED' | 'CUSTOM';

  // For BLOCKED
  reason?: string;                  // "Holiday"

  // For CUSTOM (different hours)
  customSlots?: TimeSlot[];

  // Metadata
  createdAt: string;
}

interface TimeSlot {
  startTime: string;                // "10:00"
  endTime: string;                  // "14:00"
  location?: string;
}
```

### Block Date UI

```
┌─────────────────────────────────────────────────────────────────┐
│                      Block Date                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Date: [January 20, 2026                             ▼]        │
│                                                                 │
│   Block type:                                                   │
│   ○ Block entire day                                            │
│   ○ Block with custom hours (partial availability)              │
│                                                                 │
│   Reason (optional):                                            │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │ Family holiday                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│                        [Block Date]                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Override Priority

When computing available slots:

```
1. Check for date-specific override
   ├── If BLOCKED → No slots for that date
   ├── If CUSTOM → Use custom slots only
   └── If no override → Use weekly template

2. Filter by existing bookings
   └── Remove slots that conflict with confirmed bookings

3. Apply scheduling rules
   ├── Remove slots within buffer time of existing bookings
   └── Remove slots within minimum advance notice window
```

---

## Scheduling Rules

### Rule Configuration

```typescript
interface CoachSchedulingRules {
  coachId: string;

  // Advance Notice
  minAdvanceNoticeHours: number;    // Default: 24
  maxAdvanceDays: number;           // Default: 60

  // Buffer Time
  bufferMinutes: number;            // Default: 15

  // Session Limits
  maxSessionsPerDay: number;        // Default: 8
  maxSessionsPerWeek: number;       // Default: 30

  // Booking Window
  bookingCutoffHours: number;       // Hours before session (Default: 2)

  // Auto-Confirm
  autoConfirmBookings: boolean;     // Default: false

  // Special Rules
  requirePaymentUpfront: boolean;   // Default: true
  allowSameDayBooking: boolean;     // Default: false
}
```

### Rules UI

```
┌─────────────────────────────────────────────────────────────────┐
│                    Scheduling Rules                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ADVANCE NOTICE                                                │
│   ─────────────────────────────────────────────────────         │
│   Minimum notice required:  [24 hours              ▼]           │
│   Maximum booking ahead:    [60 days               ▼]           │
│                                                                 │
│   BUFFER TIME                                                   │
│   ─────────────────────────────────────────────────────         │
│   Time between sessions:    [15 minutes            ▼]           │
│   ⓘ Gap between back-to-back sessions                          │
│                                                                 │
│   SESSION LIMITS                                                │
│   ─────────────────────────────────────────────────────         │
│   Max sessions per day:     [8                     ▼]           │
│   Max sessions per week:    [30                    ▼]           │
│                                                                 │
│   BOOKING BEHAVIOR                                              │
│   ─────────────────────────────────────────────────────         │
│   [ ] Auto-confirm new bookings                                 │
│   [✓] Require payment upfront                                   │
│   [ ] Allow same-day booking                                    │
│                                                                 │
│                       [Save Rules]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Slot Generation Algorithm

### Computing Available Slots

```typescript
async function getAvailableSlots(
  coachId: string,
  startDate: Date,
  endDate: Date,
  sessionDuration: number
): Promise<AvailabilitySlot[]> {

  // 1. Get templates for this coach
  const templates = await getTemplates(coachId);

  // 2. Get overrides for date range
  const overrides = await getOverrides(coachId, startDate, endDate);

  // 3. Get existing bookings
  const bookings = await getBookings(coachId, startDate, endDate);

  // 4. Get scheduling rules
  const rules = await getSchedulingRules(coachId);

  const slots: AvailabilitySlot[] = [];

  // 5. Iterate through each day
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    const dateStr = formatDate(date);

    // Check for override
    const override = overrides.find(o => o.date === dateStr);

    if (override?.type === 'BLOCKED') {
      continue; // Skip blocked days
    }

    // Get time ranges for this day
    let timeRanges: TimeRange[];

    if (override?.type === 'CUSTOM') {
      timeRanges = override.customSlots;
    } else {
      // Find template for this day of week
      const dayOfWeek = date.getDay();
      const template = templates.find(t => t.dayOfWeek === dayOfWeek && t.isActive);

      if (!template) continue;

      timeRanges = [{
        startTime: template.startTime,
        endTime: template.endTime,
        location: template.location
      }];
    }

    // 6. Generate slots from time ranges
    for (const range of timeRanges) {
      const rangeSlots = generateSlotsForRange(
        date,
        range,
        sessionDuration,
        rules.bufferMinutes
      );

      // 7. Filter out conflicting slots
      const availableSlots = rangeSlots.filter(slot => {
        // Check minimum advance notice
        if (getHoursUntil(slot.startTime) < rules.minAdvanceNoticeHours) {
          return false;
        }

        // Check for booking conflicts
        const hasConflict = bookings.some(booking =>
          slotsOverlap(slot, booking)
        );

        return !hasConflict;
      });

      slots.push(...availableSlots);
    }
  }

  return slots;
}
```

### Slot Structure

```typescript
interface AvailabilitySlot {
  id: string;                       // Generated unique ID
  coachId: string;
  date: string;                     // "2026-01-15"
  startTime: string;                // "16:00"
  endTime: string;                  // "17:00"
  duration: number;                 // Minutes
  location?: string;
  status: 'available' | 'booked' | 'blocked';
}
```

---

## Services

### availability-service.ts

```typescript
class AvailabilityService {
  // Templates
  getTemplates(coachId: string): Promise<AvailabilityTemplate[]>
  createTemplate(template: Omit<AvailabilityTemplate, 'id'>): Promise<AvailabilityTemplate>
  updateTemplate(id: string, data: Partial<AvailabilityTemplate>): Promise<AvailabilityTemplate>
  deleteTemplate(id: string): Promise<void>

  // Quick Actions
  applyPreset(coachId: string, preset: PresetType): Promise<AvailabilityTemplate[]>
  setWeeklyAvailability(coachId: string, days: number[], timeRange: TimeRange): Promise<AvailabilityTemplate[]>

  // Overrides
  getOverrides(coachId: string, startDate?: string, endDate?: string): Promise<AvailabilityOverride[]>
  createOverride(override: Omit<AvailabilityOverride, 'id'>): Promise<AvailabilityOverride>
  deleteOverride(id: string): Promise<void>

  // Slot Generation
  getAvailableSlots(coachId: string, startDate: string, endDate: string, duration?: number): Promise<AvailabilitySlot[]>
  checkSlotAvailability(coachId: string, date: string, time: string): Promise<boolean>
}
```

### scheduling-rules-service.ts

```typescript
class SchedulingRulesService {
  getRules(coachId: string): Promise<CoachSchedulingRules>
  updateRules(coachId: string, rules: Partial<CoachSchedulingRules>): Promise<CoachSchedulingRules>

  // Validation
  validateBookingTime(coachId: string, proposedTime: string): Promise<ValidationResult>
  canBookSameDay(coachId: string): Promise<boolean>
  getMinAdvanceNotice(coachId: string): Promise<number>
}
```

---

## Components

### Availability Components

| Component | Path | Purpose |
|-----------|------|---------|
| `availability-grid` | `/components/coach/availability-grid.tsx` | Visual schedule grid |
| `recurring-template-modal` | `/components/coach/recurring-template-modal.tsx` | Template editor |
| `CalendarExportButton` | `/components/calendar/CalendarExportButton.tsx` | Export to calendar |
| `CalendarProviderSelect` | `/components/calendar/CalendarProviderSelect.tsx` | Choose provider |
| `SyncSettingsCard` | `/components/calendar/SyncSettingsCard.tsx` | Sync configuration |

---

## API Contracts

### Template Endpoints

```typescript
// Get templates
GET /coaches/:coachId/availability/templates
Response: AvailabilityTemplate[]

// Create template
POST /coaches/:coachId/availability/templates
Body: Omit<AvailabilityTemplate, 'id'>
Response: AvailabilityTemplate

// Update template
PUT /coaches/:coachId/availability/templates/:templateId
Body: Partial<AvailabilityTemplate>
Response: AvailabilityTemplate

// Delete template
DELETE /coaches/:coachId/availability/templates/:templateId
Response: { success: boolean }
```

### Override Endpoints

```typescript
// Get overrides
GET /coaches/:coachId/availability/overrides
Query: { startDate?, endDate? }
Response: AvailabilityOverride[]

// Create override
POST /coaches/:coachId/availability/overrides
Body: Omit<AvailabilityOverride, 'id'>
Response: AvailabilityOverride

// Delete override
DELETE /coaches/:coachId/availability/overrides/:date
Response: { success: boolean }
```

### Slot Endpoints

```typescript
// Get available slots
GET /coaches/:coachId/availability/slots
Query: { startDate, endDate, duration? }
Response: AvailabilitySlot[]
```

---

## Calendar Sync

### Export Options

| Provider | Format | Status |
|----------|--------|--------|
| Google Calendar | iCal URL | Complete |
| Apple Calendar | .ics file | Complete |
| Outlook | .ics file | Complete |

### Sync Settings

```typescript
interface CalendarSyncSettings {
  userId: string;
  provider: 'google' | 'apple' | 'outlook';
  isEnabled: boolean;

  // What to sync
  syncBookings: boolean;
  syncAvailability: boolean;
  syncEvents: boolean;

  // Reminders
  reminderMinutes: number[];        // [60, 15] = 1hr and 15min before

  // Calendar ID (for Google)
  calendarId?: string;
}
```

---

## Storage Keys

| Key | Purpose |
|-----|---------|
| `availability_templates` | Weekly templates |
| `availability_overrides` | Date-specific overrides |
| `coach_scheduling_rules` | Booking rules |
| `calendar_sync_settings_${userId}` | Sync preferences |

---

## Files Reference

### Services
- `/services/availability-service.ts`
- `/services/scheduling-rules-service.ts`
- `/services/calendar-service.ts`

### Screens
- `/app/(tabs)/availability.tsx`
- `/app/availability/calendar.tsx`
- `/app/availability/add-template.tsx`
- `/app/availability/edit-template.tsx`
- `/app/availability/block-date.tsx`
- `/app/availability/scheduling-rules.tsx`

### Components
- `/components/coach/availability-grid.tsx`
- `/components/coach/recurring-template-modal.tsx`
- `/components/calendar/*.tsx`
