import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest, hashPassword, canWrite, isAdmin } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";
import { ChangePasswordSchema } from "@/lib/validators/auth";

const MIN_LENGTH_PRIVILEGED = 12;
const MIN_LENGTH_BASE = 10;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);
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
    const minLength =
      isAdmin(user.role) || canWrite(user.role)
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

    const { env } = getCloudflareContext();
    const db = env.DB;
    const hash = await hashPassword(password);

    await db.batch([
      db
        .prepare(
          `UPDATE users
           SET password_hash = ?, must_change_password = 0, updated_at = datetime('now')
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
