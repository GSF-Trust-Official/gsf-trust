"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { getSetting } from "@/lib/queries/settings";

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional().or(z.literal("")),
  member_code: z.string().max(20).optional().or(z.literal("")),
  message: z.string().max(500).optional().or(z.literal("")),
});

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => null);
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { name, email, phone, member_code, message } = parsed.data;
    const { env } = getCloudflareContext();
    const db = env.DB;

    // Reject if email already has an active user account.
    const existing = await db
      .prepare("SELECT id FROM users WHERE email = ? AND is_active = 1")
      .bind(email)
      .first<{ id: string }>();
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    // Reject if a pending request for this email already exists.
    const pending = await db
      .prepare("SELECT id FROM registration_requests WHERE email = ? AND status = 'pending'")
      .bind(email)
      .first<{ id: string }>();
    if (pending) {
      return NextResponse.json(
        { error: "A registration request for this email is already pending review." },
        { status: 409 }
      );
    }

    await db
      .prepare(
        `INSERT INTO registration_requests (name, email, phone, member_code, message)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(
        name,
        email,
        phone || null,
        member_code || null,
        message || null,
      )
      .run();

    // Notify treasurer (fire-and-forget).
    const treasurerEmail = await getSetting(db, "treasurer_email");
    if (treasurerEmail) {
      const html = `<p>A new registration request has been submitted.</p>
<p><strong>Name:</strong> ${name}<br>
<strong>Email:</strong> ${email}<br>
${phone ? `<strong>Phone:</strong> ${phone}<br>` : ""}
${member_code ? `<strong>Member Code:</strong> ${member_code}<br>` : ""}
${message ? `<strong>Message:</strong> ${message}` : ""}</p>
<p>Log in to approve or reject: <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://gsf-trust.gsftrust-official.workers.dev"}/settings">Settings → Pending Registrations</a></p>`;

      void sendEmail({
        to: treasurerEmail,
        subject: `New Registration Request — ${name}`,
        html,
        text: `New registration request from ${name} (${email}).\nReview at Settings → Pending Registrations.`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/auth/register failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
