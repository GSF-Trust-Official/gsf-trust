"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { getUserFromRequest } from "@/lib/auth";
import { isMember } from "@/lib/roles";
import { auditStatement } from "@/lib/audit";

const UpdateProfileSchema = z.object({
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!user.memberId) return NextResponse.json({ error: "No member linked" }, { status: 422 });

    const member = await env.DB
      .prepare("SELECT id, code, name, email, phone, address, join_date, status FROM members WHERE id = ?")
      .bind(user.memberId)
      .first();

    return NextResponse.json({ member });
  } catch (err) {
    console.error("GET /api/me/profile failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!user.memberId) return NextResponse.json({ error: "No member linked" }, { status: 422 });

    const body = await req.json().catch(() => null);
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const before = await env.DB
      .prepare("SELECT phone, email FROM members WHERE id = ?")
      .bind(user.memberId)
      .first();

    // Guard email uniqueness across both members and users tables.
    if (parsed.data.email !== undefined && parsed.data.email !== null) {
      const memberConflict = await env.DB
        .prepare("SELECT id FROM members WHERE email = ? AND id != ?")
        .bind(parsed.data.email, user.memberId)
        .first<{ id: string }>();
      if (memberConflict) {
        return NextResponse.json({ error: "Email already in use by another member." }, { status: 409 });
      }
      const userConflict = await env.DB
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .bind(parsed.data.email, user.sub)
        .first<{ id: string }>();
      if (userConflict) {
        return NextResponse.json({ error: "Email already in use by another account." }, { status: 409 });
      }
    }

    const updates: string[] = [];
    const binds: unknown[] = [];
    if (parsed.data.phone !== undefined) {
      updates.push("phone = ?");
      binds.push(parsed.data.phone);
    }
    if (parsed.data.email !== undefined) {
      updates.push("email = ?");
      binds.push(parsed.data.email);
    }
    if (updates.length === 0) return NextResponse.json({ ok: true });

    updates.push("updated_at = datetime('now')");
    binds.push(user.memberId);

    await env.DB.batch([
      env.DB.prepare(`UPDATE members SET ${updates.join(", ")} WHERE id = ?`).bind(...binds),
      auditStatement(env.DB, {
        userId: user.sub,
        action: "update",
        entity: "members",
        entityId: user.memberId,
        before,
        after: parsed.data,
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/me/profile failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
