# Sprint 4: Development Hub, Analytics, Teams & Advanced Features
**Duration:** 3-4 weeks
**Goal:** Complete the platform with player development tracking, team management, group chats, schools, and analytics

---

## Sprint Objectives

By the end of Sprint 4, we will have:
1. ✅ Development Hub with skills tracking & analytics
2. ✅ Interactive charts & graphs (progress visualization)
3. ✅ Achievement & badge system (gamification)
4. ✅ Team management (coaches create teams, invite players)
5. ✅ Group chats (team chats, class chats)
6. ✅ School profiles & staff management
7. ✅ Goals & objectives system
8. ✅ Push notifications (FCM)
9. ✅ Admin panel (moderation, analytics)
10. ✅ Platform ready for launch

---

## Features to Build

### 1. Database Schema Extensions

#### New Tables:

```sql
-- Skills History (track skill progression over time)
CREATE TABLE skills_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  skill_name VARCHAR(50) NOT NULL, -- 'Passing', 'Shooting', 'Dribbling', etc.
  value INT NOT NULL CHECK (value >= 1 AND value <= 10), -- 1-10 scale
  session_id UUID REFERENCES bookings(id), -- Which session updated this
  recorded_by UUID REFERENCES users(id), -- Coach who updated
  recorded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_skills_player ON skills_history(player_id);
CREATE INDEX idx_skills_recorded ON skills_history(recorded_at);

-- Achievements/Badges
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  badge_icon VARCHAR(255), -- URL or emoji
  category VARCHAR(50), -- 'milestone', 'skill', 'consistency', 'social'
  requirement_type VARCHAR(50), -- 'total_sessions', 'skill_level', 'streak', etc.
  requirement_value INT, -- e.g., 10 (for 10 sessions)
  points INT DEFAULT 10, -- Gamification points
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player Achievements (unlocked badges)
CREATE TABLE player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);
CREATE INDEX idx_player_achievements_player ON player_achievements(player_id);

-- Goals (player-set or coach-assigned)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id), -- If coach-assigned
  title VARCHAR(200) NOT NULL, -- "Improve passing to 8/10"
  description TEXT,
  target_skill VARCHAR(50), -- 'Passing', null if general
  target_value INT, -- 8 (for 8/10)
  current_value INT, -- Current level
  deadline DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_goals_player ON goals(player_id);

-- Teams
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  logo_url TEXT,
  age_group VARCHAR(20), -- 'U10', 'U14', 'U18', 'Adult'
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_teams_coach ON teams(coach_id);

-- Team Members
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position VARCHAR(50), -- 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'
  jersey_number INT,
  is_captain BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, player_id)
);
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- Team Invites
CREATE TABLE team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Group Chats (team chats, class chats)
CREATE TABLE group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'team', 'class', 'custom'
  team_id UUID REFERENCES teams(id), -- If team chat
  school_id UUID REFERENCES users(id), -- If school class chat
  admin_ids UUID[] NOT NULL, -- Array of user IDs (coach, school admin)
  member_ids UUID[] NOT NULL, -- Array of all members
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP
);

-- Group Messages
CREATE TABLE group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT,
  attachments TEXT[],
  type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_group_messages_group ON group_messages(group_id);

-- Push Notification Tokens
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- School Staff (coaches employed by school)
CREATE TABLE school_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES users(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'coach', -- 'coach', 'admin', 'manager'
  hired_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(school_id, coach_id)
);

-- School Programs (training offerings)
CREATE TABLE school_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL, -- "U12 Development Program"
  description TEXT,
  age_group VARCHAR(20),
  price DECIMAL(8, 2), -- £200/month
  schedule TEXT, -- "Mon/Wed/Fri 4-6pm"
  capacity INT, -- Max students
  enrolled_count INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add level system to player profiles
ALTER TABLE player_profiles ADD COLUMN current_level VARCHAR(20) DEFAULT 'Bronze';
ALTER TABLE player_profiles ADD COLUMN experience_points INT DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN streak_days INT DEFAULT 0;
ALTER TABLE player_profiles ADD COLUMN last_session_date DATE;
```

---

### 2. Development Hub (Player View)

This is the core feature that differentiates Clubroom from simple booking apps.

#### Overview Dashboard:

**Stats Cards:**
- [ ] Total Sessions: 42
- [ ] Total Hours: 56.5
- [ ] Current Level: Silver (3,400 / 5,000 XP to Gold)
- [ ] Current Streak: 🔥 12 days

**Progress Rings:**
- [ ] Circular progress indicators (like Apple Watch)
  - Sessions this month (8 / 12 goal)
  - Skills improved (4 / 8)
  - Active streak

**Recent Achievements:**
- [ ] Horizontal scroll of recently unlocked badges
- [ ] Tap to see details

**Quick Actions:**
- [ ] Book another session
- [ ] View full history
- [ ] Set a goal

---

#### Skills Matrix:

**Radar/Spider Chart:**
- [ ] Use Victory Native or Recharts
- [ ] Show 6-8 skills on radar:
  - Passing
  - Shooting
  - Dribbling
  - Defending
  - Positioning
  - Fitness
  - Ball Control
  - Game IQ
- [ ] Each skill 1-10 scale
- [ ] Show comparison: Current vs 3 months ago

**Skill Detail View:**
- [ ] Tap a skill to see history
- [ ] Line chart: Skill progression over time
- [ ] List of sessions that improved this skill
- [ ] Coach notes related to this skill

**Backend:**
```typescript
// GET /api/v1/development/:playerId/skills
async function getPlayerSkills(req, res) {
  const { playerId } = req.params;

  // Get latest skill values
  const latestSkills = await db.$queryRaw`
    SELECT DISTINCT ON (skill_name) skill_name, value, recorded_at
    FROM skills_history
    WHERE player_id = ${playerId}
    ORDER BY skill_name, recorded_at DESC
  `;

  // Get historical data for charts
  const history = await db.skills_history.findMany({
    where: { player_id: playerId },
    orderBy: { recorded_at: 'asc' },
  });

  res.json({
    current: latestSkills,
    history,
  });
}
```

**Frontend:**
```typescript
import { VictoryPolarAxis, VictoryArea, VictoryChart } from 'victory-native';

function SkillsRadarChart({ skills }) {
  return (
    <VictoryChart polar>
      {skills.map((skill, i) => (
        <VictoryPolarAxis key={i} dependentAxis tickValues={[2, 4, 6, 8, 10]} />
      ))}
      <VictoryArea
        data={skills.map(s => ({ x: s.name, y: s.value }))}
        style={{ data: { fill: '#3b82f6', opacity: 0.7 } }}
      />
    </VictoryChart>
  );
}
```

---

#### Session History:

**Timeline View:**
- [ ] Chronological list (newest first)
- [ ] Each entry shows:
  - Date & time
  - Coach name & avatar
  - Duration
  - Focus areas (chips)
  - Effort rating (stars)
  - Notes preview (expandable)
  - Attachments (view/download)

**Filters:**
- [ ] Date range picker
- [ ] Filter by coach
- [ ] Filter by skill focus
- [ ] Filter by rating

**Export:**
- [ ] Button: "Export Report"
- [ ] Generate PDF with all sessions (last 6 months)
- [ ] Include stats, charts, coach notes

**Backend:**
```typescript
// GET /api/v1/development/:playerId/sessions
async function getSessionHistory(req, res) {
  const { playerId } = req.params;
  const { startDate, endDate, coachId, skill } = req.query;

  const sessions = await db.bookings.findMany({
    where: {
      player_id: playerId,
      status: 'completed',
      date: { gte: startDate, lte: endDate },
      coach_id: coachId,
      // Filter by skill via session_notes.focus_areas
    },
    include: {
      coach: true,
      session_notes: true,
    },
    orderBy: { date: 'desc' },
  });

  res.json(sessions);
}
```

---

#### Analytics & Graphs:

**Page: Analytics**

**Charts to Build:**

1. **Sessions Over Time (Line Chart):**
   - X-axis: Months (last 12)
   - Y-axis: Number of sessions
   - Show trend line

2. **Hours Trained (Bar Chart):**
   - X-axis: Weeks (last 8)
   - Y-axis: Hours
   - Color by session type (1-on-1, group)

3. **Skill Improvements (Horizontal Bar Chart):**
   - X-axis: Improvement (0-3 points)
   - Y-axis: Skills
   - Show which skills improved most

4. **Training Frequency (Heatmap Calendar):**
   - GitHub-style contribution graph
   - Green intensity = more sessions that day
   - Last 365 days

5. **Session Type Breakdown (Pie Chart):**
   - 1-on-1: 60%
   - Small group: 30%
   - Team: 10%

**Using Victory Native:**
```typescript
import { VictoryLine, VictoryChart, VictoryAxis } from 'victory-native';

function SessionsOverTimeChart({ data }) {
  return (
    <VictoryChart>
      <VictoryAxis tickFormat={(x) => `${x}`} />
      <VictoryAxis dependentAxis />
      <VictoryLine
        data={data} // [{ month: 'Jan', sessions: 4 }, ...]
        x="month"
        y="sessions"
        style={{ data: { stroke: '#3b82f6' } }}
      />
    </VictoryChart>
  );
}
```

---

### 3. Achievements & Badges

#### Achievement Types:

**Milestone Badges:**
- 🎯 First Session
- 🏆 10 Sessions Completed
- 💯 50 Sessions Completed
- ⚡ 100 Hours Trained
- 🔥 30-Day Streak
- 🌟 6-Month Streak

**Skill Badges:**
- ⚽ Passing Master (Passing = 10/10)
- 🎯 Sharpshooter (Shooting = 10/10)
- 🏃 Speed Demon (Fitness = 10/10)
- 🧠 Tactical Genius (Game IQ = 10/10)

**Social Badges:**
- 👥 Team Player (Joined 3+ teams)
- 📝 Feedback Champion (Received 10+ reviews)
- 🌐 Community Leader (100+ followers)

**Consistency Badges:**
- 📅 Weekly Warrior (Sessions every week for a month)
- 🔄 Back-to-Back (2 sessions in 2 days)

#### Backend - Achievement Engine:

**Seed achievements:**
```typescript
// scripts/seedAchievements.ts
const achievements = [
  {
    name: 'First Step',
    description: 'Complete your first training session',
    badge_icon: '🎯',
    category: 'milestone',
    requirement_type: 'total_sessions',
    requirement_value: 1,
    points: 10,
  },
  {
    name: 'Dedicated Athlete',
    description: 'Complete 10 training sessions',
    badge_icon: '🏆',
    category: 'milestone',
    requirement_type: 'total_sessions',
    requirement_value: 10,
    points: 50,
  },
  // ... add 20-30 achievements
];

await db.achievements.createMany({ data: achievements });
```

**Check & Unlock (Background Job):**
```typescript
// After session completion, check for new achievements
async function checkAchievements(playerId: string) {
  const player = await db.player_profiles.findUnique({ where: { user_id: playerId } });
  const unlockedIds = await db.player_achievements.findMany({
    where: { player_id: playerId },
    select: { achievement_id: true },
  });

  const allAchievements = await db.achievements.findMany();

  for (const achievement of allAchievements) {
    // Skip if already unlocked
    if (unlockedIds.some(u => u.achievement_id === achievement.id)) continue;

    let meetsRequirement = false;

    switch (achievement.requirement_type) {
      case 'total_sessions':
        meetsRequirement = player.total_sessions >= achievement.requirement_value;
        break;
      case 'total_hours':
        meetsRequirement = player.total_hours >= achievement.requirement_value;
        break;
      case 'streak_days':
        meetsRequirement = player.streak_days >= achievement.requirement_value;
        break;
      case 'skill_level':
        // Check if any skill >= requirement_value
        const skills = await getLatestSkills(playerId);
        meetsRequirement = skills.some(s => s.value >= achievement.requirement_value);
        break;
    }

    if (meetsRequirement) {
      // Unlock achievement!
      await db.player_achievements.create({
        data: {
          player_id: playerId,
          achievement_id: achievement.id,
        }
      });

      // Award XP
      await db.player_profiles.update({
        where: { user_id: playerId },
        data: {
          experience_points: { increment: achievement.points },
        }
      });

      // Send notification
      await createNotification({
        user_id: playerId,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        body: `You unlocked: ${achievement.name}`,
        data: { achievement_id: achievement.id },
      });

      // Create auto-post (optional)
      await createPost({
        author_id: playerId,
        content: `Just unlocked the "${achievement.name}" badge! ${achievement.badge_icon}`,
        post_type: 'achievement',
        metadata: { achievement_id: achievement.id },
      });
    }
  }
}
```

#### Frontend - Achievements Screen:

**Layout:**
- [ ] Grid of badges
- [ ] Locked badges shown in grayscale
- [ ] Progress bars for in-progress achievements
- [ ] Tap to see details

```typescript
function AchievementsScreen() {
  const { data: achievements } = useQuery(['achievements'], api.achievements.getAll);
  const { data: unlocked } = useQuery(['myAchievements'], api.achievements.getMine);

  return (
    <ScrollView>
      <Text>Unlocked: {unlocked.length} / {achievements.length}</Text>
      <Grid>
        {achievements.map(achievement => {
          const isUnlocked = unlocked.some(u => u.achievement_id === achievement.id);
          return (
            <BadgeCard
              key={achievement.id}
              icon={achievement.badge_icon}
              name={achievement.name}
              unlocked={isUnlocked}
              progress={calculateProgress(achievement, player)}
            />
          );
        })}
      </Grid>
    </ScrollView>
  );
}
```

---

### 4. Level & XP System

#### Levels:
- Bronze (0-999 XP)
- Silver (1,000-4,999 XP)
- Gold (5,000-14,999 XP)
- Elite (15,000+ XP)

#### Earn XP:
- Complete session: +50 XP
- Unlock achievement: +10-100 XP (varies)
- Receive 5-star review: +25 XP
- Post content: +5 XP
- Get 10 likes on post: +10 XP

**Backend:**
```typescript
function calculateLevel(xp: number) {
  if (xp < 1000) return 'Bronze';
  if (xp < 5000) return 'Silver';
  if (xp < 15000) return 'Gold';
  return 'Elite';
}

async function awardXP(playerId: string, amount: number, reason: string) {
  const updated = await db.player_profiles.update({
    where: { user_id: playerId },
    data: {
      experience_points: { increment: amount },
    },
  });

  const newLevel = calculateLevel(updated.experience_points);

  // Check for level up
  if (newLevel !== updated.current_level) {
    await db.player_profiles.update({
      where: { user_id: playerId },
      data: { current_level: newLevel },
    });

    await createNotification({
      user_id: playerId,
      type: 'level_up',
      title: `Level Up! You're now ${newLevel}!`,
    });
  }

  return updated;
}
```

**Frontend - Level Badge:**
```typescript
function LevelBadge({ level, xp }) {
  const levels = { Bronze: 1000, Silver: 5000, Gold: 15000, Elite: Infinity };
  const nextLevel = getNextLevel(level);
  const progress = (xp % levels[level]) / levels[nextLevel];

  return (
    <View>
      <Text>{level}</Text>
      <ProgressBar value={progress} />
      <Text>{xp} / {levels[nextLevel]} XP</Text>
    </View>
  );
}
```

---

### 5. Goals & Objectives

#### Create Goal:

**Screen: Create Goal**
- [ ] Title: "Improve my passing"
- [ ] Target skill: Dropdown (Passing, Shooting, etc.)
- [ ] Target value: Slider (1-10)
- [ ] Deadline: Date picker
- [ ] Create button

**Backend:**
```typescript
// POST /api/v1/goals
async function createGoal(req, res) {
  const { player_id, title, target_skill, target_value, deadline } = req.body;

  // Get current skill level
  const currentSkill = await getCurrentSkillValue(player_id, target_skill);

  const goal = await db.goals.create({
    data: {
      player_id,
      title,
      target_skill,
      target_value,
      current_value: currentSkill,
      deadline,
      status: 'active',
    }
  });

  res.json(goal);
}
```

#### Track Progress:
- [ ] When skill is updated (via session notes), check active goals
- [ ] Update `current_value`
- [ ] If `current_value >= target_value`, mark goal as completed

**Auto-complete goals:**
```typescript
async function updatePlayerSkill(playerId, skillName, newValue) {
  // Save to skills_history
  await db.skills_history.create({
    data: { player_id: playerId, skill_name: skillName, value: newValue }
  });

  // Check active goals
  const activeGoals = await db.goals.findMany({
    where: {
      player_id: playerId,
      target_skill: skillName,
      status: 'active',
    }
  });

  for (const goal of activeGoals) {
    if (newValue >= goal.target_value) {
      await db.goals.update({
        where: { id: goal.id },
        data: {
          status: 'completed',
          completed_at: new Date(),
        }
      });

      await createNotification({
        user_id: playerId,
        type: 'goal_completed',
        title: 'Goal Completed! 🎉',
        body: `You achieved: ${goal.title}`,
      });
    } else {
      // Update progress
      await db.goals.update({
        where: { id: goal.id },
        data: { current_value: newValue },
      });
    }
  }
}
```

#### Goals Screen:
- [ ] Tabs: Active | Completed
- [ ] Each goal shows:
  - Title
  - Progress bar (current / target)
  - Days until deadline
  - Edit/Delete buttons

---

### 6. Team Management

#### Coach Creates Team:

**Screen: Create Team**
- [ ] Team name
- [ ] Age group (dropdown)
- [ ] Upload logo
- [ ] Description
- [ ] Create button

**Backend:**
```typescript
// POST /api/v1/teams
async function createTeam(req, res) {
  const { name, age_group, logo_url, description } = req.body;
  const { userId } = req.user; // Coach

  const team = await db.teams.create({
    data: {
      coach_id: userId,
      name,
      age_group,
      logo_url,
      description,
    }
  });

  // Auto-create team group chat
  await db.group_chats.create({
    data: {
      name: `${name} Team Chat`,
      type: 'team',
      team_id: team.id,
      admin_ids: [userId],
      member_ids: [userId],
    }
  });

  res.json(team);
}
```

---

#### Invite Players:

**Screen: Team Roster**
- [ ] List of current members
- [ ] Button: "Invite Player"
- [ ] Search for players
- [ ] Send invite

**Backend:**
```typescript
// POST /api/v1/teams/:teamId/invite
async function invitePlayer(req, res) {
  const { teamId } = req.params;
  const { player_id } = req.body;
  const { userId } = req.user; // Coach

  // Check coach owns team
  const team = await db.teams.findUnique({ where: { id: teamId } });
  if (team.coach_id !== userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Create invite
  const invite = await db.team_invites.create({
    data: {
      team_id: teamId,
      player_id,
      invited_by: userId,
    }
  });

  // Notify player
  await createNotification({
    user_id: player_id,
    type: 'team_invite',
    title: 'Team Invitation',
    body: `${coach.name} invited you to join ${team.name}`,
    data: { invite_id: invite.id },
  });

  res.json(invite);
}
```

**Player Accepts Invite:**
```typescript
// PATCH /api/v1/teams/invites/:inviteId/accept
async function acceptInvite(req, res) {
  const { inviteId } = req.params;
  const invite = await db.team_invites.findUnique({ where: { id: inviteId } });

  // Add to team
  await db.team_members.create({
    data: {
      team_id: invite.team_id,
      player_id: invite.player_id,
    }
  });

  // Update invite status
  await db.team_invites.update({
    where: { id: inviteId },
    data: { status: 'accepted', responded_at: new Date() },
  });

  // Add to team group chat
  await db.group_chats.update({
    where: { team_id: invite.team_id },
    data: {
      member_ids: { push: invite.player_id },
    }
  });

  res.json({ success: true });
}
```

---

#### Team Screen (Coach View):

**Tabs:**
- Roster
- Schedule (team training sessions)
- Stats (aggregate player stats)
- Chat

**Roster:**
- [ ] List of players with avatars
- [ ] Show position, jersey number
- [ ] Mark captain (star icon)
- [ ] Remove player (swipe)

**Roster Management:**
- [ ] Drag to reorder
- [ ] Tap to edit (assign position, jersey number)
- [ ] Long-press to set as captain

---

### 7. Group Chats

#### Team Chat (Auto-created with team):

**Features:**
- [ ] All team members auto-added
- [ ] Coach is admin
- [ ] Admin can:
  - Remove members
  - Pin messages
  - Mute notifications for all
- [ ] Members can:
  - Send messages
  - Leave chat

**Backend:**
```typescript
// POST /api/v1/group-chats/:groupId/messages
async function sendGroupMessage(req, res) {
  const { groupId } = req.params;
  const { content, attachments } = req.body;
  const { userId } = req.user;

  // Check user is member
  const chat = await db.group_chats.findUnique({ where: { id: groupId } });
  if (!chat.member_ids.includes(userId)) {
    return res.status(403).json({ error: 'Not a member' });
  }

  // Create message
  const message = await db.group_messages.create({
    data: {
      group_id: groupId,
      sender_id: userId,
      content,
      attachments,
    }
  });

  // Update last_message_at
  await db.group_chats.update({
    where: { id: groupId },
    data: { last_message_at: new Date() },
  });

  // Send real-time update to all members
  chat.member_ids.forEach(memberId => {
    if (memberId !== userId) {
      io.to(memberId).emit('group_message', message);
    }
  });

  // Send push notifications (to all except sender)
  chat.member_ids.forEach(async (memberId) => {
    if (memberId !== userId) {
      await sendPushNotification(memberId, {
        title: `${chat.name}`,
        body: `${user.name}: ${content}`,
        data: { group_id: groupId },
      });
    }
  });

  res.json(message);
}
```

#### Frontend - Group Chat UI:

**Similar to DM, but:**
- [ ] Show sender name + avatar for each message
- [ ] Admin badge on admin messages
- [ ] Group info button (shows members list)

---

### 8. Schools & Staff Management

#### School Dashboard (School Admin View):

**Tabs:**
- Overview
- Staff
- Programs
- Bookings
- Messages
- Profile

**Overview:**
- [ ] Stats cards:
  - Total students enrolled
  - Active programs
  - Staff count
  - Revenue this month
- [ ] Recent bookings list
- [ ] Upcoming events

---

#### Staff Management:

**Add Coach to School:**
- [ ] Search for coach by email/name
- [ ] Send invite
- [ ] Coach accepts → added to school staff

**Backend:**
```typescript
// POST /api/v1/schools/:schoolId/staff
async function addStaff(req, res) {
  const { schoolId } = req.params;
  const { coach_id, role } = req.body;

  await db.school_staff.create({
    data: {
      school_id: schoolId,
      coach_id,
      role,
    }
  });

  // Update school staff count
  await db.school_profiles.update({
    where: { user_id: schoolId },
    data: { staff_count: { increment: 1 } }
  });

  res.json({ success: true });
}
```

**Staff List:**
- [ ] Display all coaches
- [ ] Show role (Coach, Admin)
- [ ] Remove button (swipe)

---

#### Programs (Training Offerings):

**Create Program:**
- [ ] Form:
  - Program name
  - Description
  - Age group
  - Price (£/month)
  - Schedule
  - Capacity
- [ ] Save

**Display Programs:**
- [ ] On school profile (public)
- [ ] Users can inquire or enroll
- [ ] Waitlist if full

**Backend:**
```typescript
// POST /api/v1/schools/:schoolId/programs
async function createProgram(req, res) {
  const { name, description, age_group, price, schedule, capacity } = req.body;

  const program = await db.school_programs.create({
    data: {
      school_id: req.params.schoolId,
      name,
      description,
      age_group,
      price,
      schedule,
      capacity,
    }
  });

  res.json(program);
}
```

---

### 9. Push Notifications

#### Setup FCM (Firebase Cloud Messaging):

**Install:**
```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

**Frontend - Register Token:**
```typescript
import messaging from '@react-native-firebase/messaging';

async function registerPushToken() {
  const token = await messaging().getToken();

  // Send to backend
  await api.notifications.registerToken({
    token,
    platform: Platform.OS,
  });
}

// Listen for notifications
messaging().onMessage(async (remoteMessage) => {
  Toast.show({
    type: 'info',
    text1: remoteMessage.notification.title,
    text2: remoteMessage.notification.body,
  });
});
```

**Backend - Save Token:**
```typescript
// POST /api/v1/notifications/register-token
async function registerToken(req, res) {
  const { token, platform } = req.body;
  const { userId } = req.user;

  await db.push_tokens.upsert({
    where: { user_id_token: { user_id: userId, token } },
    create: {
      user_id: userId,
      token,
      platform,
    },
    update: {},
  });

  res.json({ success: true });
}
```

**Backend - Send Push Notification:**
```typescript
import admin from 'firebase-admin';

async function sendPushNotification(userId: string, payload: {
  title: string;
  body: string;
  data?: any;
}) {
  const tokens = await db.push_tokens.findMany({
    where: { user_id: userId },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
    tokens: tokens.map(t => t.token),
  };

  await admin.messaging().sendMulticast(message);
}
```

---

### 10. Admin Panel

#### Admin Dashboard (Web-based - Optional):

**Build a simple web dashboard for platform admins:**

**Pages:**
1. **Overview:**
   - Total users (by role)
   - Total bookings
   - Total revenue (GMV)
   - Active users (DAU, MAU)
   - Charts

2. **Users:**
   - List all users
   - Search, filter by role
   - View profile
   - Suspend/delete user
   - Verify coach (DBS check)

3. **Content Moderation:**
   - Pending reports
   - Review flagged posts/comments
   - Actions: Dismiss, Remove, Suspend user

4. **Bookings:**
   - View all bookings
   - Filter by status, date
   - Handle disputes

5. **Payments:**
   - Transaction history
   - Revenue analytics
   - Refunds

6. **Settings:**
   - Platform fees (adjust %)
   - Feature flags
   - Email templates

**Tech Stack for Admin:**
- Next.js or React
- Tailwind CSS
- Recharts (charts)
- Connects to same backend API

**Example Admin Endpoint:**
```typescript
// GET /api/v1/admin/stats
// (Requires admin role middleware)
async function getAdminStats(req, res) {
  const totalUsers = await db.users.count();
  const totalBookings = await db.bookings.count();
  const totalRevenue = await db.payments.aggregate({
    where: { status: 'succeeded' },
    _sum: { amount: true },
  });

  const dau = await db.users.count({
    where: {
      last_active: { gte: startOfDay(new Date()) },
    }
  });

  res.json({
    total_users: totalUsers,
    total_bookings: totalBookings,
    total_revenue: totalRevenue._sum.amount || 0,
    dau,
  });
}
```

---

## API Endpoints Summary (Sprint 4)

### Development
- `GET /api/v1/development/:playerId/skills` - Get skills data
- `GET /api/v1/development/:playerId/sessions` - Session history
- `GET /api/v1/development/:playerId/analytics` - Analytics data
- `POST /api/v1/development/export` - Export PDF report

### Achievements
- `GET /api/v1/achievements` - Get all achievements
- `GET /api/v1/achievements/mine` - Get player's unlocked achievements

### Goals
- `POST /api/v1/goals` - Create goal
- `GET /api/v1/goals` - Get my goals
- `PATCH /api/v1/goals/:id` - Update goal
- `DELETE /api/v1/goals/:id` - Delete goal

### Teams
- `POST /api/v1/teams` - Create team
- `GET /api/v1/teams/:id` - Get team
- `PATCH /api/v1/teams/:id` - Update team
- `DELETE /api/v1/teams/:id` - Delete team
- `POST /api/v1/teams/:id/invite` - Invite player
- `GET /api/v1/teams/invites/mine` - Get my invites
- `PATCH /api/v1/teams/invites/:id/accept` - Accept invite
- `PATCH /api/v1/teams/invites/:id/decline` - Decline invite
- `DELETE /api/v1/teams/:id/members/:playerId` - Remove member

### Group Chats
- `POST /api/v1/group-chats` - Create group chat
- `GET /api/v1/group-chats` - Get my group chats
- `GET /api/v1/group-chats/:id/messages` - Get messages
- `POST /api/v1/group-chats/:id/messages` - Send message
- `POST /api/v1/group-chats/:id/members` - Add member (admin)
- `DELETE /api/v1/group-chats/:id/members/:userId` - Remove member

### Schools
- `GET /api/v1/schools/:id/staff` - Get staff
- `POST /api/v1/schools/:id/staff` - Add staff
- `DELETE /api/v1/schools/:id/staff/:coachId` - Remove staff
- `GET /api/v1/schools/:id/programs` - Get programs
- `POST /api/v1/schools/:id/programs` - Create program
- `PATCH /api/v1/schools/:id/programs/:programId` - Update program
- `DELETE /api/v1/schools/:id/programs/:programId` - Delete program

### Notifications
- `POST /api/v1/notifications/register-token` - Register push token
- `DELETE /api/v1/notifications/tokens/:token` - Unregister token

### Admin
- `GET /api/v1/admin/stats` - Platform statistics
- `GET /api/v1/admin/users` - List users (paginated, filterable)
- `PATCH /api/v1/admin/users/:id/suspend` - Suspend user
- `GET /api/v1/admin/reports` - Get content reports
- `PATCH /api/v1/admin/reports/:id/resolve` - Resolve report

---

## UI Components to Build (Sprint 4)

### Development Hub:
- [ ] DevelopmentHubScreen
- [ ] StatsCards
- [ ] SkillsRadarChart
- [ ] SkillDetailScreen
- [ ] SessionHistoryList
- [ ] SessionHistoryItem (expandable)
- [ ] AnalyticsScreen
- [ ] SessionsOverTimeChart
- [ ] HoursTrainedChart
- [ ] SkillImprovementsChart
- [ ] TrainingHeatmap

### Achievements:
- [ ] AchievementsScreen
- [ ] BadgeCard (locked/unlocked states)
- [ ] LevelBadge
- [ ] ProgressRing
- [ ] AchievementDetailModal

### Goals:
- [ ] GoalsScreen
- [ ] CreateGoalScreen
- [ ] GoalCard
- [ ] GoalProgressBar

### Teams:
- [ ] CreateTeamScreen
- [ ] TeamScreen
- [ ] TeamRosterList
- [ ] TeamMemberCard
- [ ] InvitePlayerScreen
- [ ] TeamInviteCard (accept/decline)

### Group Chats:
- [ ] GroupChatScreen
- [ ] GroupChatList
- [ ] GroupMessageBubble
- [ ] GroupInfoScreen

### Schools:
- [ ] SchoolDashboard
- [ ] StaffManagementScreen
- [ ] AddStaffScreen
- [ ] ProgramsScreen
- [ ] CreateProgramScreen

---

## Success Criteria

✅ Sprint 4 is complete when:
1. Development Hub shows skills, analytics, session history
2. Radar chart displays player skills
3. Achievements unlock automatically
4. XP and leveling system works
5. Players can set and track goals
6. Coaches can create teams and invite players
7. Team group chats functional
8. Schools can add staff and create programs
9. Push notifications work (iOS + Android)
10. Admin panel accessible (basic version)
11. Platform is feature-complete and ready for beta testing

---

## Testing Checklist

- [ ] Complete session → skills updated → visible in Development Hub
- [ ] View skills radar chart
- [ ] View session history with notes
- [ ] Export development report (PDF)
- [ ] Unlock achievement (e.g., 10 sessions)
- [ ] Receive achievement notification
- [ ] Level up (gain enough XP)
- [ ] Create goal
- [ ] Complete goal (skill reaches target)
- [ ] Coach creates team
- [ ] Coach invites player to team
- [ ] Player accepts invite
- [ ] Player joins team group chat
- [ ] Send message in group chat
- [ ] School adds coach as staff
- [ ] School creates program
- [ ] User follows school
- [ ] Receive push notification (booking, message, achievement)
- [ ] Admin views platform stats
- [ ] Admin suspends user

---

## Estimated Effort

**Backend:** 8-10 days
- Development Hub APIs: 2 days
- Achievements & XP system: 2 days
- Goals: 1 day
- Teams: 2 days
- Group chats: 1 day
- Schools: 1 day
- Push notifications: 1 day

**Frontend:** 10-12 days
- Development Hub UI: 3 days
- Charts (Victory Native): 2 days
- Achievements & badges: 2 days
- Goals: 1 day
- Teams UI: 2 days
- Group chats UI: 1 day
- Schools UI: 1 day

**Admin Panel:** 3-5 days (optional, can be post-launch)

**Total:** 18-24 days (3.5-4 weeks)

---

## Dependencies

- Victory Native (charts)
- Firebase Cloud Messaging (push notifications)
- PDF generation library (for reports)
- Charting library (react-native-svg + victory)

---

## Post-Sprint 4 (Nice-to-Haves)

**Future features (post-launch):**
- Video session recordings
- Live streaming (coach can stream training)
- Marketplace (buy equipment, courses)
- Tournaments & leagues
- AI coach recommendations
- AR drills (augmented reality)
- Wearable integration (Apple Watch, Fitbit)
- Advanced analytics (ML-based insights)

---

## Launch Checklist

Before going live:
- [ ] All Sprint 1-4 features tested
- [ ] Security audit (auth, payments, data privacy)
- [ ] Load testing (handle 1000+ concurrent users)
- [ ] Privacy policy & terms of service
- [ ] GDPR compliance (data export, deletion)
- [ ] COPPA compliance (child safety, parent controls)
- [ ] DBS check verification flow for coaches
- [ ] App Store / Play Store submissions
- [ ] Marketing website (landing page)
- [ ] Customer support system (Intercom, Zendesk)
- [ ] Analytics (Mixpanel, Amplitude)
- [ ] Error tracking (Sentry)
- [ ] Staging environment (for testing)
- [ ] CI/CD pipeline (automated deployments)
- [ ] Backup & disaster recovery plan
- [ ] Stripe live mode enabled
- [ ] Domain & SSL certificate
- [ ] Email deliverability (SPF, DKIM, DMARC)
- [ ] Social media accounts created

---

## Conclusion

After Sprint 4, **Clubroom** will be a fully-featured football social network and development platform.

**Key Differentiators:**
✅ Social networking (not just transactional)
✅ Development tracking with data visualization
✅ Gamification (achievements, levels, XP)
✅ Team management built-in
✅ School integration
✅ Comprehensive marketplace (booking + payments)

**Ready to disrupt the coaching industry!** 🚀⚽

