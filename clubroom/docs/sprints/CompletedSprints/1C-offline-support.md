# 1C: Offline Support

**Phase**: 1 — Foundation
**Origin**: Sprint 1, Tasks 6, 7
**Estimated scope**: 2 tasks, 2 new files

## Goal

Users see a clear banner when offline. Write operations queue and flush on reconnect. The app doesn't break when the connection drops.

## Tasks

### Task 1: Connection Status Detection

**File**: `hooks/useConnectionStatus.ts`

Detect when the user goes offline and show a banner:

```typescript
import NetInfo from '@react-native-community/netinfo';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return { isConnected };
}
```

**UI**: Persistent top banner when offline:
```
┌─────────────────────────────────────┐
│ ⚠️ You're offline. Changes will    │
│ sync when you reconnect.            │
└─────────────────────────────────────┘
```
- Animated slide-down/slide-up
- Shows on every screen (add to root layout)
- Automatically hides when connection restored with "Back online" flash

### Task 2: Offline Action Queue

**File**: `services/api-client.ts` (extend)

When offline, queue write operations for later:

```typescript
interface QueuedAction {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body: any;
  timestamp: number;
}

// In api-client.ts
async function queuedWrite<T>(method: string, path: string, body: any): Promise<T> {
  if (!isConnected) {
    await addToQueue({ id: generateId(), method, path, body, timestamp: Date.now() });
    // Return optimistic response from local cache
    return optimisticResponse(method, path, body);
  }
  return apiFetch(method, path, body);
}

// On reconnect: flush queue in order
async function flushQueue(): Promise<void> {
  const queue = await getQueue();
  for (const action of queue) {
    try {
      await apiFetch(action.method, action.path, action.body);
      await removeFromQueue(action.id);
    } catch (err) {
      // Stop flushing on failure — will retry next reconnect
      break;
    }
  }
}
```

- Queue stored in AsyncStorage (persists across app restart)
- Flush on reconnect (NetInfo listener)
- Optimistic responses return immediately so UI feels instant
- Conflict resolution: server wins on conflict (last-write-wins for MVP)

## Acceptance Criteria

- [ ] Offline banner shown when connection lost, auto-hides on reconnect
- [ ] Write actions queued when offline and flushed on reconnect
- [ ] Optimistic UI — user sees immediate feedback even when offline
- [ ] Queue persists across app restart

## Files Changed

| File | Action |
|------|--------|
| `hooks/useConnectionStatus.ts` | CREATE |
| `components/ui/offline-banner.tsx` | CREATE |
| `app/_layout.tsx` | MODIFY — add offline banner to root layout |
| `services/api-client.ts` | EXTEND — add queue + flush |

## Dependencies

- **Blocks**: Nothing directly
- **Blocked by**: 1A (needs api-client)
