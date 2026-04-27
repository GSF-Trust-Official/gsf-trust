import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isMember } from "@/lib/roles";
import { getArrears } from "@/lib/queries/subscriptions";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const arrears = await getArrears(db);
    return NextResponse.json({ ok: true, arrears });
  } catch (err) {
    console.error("GET /api/subscriptions/arrears failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
