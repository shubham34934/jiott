/** For dynamic API JSON responses; pair with `revalidateTag` / RSC `router.refresh()`. */
export const JSON_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, must-revalidate",
} as const;
