import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest, canWrite, isMember } from "@/lib/auth";
import { CreateMemberSchema } from "@/lib/validators/member";
import { getAllMembers, createMember } from "@/lib/queries/members";

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
    // Member role uses /api/me/* for row-level self-service only.
    if (isMember(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const members = await getAllMembers(db);
    return NextResponse.json({ ok: true, members });
  } catch (err) {
    console.error("GET /api/members failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request): Promise<NextResponse> {
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
    if (!canWrite(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check code uniqueness
    const existing = await db
      .prepare("SELECT id FROM members WHERE code = ?")
      .bind(data.code)
      .first<{ id: string }>();
    if (existing) {
      return NextResponse.json(
        { error: "A member with this code already exists" },
        { status: 409 }
      );
    }

    const id = generateId();
    await createMember(
      db,
      {
        id,
        code: data.code,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        address: data.address ?? null,
        join_date: data.join_date,
        status: "active",
        is_bod: data.is_bod ? 1 : 0,
        bod_designation: data.bod_designation ?? null,
        notes: data.notes ?? null,
      },
      user.sub
    );

    return NextResponse.json({ ok: true, member: { id, code: data.code, name: data.name } }, { status: 201 });
  } catch (err) {
    console.error("POST /api/members failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
