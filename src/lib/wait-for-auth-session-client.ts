function responseHasUser(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const o = body as Record<string, unknown>;
  return o.user != null && typeof o.user === "object";
}

/**
 * After `signIn`, the client session store may lag briefly; poll `/api/auth/session` until the user is present.
 */
export async function waitForAuthSessionClient(
  maxAttempts = 40,
  delayMs = 50
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch("/api/auth/session", {
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
