// Session = a signed JWT in an HttpOnly cookie. Uses `jose`, which works in both
// the Node runtime (server actions) and the Edge runtime (middleware).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "mm_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.SESSION_SECRET ?? "dev-insecure-secret-change-in-production"
  );
}

export async function createSessionToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return { email: String(payload.email) };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SEC;
