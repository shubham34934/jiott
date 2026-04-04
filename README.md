# JioTT - Table Tennis Tracker

A mobile-first Progressive Web App (PWA) for tracking table tennis matches, player performance, ELO ratings, and tournaments.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL (Neon) with Prisma ORM v6
- **Auth**: Neon Auth (`@neondatabase/auth`) + Prisma for app `User` / `Player`
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
- A PostgreSQL database ([Neon](https://neon.tech) free tier works well)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set `DATABASE_URL`, `NEON_AUTH_BASE_URL`, and `NEON_AUTH_COOKIE_SECRET` (see `.env.example`). Enable **Auth** on your Neon branch and paste the Auth URL from the console.

3. **Apply database migrations**:
   ```bash
   npx prisma migrate deploy
   ```
   For local development you can use `npx prisma migrate dev` to create new migrations after schema changes.

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Neon connection issues (`P1001` / can’t reach server)

- Use the **direct** connection URI from the Neon dashboard (host like `ep-…aws.neon.tech`, not always required to use the pooler for local dev).
- Do **not** add `channel_binding=require` to the URL; it often breaks Prisma/Node TLS.
- If the project was **idle**, open it in the [Neon console](https://console.neon.tech) to wake it, then retry.
- Some networks block outbound **port 5432** or mishandle **IPv6**; try another Wi‑Fi, disable VPN, or check Neon’s IPv4 / pooler options in the docs.
- After changing `.env`, restart `npm run dev`.

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
