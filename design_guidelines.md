# Study App Design Guidelines: Neomorphic Productivity Interface

## Design Approach
**Neomorphic Design System** - Soft, tactile interface emphasizing depth through subtle shadows and highlights. This aesthetic creates a calm, focused environment perfect for productivity and concentration.

**Key Principles:**
- Soft, embossed UI elements that appear to float or sink
- Minimal visual noise to maintain focus
- Tactile, pressable components
- Generous spacing for breathing room

## Typography System
- **Primary Font:** Inter or SF Pro Display (clean, modern sans-serif)
- **Headings:** Font weights 600-700, sizes: text-3xl (timer), text-xl (section headers), text-lg (card titles)
- **Body Text:** Font weight 400-500, sizes: text-base (task descriptions), text-sm (metadata)
- **Monospace:** JetBrains Mono for timer/countdown displays (tabular-nums for alignment)

## Layout Architecture

**Desktop-First Dashboard Layout:**
- Fixed sidebar (w-64) for navigation and quick stats
- Main content area with max-w-6xl container
- Use Tailwind spacing: p-4, p-6, p-8, gap-6, gap-8
- Consistent border-radius: rounded-2xl for cards, rounded-xl for buttons, rounded-lg for inputs

**Grid System:**
- Primary dashboard: 2-column grid (lg:grid-cols-2) for timer + tasks
- Task list: Single column with proper spacing (space-y-4)
- Pomodoro stats: 3-column grid for metrics (grid-cols-3 gap-4)

## Core Components

**1. Sidebar Navigation**
- Fixed left sidebar with app logo at top
- Vertical menu items: Dashboard, Tasks, Statistics, Settings
- Active state indicated by depth variation
- User profile section at bottom

**2. Pomodoro Timer (Hero Component)**
- Large circular timer display (300-400px diameter) with neomorphic depth
- Time in monospace font at text-6xl
- Play/pause and reset buttons as rounded-full icons
- Session counter below timer
- Current task name displayed above timer

**3. Task Management Panel**
- Task input field with neomorphic inset effect
- Task cards with checkbox, title, time estimate, delete action
- Each task shows subtle depth with inner shadow when incomplete
- Completed tasks flatten with reduced opacity
- "Add Task" button with prominent neomorphic raise

**4. Session History/Stats Cards**
- Grid of metric cards showing: Sessions completed today, Total focus time, Current streak
- Each card has soft shadow depth
- Large number display (text-4xl) with small label underneath (text-sm)

**5. Settings Panel**
- Work duration slider
- Short break duration slider  
- Long break duration slider
- Sound notifications toggle
- All controls with neomorphic treatment

## Spacing & Rhythm
- Container padding: p-8 for main content area
- Card padding: p-6 for standard cards, p-8 for prominent components
- Section spacing: space-y-8 between major sections
- Component spacing: gap-6 for component groups
- Micro spacing: space-y-2 for related text elements

## Interactive Elements

**Buttons:**
- Primary actions: px-8 py-3, rounded-xl, soft raised effect
- Icon buttons: p-4, rounded-full
- Hover: Slight elevation increase (transform subtle)
- Active: Pressed inset effect

**Form Inputs:**
- Text fields: px-4 py-3, rounded-lg, inset shadow
- Checkboxes: Custom neomorphic circles that depress when checked
- Sliders: Rounded track with raised thumb control

**Cards:**
- Consistent rounded-2xl corners
- Soft outer shadow + subtle inner highlight
- Hover state: Minimal elevation change
- Padding: p-6 standard

## Component Hierarchy

**Dashboard View Structure:**
1. Top: Current session timer (prominent, centered in left column)
2. Right column: Today's task list with quick add
3. Below timer: Session stats in 3-column grid
4. Bottom: Recent activity log

**Depth Layers:**
- Background: Flat base layer
- Cards: Raised 2-4px equivalent depth
- Active elements: Raised 4-6px
- Pressed states: Inset 2px
- Floating elements (modals): 8-12px

## Special Features

**Focus Mode:**
- Fullscreen timer view option
- Minimal distractions: just timer, current task, controls
- Ambient background treatment

**Quick Actions Bar:**
- Floating action strip at top-right: Quick add task, Start session, View stats
- Rounded-full container with soft shadow

## Icons
Use Heroicons (outline style for consistency with neomorphic softness)
- Timer: ClockIcon
- Tasks: CheckCircleIcon  
- Stats: ChartBarIcon
- Settings: CogIcon
- Add: PlusCircleIcon

## Images
No hero images. This is a utility-focused productivity app where the interface elements themselves are the primary visual focus. The neomorphic aesthetic creates visual interest through depth and shadow rather than photography.

**Possible additions:**
- Small avatar/profile image in sidebar (rounded-full, w-10 h-10)
- Empty state illustrations for completed task lists (subtle, line-art style)

## Accessibility
- Ensure neomorphic depth is complemented by subtle border treatments for low-vision users
- Maintain proper contrast ratios for text readability
- Keyboard navigation for all timer and task controls
- Focus states with visible outline offset
- Screen reader labels for icon-only buttons