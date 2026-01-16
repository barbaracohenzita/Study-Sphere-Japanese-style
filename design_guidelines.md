# Study App Design Guidelines: Japandi Minimalist Interface

## Design Approach
**Japandi Minimalist System** - Zen-inspired productivity interface emphasizing Ma (negative space), Kanso (simplicity), and Shibui (subtle elegance). Flat, refined aesthetic with deliberate borders and breathing room to create calm focus.

**Key Principles:**
- Abundant negative space as a design element
- Refined borders over shadows for definition
- Subtle texture layers (paper, linen grain)
- Asymmetric balance inspired by Japanese composition
- Essential elements only - extreme restraint

## Typography System
- **Primary Font:** Inter (400, 500, 600 weights) via Google Fonts CDN
- **Display Font:** Crimson Pro (for elegant headers, 500-600 weights)
- **Timer Display:** JetBrains Mono (tabular-nums, 400-500 weights)
- **Scale:** text-5xl (timer), text-2xl (page headers), text-lg (section titles), text-base (body), text-sm (metadata)
- **Letter spacing:** tracking-tight for headers, tracking-normal for body
- **Line height:** leading-relaxed for all text to enhance readability and breathing room

## Layout Architecture

**Asymmetric Dashboard Grid:**
- Left column (2/5 width): Pomodoro timer + session stats (vertical rhythm)
- Right column (3/5 width): Task management panel
- Use Tailwind spacing: p-6, p-8, p-12, gap-8, gap-12, space-y-6
- Maximum container width: max-w-7xl with px-8 horizontal padding
- Borders: border, border-2 for emphasis
- Corner treatment: rounded-none for strict minimalism, rounded for softer cards

**Spacing Primitives:**
- Consistently use: 2, 4, 6, 8, 12, 16 for spacing units
- Generous vertical rhythm: space-y-8 between major sections, space-y-6 within sections
- Horizontal padding: px-6 for cards, px-8 for containers

## Core Components

**1. Top Navigation Bar**
- Full-width horizontal bar, border-b with subtle texture background
- Left: App wordmark (Crimson Pro, text-xl)
- Center: Tab navigation (Dashboard, Focus History, Settings) - text-sm with minimal underline indicator
- Right: Profile icon + daily streak counter
- Height: h-16, px-8 horizontal padding

**2. Pomodoro Timer (Primary Focus)**
- Large circular outline (border-4, 320px diameter) with timer inside
- Time display: JetBrains Mono, text-6xl, centered
- Session indicator: Small vertical marks outside circle showing 4-session cycle
- Current task name above timer (text-lg, max 40 characters)
- Control buttons below: Single row with start/pause (icon-only, border-2, rounded-full, w-12 h-12)
- Mode selector underneath: Work/Short Break/Long Break as text buttons with border-b-2 active state

**3. Session Statistics Panel**
- Horizontal 3-card layout below timer (grid-cols-3, gap-4)
- Each card: border, p-6, minimal design
- Large metric (text-4xl, tabular-nums) + small label (text-sm, tracking-wide, uppercase)
- Cards show: Sessions Today, Total Focus Time, Current Streak
- Subtle texture background per card

**4. Task Management Column**
- Section header: "Today's Focus" (text-2xl, Crimson Pro, mb-6)
- Task input: Full-width, border-2, px-4 py-3, placeholder with calming instruction
- Task list: Single column, space-y-3
- Task cards: border, p-4, flex layout
  - Custom checkbox: square outline (w-5 h-5, border-2, rounded-sm) with checkmark reveal
  - Task title: text-base, flex-1, ml-3
  - Estimated time badge: text-sm, border, px-2 py-1, rounded-sm
  - Delete icon: minimal, text-sm
- Completed tasks: reduced opacity, subtle strikethrough
- Add task button: w-full, border-2, border-dashed, py-3, text-center, hover with border-solid

**5. Settings/Preferences Panel**
- Duration controls in vertical stack (space-y-6)
- Each control: Label (text-sm, uppercase, tracking-wide) + value display + slider
- Minimal sliders: thin track (h-1), square thumb (border-2, w-4 h-4)
- Toggle switches: Rectangular track with sliding square indicator
- Time presets: Grid of preset buttons (grid-cols-4, gap-2) - 15m, 25m, 45m, 60m

**6. Focus History View**
- Calendar-style grid showing completed sessions
- Each day: small square with session count indicator
- Weekly summary bars below calendar
- Vertical timeline on right showing recent sessions with timestamps

## Component Hierarchy

**Dashboard Layout Structure:**
```
├── Top Navigation (full-width)
├── Main Container (max-w-7xl, 2-column grid)
│   ├── Left Column (Timer + Stats)
│   │   ├── Pomodoro Timer (circular, prominent)
│   │   ├── Session Stats (3-column grid)
│   │   └── Quick Settings (collapsible)
│   └── Right Column (Tasks)
│       ├── Task Input
│       ├── Active Tasks List
│       └── Completed Tasks (collapsible)
└── Bottom: Daily Quote/Affirmation (text-center, border-t, py-6)
```

## Visual Treatment Details

**Borders & Lines:**
- Primary borders: border (1px equivalent)
- Emphasis borders: border-2
- Accent elements: border-l-4 or border-t-4 for vermillion accent
- All borders solid, no rounded corners on structural elements

**Texture Integration:**
- Subtle paper texture overlay on main background (CSS background-image)
- Linen grain texture on card backgrounds
- Keep textures at 3-5% opacity for subtlety

**Depth Without Shadows:**
- Layering through border contrast
- Slight background tone shifts between elements
- Border-l-4 accent bars for hierarchy
- Negative space creates visual separation

**Interactive States:**
- Hover: Subtle background tone shift, border color change
- Active: Border-2 becomes border-3 (simulated press)
- Focus: Double border or border-2 with accent treatment
- No transitions except opacity (duration-200)

## Icons
Use Heroicons (outline style) via CDN:
- Timer: ClockIcon
- Tasks: CheckCircleIcon, ListBulletIcon
- Stats: ChartBarIcon
- Settings: Cog6ToothIcon
- Add: PlusIcon
- Profile: UserCircleIcon

## Images

**Minimal Image Usage:**
This is a utility-focused app where simplicity reigns. No hero images.

**Permitted Visual Elements:**
- User avatar: Small circular (w-10 h-10) in navigation
- Empty state illustrations: Single-color, line-art style when no tasks exist (max 200px wide, centered)
- Zen imagery option: Small (120x120px) subtle ink-wash style image in settings footer as calming element
- Background textures: Paper grain, linen patterns as CSS backgrounds (subtle, < 5% opacity)

## Accessibility
- All borders maintain 3:1 contrast minimum
- Interactive elements have 44x44px minimum touch targets
- Keyboard navigation with visible focus indicators (border-2 with offset)
- Timer announces time remaining to screen readers
- Task checkboxes properly labeled
- High contrast mode support through border emphasis

## Special Features

**Breathing Animation:**
- Subtle pulsing border on timer during active session (very slow, 4s cycle)
- Gentle opacity shift on task cards when due time approaching

**Session Transitions:**
- Minimal slide transition between work/break modes
- Zen bell sound notification option
- Fullscreen focus mode: Just timer + current task, centered, maximum negative space

**Mindful Additions:**
- Daily intention input at top (text-sm, italic, border-l-4 accent)
- Session reflection prompt after completion (modal with single text area)
- Weekly review summary with minimal data visualization (vertical bars only)