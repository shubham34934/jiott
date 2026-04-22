/** Browser / client `fetch` for app JSON APIs — avoids stale disk/HTTP cache. */
export function apiGet(
  input: string | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, { ...init, cache: "no-store" });
}
