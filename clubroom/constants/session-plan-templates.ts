/* ---------- Types ---------- */

export type SessionCategory =
  | 'Dribbling'
  | 'Passing'
  | 'Shooting'
  | 'Defending'
  | 'Goalkeeping'
  | 'Fitness'
  | 'Tactical';

export type AgeGroup = 'U7-U9' | 'U10-U12' | 'U13-U15' | 'U16+';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface SessionActivity {
  title: string;
  duration: number; // minutes
  description: string;
}

export interface SessionPlanTemplate {
  id: string;
  title: string;
  ageGroup: AgeGroup;
  focus: SessionCategory;
  duration: number; // total minutes
  difficulty: Difficulty;
  warmup: SessionActivity;
  mainActivities: SessionActivity[];
  cooldown: SessionActivity;
  equipment: string[];
  coachingPoints: string[];
}

/* ---------- Templates ---------- */

export const SESSION_PLAN_TEMPLATES: SessionPlanTemplate[] = [
  // ── Dribbling ──────────────────────────────────
  {
    id: 'drb-01',
    title: 'Close Control Basics',
    ageGroup: 'U7-U9',
    focus: 'Dribbling',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Ball Mastery Warm-up', duration: 10, description: 'Toe taps, sole rolls, and inside-outside touches on the spot.' },
    mainActivities: [
      { title: 'Cone Weaving', duration: 15, description: 'Dribble through a line of cones using inside and outside of foot.' },
      { title: 'Traffic Light Dribbling', duration: 15, description: 'Dribble in a grid; red = stop, amber = slow, green = speed up.' },
    ],
    cooldown: { title: 'Stretching Circle', duration: 10, description: 'Light stretches focusing on calves and quadriceps.' },
    equipment: ['Cones', 'Footballs', 'Bibs'],
    coachingPoints: ['Head up while dribbling', 'Small touches to keep ball close', 'Use both feet'],
  },
  {
    id: 'drb-02',
    title: '1v1 Dribbling Moves',
    ageGroup: 'U10-U12',
    focus: 'Dribbling',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Dynamic Stretching', duration: 10, description: 'High knees, butt kicks, and lateral shuffles with a ball.' },
    mainActivities: [
      { title: 'Step-over Drill', duration: 15, description: 'Practice step-overs against a passive defender.' },
      { title: 'Cruyff Turn Practice', duration: 15, description: 'Use Cruyff turn to change direction in a channel.' },
      { title: '1v1 Attacking Duel', duration: 15, description: 'Live 1v1 in a 10x10m box, attacker scores by dribbling past end line.' },
    ],
    cooldown: { title: 'Cool-down Jog', duration: 10, description: 'Light jog and static stretches.' },
    equipment: ['Cones', 'Footballs', 'Mini Goals', 'Bibs'],
    coachingPoints: ['Drop shoulder to sell feint', 'Accelerate after the move', 'Stay on toes'],
  },
  {
    id: 'drb-03',
    title: 'Advanced Dribbling Under Pressure',
    ageGroup: 'U13-U15',
    focus: 'Dribbling',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Rondo Warm-up', duration: 10, description: '5v2 rondo focusing on first touch and quick feet.' },
    mainActivities: [
      { title: 'Tight Space Dribbling', duration: 15, description: 'Dribble in a 5x5m box while keeping possession.' },
      { title: 'Slalom Relay Race', duration: 15, description: 'Competitive slalom drill with quick feet through tight cones.' },
      { title: '2v2 Dribbling Game', duration: 20, description: 'Small sided game where goals only count if scored after a successful dribble.' },
    ],
    cooldown: { title: 'Recovery Stretching', duration: 10, description: 'Hamstring, hip flexor, and calf stretches.' },
    equipment: ['Cones', 'Footballs', 'Mini Goals', 'Bibs', 'Poles'],
    coachingPoints: ['Shield the ball with body', 'Change pace and direction', 'Scan before receiving'],
  },
  {
    id: 'drb-04',
    title: 'Speed Dribbling',
    ageGroup: 'U16+',
    focus: 'Dribbling',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Sprint Activation', duration: 10, description: 'Progressive sprints with ball at feet.' },
    mainActivities: [
      { title: 'Speed Dribble Sprints', duration: 15, description: 'Dribble 40m at pace, focusing on longer touches.' },
      { title: 'Counter-attack Simulation', duration: 20, description: '3v2 fast break scenario starting from halfway.' },
      { title: 'Full Pitch Transition Game', duration: 25, description: 'Game emphasising fast dribbling transitions.' },
    ],
    cooldown: { title: 'Foam Rolling', duration: 10, description: 'Self-myofascial release on quads and IT band.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs'],
    coachingPoints: ['Push ball into space', 'Use laces for speed dribbling', 'Decision making at pace'],
  },

  // ── Passing ────────────────────────────────────
  {
    id: 'pas-01',
    title: 'First Touch & Passing',
    ageGroup: 'U7-U9',
    focus: 'Passing',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Partner Passing', duration: 10, description: 'Pass and receive with a partner over 5m.' },
    mainActivities: [
      { title: 'Gate Passing', duration: 15, description: 'Pass through cone gates to earn points.' },
      { title: 'Triangle Passing', duration: 15, description: 'Three players pass around a triangle, follow your pass.' },
    ],
    cooldown: { title: 'Stretching & Review', duration: 10, description: 'Light stretches while discussing what was learned.' },
    equipment: ['Cones', 'Footballs'],
    coachingPoints: ['Plant foot next to ball', 'Use inside of foot', 'Follow through towards target'],
  },
  {
    id: 'pas-02',
    title: 'Passing Combinations',
    ageGroup: 'U10-U12',
    focus: 'Passing',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Rondo 4v1', duration: 10, description: 'Quick passing to keep possession in a circle.' },
    mainActivities: [
      { title: 'Wall Pass Drill', duration: 15, description: 'Give and go combinations through cones.' },
      { title: 'Overlap Passing', duration: 15, description: 'Practice overlapping runs with timed passes.' },
      { title: 'Passing Game', duration: 15, description: '4v4 game where a goal counts double if scored from a one-touch pass.' },
    ],
    cooldown: { title: 'Light Jogging', duration: 10, description: 'Slow jog and hamstring stretches.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Mini Goals'],
    coachingPoints: ['Weight of pass', 'Communication before receiving', 'Body open to the field'],
  },
  {
    id: 'pas-03',
    title: 'Long Range Distribution',
    ageGroup: 'U13-U15',
    focus: 'Passing',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Passing Circuits', duration: 10, description: 'Various passing techniques around a circuit.' },
    mainActivities: [
      { title: 'Driven Pass Practice', duration: 15, description: 'Hit driven passes over 25-30m to a target zone.' },
      { title: 'Switching Play Drill', duration: 20, description: 'Switch the ball across the pitch to wide players.' },
      { title: 'Possession Game with Long Passes', duration: 20, description: '7v7 possession; bonus point for successful long switch.' },
    ],
    cooldown: { title: 'Cool-down Walk', duration: 10, description: 'Walk and stretch major muscle groups.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Goals'],
    coachingPoints: ['Strike through the ball for driven pass', 'Accuracy over power', 'Scan before playing long'],
  },
  {
    id: 'pas-04',
    title: 'Playing Out From The Back',
    ageGroup: 'U16+',
    focus: 'Passing',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Positional Rondo', duration: 10, description: '6v3 rondo in shape, mimicking build-up positions.' },
    mainActivities: [
      { title: 'Build-up Patterns', duration: 20, description: 'Rehearse build-up patterns from goalkeeper to midfield.' },
      { title: 'Press Resistance', duration: 20, description: 'Build out against increasing press intensity.' },
      { title: 'Full Game Build-up Focus', duration: 20, description: 'Match play with conditions on playing out.' },
    ],
    cooldown: { title: 'Active Recovery', duration: 10, description: 'Light passing and movement followed by stretches.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs', 'Mannequins'],
    coachingPoints: ['Patience in possession', 'Create passing lanes', 'Goalkeeper as extra player'],
  },

  // ── Shooting ───────────────────────────────────
  {
    id: 'sht-01',
    title: 'Shooting Basics',
    ageGroup: 'U7-U9',
    focus: 'Shooting',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Dribble & Shoot', duration: 10, description: 'Dribble to a line and shoot at an open goal.' },
    mainActivities: [
      { title: 'Target Practice', duration: 15, description: 'Shoot at targets placed in corners of the goal.' },
      { title: 'Shooting Relay', duration: 15, description: 'Teams compete in a shooting relay from the edge of the box.' },
    ],
    cooldown: { title: 'Fun Game', duration: 10, description: 'Small match with emphasis on shooting.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Targets'],
    coachingPoints: ['Laces for power', 'Keep head over the ball', 'Aim for corners'],
  },
  {
    id: 'sht-02',
    title: 'Finishing Under Pressure',
    ageGroup: 'U10-U12',
    focus: 'Shooting',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Shooting Warm-up', duration: 10, description: 'Volleys and half-volleys from crosses.' },
    mainActivities: [
      { title: 'Quick Fire Shooting', duration: 15, description: 'Receive ball, turn, and shoot within 3 seconds.' },
      { title: '1v1 Finishing', duration: 15, description: 'Attacker vs goalkeeper from edge of box.' },
      { title: 'Crossing & Finishing', duration: 15, description: 'Wide player crosses, attacker finishes first time.' },
    ],
    cooldown: { title: 'Stretch & Debrief', duration: 10, description: 'Stretching while reviewing finishing techniques.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Bibs'],
    coachingPoints: ['Composure in front of goal', 'Pick your spot before shooting', 'Follow in for rebounds'],
  },
  {
    id: 'sht-03',
    title: 'Set Piece Finishing',
    ageGroup: 'U13-U15',
    focus: 'Shooting',
    duration: 90,
    difficulty: 'Intermediate',
    warmup: { title: 'Passing to Shooting', duration: 10, description: 'Combination play ending with a shot.' },
    mainActivities: [
      { title: 'Free Kick Practice', duration: 20, description: 'Practise free kicks from various distances.' },
      { title: 'Corner Kick Routines', duration: 20, description: 'Rehearse near post, far post, and short corner finishes.' },
      { title: 'Match with Set Pieces', duration: 20, description: 'Small sided game; goals from set pieces count double.' },
    ],
    cooldown: { title: 'Yoga Cool-down', duration: 10, description: 'Basic yoga poses for flexibility.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Free Kick Wall', 'Bibs'],
    coachingPoints: ['Technique over power on free kicks', 'Timing of runs at corners', 'Delivery quality'],
  },
  {
    id: 'sht-04',
    title: 'Clinical Finishing Masterclass',
    ageGroup: 'U16+',
    focus: 'Shooting',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Technical Shooting', duration: 10, description: 'Various finishes: side-foot, laces, chip, placed.' },
    mainActivities: [
      { title: 'Finishing from Cutbacks', duration: 20, description: 'Wide player cuts back, striker finishes first time.' },
      { title: 'Through Ball & Finish', duration: 20, description: 'Midfielder plays through ball, striker finishes 1v1.' },
      { title: 'Competitive Shooting Game', duration: 20, description: 'Points-based game rewarding different finish types.' },
    ],
    cooldown: { title: 'Recovery Protocol', duration: 10, description: 'Light jog and comprehensive stretching.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs'],
    coachingPoints: ['Match the finish to the situation', 'Composure under pressure', 'Strike through the middle of the ball'],
  },

  // ── Defending ──────────────────────────────────
  {
    id: 'def-01',
    title: 'Defending Basics',
    ageGroup: 'U7-U9',
    focus: 'Defending',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Tag Games', duration: 10, description: 'Tag-based games to develop chasing and tackling instincts.' },
    mainActivities: [
      { title: 'Shadow Defending', duration: 15, description: 'Mirror an attacker without tackling, focusing on body position.' },
      { title: 'Steal the Ball', duration: 15, description: 'Defender tries to win ball from attacker in a small area.' },
    ],
    cooldown: { title: 'Ball Mastery', duration: 10, description: 'Light ball skills and stretching.' },
    equipment: ['Cones', 'Footballs', 'Bibs'],
    coachingPoints: ['Stay on your feet', 'Side-on body shape', 'Patience, do not dive in'],
  },
  {
    id: 'def-02',
    title: 'Pressing & Tackling',
    ageGroup: 'U10-U12',
    focus: 'Defending',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Defensive Footwork', duration: 10, description: 'Ladder drills and lateral shuffles.' },
    mainActivities: [
      { title: 'Block Tackling Drill', duration: 15, description: 'Practise block tackle technique in pairs.' },
      { title: 'Pressing Triggers', duration: 15, description: 'Recognise when to press in a 4v3 overload scenario.' },
      { title: 'Defensive SSG', duration: 15, description: 'Small sided game; team without ball earns points for turnovers.' },
    ],
    cooldown: { title: 'Stretching', duration: 10, description: 'Static stretches for legs and core.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Mini Goals'],
    coachingPoints: ['Get tight to the attacker', 'Win it, do not just kick it', 'Communicate with teammates'],
  },
  {
    id: 'def-03',
    title: 'Defensive Shape',
    ageGroup: 'U13-U15',
    focus: 'Defending',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Defensive Shadowing', duration: 10, description: 'Pairs shadow attacker movements maintaining position.' },
    mainActivities: [
      { title: 'Back Four Organisation', duration: 20, description: 'Defensive line moves as a unit; step up, drop, slide.' },
      { title: 'Covering & Recovery Runs', duration: 20, description: 'Practice covering angles and recovery sprints.' },
      { title: 'Phase of Play: Defending', duration: 20, description: 'Defending unit vs attacking unit on half a pitch.' },
    ],
    cooldown: { title: 'Cool-down', duration: 10, description: 'Gentle jog and stretches.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Bibs', 'Poles'],
    coachingPoints: ['Compact defensive line', 'Communication is key', 'Delay the attack'],
  },
  {
    id: 'def-04',
    title: 'High Press System',
    ageGroup: 'U16+',
    focus: 'Defending',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Pressing Warm-up', duration: 10, description: 'High-intensity rondo with pressing rules.' },
    mainActivities: [
      { title: 'Press Triggers Recognition', duration: 20, description: 'Identify and react to pressing triggers in game scenarios.' },
      { title: 'Counter-press Drill', duration: 20, description: 'Immediate press after losing ball in 5v5 area.' },
      { title: 'Full Match with Press Focus', duration: 20, description: 'Game conditioned on pressing within 3 seconds of losing possession.' },
    ],
    cooldown: { title: 'Recovery Session', duration: 10, description: 'Low-intensity movement and thorough stretching.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs'],
    coachingPoints: ['Press as a unit', 'Cut off passing lanes', 'Intensity and commitment'],
  },

  // ── Goalkeeping ────────────────────────────────
  {
    id: 'gk-01',
    title: 'Goalkeeping Fundamentals',
    ageGroup: 'U7-U9',
    focus: 'Goalkeeping',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Catching Warm-up', duration: 10, description: 'Throwing and catching in pairs at various heights.' },
    mainActivities: [
      { title: 'Set Position & Ready Stance', duration: 15, description: 'Practice the ready position and footwork.' },
      { title: 'Low Diving Saves', duration: 15, description: 'Collapse dive technique to save low shots.' },
    ],
    cooldown: { title: 'Reaction Games', duration: 10, description: 'Fun reaction-based catching games.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Goalkeeper Gloves'],
    coachingPoints: ['Hands in W shape', 'Get behind the ball', 'Stay on your toes'],
  },
  {
    id: 'gk-02',
    title: 'Shot Stopping',
    ageGroup: 'U10-U12',
    focus: 'Goalkeeping',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Footwork Drills', duration: 10, description: 'Quick feet through ladder and cones.' },
    mainActivities: [
      { title: 'High Saves', duration: 15, description: 'Practice high catches and tipping over the bar.' },
      { title: 'Rapid Fire Saves', duration: 15, description: 'Multiple shots in quick succession from 10m.' },
      { title: 'Angle Play', duration: 15, description: 'Narrow the angle and make the save from 1v1 situations.' },
    ],
    cooldown: { title: 'Stretching', duration: 10, description: 'Focus on wrists, shoulders, and hips.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Goalkeeper Gloves', 'Rebounder'],
    coachingPoints: ['Get set before the shot', 'Strong wrists on saves', 'Recover quickly between shots'],
  },
  {
    id: 'gk-03',
    title: 'Distribution & Sweeping',
    ageGroup: 'U13-U15',
    focus: 'Goalkeeping',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Passing Warm-up', duration: 10, description: 'Short and long passing with feet and hands.' },
    mainActivities: [
      { title: 'Goal Kicks & Distribution', duration: 20, description: 'Practise accurate goal kicks to target zones.' },
      { title: 'Sweeper Keeper Drill', duration: 20, description: 'Read through balls and come off line to clear.' },
      { title: 'Game Scenario Distribution', duration: 20, description: 'Build-up play starting from the goalkeeper.' },
    ],
    cooldown: { title: 'Cool-down', duration: 10, description: 'Light movement and static stretching.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Goalkeeper Gloves', 'Bibs'],
    coachingPoints: ['Decisiveness on when to come out', 'Accuracy of distribution', 'Communication with defenders'],
  },
  {
    id: 'gk-04',
    title: 'Advanced Goalkeeper Training',
    ageGroup: 'U16+',
    focus: 'Goalkeeping',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Reaction Drills', duration: 10, description: 'Close-range reaction saves and deflections.' },
    mainActivities: [
      { title: 'Cross Handling', duration: 20, description: 'Deal with crosses under pressure from attackers.' },
      { title: 'Penalty Save Training', duration: 15, description: 'Read the taker and practice diving technique.' },
      { title: 'Match Simulation', duration: 25, description: 'Full game scenario with shots, crosses, and 1v1s.' },
    ],
    cooldown: { title: 'Recovery Protocol', duration: 10, description: 'Ice bath recommendations and stretching.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Goalkeeper Gloves', 'Bibs', 'Rebounder'],
    coachingPoints: ['Commanding the box', 'Positioning for crosses', 'Mental preparation for penalties'],
  },

  // ── Fitness ────────────────────────────────────
  {
    id: 'fit-01',
    title: 'Fun Fitness for Juniors',
    ageGroup: 'U7-U9',
    focus: 'Fitness',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Animal Movements', duration: 10, description: 'Bear crawls, frog jumps, and crab walks.' },
    mainActivities: [
      { title: 'Relay Races', duration: 15, description: 'Sprint relays with ball, cone, and bib challenges.' },
      { title: 'Obstacle Course', duration: 15, description: 'Agility course with hurdles, cones, and tunnels.' },
    ],
    cooldown: { title: 'Cool-down Games', duration: 10, description: 'Musical statues and light stretching.' },
    equipment: ['Cones', 'Hurdles', 'Bibs', 'Footballs'],
    coachingPoints: ['Encourage effort over speed', 'Make it fun', 'Proper running technique'],
  },
  {
    id: 'fit-02',
    title: 'Agility & Speed',
    ageGroup: 'U10-U12',
    focus: 'Fitness',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Dynamic Warm-up', duration: 10, description: 'Skipping, bounding, and lateral movements.' },
    mainActivities: [
      { title: 'Agility Ladder Drills', duration: 15, description: 'Quick feet patterns through the agility ladder.' },
      { title: 'T-Drill Sprints', duration: 15, description: 'T-shape sprint drill for multi-directional speed.' },
      { title: 'Sprint Races', duration: 15, description: 'Competitive 20m and 40m sprints.' },
    ],
    cooldown: { title: 'Flexibility Work', duration: 10, description: 'PNF stretching for key muscle groups.' },
    equipment: ['Cones', 'Agility Ladder', 'Stopwatch', 'Bibs'],
    coachingPoints: ['Low centre of gravity for agility', 'Drive arms for speed', 'Quick ground contact'],
  },
  {
    id: 'fit-03',
    title: 'Endurance & Stamina',
    ageGroup: 'U13-U15',
    focus: 'Fitness',
    duration: 90,
    difficulty: 'Intermediate',
    warmup: { title: 'Progressive Jog', duration: 10, description: 'Gradually increasing pace over 10 minutes.' },
    mainActivities: [
      { title: 'Interval Running', duration: 20, description: 'Alternate 2 min run / 1 min walk for 6 sets.' },
      { title: 'Football Fitness Circuit', duration: 20, description: 'Stations: burpees, sprints, ball work, core.' },
      { title: 'Endurance SSG', duration: 20, description: '7v7 game on a large pitch with no subs.' },
    ],
    cooldown: { title: 'Recovery Stretching', duration: 10, description: 'Deep stretches and breathing exercises.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Stopwatch'],
    coachingPoints: ['Pace yourself', 'Controlled breathing', 'Mental toughness'],
  },
  {
    id: 'fit-04',
    title: 'Match Fitness Conditioning',
    ageGroup: 'U16+',
    focus: 'Fitness',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Activation Protocol', duration: 10, description: 'Band work, dynamic stretches, and short sprints.' },
    mainActivities: [
      { title: 'High Intensity Intervals', duration: 20, description: '30 second sprints with 30 second recovery, 10 sets.' },
      { title: 'Repeated Sprint Ability', duration: 20, description: '6x40m sprints with 20 second recovery between.' },
      { title: 'Full Match Intensity Game', duration: 20, description: '11v11 or 9v9 at match intensity with time limits.' },
    ],
    cooldown: { title: 'Recovery Protocol', duration: 10, description: 'Ice bath, foam rolling, and stretching routine.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs', 'Resistance Bands', 'Stopwatch'],
    coachingPoints: ['Push through discomfort', 'Maintain technique when tired', 'Recovery nutrition post-session'],
  },

  // ── Tactical ───────────────────────────────────
  {
    id: 'tac-01',
    title: 'Understanding Positions',
    ageGroup: 'U7-U9',
    focus: 'Tactical',
    duration: 60,
    difficulty: 'Beginner',
    warmup: { title: 'Positional Tag', duration: 10, description: 'Tag game where players must stay in zones.' },
    mainActivities: [
      { title: 'Zonal Awareness', duration: 15, description: 'Players learn their zone on the pitch with visual markers.' },
      { title: 'Mini Match with Zones', duration: 15, description: '4v4 with marked zones; players assigned to areas.' },
    ],
    cooldown: { title: 'Team Talk', duration: 10, description: 'Discussion on positions while stretching.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Mini Goals'],
    coachingPoints: ['Stay in your area', 'Look for space', 'Support your teammates'],
  },
  {
    id: 'tac-02',
    title: 'Attacking Overloads',
    ageGroup: 'U10-U12',
    focus: 'Tactical',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Possession Warm-up', duration: 10, description: '4v2 keep ball in a small area.' },
    mainActivities: [
      { title: '3v2 Overload Drill', duration: 15, description: 'Attacking overload to find the spare player.' },
      { title: 'Wide Overloads', duration: 15, description: 'Creating 2v1 on the wing with overlapping full-back.' },
      { title: 'Overload Game', duration: 15, description: '5v3 possession game; team in possession gets extra players.' },
    ],
    cooldown: { title: 'Review & Stretch', duration: 10, description: 'Discussion on creating overloads while stretching.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Mini Goals'],
    coachingPoints: ['Recognise overload situations', 'Move the ball quickly', 'Support angles'],
  },
  {
    id: 'tac-03',
    title: 'Transition Play',
    ageGroup: 'U13-U15',
    focus: 'Tactical',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Quick Transition Rondo', duration: 10, description: 'When ball is lost, defenders switch roles immediately.' },
    mainActivities: [
      { title: 'Attack to Defence Transition', duration: 20, description: 'Lose the ball, press immediately within 5 seconds.' },
      { title: 'Defence to Attack Transition', duration: 20, description: 'Win the ball, find the forward pass within 3 touches.' },
      { title: 'Transition Game', duration: 20, description: '6v6 game with focus on quick transitions both ways.' },
    ],
    cooldown: { title: 'Video Review & Stretch', duration: 10, description: 'Brief tactical debrief and stretching.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Bibs'],
    coachingPoints: ['Speed of transition', 'Mentality switch', 'First 5 seconds are crucial'],
  },
  {
    id: 'tac-04',
    title: 'Formation & System Play',
    ageGroup: 'U16+',
    focus: 'Tactical',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Positional Play Rondo', duration: 10, description: '8v3 positional rondo in a large grid.' },
    mainActivities: [
      { title: 'Formation Walk-through', duration: 20, description: 'Walk through team shape in and out of possession.' },
      { title: 'Phase of Play: Attacking', duration: 20, description: 'Rehearse attacking patterns in chosen formation.' },
      { title: 'Full Match Tactical', duration: 20, description: 'Game implementing the formation and principles covered.' },
    ],
    cooldown: { title: 'Debrief & Recovery', duration: 10, description: 'Tactical analysis discussion and stretching.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs', 'Tactics Board'],
    coachingPoints: ['Know your role in and out of possession', 'Flexibility within the system', 'Team cohesion'],
  },

  // ── Extra Templates to reach 30+ ──────────────
  {
    id: 'drb-05',
    title: 'First Touch Mastery',
    ageGroup: 'U10-U12',
    focus: 'Dribbling',
    duration: 75,
    difficulty: 'Intermediate',
    warmup: { title: 'Juggling Challenge', duration: 10, description: 'Keep the ball up using all surfaces.' },
    mainActivities: [
      { title: 'Cushion Control', duration: 15, description: 'Receive lofted passes and control with one touch.' },
      { title: 'Turn & Go', duration: 15, description: 'Receive with back to goal, turn, and accelerate.' },
      { title: 'First Touch SSG', duration: 15, description: 'Game where 3-touch maximum is enforced.' },
    ],
    cooldown: { title: 'Stretching', duration: 10, description: 'Full body stretching routine.' },
    equipment: ['Cones', 'Footballs', 'Bibs', 'Mini Goals'],
    coachingPoints: ['Soft touch on first contact', 'Touch into space', 'Open body to see the pitch'],
  },
  {
    id: 'pas-05',
    title: 'Midfield Link-up Play',
    ageGroup: 'U13-U15',
    focus: 'Passing',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Passing Patterns', duration: 10, description: 'Rehearse passing sequences in groups of 4.' },
    mainActivities: [
      { title: 'Central Midfield Combinations', duration: 20, description: 'Third man runs and one-two combinations.' },
      { title: 'Breaking Lines', duration: 20, description: 'Pass through lines of defenders into attacking zones.' },
      { title: 'Game: Midfield Dominance', duration: 20, description: 'Bonus points for goals from midfield combinations.' },
    ],
    cooldown: { title: 'Stretch & Debrief', duration: 10, description: 'Discuss midfield decision-making while stretching.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Bibs'],
    coachingPoints: ['Play on the half-turn', 'Recognise when to play forward', 'Third man movement'],
  },
  {
    id: 'sht-05',
    title: 'Volley & Half-Volley Technique',
    ageGroup: 'U13-U15',
    focus: 'Shooting',
    duration: 90,
    difficulty: 'Intermediate',
    warmup: { title: 'Volley Pairs', duration: 10, description: 'Partners volley to each other from short range.' },
    mainActivities: [
      { title: 'Side Volley Drill', duration: 20, description: 'Practise side volley technique from crosses.' },
      { title: 'Half-Volley Strikes', duration: 20, description: 'Hit half volleys from the edge of the area.' },
      { title: 'Competitive Volleys', duration: 20, description: 'Points game: goals from volleys earn extra points.' },
    ],
    cooldown: { title: 'Cool-down', duration: 10, description: 'Light jog and comprehensive stretching.' },
    equipment: ['Cones', 'Footballs', 'Goals', 'Bibs'],
    coachingPoints: ['Watch the ball onto the foot', 'Keep body over the ball', 'Timing of the strike'],
  },
  {
    id: 'def-05',
    title: 'Aerial Defending',
    ageGroup: 'U16+',
    focus: 'Defending',
    duration: 90,
    difficulty: 'Advanced',
    warmup: { title: 'Heading Warm-up', duration: 10, description: 'Defensive heading practice in pairs.' },
    mainActivities: [
      { title: 'Aerial Duel Drill', duration: 20, description: '1v1 heading duels from various delivery types.' },
      { title: 'Set Piece Defending', duration: 20, description: 'Zonal and man-marking systems for corners and free kicks.' },
      { title: 'Game with Aerial Focus', duration: 20, description: 'Match play where long balls and set pieces feature heavily.' },
    ],
    cooldown: { title: 'Neck & Shoulder Stretches', duration: 10, description: 'Targeted stretching for heading-related muscles.' },
    equipment: ['Cones', 'Footballs', 'Full Goals', 'Bibs'],
    coachingPoints: ['Time the jump', 'Head the ball at its highest point', 'Aggressive starting position'],
  },
];

/* ---------- Utility functions ---------- */

export const SESSION_CATEGORIES: SessionCategory[] = [
  'Dribbling',
  'Passing',
  'Shooting',
  'Defending',
  'Goalkeeping',
  'Fitness',
  'Tactical',
];

export const AGE_GROUPS: AgeGroup[] = ['U7-U9', 'U10-U12', 'U13-U15', 'U16+'];

export function filterSessionPlans(
  category?: SessionCategory | null,
  ageGroup?: AgeGroup | null,
  searchQuery?: string,
): SessionPlanTemplate[] {
  return SESSION_PLAN_TEMPLATES.filter((plan) => {
    if (category && plan.focus !== category) return false;
    if (ageGroup && plan.ageGroup !== ageGroup) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = plan.title.toLowerCase().includes(q);
      const matchesFocus = plan.focus.toLowerCase().includes(q);
      const matchesPoints = plan.coachingPoints.some((p) =>
        p.toLowerCase().includes(q),
      );
      if (!matchesTitle && !matchesFocus && !matchesPoints) return false;
    }
    return true;
  });
}
