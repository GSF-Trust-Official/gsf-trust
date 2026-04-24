import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { D1Database } from "@cloudflare/workers-types";
import type { JwtPayload, UserRole } from "@/types";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = "8h";
const COOKIE_NAME = "gsf-session";

// ─── Password helpers ────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT helpers ─────────────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: Omit<JwtPayload, "exp">
): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as JwtPayload;
}

// ─── Role guards ─────────────────────────────────────────────────────────────
// Use these in every API route handler — never rely on middleware alone.

/** admin + editor can log and edit transactions, manage members */
export function canWrite(role: UserRole): boolean {
  return role === "admin" || role === "editor";
}

/** admin only — soft-delete, user management, settings, approve registrations */
export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

/** member only — row-level self-service portal */
export function isMember(role: UserRole): boolean {
  return role === "member";
}

// ─── Request helper ───────────────────────────────────────────────────────────

/**
 * Extracts and verifies the session JWT from the request cookie, then checks
 * the embedded tokenVersion against the DB. This means logout and password-change
 * immediately invalidate existing tokens — stolen cookies don't persist until expiry.
 * Use at the top of every protected route handler.
 */
export async function getUserFromRequest(
  req: Request,
  db: D1Database
): Promise<JwtPayload | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));

  if (!match) return null;

  const token = match.slice(COOKIE_NAME.length + 1);
  try {
    const payload = await verifyToken(token);
    const row = await db
      .prepare(
        "SELECT token_version FROM users WHERE id = ? AND is_active = 1"
      )
      .bind(payload.sub)
      .first<{ token_version: number }>();
    if (!row || row.token_version !== payload.tokenVersion) return null;
    return payload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
