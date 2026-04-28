import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { AnnouncementSchema } from "@/lib/validators/scholarship";
import { getActiveAnnouncement, upsertAnnouncement } from "@/lib/queries/scholarshipAnnouncements";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });

    const announcement = await getActiveAnnouncement(db);
    return NextResponse.json(announcement ?? null);
  } catch (err) {
    console.error("GET /api/scholarship/announcement failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (!canWrite(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body   = await req.json().catch(() => null);
    const parsed = AnnouncementSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const {
      id, title, description, eligibility_criteria, deadline,
      contact, poster_drive_url, documents_drive_url, form_url, is_active,
    } = parsed.data;

    const newId = await upsertAnnouncement(db, id ?? null, {
      title,
      description,
      eligibilityCriteria: eligibility_criteria ?? null,
      deadline:            deadline             ?? null,
      contact:             contact              ?? null,
      posterDriveUrl:      poster_drive_url     ?? null,
      documentsDriveUrl:   documents_drive_url  ?? null,
      formUrl:             form_url             ?? null,
      isActive:            is_active,
      userId:              user.sub,
    });

    return NextResponse.json({ ok: true, id: newId });
  } catch (err) {
    console.error("POST /api/scholarship/announcement failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
