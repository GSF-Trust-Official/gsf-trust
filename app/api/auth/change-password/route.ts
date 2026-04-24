import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest, hashPassword, canWrite } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";
import { ChangePasswordSchema } from "@/lib/validators/auth";

const MIN_LENGTH_PRIVILEGED = 12;
const MIN_LENGTH_BASE = 10;

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

    const { password } = parsed.data;
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

    const hash = await hashPassword(password);

    // Increment token_version so existing sessions on other devices are revoked.
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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/change-password failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
