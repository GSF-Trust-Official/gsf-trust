import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest, isMember } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries/dashboard";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.mustChangePassword) {
      return NextResponse.json(
        { error: "Password change required", code: "MUST_CHANGE_PASSWORD" },
        { status: 403 }
      );
    }
    if (isMember(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await getDashboardData(db);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("GET /api/dashboard failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
