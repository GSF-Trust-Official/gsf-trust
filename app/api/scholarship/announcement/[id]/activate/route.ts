import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { activateAnnouncement } from "@/lib/queries/scholarshipAnnouncements";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (!canWrite(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    await activateAnnouncement(db, id, user.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/scholarship/announcement/[id]/activate failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
