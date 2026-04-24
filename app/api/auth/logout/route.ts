import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest, COOKIE_NAME } from "@/lib/auth";
import { auditStatement } from "@/lib/audit";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const user = await getUserFromRequest(req);

    if (user) {
      const { env } = getCloudflareContext();
      const db = env.DB;
      const ip =
        req.headers.get("cf-connecting-ip") ??
        req.headers.get("x-forwarded-for") ??
        undefined;
      const ua = req.headers.get("user-agent") ?? undefined;

      await db.batch([
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
    // Always clear the cookie even if the audit write fails.
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
    return res;
  }
}
