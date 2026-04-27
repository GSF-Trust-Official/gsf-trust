import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserByEmail } from "@/lib/queries/users";
import { verifyPassword, signToken, COOKIE_NAME } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";
import { LoginSchema } from "@/lib/validators/auth";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW = "-15 minutes";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours
const UNKNOWN_IP = "unknown";

// Constant-time dummy hash: prevents user enumeration via bcrypt timing differences.
// bcrypt always runs the full key derivation regardless of whether this hash matches.
const DUMMY_HASH =
  "$2b$12$Y.Q9cXmvQpmwJ1FyGoCgI.5iP19pkqbsC27.O1CxvAgR3BdhSj8Yi";

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

    const ip =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-forwarded-for") ??
      UNKNOWN_IP;
    const ua = req.headers.get("user-agent") ?? undefined;

    const failedAttempts = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM auth_attempts
         WHERE success = 0
           AND created_at > datetime('now', ?)
           AND (email = ? OR ip_address = ?)`
      )
      .bind(LOCK_WINDOW, email, ip)
      .first<{ count: number }>();

    if ((failedAttempts?.count ?? 0) >= MAX_FAILED_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Always run bcrypt regardless of whether the user exists: constant timing.
    const passwordOk = await verifyPassword(
      password,
      user?.password_hash ?? DUMMY_HASH
    );

    if (!user || !passwordOk) {
      // Only audit failed attempts for known users; unknown emails have no user_id.
      if (user) {
        await db.batch([
          db
            .prepare(
              "INSERT INTO auth_attempts (email, ip_address, success) VALUES (?, ?, 0)"
            )
            .bind(email, ip),
          auditStatement(db, {
            userId: user.id,
            action: "failed_login",
            entity: "users",
            entityId: user.id,
            ipAddress: ip,
            userAgent: ua,
          }),
        ]);
      } else {
        await db
          .prepare(
            "INSERT INTO auth_attempts (email, ip_address, success) VALUES (?, ?, 0)"
          )
          .bind(email, ip)
          .run();
      }
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Successful login: sign token and persist session.
    const mustChangePassword = user.must_change_password === 1;
    const token = await signToken({
      sub: user.id,
      role: user.role,
      name: user.name,
      tokenVersion: user.token_version,
      mustChangePassword,
    });

    await db.batch([
      db
        .prepare(
          "INSERT INTO auth_attempts (email, ip_address, success) VALUES (?, ?, 1)"
        )
        .bind(email, ip),
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
      mustChangePassword,
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
