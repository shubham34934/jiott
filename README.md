# JioTT - Table Tennis Tracker

A mobile-first Progressive Web App (PWA) for tracking table tennis matches, player performance, ELO ratings, and tournaments.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: MongoDB with Prisma ORM v6
- **Auth**: NextAuth.js (Google provider)
- **Data Fetching**: TanStack React Query
- **Icons**: Lucide React

## Features

- **Matches**: Create singles/doubles matches, track scores per set, complete matches
- **Players**: View all players, detailed profiles with stats and match history
- **ELO Ratings**: Automatic rating updates after match completion
- **Leaderboard**: Ranked player list with top-3 podium
- **Tournaments**: Single elimination bracket generation with auto-progression
- **Event Logging**: Full audit trail of all score changes
- **PWA**: Installable, offline-capable with service worker

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB database (MongoDB Atlas free tier recommended)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env` and update with your credentials:
   ```
   DATABASE_URL="mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/jiott?retryWrites=true&w=majority"
   NEXTAUTH_SECRET="your-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

3. **Push schema to database** (MongoDB uses `db push` instead of migrations):
   ```bash
   npx prisma db push
   ```

4. **Seed demo data** (optional):
   ```bash
   npx tsx prisma/seed.ts
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── matches/       # Match CRUD + score updates
│   │   ├── players/       # Player listing + profiles
│   │   ├── leaderboard/   # Ranked player list
│   │   └── tournaments/   # Tournament + bracket generation
│   ├── matches/           # Match pages (list, detail, create)
│   ├── players/           # Player pages (list, profile)
│   ├── leaderboard/       # Leaderboard page
│   ├── profile/           # User profile page
│   ├── tournaments/       # Tournament pages (bracket, create)
│   └── auth/              # Sign-in page
├── components/            # Reusable UI components
├── lib/                   # Core utilities (prisma, auth, elo, bracket)
├── providers/             # React context providers
└── types/                 # TypeScript type augmentations
```

## Design System

| Token | Value |
|-------|-------|
| Primary | `#1D4ED8` (Deep Blue) |
| Secondary | `#6366F1` (Indigo) |
| Background | `#F9FAFB` (Light Gray) |
| Success | `#16A34A` (Green) |
| Danger | `#DC2626` (Red) |
| Font | Inter |

## Key Algorithms

### ELO Rating System
- K-factor: 32
- Default rating: 1000
- Doubles: uses average team rating
- Atomically updated on match completion

### Tournament Bracket
- Single elimination with random seeding
- Auto-normalizes to power of 2 (adds byes)
- Winners auto-propagate to next round
- Match dependencies track round progression
