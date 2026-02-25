# Progress & Development Sprint 1: Broken Features

**Sprint Goal**: Fix critical calculation errors, data display bugs, and broken functionality in progress tracking, badges, and video features. These are user-facing bugs that break core features or show incorrect data.

**Items**: 11 (173, 174, 175, 176, 228, 229, 230, 232, 233, 279, 289)

---

## Item 173: Four Corner Diamond Caps at 99

**Problem**: Skills cap at 99 instead of 100 in the Four Corner Diamond visualization.

**File**: `components/progress/four-corner-diamond.tsx` line ~58

**Current behavior**: Uses `Math.min(99, ...)` which prevents full 100% display.

**Prompt**:
```
Fix the Four Corner Diamond skill cap in components/progress/four-corner-diamond.tsx.

Actual code (line 58, function named clampScore):
function clampScore(value: number): number {
  return Math.max(0, Math.min(99, Math.round(value)));
}

Change 99 to 100 to allow full 100%:
function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

Also verify all SVG calculations handle 100 correctly:
- Point positioning should work with normalized values 0-100
- Labels should not overlap at 100
- Diamond shape should remain symmetrical at max values

Acceptance criteria:
✓ Skills can reach exactly 100% in visualization
✓ Diamond shape renders correctly with all 4 corners at 100
✓ Labels remain readable and non-overlapping
✓ No visual artifacts when all values are 100
```

---

## Item 174: Skill Level Card Progress Exceeds 100%

**Problem**: Progress bars can exceed 100% because values aren't clamped.

**Files**: `components/progress/skill-level-card.tsx` lines ~62, 89-94

**Current behavior**: Direct division without bounds checking allows >100% width.

**Prompt**:
```
Add progress clamping to Skill Level Card in components/progress/skill-level-card.tsx.

Current code (lines 89-94):
const progressWidth = (currentLevel / nextLevelThreshold) * 100;

Replace with clamped calculation:
const progressWidth = Math.min(100, Math.max(0, (currentLevel / nextLevelThreshold) * 100));

Also check line ~62 for similar calculations and apply same pattern.

Add defensive programming for edge cases:
- nextLevelThreshold === 0 → show 0%
- currentLevel > nextLevelThreshold → show 100%
- Negative values → show 0%

Acceptance criteria:
✓ Progress bars never exceed 100% width
✓ Progress bars never show negative width
✓ Division by zero handled gracefully
✓ Visual display accurate for all skill level ranges
✓ No console warnings about invalid layout
```

---

## Item 175: Coach Says Card Trend Icons

**Problem**: "Consistent" and "Declining" trends both show right arrow (→) instead of distinct icons.

**Files**: `components/progress/coach-says-card.tsx` lines ~285-288, 321

**Current behavior**: Icon selection logic uses same icon for multiple states.

**Prompt**:
```
Fix trend icon logic in Coach Says Card (components/progress/coach-says-card.tsx).

Current code (lines 285-288):
if (trend === 'improving') return 'arrow-up';
if (trend === 'declining') return 'arrow-right';
return 'arrow-right'; // consistent case

This makes declining and consistent identical. Fix:

getTrendIcon(trend: 'improving' | 'consistent' | 'declining'): string {
  if (trend === 'improving') return 'arrow-up';
  if (trend === 'declining') return 'arrow-down';
  return 'minus'; // horizontal line for consistent
}

Also update getTrendColor at line ~321 to handle all 3 states:
- improving → colors.success
- declining → colors.error
- consistent → colors.text.secondary

Use const { colors } = useTheme() for color values.

Acceptance criteria:
✓ Improving shows up arrow in success color
✓ Declining shows down arrow in error color
✓ Consistent shows minus/horizontal line in secondary text color
✓ All icons from @expo/vector-icons MaterialIcons set
✓ Icons visually distinct at a glance
```

---

## Item 176: Player Card OVR Requires Exactly 5 Attributes

**Problem**: Overall rating shows nothing if there aren't exactly 5 attributes.

**Files**: `components/progress/player-card-front.tsx` lines ~68-72

**Current behavior**: Hardcoded array access [0], [1], [2], [3], [4] crashes with fewer attributes.

**Prompt**:
```
Make Player Card OVR calculation flexible in components/progress/player-card-front.tsx.

Current code (lines 68-72):
const ovr = Math.round((attrs[0] + attrs[1] + attrs[2] + attrs[3] + attrs[4]) / 5);

This breaks with 4 or fewer attributes. Replace with:

const calculateOVR = (attributes: Array<{value: number}>): number => {
  if (attributes.length === 0) return 0;
  const sum = attributes.reduce((acc, attr) => acc + attr.value, 0);
  return Math.round(sum / attributes.length);
};

const ovr = calculateOVR(topAttributes);

Also handle display when OVR is 0:
- Show "N/A" instead of "0" if no attributes
- Use colors.text.tertiary for empty state
- Add min-height to prevent layout shift

Acceptance criteria:
✓ Works with 0-20 attributes (any count)
✓ Calculates average correctly regardless of count
✓ Shows "N/A" when no attributes available
✓ No crashes or undefined values
✓ Layout stable regardless of attribute count
```

---

## Item 228: Video Player Completely Disabled

**Problem**: Video player is a non-functional placeholder that never plays videos.

**Files**: `components/drills/VideoPlayer.tsx` lines 1-43

**Current behavior**: Returns static placeholder with "Video player coming soon".

**Prompt**:
```
Implement functional video player in components/drills/VideoPlayer.tsx.

Current file is 43-line placeholder. Replace with working implementation using expo-av:

import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useState, useRef } from 'react';
import { View, ActivityIndicator, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Row, Center } from '@/components/primitives';

interface VideoPlayerProps {
  uri: string;
  thumbnailUri?: string;
  onPlaybackStatusUpdate?: (status: AVPlaybackStatus) => void;
}

export function VideoPlayer({ uri, thumbnailUri, onPlaybackStatusUpdate }: VideoPlayerProps) {
  const { colors } = useTheme();
  const videoRef = useRef<Video>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={{ backgroundColor: colors.background.secondary, borderRadius: 12, overflow: 'hidden' }}>
      <Video
        ref={videoRef}
        source={{ uri }}
        rate={1.0}
        volume={1.0}
        isMuted={false}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            setIsLoading(false);
          }
          onPlaybackStatusUpdate?.(status);
        }}
        style={{ width: '100%', aspectRatio: 16/9 }}
      />
      {isLoading && (
        <Center style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <ActivityIndicator size="large" color={colors.primary.base} />
        </Center>
      )}
      <Pressable
        onPress={() => {
          if (isPlaying) {
            videoRef.current?.pauseAsync();
          } else {
            videoRef.current?.playAsync();
          }
        }}
        style={{ position: 'absolute', bottom: 16, right: 16 }}
      >
        <View style={{
          backgroundColor: withAlpha(colors.background.base, 0.9),
          borderRadius: 999,
          padding: 12
        }}>
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={24}
            color={colors.primary.base}
          />
        </View>
      </Pressable>
    </View>
  );
}

NOTE: expo-av is already in package.json — no install needed.

Acceptance criteria:
✓ Videos actually play when play button pressed
✓ Shows loading spinner while video loads
✓ Play/pause toggle works correctly
✓ Video fills container with 16:9 aspect ratio
✓ Controls visible and accessible
✓ No crashes on invalid URI (show error state)
✓ Uses theme colors via useTheme()
```

---

## Item 229: Video Upload Progress is Fake

**Problem**: Upload progress jumps from 0% to 100% instantly instead of showing real progress.

**Files**: `hooks/use-video-upload.ts` lines ~44-47

**Current behavior**: Mock implementation that doesn't track actual upload.

**Prompt**:
```
Implement improved simulated video upload progress in hooks/use-video-upload.ts.
NOTE: There is no real backend — this replaces instant 0→100 with realistic chunk-based simulation.

Current code (lines 44-47):
setProgress(0);
// simulate upload
await new Promise(resolve => setTimeout(resolve, 500));
setProgress(100);

Since we're using AsyncStorage (no backend API yet), simulate realistic progress:

const uploadVideo = async (uri: string, metadata: VideoMetadata) => {
  setIsUploading(true);
  setProgress(0);
  setError(null);

  try {
    // Read file info for realistic simulation
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const fileSize = fileInfo.size || 10000000; // default 10MB
    const chunkSize = 1000000; // 1MB chunks
    const totalChunks = Math.ceil(fileSize / chunkSize);

    // Simulate chunk-by-chunk upload with realistic timing
    for (let i = 0; i < totalChunks; i++) {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms per chunk
      const progressPercent = Math.round(((i + 1) / totalChunks) * 100);
      setProgress(progressPercent);
    }

    // Save to AsyncStorage via apiClient
    const videoId = generateId('vid');
    const video: Video = {
      id: videoId,
      uri,
      ...metadata,
      uploadedAt: new Date().toISOString(),
    };

    await apiClient.set(`VIDEO_${videoId}`, video);
    setProgress(100);
    return ok(video);

  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : 'Unknown upload error';
    setError(message);
    return err({ code: 'UNKNOWN', message });
  } finally {
    setIsUploading(false);
  }
};

Import FileSystem from expo-file-system if not present.

Acceptance criteria:
✓ Progress updates incrementally from 0-100%
✓ Progress reflects file size (larger = more steps)
✓ Each progress update visible to user (not instant)
✓ Upload completes successfully and saves to AsyncStorage
✓ Returns Result<Video, ServiceError>
✓ Error state handled and displayed
```

---

## Item 230: Video Upload No Cancel

**Problem**: Can't cancel an in-progress upload.

**Files**: `hooks/use-video-upload.ts` lines ~37-120

**Current behavior**: No abort mechanism.

**Prompt**:
```
Add cancel functionality to video upload hook in hooks/use-video-upload.ts.

Add AbortController pattern:

export function useVideoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadVideo = async (uri: string, metadata: VideoMetadata) => {
    // Create abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileSize = fileInfo.size || 10000000;
      const chunkSize = 1000000;
      const totalChunks = Math.ceil(fileSize / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        // Check for abort
        if (signal.aborted) {
          throw new Error('Upload cancelled by user');
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      // ... rest of upload logic
    } catch (thrown: unknown) {
      const message = thrown instanceof Error ? thrown.message : 'Unknown error';
      if (message === 'Upload cancelled by user') {
        setError('Upload cancelled');
        return err({ code: 'UNKNOWN', message: 'Upload cancelled by user' });
      }
      setError(message);
      return err({ code: 'UNKNOWN', message });
    } finally {
      setIsUploading(false);
      abortControllerRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return {
    uploadVideo,
    cancelUpload,
    isUploading,
    progress,
    error,
  };
}

Acceptance criteria:
✓ cancelUpload() stops upload immediately
✓ Progress freezes at current value when cancelled
✓ Error message shows "Upload cancelled"
✓ Returns UPLOAD_CANCELLED error code
✓ Cleanup happens properly (isUploading = false)
✓ Can start new upload after cancelling
✓ No memory leaks from dangling abort controllers
```

---

## Item 232: Same Badge Awarded Multiple Times

**Problem**: Can award the same badge to the same athlete multiple times in the same session.

**Files**: `components/badges/quick-recognition-modal.tsx` lines ~112-121

**Current behavior**: No deduplication when adding badges.

**Prompt**:
```
Add session-scoped badge deduplication in components/badges/quick-recognition-modal.tsx.

Current code (lines 112-121) allows duplicate badge awards. Add tracking:

const QuickRecognitionModal = () => {
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<Badge[]>([]);
  // Add tracking map
  const [awardedBadges, setAwardedBadges] = useState<Map<string, Set<string>>>(new Map());

  const handleAwardBadge = async (athleteId: string, badge: Badge) => {
    // Check if already awarded
    const athleteBadges = awardedBadges.get(athleteId) || new Set();
    if (athleteBadges.has(badge.id)) {
      Alert.alert(
        'Already Awarded',
        `${badge.name} has already been awarded to this athlete in this session.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Award badge
    const result = await badgeService.awardBadge({
      athleteId,
      badgeId: badge.id,
      awardedBy: currentUserId,
      sessionId: currentSessionId,
    });

    if (result.success) {
      // Track as awarded — clone Set before mutating (React immutability)
      const updated = new Map(awardedBadges);
      const existing = updated.get(athleteId) || new Set<string>();
      const newBadges = new Set(existing);
      newBadges.add(badge.id);
      updated.set(athleteId, newBadges);
      setAwardedBadges(updated);

      // Show success
      Toast.show({ text: `${badge.name} awarded!`, type: 'success' });
    } else {
      Toast.show({ text: result.error.message, type: 'error' });
    }
  };

  // NOTE: result.success / result.data / result.error per types/result.ts

  // Reset tracking when modal closes
  const handleClose = () => {
    setAwardedBadges(new Map());
    setSelectedAthletes([]);
    setSelectedBadges([]);
    onClose();
  };

Also add visual indicator in badge list:
- Show checkmark on badges already awarded to selected athlete
- Disable badge button if already awarded
- Use colors.success.base for checkmark color

Acceptance criteria:
✓ Cannot award same badge twice to same athlete in one session
✓ Alert shows when attempting duplicate award
✓ Visual indicator shows already-awarded badges
✓ Awarded badge buttons are disabled
✓ Tracking resets when modal closes
✓ Can award same badge to different athletes
✓ Can award different badges to same athlete
```

---

## Item 233: Badge Session Selector Case-Sensitive Search

**Problem**: Search is case-sensitive, so "passing" doesn't match "Passing Drills".

**Files**: `components/badges/badge-session-selector.tsx` lines ~66-73

**Current behavior**: Direct string comparison without normalization.

**Prompt**:
```
Make badge session search case-insensitive in components/badges/badge-session-selector.tsx.

Current code (lines 66-73):
const filteredSessions = sessions.filter(s =>
  s.title.includes(searchQuery) || s.description.includes(searchQuery)
);

Replace with case-insensitive search:

const filteredSessions = useMemo(() => {
  if (!searchQuery.trim()) return sessions;

  const query = searchQuery.toLowerCase().trim();
  return sessions.filter(session => {
    const title = session.title.toLowerCase();
    const description = (session.description || '').toLowerCase();
    const date = new Date(session.date).toLocaleDateString().toLowerCase();

    return title.includes(query) ||
           description.includes(query) ||
           date.includes(query);
  });
}, [sessions, searchQuery]);

Also add search highlights:
- Bold matching text in results
- Show "No sessions match '{query}'" if empty
- Show total count: "12 sessions" / "3 of 12 sessions"

Use useMemo to prevent re-filtering on every render.

Acceptance criteria:
✓ "passing" matches "Passing Drills"
✓ "DEFENSE" matches "defensive positioning"
✓ Search includes title, description, and date
✓ Matching text highlighted in results
✓ Empty state shows search query
✓ Result count displayed
✓ Search debounced (300ms) to avoid lag
✓ Performance good with 100+ sessions
```

---

## Item 279: Video Annotation Update Loses ID

**Problem**: Updating an annotation removes it and adds a new one with different ID.

**Files**: `services/video-service.ts` lines ~619-642

**Current behavior**: Mock implementation deletes + adds instead of updating.

**Prompt**:
```
Fix annotation update to preserve ID in services/video-service.ts.

Current code (lines 599-632):
NOTE: updateAnnotation returns Promise<VideoAnnotation | null> (NOT Result).
In mock mode it calls this.removeAnnotation() then this.addAnnotation() — addAnnotation generates a NEW ID, losing the original.

async updateAnnotation(videoId: string, annotationId: string, updates: UpdateAnnotationInput): Promise<VideoAnnotation | null> {
  const video = await this.getVideo(videoId);
  if (!video) return null;
  const annotationIndex = video.annotations.findIndex((a) => a.id === annotationId);
  if (annotationIndex === -1) return null;
  const existingAnnotation = video.annotations[annotationIndex];
  const updatedAnnotation = { ...existingAnnotation, ...updates, updatedAt: new Date().toISOString() };

  // BUG: removeAnnotation + addAnnotation generates a NEW ID
  if (USE_MOCK) {
    await this.removeAnnotation(videoId, annotationId);
    await this.addAnnotation(videoId, updatedAnnotation.timestamp, updatedAnnotation.label, updatedAnnotation.type, updatedAnnotation.note);
    return updatedAnnotation; // Returns stale object with original ID, but storage has new ID
  }
}

Fix to update in place, matching the existing return type (VideoAnnotation | null):

async updateAnnotation(
  videoId: string,
  annotationId: string,
  updates: Partial<Omit<VideoAnnotation, 'id'>>
): Promise<VideoAnnotation | null> {
  const video = this.videos.get(videoId);
  if (!video) return null;

  const annotationIndex = video.annotations.findIndex(a => a.id === annotationId);
  if (annotationIndex === -1) return null;

  // Update in place, preserving original ID
  video.annotations[annotationIndex] = {
    ...video.annotations[annotationIndex],
    ...updates,
    id: annotationId, // Preserve original ID
  };

  this.videos.set(videoId, video);
  await this.save();

  emitTyped('VIDEO_ANNOTATION_UPDATED', {
    videoId,
    annotationId,
    annotation: video.annotations[annotationIndex]
  });

  logger.debug('Annotation updated', { videoId, annotationId });
  return video.annotations[annotationIndex];
}

Also add validation:
- Timestamp within video duration
- Text not empty
- No duplicate timestamps

Acceptance criteria:
✓ Annotation ID preserved after update
✓ All fields update correctly
✓ VIDEO_ANNOTATION_UPDATED event emitted
✓ Returns NOT_FOUND if annotation doesn't exist
✓ Validates timestamp range
✓ Persists to AsyncStorage via apiClient
✓ Logger records update
```

---

## Item 289: Video Screen Timestamps No Range Validation

**Problem**: Can add annotations with invalid timestamps (negative, beyond video duration).

**Files**: `app/videos/[id].tsx` lines ~125, 159

**Current behavior**: No validation before creating annotation.

**Prompt**:
```
Add timestamp validation to video annotation creation in app/videos/[id].tsx.

At lines ~125 and ~159, add validation before creating annotation:

// CRITICAL: useTheme() MUST be at component top level (Rules of Hooks).
// Never call hooks inside event handlers, callbacks, or regular functions.
const { colors } = useTheme(); // <-- at component top level

const handleAddAnnotation = async () => {
  // Validate timestamp
  if (timestamp < 0) {
    Alert.alert('Invalid Timestamp', 'Timestamp cannot be negative');
    return;
  }

  if (videoDuration && timestamp > videoDuration) {
    Alert.alert(
      'Invalid Timestamp',
      `Timestamp cannot exceed video duration (${formatDuration(videoDuration)})`
    );
    return;
  }

  if (!annotationText.trim()) {
    Alert.alert('Empty Annotation', 'Please enter annotation text');
    return;
  }

  if (annotationText.length > 500) {
    Alert.alert('Annotation Too Long', 'Maximum 500 characters');
    return;
  }

  const result = await videoService.addAnnotation(videoId, {
    timestamp,
    text: annotationText.trim(),
    createdBy: currentUserId,
  });

  if (result.success) {
    setAnnotationText('');
    Keyboard.dismiss();
    Toast.show({ text: 'Annotation added', type: 'success' });
  } else {
    Alert.alert('Error', result.error.message);
  }
};

Add helper for duration formatting:
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

Show timestamp picker with max value = video duration.

Acceptance criteria:
✓ Cannot add annotation with negative timestamp
✓ Cannot add annotation beyond video duration
✓ Cannot add empty annotation
✓ Cannot add annotation >500 characters
✓ Clear error messages for each case
✓ Timestamp picker capped at video duration
✓ Success toast on valid annotation
✓ Input cleared after successful add
```

---

## Sprint 1 Summary

**Total Items**: 11
**Estimated Effort**: 18-22 hours
**Priority**: HIGH - all are broken core features or data integrity bugs

**Dependency Map**:
- Items 228, 229, 230, 279, 289 are video-related → work together
- Items 173, 174, 175, 176 are progress visualization → work together
- Items 232, 233 are badge system → work together

**Success Criteria**:
- ✓ All calculations accurate and bounded (0-100%)
- ✓ No duplicate badges in single session
- ✓ Video player functional with real playback
- ✓ Upload progress realistic and cancellable
- ✓ Annotation IDs stable across updates
- ✓ All validation prevents invalid data entry

**Testing Focus**:
- Edge cases: 0 attributes, 100% values, division by zero
- Progress calculations with various inputs
- Badge deduplication across multiple athletes
- Video upload cancel mid-stream
- Annotation timestamp boundaries

**Risk Areas**:
- expo-av integration for video playback (may need native rebuild)
- FileSystem API for upload progress simulation
- AbortController pattern in React Native
