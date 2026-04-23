/** First word of a display name, or a fallback. */
export function firstName(name: string | null | undefined, fallback = "Someone"): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Join a list of display names as first names separated by " & ". */
export function firstNamesJoined(
  names: ReadonlyArray<string | null | undefined>,
  fallback = "Someone"
): string {
  const parts = names.map((n) => firstName(n, fallback));
  return parts.join(" & ");
}
