/** Client-side React Query freshness window (ms). Mutations still invalidate affected keys; see `apiGet` + `router.refresh()` for server-rendered pages. */
export const QUERY_STALE_TIME_MS = 30_000;
