# Performance checklist (JioTT)

## DB in the same region as Vercel

- In the [Neon console](https://console.neon.tech), create or use a branch whose region matches your Vercel deployment.
- Set Vercel Serverless **region** to match (see `vercel.json` → `regions`). Example: Neon `aws-us-east-1` pairs with Vercel `iad1`. If your DB is in Mumbai, prefer `bom1` (or the closest Vercel region Neon documents for that area) and update `vercel.json` accordingly.
- Keep `DATABASE_URL` on the **pooled** host; see comments in `.env.example`.

## React Query (client cache)

- Global defaults: `staleTime` 30s, `refetchOnWindowFocus: false` in `src/providers/QueryProvider.tsx`.
- Shared prefetch keys: `src/lib/query-prefetch.ts`; bottom nav prefetches on hover for Home / Matches / Players.

## ISR / Data Cache (server)

- Read APIs use `unstable_cache` with `revalidate: 30` and cache tags (not `export const revalidate` on Route Handlers, so Next does not try to hit the DB during `next build`).
- Match list: `src/app/api/matches/route.ts` + `src/lib/get-matches-list.ts`.
- Leaderboard, tournaments list, players list: cached helpers in `src/lib/get-*.ts` with `revalidate: 30` and `revalidateTag` on writes.

## Reduce API calls

- Server: shared cached query functions + tags limit repeated Prisma work.
- Client: `staleTime`, hover prefetch, and invalidation only where data actually changes.

## Optimistic UI

- Match detail: set-score mutation applies optimistic cache updates before the PATCH completes (`src/app/matches/[id]/page.tsx`).

## Server Components

- `src/app/leaderboard/page.tsx` and `src/app/tournaments/page.tsx` load data on the server (cached Prisma). Small client islands: `tournaments-header.tsx`, `tournaments-empty-cta.tsx`.

## Bundle size (target under ~200 kB First Load JS, gzipped)

- Target is **gzipped First Load JS** for primary routes (check Vercel Speed Insights / build output). `lucide-react` is already optimized by Next by default; `optimizePackageImports` includes `@tanstack/react-query` in `next.config.ts`.
- If a route exceeds the budget, split with `next/dynamic` for heavy client-only sections.

## Edge vs Node for read-heavy API routes

- This app uses **Prisma + Neon over WebSockets (`ws`)** in `src/lib/prisma.ts`, which requires the **Node.js** runtime. **Do not** set `runtime = 'edge'` on DB-backed Route Handlers; they will fail or need a full rewrite (e.g. HTTP-only data access).
- Read-heavy routes stay **Node** in the **same region** as the database; that gives low latency without Edge.
