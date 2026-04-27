import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  getUserFromRequest,
  hashPassword,
  verifyPassword,
  signToken,
  COOKIE_NAME,
} from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { auditStatement } from "@/lib/audit";
import { ChangePasswordSchema } from "@/lib/validators/auth";

const MIN_LENGTH_PRIVILEGED = 12;
const MIN_LENGTH_BASE = 10;
const SESSION_MAX_AGE = 60 * 60 * 8;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const user = await getUserFromRequest(req, db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { currentPassword, password } = parsed.data;
    const minLength = canWrite(user.role)
      ? MIN_LENGTH_PRIVILEGED
      : MIN_LENGTH_BASE;

    if (password.length < minLength) {
      return NextResponse.json(
        {
          error: `Password must be at least ${minLength} characters for your account type.`,
        },
        { status: 400 }
      );
    }

    // For non-forced changes (regular password update) current password is required.
    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required" },
          { status: 400 }
        );
      }
      const userRow = await db
        .prepare("SELECT password_hash FROM users WHERE id = ?")
        .bind(user.sub)
        .first<{ password_hash: string }>();
      if (!userRow || !(await verifyPassword(currentPassword, userRow.password_hash))) {
        return NextResponse.json(
          { error: "Current password is incorrect" },
          { status: 400 }
        );
      }
    }

    const hash = await hashPassword(password);
    const newTokenVersion = user.tokenVersion + 1;

    // Atomic: update password, clear mustChangePassword, increment token_version.
    await db.batch([
      db
        .prepare(
          `UPDATE users
           SET password_hash = ?, must_change_password = 0,
               token_version = token_version + 1,
               updated_at = datetime('now')
           WHERE id = ?`
        )
        .bind(hash, user.sub),
      auditStatement(db, {
        userId: user.sub,
        action: "update",
        entity: "users",
        entityId: user.sub,
        after: { must_change_password: 0 },
      }),
    ]);

    // Re-issue a fresh token so this session remains valid on this device.
    // The incremented token_version invalidates any other active sessions.
    const newToken = await signToken({
      sub: user.sub,
      role: user.role,
      name: user.name,
      tokenVersion: newTokenVersion,
      mustChangePassword: false,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/change-password failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
