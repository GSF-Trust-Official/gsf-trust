"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isMember, canWrite } from "@/lib/roles";
import type { Subscription, Member } from "@/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ subscriptionId: string }> }
): Promise<NextResponse | Response> {
  try {
    const { subscriptionId } = await params;
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sub = await env.DB
      .prepare("SELECT * FROM subscriptions WHERE id = ?")
      .bind(subscriptionId)
      .first<Subscription>();
    if (!sub) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    // Row-level security: member can only access their own subscription.
    if (isMember(user.role) && sub.member_id !== user.memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Non-member non-staff falls through (viewer/editor/admin all allowed).

    if (sub.status !== "paid") {
      return NextResponse.json({ error: "No receipt for unpaid subscription" }, { status: 422 });
    }

    const member = await env.DB
      .prepare("SELECT name, code FROM members WHERE id = ?")
      .bind(sub.member_id)
      .first<Pick<Member, "name" | "code">>();
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Dynamic import keeps JSX out of this .ts file and avoids bundler issues.
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { MemberReceiptDocument, buildReceiptFilename, buildReceiptNo, buildMonthLabel } =
      await import("@/lib/reports/memberReceiptPdf");

    const receiptNo  = buildReceiptNo(sub, member.code);
    const monthLabel = buildMonthLabel(sub);
    const filename   = buildReceiptFilename(sub, member.code);

    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      MemberReceiptDocument({ sub, member, receiptNo, monthLabel }) as any
    );

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("GET /api/me/receipts/[subscriptionId] failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
