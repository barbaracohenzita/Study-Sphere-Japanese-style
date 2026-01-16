# StudyFlow - Pomodoro Timer & Task Manager

## Overview

StudyFlow is a productivity web application featuring a Pomodoro timer and task management system. The app uses a neomorphic design aesthetic with soft, tactile UI elements that create a calm, focused environment for studying. Users can manage tasks with estimated pomodoro counts, track completed focus sessions, and customize timer settings.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React useState for local UI state
- **Styling**: Tailwind CSS with custom neomorphic design system including CSS custom properties for theming (light/dark mode support)
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API with endpoints under `/api/` prefix
- **Development**: Vite dev server with HMR for frontend, tsx for TypeScript execution

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - contains tasks, sessions, and settings tables
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod
- **Current Storage**: In-memory storage implementation (`MemStorage` class) - database tables are defined but storage uses Map-based implementation

### Key Data Models
- **Tasks**: id, title, completed status, estimated/completed pomodoros
- **Sessions**: id, type (work/shortBreak/longBreak), duration, completedAt, optional taskId
- **Settings**: timer durations, sessions until long break, sound enabled

### Project Structure
```
client/           # React frontend
  src/
    components/   # React components including shadcn/ui
    pages/        # Route pages (dashboard, not-found)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Express backend
  index.ts        # Server entry point
  routes.ts       # API route definitions
  storage.ts      # Data storage interface and implementation
  vite.ts         # Vite dev server integration
  static.ts       # Production static file serving
shared/           # Shared code between client/server
  schema.ts       # Drizzle schema and Zod types
```

### Design System
- Neomorphic UI with soft shadows and depth effects
- CSS custom properties for color theming
- Light and dark mode support via ThemeProvider context
- Custom neo-card, neo-inset, neo-button utility classes

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via DATABASE_URL environment variable)
- **Drizzle Kit**: Database migrations and schema push (`npm run db:push`)

### UI Libraries
- **Radix UI**: Accessible primitive components (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **shadcn/ui**: Pre-built component library using Radix + Tailwind

### Frontend
- **TanStack React Query**: Server state management and caching
- **React Hook Form + Zod**: Form handling and validation
- **date-fns**: Date formatting utilities
- **Embla Carousel**: Carousel component

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development