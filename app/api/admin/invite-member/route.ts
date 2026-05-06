"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SignJWT } from "jose";
import { z } from "zod";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { auditStatement } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import type { Member } from "@/types";

const InviteSchema = z.object({ member_id: z.string().min(1) });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://gsf-trust.gsftrust-official.workers.dev";
const INVITE_EXPIRY = "48h";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const member = await env.DB
      .prepare("SELECT * FROM members WHERE id = ? AND status = 'active'")
      .bind(parsed.data.member_id)
      .first<Member>();
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (!member.email) {
      return NextResponse.json({ error: "Member has no email address on file." }, { status: 422 });
    }

    // Check no existing active account by email.
    const existing = await env.DB
      .prepare("SELECT id FROM users WHERE email = ? AND is_active = 1")
      .bind(member.email)
      .first<{ id: string }>();
    if (existing) {
      return NextResponse.json({ error: "A portal account for this member already exists." }, { status: 409 });
    }

    // Check no other user is already linked to this member record.
    const alreadyLinked = await env.DB
      .prepare("SELECT id FROM users WHERE member_id = ? AND is_active = 1")
      .bind(member.id)
      .first<{ id: string }>();
    if (alreadyLinked) {
      return NextResponse.json({ error: "A portal account for this member already exists." }, { status: 409 });
    }

    const tempHash = await hashPassword(crypto.randomUUID() + crypto.randomUUID());
    const newUserId = crypto.randomUUID().replace(/-/g, "");

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO users (id, email, password_hash, name, role, must_change_password, member_id)
         VALUES (?, ?, ?, ?, 'member', 1, ?)`
      ).bind(newUserId, member.email, tempHash, member.name, member.id),
      auditStatement(env.DB, {
        userId: user.sub,
        action: "create",
        entity: "users",
        entityId: newUserId,
        after: { email: member.email, role: "member", via: "direct_invite", member_id: member.id },
      }),
    ]);

    // New users always have token_version = 0 (DB default).
    const inviteToken = await new SignJWT({ sub: newUserId, purpose: "set-password", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(INVITE_EXPIRY)
      .sign(getSecret());

    const inviteUrl  = `${APP_URL}/set-password?token=${inviteToken}`;
    const safeName   = member.name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    void sendEmail({
      to: member.email,
      subject: "Your GSF Foundation account is ready",
      html: `<p>Assalamu Alaikum ${safeName},</p>
<p>You have been invited to the GSF Foundation member portal. Please set your password using the link below:</p>
<p><a href="${inviteUrl}">Set Your Password</a></p>
<p>This link expires in 48 hours.</p>
<p>Once logged in, you can view your subscription history, outstanding dues, and download payment receipts.</p>
<p>JazakAllah Khair,<br>GSF Foundation</p>`,
      text: `Assalamu Alaikum ${member.name},\n\nYou have been invited to the GSF Foundation member portal.\n\nSet your password here: ${inviteUrl}\n\nThis link expires in 48 hours.\n\nJazakAllah Khair,\nGSF Foundation`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/admin/invite-member failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
