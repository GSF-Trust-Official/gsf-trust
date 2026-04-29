"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { jwtVerify } from "jose";
import { z } from "zod";
import { hashPassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";

const SetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(10),
});

const SESSION_MAX_AGE = 60 * 60 * 8;

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    const parsed = SetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Validate the one-time invite token.
    let userId: string;
    try {
      const { payload } = await jwtVerify(token, getSecret());
      if (payload["purpose"] !== "set-password" || typeof payload["sub"] !== "string") {
        throw new Error("invalid token");
      }
      userId = payload["sub"];
    } catch {
      return NextResponse.json({ error: "Invalid or expired invite link." }, { status: 400 });
    }

    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await db
      .prepare("SELECT id, role, name, token_version, member_id FROM users WHERE id = ? AND is_active = 1")
      .bind(userId)
      .first<{ id: string; role: string; name: string; token_version: number; member_id: string | null }>();

    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    const newHash = await hashPassword(password);
    const newTokenVersion = user.token_version + 1;

    await db.batch([
      db.prepare(
        `UPDATE users
         SET password_hash = ?, must_change_password = 0, token_version = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(newHash, newTokenVersion, user.id),
      auditStatement(db, {
        userId: user.id,
        action: "update",
        entity: "users",
        entityId: user.id,
        after: { action: "set-password-from-invite" },
      }),
    ]);

    // Issue session cookie so the user is immediately logged in.
    const sessionToken = await signToken({
      sub: user.id,
      role: user.role as "admin" | "editor" | "viewer" | "member",
      name: user.name,
      tokenVersion: newTokenVersion,
      mustChangePassword: false,
      memberId: user.member_id ?? null,
    });

    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/set-password failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
