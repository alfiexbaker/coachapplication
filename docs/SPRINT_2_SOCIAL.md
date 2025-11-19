# Sprint 2: Social Features & Discovery
**Duration:** 2-3 weeks
**Goal:** Build the social networking layer - feeds, posts, profiles, connections, and discovery

---

## Sprint Objectives

By the end of Sprint 2, we will have:
1. ✅ Social feed with posts (text, images, videos)
2. ✅ Like, comment, share functionality
3. ✅ Follow/unfollow users
4. ✅ Public profile pages (players, coaches, schools)
5. ✅ Coach & school discovery with search/filters
6. ✅ Rich user profiles with stats
7. ✅ Notification system (in-app)
8. ✅ Content moderation (report system)

---

## Features to Build

### 1. Database Schema Extensions

#### New Tables:

```sql
-- Posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media_urls TEXT[], -- Array of S3 URLs
  media_types TEXT[], -- ['image', 'video', 'image']
  post_type VARCHAR(50) DEFAULT 'standard', -- 'standard', 'achievement', 'session_highlight'
  metadata JSONB, -- Flexible data (e.g., achievement_id, session_id)
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'followers', 'private'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- Likes
CREATE TABLE post_likes (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_likes_post ON post_likes(post_id);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
  likes_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_comments_post ON comments(post_id);

-- Follows (social graph)
CREATE TABLE follows (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- Add follower counts to profiles (denormalized for performance)
ALTER TABLE player_profiles ADD COLUMN followers_count INT DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN following_count INT DEFAULT 0;
ALTER TABLE coach_profiles ADD COLUMN followers_count INT DEFAULT 0;
ALTER TABLE coach_profiles ADD COLUMN following_count INT DEFAULT 0;
ALTER TABLE school_profiles ADD COLUMN followers_count INT DEFAULT 0;

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'follow', 'booking', 'achievement', etc.
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB, -- Flexible payload (e.g., { post_id, actor_id })
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Reports (content moderation)
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id),
  post_id UUID REFERENCES posts(id),
  comment_id UUID REFERENCES comments(id),
  reason VARCHAR(50) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'other'
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reports_status ON reports(status);
```

---

### 2. Social Feed

#### Backend Endpoints:

**Posts:**
- [ ] `GET /api/v1/posts` - Get feed (paginated, algorithmic)
- [ ] `POST /api/v1/posts` - Create post
- [ ] `GET /api/v1/posts/:id` - Get single post
- [ ] `DELETE /api/v1/posts/:id` - Delete post (author only)
- [ ] `PATCH /api/v1/posts/:id` - Edit post (author only)

**Likes:**
- [ ] `POST /api/v1/posts/:id/like` - Like post (toggle)
- [ ] `GET /api/v1/posts/:id/likes` - Get users who liked (paginated)

**Comments:**
- [ ] `POST /api/v1/posts/:id/comments` - Add comment
- [ ] `GET /api/v1/posts/:id/comments` - Get comments (paginated)
- [ ] `DELETE /api/v1/comments/:id` - Delete comment
- [ ] `POST /api/v1/comments/:id/like` - Like comment

**Shares:**
- [ ] `POST /api/v1/posts/:id/share` - Share post (creates repost)

#### Feed Algorithm (Simple V1):
```typescript
// Pseudo-code for feed generation
function generateFeed(userId: string, page: number) {
  // Get users the person follows
  const following = await getFollowing(userId);

  // Get posts from followed users + own posts
  const posts = await getPosts({
    where: { author_id: { in: [...following, userId] } },
    orderBy: { created_at: 'desc' },
    skip: page * 20,
    take: 20,
    include: {
      author: true, // Include author profile
      likes: { where: { user_id: userId } }, // Did current user like?
      _count: { select: { likes: true, comments: true } }
    }
  });

  return posts;
}
```

**V2 Algorithm (Future):**
- Engagement score (likes + comments + shares)
- Recency decay
- Personalization (interests, interactions)

#### Frontend Feed Screen:

**FeedScreen (`app/(tabs)/feed.tsx`):**
- [ ] Infinite scroll list (FlatList)
- [ ] Pull-to-refresh
- [ ] Post card component
- [ ] Tabs: For You | Following | Coaches | Schools

**PostCard Component:**
```typescript
// components/social/PostCard.tsx
<PostCard>
  <Header>
    <Avatar />
    <Name> + <Role Badge>
    <Timestamp>
    <MoreMenu> (report, share, delete if own)
  </Header>

  <Content>
    {text}
  </Content>

  <Media> (if images/videos)
    <ImageGallery /> or <VideoPlayer />
  </Media>

  <Interactions>
    <LikeButton count={likes} liked={userLiked} />
    <CommentButton count={comments} />
    <ShareButton count={shares} />
  </Interactions>

  {showComments && (
    <CommentsList>
      {comments.map(comment => <Comment />)}
    </CommentsList>
  )}
</PostCard>
```

---

### 3. Create Post

#### Create Post Screen:

**Modal or Full Screen:**
- [ ] Text editor (multi-line input)
- [ ] Character limit (500 chars)
- [ ] Media picker (images/videos)
  - Max 10 images or 1 video (60s)
- [ ] Privacy selector (Public, Followers Only, Private)
- [ ] Tag people (autocomplete search)
- [ ] Add location (optional)
- [ ] Post button (disabled if empty)

#### Media Upload:
- [ ] Use `expo-image-picker`
- [ ] Compress images (expo-image-manipulator)
- [ ] Upload to S3/Cloudflare R2
- [ ] Show upload progress
- [ ] Return CDN URLs
- [ ] Save URLs to post.media_urls[]

#### Backend Post Creation:
```typescript
// POST /api/v1/posts
async function createPost(req, res) {
  const { content, media_urls, visibility } = req.body;
  const { userId } = req.user;

  // Validate
  if (!content && !media_urls?.length) {
    return res.status(400).json({ error: 'Post cannot be empty' });
  }

  // Create post
  const post = await db.posts.create({
    data: {
      author_id: userId,
      content,
      media_urls,
      media_types: inferMediaTypes(media_urls), // 'image' or 'video'
      visibility,
    },
    include: {
      author: true, // Return author profile with post
    }
  });

  // Send notifications to followers (async job)
  queue.add('notify-followers', { postId: post.id });

  res.status(201).json(post);
}
```

---

### 4. Like & Comment System

#### Like Functionality:
- [ ] Optimistic UI update (instant feedback)
- [ ] Toggle like (like if not liked, unlike if liked)
- [ ] Animate heart icon
- [ ] Haptic feedback
- [ ] Update like count locally
- [ ] Send API request in background

**Frontend (React Query mutation):**
```typescript
const likeMutation = useMutation({
  mutationFn: (postId: string) => api.posts.toggleLike(postId),
  onMutate: async (postId) => {
    // Optimistic update
    queryClient.setQueryData(['posts'], (old) => {
      return old.map(post =>
        post.id === postId
          ? { ...post, liked: !post.liked, likes_count: post.liked ? post.likes_count - 1 : post.likes_count + 1 }
          : post
      );
    });
  },
});
```

#### Comment Functionality:
- [ ] Comment input at bottom of post
- [ ] Submit comment
- [ ] Display comments in list
- [ ] Nested replies (1 level deep)
- [ ] Like comments
- [ ] Delete own comments

**CommentInput Component:**
```typescript
<CommentInput>
  <Avatar />
  <TextInput placeholder="Add a comment..." />
  <SendButton />
</CommentInput>
```

**CommentsList Component:**
```typescript
<CommentsList>
  {comments.map(comment => (
    <CommentItem key={comment.id}>
      <Avatar />
      <Content>
        <Name> {comment.author.name}
        <Text> {comment.content}
        <Timestamp> 2h ago
        <Actions>
          <LikeButton />
          <ReplyButton />
        </Actions>
      </Content>

      {comment.replies?.length > 0 && (
        <RepliesList>
          {comment.replies.map(reply => <Reply />)}
        </RepliesList>
      )}
    </CommentItem>
  ))}
</CommentsList>
```

---

### 5. Follow System

#### Backend Endpoints:
- [ ] `POST /api/v1/users/:id/follow` - Follow user
- [ ] `DELETE /api/v1/users/:id/follow` - Unfollow user
- [ ] `GET /api/v1/users/:id/followers` - Get followers (paginated)
- [ ] `GET /api/v1/users/:id/following` - Get following (paginated)
- [ ] `GET /api/v1/users/:id/follow-status` - Check if user follows another

#### Follow Logic:
```typescript
// POST /api/v1/users/:targetId/follow
async function followUser(req, res) {
  const { userId } = req.user; // Current user
  const { targetId } = req.params; // User to follow

  // Prevent self-follow
  if (userId === targetId) {
    return res.status(400).json({ error: 'Cannot follow yourself' });
  }

  // Create follow relationship
  await db.follows.create({
    data: {
      follower_id: userId,
      following_id: targetId,
    }
  });

  // Update follower counts (denormalized)
  await db.updateFollowerCounts(userId, targetId);

  // Send notification to target user
  await createNotification({
    user_id: targetId,
    type: 'follow',
    title: `${req.user.name} started following you`,
    data: { actor_id: userId }
  });

  res.status(200).json({ success: true });
}
```

#### Frontend Follow Button:
- [ ] Shows "Follow" or "Following" based on state
- [ ] Optimistic UI update
- [ ] Haptic feedback
- [ ] Shows on profiles, post cards

```typescript
<FollowButton
  userId={coach.id}
  isFollowing={isFollowing}
  onToggle={() => followMutation.mutate(coach.id)}
/>
```

---

### 6. Public Profiles (Enhanced)

#### Profile Tabs:

**Player Profile:**
- [ ] **Posts Tab**: User's posts (grid or list)
- [ ] **Stats Tab**: Sessions, hours, achievements
- [ ] **Activity Tab**: Recent sessions, reviews received

**Coach Profile:**
- [ ] **About Tab**: Bio, certifications, pricing, availability
- [ ] **Posts Tab**: Coach's posts
- [ ] **Reviews Tab**: Reviews from players/parents (5-star ratings)
- [ ] **Team Tab**: Current roster

**School Profile:**
- [ ] **About Tab**: Bio, facilities, staff count
- [ ] **Posts Tab**: Announcements, news
- [ ] **Programs Tab**: Training programs offered
- [ ] **Staff Tab**: List of coaches
- [ ] **Reviews Tab**: Reviews

#### Profile Header Component:
```typescript
<ProfileHeader>
  <CoverPhoto />
  <Avatar large />
  <Name + Verified Badge />
  <Bio />

  <Stats>
    <Stat label="Followers" value={1.2k} />
    <Stat label="Following" value={340} />
    <Stat label="Posts" value={89} />
    {role === 'coach' && <Stat label="Rating" value={4.8} />}
  </Stats>

  <Actions>
    {isOwnProfile ? (
      <EditButton />
    ) : (
      <>
        <FollowButton />
        <MessageButton />
        {role === 'coach' && <BookButton />}
      </>
    )}
  </Actions>
</ProfileHeader>
```

#### Backend Profile Endpoints:
- [ ] `GET /api/v1/users/:id/posts` - Get user's posts
- [ ] `GET /api/v1/users/:id/stats` - Get profile stats (followers, sessions, etc.)

---

### 7. Discovery & Search

#### Search Screen (`app/(tabs)/discover.tsx`):

**Tabs:**
- Coaches
- Schools
- Players (for coaches recruiting)

**Search Bar:**
- [ ] Text input with debounce (300ms)
- [ ] Search by name, location, specialty
- [ ] Filters (expandable panel)

**Filters (Coach Search):**
- [ ] Location (postcode + radius slider)
- [ ] Price range (slider: £0-£100/hr)
- [ ] Rating (4+ stars, 4.5+ stars)
- [ ] Specialty (multi-select: Youth, Goalkeeper, Fitness, etc.)
- [ ] Certification (DBS, FA Level 1/2/3)
- [ ] Availability (today, this week, this month)
- [ ] Age group (U10, U14, U18, Adult)

**Sort Options:**
- Distance (nearest first)
- Price (low to high, high to low)
- Rating (highest first)
- Newest

**Results List:**
- [ ] Coach card (name, avatar, rating, price, distance, follow button)
- [ ] Tap to view full profile
- [ ] Infinite scroll (pagination)

#### Backend Search Endpoint:
```typescript
// GET /api/v1/coaches?q=goalkeeper&postcode=SW1A&radius=10&minRating=4&sort=distance
async function searchCoaches(req, res) {
  const { q, postcode, radius, minPrice, maxPrice, minRating, sort } = req.query;

  // Get lat/lng from postcode (use geocoding API)
  const { lat, lng } = await geocodePostcode(postcode);

  // Build query
  const coaches = await db.coach_profiles.findMany({
    where: {
      // Text search
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
        { specialties: { has: q } },
      ],
      // Filters
      price_1on1: { gte: minPrice, lte: maxPrice },
      rating: { gte: minRating },
    },
    // Calculate distance (PostgreSQL PostGIS or app-level)
    // Filter by radius
  });

  // Sort results
  if (sort === 'distance') {
    coaches.sort((a, b) => calculateDistance(lat, lng, a) - calculateDistance(lat, lng, b));
  }

  res.json(coaches);
}
```

#### Map View (Optional):
- [ ] Install `react-native-maps`
- [ ] Show coaches as pins on map
- [ ] Tap pin to see coach card
- [ ] Cluster markers when zoomed out

---

### 8. Notifications

#### In-App Notification Center:

**Screen: NotificationsScreen**
- [ ] Tabs: All | Bookings | Social | Payments
- [ ] List of notifications
- [ ] Mark as read on tap
- [ ] Swipe to delete
- [ ] Badge count on tab icon

**Notification Types:**
- Like: "John liked your post"
- Comment: "Sarah commented on your post"
- Follow: "Mike started following you"
- Booking: "New booking request from Emma"
- Payment: "Payment received: £50.00"
- Achievement: "You unlocked a new badge!"

**Backend:**
- [ ] `GET /api/v1/notifications` - Get notifications (paginated)
- [ ] `PATCH /api/v1/notifications/:id/read` - Mark as read
- [ ] `POST /api/v1/notifications/read-all` - Mark all as read
- [ ] `DELETE /api/v1/notifications/:id` - Delete notification

**Real-time Updates:**
- [ ] Use Socket.io or Pusher
- [ ] Listen for new notifications
- [ ] Show badge count
- [ ] Play sound (optional)

**Notification Creation (Backend):**
```typescript
async function createNotification(data: {
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: any;
}) {
  // Save to DB
  const notification = await db.notifications.create({ data });

  // Send real-time update via WebSocket
  io.to(data.user_id).emit('notification', notification);

  // Send push notification (if user has tokens)
  await sendPushNotification(data.user_id, {
    title: data.title,
    body: data.body,
    data: data.data,
  });

  return notification;
}
```

---

### 9. Content Moderation

#### Report System:

**Report Button (on posts, comments, profiles):**
- [ ] "Report" option in more menu
- [ ] Modal with report reasons:
  - Spam
  - Harassment or bullying
  - Inappropriate content
  - Impersonation
  - Other (text input)
- [ ] Submit report

**Backend:**
- [ ] `POST /api/v1/reports` - Submit report
```typescript
{
  reported_user_id?: string,
  post_id?: string,
  comment_id?: string,
  reason: 'spam' | 'harassment' | 'inappropriate' | 'other',
  description?: string
}
```

**Admin Dashboard (Basic):**
- [ ] View pending reports
- [ ] Review content
- [ ] Actions: Dismiss | Remove Content | Suspend User
- [ ] (Full admin panel in future sprint)

#### Profanity Filter:
- [ ] Install `bad-words` npm package
- [ ] Filter posts/comments for minors (under 13)
- [ ] Warn before posting if detected

---

### 10. Media Handling

#### Image Upload:
- [ ] Install `expo-image-picker`
- [ ] Image compression (reduce file size)
- [ ] Max size: 10MB per image
- [ ] Max images per post: 10
- [ ] Supported formats: JPG, PNG, HEIC

#### Video Upload:
- [ ] Max duration: 60 seconds
- [ ] Max size: 50MB
- [ ] Supported formats: MP4, MOV
- [ ] Show thumbnail preview

#### Backend Upload:
- [ ] Endpoint: `POST /api/v1/upload`
- [ ] Validate file type & size
- [ ] Upload to S3/R2
- [ ] Generate thumbnail for videos
- [ ] Return CDN URL

**Upload Component:**
```typescript
<MediaPicker>
  <ImageGrid>
    {images.map((img, i) => (
      <ImagePreview key={i} uri={img.uri} onRemove={() => removeImage(i)} />
    ))}
    {images.length < 10 && <AddImageButton />}
  </ImageGrid>

  {video && (
    <VideoPreview uri={video.uri} onRemove={() => setVideo(null)} />
  )}

  {uploading && <ProgressBar progress={uploadProgress} />}
</MediaPicker>
```

---

### 11. User Experience Enhancements

#### Infinite Scroll:
- [ ] Implement pagination for feeds
- [ ] Load more on scroll to bottom
- [ ] Show loading spinner at bottom

#### Pull to Refresh:
- [ ] RefreshControl on all list screens
- [ ] Reload feed data

#### Optimistic Updates:
- [ ] Like/unlike instantly updates UI
- [ ] Follow/unfollow instantly updates button
- [ ] Post creation adds to feed immediately

#### Skeleton Loaders:
- [ ] Create PostCardSkeleton component
- [ ] Show while loading feed

#### Empty States:
- [ ] No posts yet: "Start following people to see posts"
- [ ] No search results: "No coaches found. Try adjusting filters."
- [ ] No followers: "No followers yet"

---

## API Endpoints Summary (Sprint 2)

### Posts
- `GET /api/v1/posts` - Get feed
- `POST /api/v1/posts` - Create post
- `GET /api/v1/posts/:id` - Get post
- `DELETE /api/v1/posts/:id` - Delete post
- `POST /api/v1/posts/:id/like` - Toggle like
- `GET /api/v1/posts/:id/likes` - Get likers
- `POST /api/v1/posts/:id/comments` - Add comment
- `GET /api/v1/posts/:id/comments` - Get comments
- `POST /api/v1/posts/:id/share` - Share post

### Comments
- `DELETE /api/v1/comments/:id` - Delete comment
- `POST /api/v1/comments/:id/like` - Like comment

### Social
- `POST /api/v1/users/:id/follow` - Follow user
- `DELETE /api/v1/users/:id/follow` - Unfollow user
- `GET /api/v1/users/:id/followers` - Get followers
- `GET /api/v1/users/:id/following` - Get following

### Search
- `GET /api/v1/coaches?q=...` - Search coaches
- `GET /api/v1/schools?q=...` - Search schools
- `GET /api/v1/players?q=...` - Search players

### Notifications
- `GET /api/v1/notifications` - Get notifications
- `PATCH /api/v1/notifications/:id/read` - Mark read
- `POST /api/v1/notifications/read-all` - Mark all read

### Moderation
- `POST /api/v1/reports` - Report content
- `GET /api/v1/upload` - Upload media

---

## UI Components to Build (Sprint 2)

### Social:
- [ ] FeedScreen
- [ ] PostCard
- [ ] CreatePostScreen
- [ ] MediaPicker
- [ ] ImageGallery
- [ ] VideoPlayer
- [ ] CommentsList
- [ ] CommentInput
- [ ] LikeButton
- [ ] FollowButton
- [ ] ShareButton

### Discovery:
- [ ] DiscoverScreen (update existing)
- [ ] CoachCard (update existing)
- [ ] SchoolCard
- [ ] SearchBar
- [ ] FilterPanel
- [ ] MapView (optional)

### Profiles:
- [ ] ProfileHeader
- [ ] ProfileTabs
- [ ] PostsGrid
- [ ] FollowersList
- [ ] FollowingList

### Notifications:
- [ ] NotificationsScreen
- [ ] NotificationItem
- [ ] NotificationBadge

### Moderation:
- [ ] ReportModal

---

## Success Criteria

✅ Sprint 2 is complete when:
1. User can create posts with text and media
2. User can like, comment, share posts
3. User can follow/unfollow other users
4. Feed displays posts from followed users
5. Search works for coaches and schools with filters
6. Public profiles show posts and stats
7. Notifications work (in-app)
8. Report system functional
9. All social endpoints tested
10. Media uploads work (images and videos)

---

## Testing Checklist

- [ ] Create post (text only)
- [ ] Create post with images (1, 5, 10)
- [ ] Create post with video
- [ ] Like/unlike post
- [ ] Comment on post
- [ ] Reply to comment
- [ ] Follow/unfollow user
- [ ] View follower/following lists
- [ ] Search coaches by name
- [ ] Filter coaches by price
- [ ] Sort by distance
- [ ] View public profile
- [ ] Receive notification for like
- [ ] Receive notification for follow
- [ ] Mark notification as read
- [ ] Report a post
- [ ] Report a user

---

## Dependencies

**External Services:**
- S3/Cloudflare R2 (media storage)
- CDN (media delivery)
- Geocoding API (postcode to lat/lng)
- Socket.io or Pusher (real-time notifications)

**NPM Packages:**
- expo-image-picker
- expo-image-manipulator (compression)
- expo-av (video player)
- react-native-maps (optional)
- Socket.io client
- bad-words (profanity filter)

---

## Estimated Effort

**Backend:** 6-8 days
- Posts API: 2 days
- Social graph (follows): 1 day
- Search & filters: 2 days
- Notifications: 1 day
- Reports & moderation: 1 day
- Testing: 1 day

**Frontend:** 6-8 days
- Feed UI: 2 days
- Create post: 1 day
- Profiles: 2 days
- Search & discovery: 2 days
- Notifications: 1 day
- Testing: 1 day

**Total:** 12-16 days (2.5-3 weeks)

---

## Next Sprint Preview

Sprint 3 will focus on:
- Bookings & appointments
- Calendar management
- Payment integration (Stripe)
- Session notes
- Reviews & ratings

