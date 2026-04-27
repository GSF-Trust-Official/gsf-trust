import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isAdmin, isMember } from "@/lib/roles";
import { UpdateMemberSchema } from "@/lib/validators/member";
import {
  getMemberById,
  updateMember,
  deactivateMember,
} from "@/lib/queries/members";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    const { id } = await params;
    const member = await getMemberById(db, id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, member });
  } catch (err) {
    console.error("GET /api/members/[id] failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    const { id } = await params;
    const member = await getMemberById(db, id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = UpdateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Check code uniqueness if code is changing
    if (data.code && data.code !== member.code) {
      const existing = await db
        .prepare("SELECT id FROM members WHERE code = ? AND id != ?")
        .bind(data.code, id)
        .first<{ id: string }>();
      if (existing) {
        return NextResponse.json(
          { error: "A member with this code already exists" },
          { status: 409 }
        );
      }
    }

    // Map boolean is_bod → 0|1 before passing to the query layer
    const mapped: Partial<Omit<typeof member, "id" | "created_at" | "updated_at">> = {
      ...data,
      is_bod:
        data.is_bod !== undefined ? (data.is_bod ? 1 : 0) : undefined,
    };
    await updateMember(db, id, mapped, member, user.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/members/[id] failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const member = await getMemberById(db, id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    await deactivateMember(db, id, member, user.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/members/[id] failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
