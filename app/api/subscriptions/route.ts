import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isMember } from "@/lib/roles";
import { LogSubscriptionSchema } from "@/lib/validators/subscription";
import { getMatrixForYear, upsertSubscription } from "@/lib/queries/subscriptions";
import { getMemberById } from "@/lib/queries/members";
import { getSetting } from "@/lib/queries/settings";
import {
  sendReceipt,
  buildSubscriptionReceiptHtml,
  buildSubscriptionReceiptText,
  buildSubscriptionReceiptWhatsApp,
} from "@/lib/email";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url  = new URL(req.url);
    const year = parseInt(url.searchParams.get("year") ?? "", 10) || new Date().getFullYear();

    const matrix = await getMatrixForYear(db, year);
    return NextResponse.json({ ok: true, matrix, year });
  } catch (err) {
    console.error("GET /api/subscriptions failed", err);
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
    const parsed = LogSubscriptionSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { member_id, month, year, amount, paid_date, mode, reference, notes } = parsed.data;

    const member = await getMemberById(db, member_id);
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    await upsertSubscription(db, {
      member_id,
      member_code: member.code,
      member_name: member.name,
      month,
      year,
      amount,
      paid_date,
      mode,
      reference: reference ?? null,
      notes:     notes ?? null,
      userId:    user.sub,
    });

    const monthLabel = new Date(year, month - 1).toLocaleDateString("en-IN", {
      month: "short", year: "numeric",
    });
    const receiptParams = {
      memberName: member.name,
      memberCode: member.code,
      monthLabel,
      amount,
      mode,
      paidDate:  paid_date,
      reference: reference ?? null,
    };

    let emailSent = false;
    const whatsappText = buildSubscriptionReceiptWhatsApp(receiptParams);

    if (member.email) {
      const enabled = await getSetting(db, "receipt_subscriptions_enabled");
      if (enabled !== "0") {
        void sendReceipt({
          to:      member.email,
          subject: `Payment Receipt — GSF Foundation (${monthLabel})`,
          html:    buildSubscriptionReceiptHtml(receiptParams),
          text:    buildSubscriptionReceiptText(receiptParams),
        });
        emailSent = true;
      }
    }

    return NextResponse.json({ ok: true, email_sent: emailSent, whatsapp_text: whatsappText });
  } catch (err) {
    console.error("POST /api/subscriptions failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
