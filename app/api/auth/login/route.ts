import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserByEmail } from "@/lib/queries/users";
import { verifyPassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";
import { LoginSchema } from "@/lib/validators/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW = "-15 minutes";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserByEmail(db, email);

    // Identical response for unknown email and wrong password — no enumeration.
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Rate limit: count failed_login audit entries in the last 15 minutes.
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM audit_log
         WHERE user_id = ? AND action = 'failed_login'
         AND created_at > datetime('now', ?)`
      )
      .bind(user.id, LOCK_WINDOW)
      .first<{ count: number }>();

    if ((row?.count ?? 0) >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for") ??
      undefined;
    const ua = req.headers.get("user-agent") ?? undefined;

    const passwordOk = await verifyPassword(password, user.password_hash);

    if (!passwordOk) {
      await db.batch([
        auditStatement(db, {
          userId: user.id,
          action: "failed_login",
          entity: "users",
          entityId: user.id,
          ipAddress: ip,
          userAgent: ua,
        }),
      ]);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Successful login — sign token and persist session.
    const token = await signToken({
      sub: user.id,
      role: user.role,
      name: user.name,
    });

    await db.batch([
      db
        .prepare(
          "UPDATE users SET last_login = datetime('now'), updated_at = datetime('now') WHERE id = ?"
        )
        .bind(user.id),
      auditStatement(db, {
        userId: user.id,
        action: "login",
        entity: "users",
        entityId: user.id,
        ipAddress: ip,
        userAgent: ua,
      }),
    ]);

    const res = NextResponse.json({
      ok: true,
      mustChangePassword: user.must_change_password === 1,
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });

    return res;
  } catch (err) {
    console.error("POST /api/auth/login failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
