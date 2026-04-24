import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest, COOKIE_NAME } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const user = await getUserFromRequest(req, db);

    if (user) {
      const ip =
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-forwarded-for") ??
        undefined;
      const ua = req.headers.get("user-agent") ?? undefined;

      // Increment token_version so the now-cleared cookie can never be replayed.
      await db.batch([
        db
          .prepare(
            "UPDATE users SET token_version = token_version + 1, updated_at = datetime('now') WHERE id = ?"
          )
          .bind(user.sub),
        auditStatement(db, {
          userId: user.sub,
          action: "logout",
          entity: "users",
          entityId: user.sub,
          ipAddress: ip,
          userAgent: ua,
        }),
      ]);
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (err) {
    console.error("POST /api/auth/logout failed", err);
    // Always clear the cookie even if the DB write fails.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }
}
