"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { SignJWT } from "jose";
import { z } from "zod";
import { getUserFromRequest, hashPassword } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { auditStatement } from "@/lib/audit";
import { sendEmail } from "@/lib/email";
import type { RegistrationRequest } from "@/types";

const ApproveSchema = z.object({
  action: z.literal("approve"),
  linked_member_id: z.string().min(1).optional(),
});

const RejectSchema = z.object({
  action: z.literal("reject"),
  rejection_reason: z.string().max(500).optional(),
});

const BodySchema = z.discriminatedUnion("action", [ApproveSchema, RejectSchema]);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://gsf-trust.gsftrust-official.workers.dev";
const INVITE_EXPIRY = "48h";

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not set");
  return new TextEncoder().encode(s);
}

async function makeInviteToken(userId: string, tokenVersion: number): Promise<string> {
  return new SignJWT({ sub: userId, purpose: "set-password", tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(INVITE_EXPIRY)
    .sign(getSecret());
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const request = await env.DB
      .prepare("SELECT * FROM registration_requests WHERE id = ?")
      .bind(id)
      .first<RegistrationRequest>();

    if (!request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (request.status !== "pending") {
      return NextResponse.json({ error: "Request already reviewed" }, { status: 409 });
    }

    if (parsed.data.action === "approve") {
      // Ensure no duplicate user for this email.
      const existing = await env.DB
        .prepare("SELECT id FROM users WHERE email = ?")
        .bind(request.email)
        .first<{ id: string }>();
      if (existing) {
        return NextResponse.json(
          { error: "A user with this email already exists." },
          { status: 409 }
        );
      }

      // Validate the linked member exists and is active before binding.
      if (parsed.data.linked_member_id) {
        const linkedMember = await env.DB
          .prepare("SELECT id FROM members WHERE id = ? AND status = 'active'")
          .bind(parsed.data.linked_member_id)
          .first<{ id: string }>();
        if (!linkedMember) {
          return NextResponse.json(
            { error: "Linked member not found or inactive." },
            { status: 404 }
          );
        }

        // Prevent linking two user accounts to the same member.
        const alreadyLinked = await env.DB
          .prepare("SELECT id FROM users WHERE member_id = ? AND is_active = 1")
          .bind(parsed.data.linked_member_id)
          .first<{ id: string }>();
        if (alreadyLinked) {
          return NextResponse.json(
            { error: "This member already has an active portal account." },
            { status: 409 }
          );
        }
      }

      // Create the user account (must_change_password=1 until they set it via invite link).
      const tempHash = await hashPassword(crypto.randomUUID() + crypto.randomUUID());
      const newUserId = crypto.randomUUID().replace(/-/g, "");

      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO users (id, email, password_hash, name, role, must_change_password, member_id)
           VALUES (?, ?, ?, ?, 'member', 1, ?)`
        ).bind(newUserId, request.email, tempHash, request.name, parsed.data.linked_member_id ?? null),
        env.DB.prepare(
          `UPDATE registration_requests
           SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), linked_member_id = ?
           WHERE id = ?`
        ).bind(user.sub, parsed.data.linked_member_id ?? null, id),
        auditStatement(env.DB, {
          userId: user.sub,
          action: "create",
          entity: "users",
          entityId: newUserId,
          after: { email: request.email, role: "member", via: "registration_approval" },
        }),
      ]);

      // Send invite email with set-password link.
      // New users always have token_version = 0 (DB default).
      const inviteToken = await makeInviteToken(newUserId, 0);
      const inviteUrl   = `${APP_URL}/set-password?token=${inviteToken}`;
      const safeName    = request.name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      void sendEmail({
        to: request.email,
        subject: "Your GSF Trust account is ready",
        html: `<p>Assalamu Alaikum ${safeName},</p>
<p>Your registration has been approved. Please set your password using the link below:</p>
<p><a href="${inviteUrl}">Set Your Password</a></p>
<p>This link expires in 48 hours.</p>
<p>Once logged in, you can view your subscription history, outstanding dues, and download payment receipts.</p>
<p>JazakAllah Khair,<br>GSF Trust</p>`,
        text: `Assalamu Alaikum ${request.name},\n\nYour registration has been approved.\n\nSet your password here: ${inviteUrl}\n\nThis link expires in 48 hours.\n\nJazakAllah Khair,\nGSF Trust`,
      });

      return NextResponse.json({ ok: true, user_id: newUserId });
    } else {
      // Reject.
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE registration_requests
           SET status = 'rejected', reviewed_by = ?, reviewed_at = datetime('now'), rejection_reason = ?
           WHERE id = ?`
        ).bind(user.sub, parsed.data.rejection_reason ?? null, id),
        auditStatement(env.DB, {
          userId: user.sub,
          action: "update",
          entity: "registration_requests",
          entityId: id,
          after: { status: "rejected" },
        }),
      ]);

      // Notify the applicant politely.
      const rejectName   = request.name.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const rejectReason = parsed.data.rejection_reason
        ? parsed.data.rejection_reason.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
        : null;
      void sendEmail({
        to: request.email,
        subject: "GSF Trust — Registration Update",
        html: `<p>Assalamu Alaikum ${rejectName},</p>
<p>Thank you for your interest in the GSF Trust member portal.</p>
<p>After review, we were unable to approve your registration at this time.${rejectReason ? ` Reason: ${rejectReason}` : ""}</p>
<p>If you believe this is an error, please contact the Treasurer directly.</p>
<p>JazakAllah Khair,<br>GSF Trust</p>`,
        text: `Assalamu Alaikum ${request.name},\n\nWe were unable to approve your registration at this time.${parsed.data.rejection_reason ? `\nReason: ${parsed.data.rejection_reason}` : ""}\n\nJazakAllah Khair,\nGSF Trust`,
      });

      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    console.error("POST /api/admin/registrations/[id] failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
