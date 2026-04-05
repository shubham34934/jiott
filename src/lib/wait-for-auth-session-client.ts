function responseHasUser(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  if (o.user != null) return true;
  const inner = o.data;
  if (inner && typeof inner === "object" && (inner as { user?: unknown }).user != null) {
    return true;
  }
  return false;
}

/**
 * After `signIn.email`, better-auth flips the session store on a short timeout, so a same-tick
 * `router.push` can mount the next page before the client sees the new session. Poll get-session
 * (with cookies) until the user is present or we time out.
 */
export async function waitForAuthSessionClient(
  maxAttempts = 40,
  delayMs = 50
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch("/api/auth/get-session", {
        credentials: "include",
      });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      const body: unknown = await res.json();
      if (responseHasUser(body)) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}
