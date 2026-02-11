import { ServiceEvents, EventPayloads } from '../../services/event-bus';

type EventKey = typeof ServiceEvents.SESSION_COMPLETED;
const eventKey: EventKey = 'session:completed';

type Payload = EventPayloads[EventKey];
const payload: Payload = {
  sessionId: 's',
  coachId: 'c',
  athleteIds: ['a'],
};

export { eventKey, payload };
