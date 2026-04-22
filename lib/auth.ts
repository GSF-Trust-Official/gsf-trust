import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { JwtPayload } from "@/types";

const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = "8h";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: Omit<JwtPayload, "exp">): Promise<string> {
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
