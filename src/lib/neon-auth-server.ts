import { createNeonAuth } from "@neondatabase/auth/next/server";

const configuredBaseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
const baseUrl =
  configuredBaseUrl || "https://invalid.neon-auth.local/neondb/auth";

let neonDevConfigLogged = false;
function logNeonDevConfigOnce(lines: string[]) {
  if (process.env.NODE_ENV !== "development" || neonDevConfigLogged) return;
  neonDevConfigLogged = true;
  console.warn(`\n[Neon Auth]\n${lines.join("\n")}\n`);
}

const cookieSecretRaw = process.env.NEON_AUTH_COOKIE_SECRET?.trim() ?? "";
const cookieSecretShort = cookieSecretRaw.length < 32;
let cookieSecret = cookieSecretRaw;
if (cookieSecretShort) {
  cookieSecret = "dev-only-neon-auth-secret-min-32chars!!";
}

if (!configuredBaseUrl || cookieSecretShort) {
  const lines: string[] = [];
  if (!configuredBaseUrl) {
    lines.push(
      "• NEON_AUTH_BASE_URL is missing — set it from Neon Console → Branch → Auth → Configuration.",
      "  Without it, /api/auth/get-session returns 502."
    );
  }
  if (cookieSecretShort) {
    lines.push(
      "• NEON_AUTH_COOKIE_SECRET must be ≥32 chars (openssl rand -base64 32). Using a dev-only fallback."
    );
  }
  logNeonDevConfigOnce(lines);
}

/**
 * Neon Console → Project → Branch → Auth → Configuration: `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (≥32 chars).
 */
export const neonAuth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
  },
});
