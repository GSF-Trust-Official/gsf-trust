import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isMember } from "@/lib/roles";
import { LogDonationSchema } from "@/lib/validators/donation";
import { getDonations, insertDonation } from "@/lib/queries/donations";
import { getMemberById } from "@/lib/queries/members";
import { getSetting } from "@/lib/queries/settings";
import {
  sendReceipt,
  buildDonationReceiptHtml,
  buildDonationReceiptText,
  buildDonationReceiptWhatsApp,
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

    const url      = new URL(req.url);
    const page     = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const rawType  = url.searchParams.get("type");
    const type     = (rawType === "hadiya" || rawType === "zakat" || rawType === "other") ? rawType : undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
    const dateTo   = url.searchParams.get("dateTo") ?? undefined;

    const result = await getDonations(db, { type, category, dateFrom, dateTo, page, pageSize: 20 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/donations failed", err);
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
    const parsed = LogDonationSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { member_id, donor_name, type, category, amount, date, mode, reference, notes } = parsed.data;

    // Double-enforce server-side: zakat donation must go to scholarship
    if (type === "zakat" && category !== "scholarship")
      return NextResponse.json({ error: "Zakat donations must be categorized as Scholarship" }, { status: 400 });

    // Look up member code if a member was selected
    let memberCode: string | null = null;
    if (member_id) {
      const member = await getMemberById(db, member_id);
      memberCode = member?.code ?? null;
    }

    await insertDonation(db, {
      memberId:   member_id ?? null,
      memberCode,
      donorName:  donor_name,
      type,
      category,
      amount,
      date,
      mode:      mode      ?? null,
      reference: reference ?? null,
      notes:     notes     ?? null,
      userId:    user.sub,
    });

    const receiptParams = {
      donorName:  donor_name ?? "Donor",
      memberCode: memberCode,
      type,
      amount,
      mode:       mode ?? null,
      date,
      reference:  reference ?? null,
    };

    let emailSent = false;
    const whatsappText = buildDonationReceiptWhatsApp(receiptParams);

    const memberEmail = member_id ? (await getMemberById(db, member_id))?.email ?? null : null;
    if (memberEmail) {
      const enabled = await getSetting(db, "receipt_donations_enabled");
      if (enabled !== "0") {
        void sendReceipt({
          to:      memberEmail,
          subject: "Donation Receipt — GSF Foundation",
          html:    buildDonationReceiptHtml(receiptParams),
          text:    buildDonationReceiptText(receiptParams),
        });
        emailSent = true;
      }
    }

    return NextResponse.json({ ok: true, email_sent: emailSent, whatsapp_text: whatsappText });
  } catch (err) {
    console.error("POST /api/donations failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
