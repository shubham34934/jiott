import crypto from "node:crypto";

type NeonJwks = { keys: Array<crypto.JsonWebKey & { kid?: string }> };

let jwksCache: { data: NeonJwks; expires: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function fetchJwks(baseUrl: string): Promise<NeonJwks> {
  const now = Date.now();
  if (jwksCache && jwksCache.expires > now) return jwksCache.data;

  const res = await fetch(`${baseUrl}/.well-known/jwks.json`);
  if (!res.ok) {
    throw new Error(`JWKS fetch failed: ${res.status}`);
  }
  const data = (await res.json()) as NeonJwks;
  jwksCache = { data, expires: now + JWKS_TTL_MS };
  return data;
}

/**
 * Verifies Neon Auth webhook signatures (EdDSA / Ed25519 detached JWS).
 * @see https://neon.com/docs/auth/guides/webhooks
 */
export async function verifyNeonAuthWebhook(
  rawBody: string,
  headers: Headers
): Promise<Record<string, unknown>> {
  const signature = headers.get("x-neon-signature");
  const kid = headers.get("x-neon-signature-kid");
  const timestamp = headers.get("x-neon-timestamp");
  if (!signature || !kid || !timestamp) {
    throw new Error("Missing Neon webhook signature headers");
  }

  const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim().replace(/\/$/, "");
  if (!baseUrl) {
    throw new Error("NEON_AUTH_BASE_URL is not configured");
  }

  const jwks = await fetchJwks(baseUrl);
  const jwk = jwks.keys.find((k) => k.kid === kid);
  if (!jwk) {
    jwksCache = null;
    throw new Error(`JWK ${kid} not found`);
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: "jwk" });
  const parts = signature.split(".");
  if (parts.length !== 3 || parts[1] !== "") {
    throw new Error("Expected detached JWS (header..signature)");
  }
  const [headerB64, , signatureB64] = parts;

  const payloadB64 = Buffer.from(rawBody, "utf8").toString("base64url");
  const signaturePayload = `${timestamp}.${payloadB64}`;
  const signaturePayloadB64 = Buffer.from(signaturePayload, "utf8").toString(
    "base64url"
  );
  const signingInput = `${headerB64}.${signaturePayloadB64}`;

  const ok = crypto.verify(
    null,
    Buffer.from(signingInput),
    publicKey,
    Buffer.from(signatureB64, "base64url")
  );
  if (!ok) {
    throw new Error("Invalid webhook signature");
  }

  const ts = parseInt(timestamp, 10);
  const ageMs = Date.now() - ts;
  if (ageMs > 5 * 60 * 1000) {
    throw new Error("Webhook timestamp too old");
  }
  if (ageMs < -2 * 60 * 1000) {
    throw new Error("Webhook timestamp in the future");
  }

  return JSON.parse(rawBody) as Record<string, unknown>;
}
